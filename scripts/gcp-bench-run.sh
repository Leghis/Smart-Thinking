#!/usr/bin/env bash
# GCP benchmark run: staging -> VM e2-standard-4 -> scp remote scripts to the SSH user's home -> sudo run -> fetch -> cleanup.
# Fixes the previous /opt/remote-run.sh permission failure (scp to $HOME, run with sudo -E).
set -uo pipefail

PROJECT="beaming-delight-507904-e4"
ZONE="europe-west1-b"
NAME="st-bench-$(date +%s)"
MOUNT="/Users/leghis/Downloads/Smart-Thinking"
OUT="${MOUNT}/proofs/gcp"
STAGE="${OUT}/staging"
LOG="${OUT}/gcp-run.log"
mkdir -p "$OUT" "$STAGE"
: > "$LOG"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }

cleanup() {
  log "CLEANUP: suppression VM $NAME"
  gcloud compute instances delete "$NAME" --project="$PROJECT" --zone="$ZONE" --delete-disks=all --quiet >>"$LOG" 2>&1 || true
  log "CLEANUP: instances restantes: [$(gcloud compute instances list --project="$PROJECT" --format='value(name)' 2>/dev/null | tr '\n' ' ')]"
  log "CLEANUP: disques restants: [$(gcloud compute disks list --project="$PROJECT" --format='value(name)' 2>/dev/null | tr '\n' ' ')]"
}
trap cleanup EXIT INT TERM

cp "${MOUNT}/scripts/gcp-remote-bench.cjs" "${STAGE}/gcp-remote-bench.cjs"
cp "${MOUNT}/scripts/gcp/remote-run.sh" "${STAGE}/remote-run.sh"
cp "${MOUNT}/scripts/gcp/swebench.sh" "${STAGE}/swebench.sh"
cp "${MOUNT}/scripts/gcp/terminalbench.sh" "${STAGE}/terminalbench.sh"

log "PROVISION VM $NAME"
gcloud compute instances create "$NAME" \
  --project="$PROJECT" --zone="$ZONE" --machine-type=e2-standard-4 \
  --image-family=ubuntu-2404-lts-amd64 --image-project=ubuntu-os-cloud \
  --boot-disk-size=150GB --boot-disk-type=pd-balanced \
  --metadata=startup-script='#!/bin/bash
exec > /var/log/st-startup.log 2>&1
export DEBIAN_FRONTEND=noninteractive
echo START $(date -u)
apt-get update -qq
# docker-compose-v2 est requis par Terminal-bench (`docker compose`, absent de docker.io seul).
apt-get install -y -qq docker.io docker-compose-v2 git curl python3-pip python3-venv zlib1g-dev
systemctl enable --now docker
usermod -aG docker ubuntu
curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/node.sh
bash /tmp/node.sh
apt-get install -y -qq nodejs
echo node $(node -v) npm $(npm -v)
rm -rf /opt/st
for i in 1 2 3; do git clone --depth=1 https://github.com/Leghis/Smart-Thinking.git /opt/st && break; sleep 10; done
cd /opt/st
if test -f package-lock.json; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
npm run build
test -f build/bench/providers.js
echo STATUS=$?
if test -f build/bench/providers.js; then touch /opt/st-ready; fi
touch /opt/st-startup-done' >>"$LOG" 2>&1 || { log "PROVISION ECHEC"; exit 1; }

log "WAIT readiness"
READY=0
for i in $(seq 1 60); do
  STATUS=$(gcloud compute ssh "$NAME" --project="$PROJECT" --zone="$ZONE" --quiet \
    --command='if test -f /opt/st-startup-done; then if test -f /opt/st-ready; then echo READY; else echo BUILDFAIL; fi; else echo WAIT; fi' 2>>"$LOG" || echo SSHFAIL)
  case "$STATUS" in
    READY) READY=1; log "VM prete (essai $i)"; break;;
    BUILDFAIL) READY=2; log "Build VM en echec (essai $i) — le runner distant retentera"; break;;
  esac
  sleep 15
done
[ "$READY" != 0 ] || { log "VM non prete"; exit 1; }

RHOME=$(gcloud compute ssh "$NAME" --project="$PROJECT" --zone="$ZONE" --quiet \
  --command='echo HOME=$HOME' 2>>"$LOG" | tail -1 | tr -d '\r' | sed 's/^HOME=//')
case "$RHOME" in
  /*) log "Home SSH distant: $RHOME";;
  *) RHOME=/home/ubuntu; log "Home SSH distant indetermine, repli $RHOME";;
esac

log "SCP scripts -> $RHOME"
gcloud compute scp "${STAGE}/gcp-remote-bench.cjs" "${STAGE}/remote-run.sh" "${STAGE}/swebench.sh" "${STAGE}/terminalbench.sh" \
  "$NAME:$RHOME/" --project="$PROJECT" --zone="$ZONE" >>"$LOG" 2>&1 || { log "SCP ECHEC"; exit 1; }

log "RUN remote (mono-ligne, sudo)"
gcloud compute ssh "$NAME" --project="$PROJECT" --zone="$ZONE" --quiet \
  --command="sudo -E bash $RHOME/remote-run.sh '${DEEPSEEK_API_KEY:-}' '${TAVILY_API_KEY:-}'" >>"$LOG" 2>&1
log "RUN remote exit=$?"

log "FETCH results"
rm -rf "${OUT}/remote"
gcloud compute scp --recurse "$NAME:$RHOME/bench-results" "${OUT}/remote" --project="$PROJECT" --zone="$ZONE" >>"$LOG" 2>&1 || log "scp partiel"
log "DONE — cleanup suit (trap)"
