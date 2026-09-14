#!/usr/bin/env bash
# GCP benchmark run: provision VM, install MCP from git, run reasoning suites + SWE-bench/Terminal-bench
# oracle validation, fetch results back, DESTROY all resources (trap). See benchmarks/DEEPSEEK-OFFICIAL-BENCHMARKS.md
set -uo pipefail

PROJECT="beaming-delight-507904-e4"
ZONE="europe-west1-b"
NAME="st-bench-$(date +%s)"
MOUNT="/Users/leghis/Downloads/Smart-Thinking"
OUT="${MOUNT}/proofs/gcp"
mkdir -p "$OUT"
LOG="${OUT}/gcp-run.log"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }

cleanup() {
  log "CLEANUP: suppression des ressources"
  gcloud compute instances delete "$NAME" --project="$PROJECT" --zone="$ZONE" --delete-disks=all --quiet >>"$LOG" 2>&1 || true
  gcloud compute firewall-rules delete "${NAME}-ssh" --project="$PROJECT" --quiet >>"$LOG" 2>&1 || true
  gcloud compute disks list --project="$PROJECT" --filter="name~${NAME}" --format="value(name)" | while read -r d; do
    gcloud compute disks delete "$d" --project="$PROJECT" --zone="$ZONE" --quiet >>"$LOG" 2>&1 || true
  done
  log "CLEANUP: verification — instances restantes:"
  gcloud compute instances list --project="$PROJECT" --format="value(name)" >>"$LOG" 2>&1 || true
  log "CLEANUP termine"
}
trap cleanup EXIT

log "PROVISION: VM $NAME ($PROJECT / $ZONE)"
gcloud config set project "$PROJECT" >>"$LOG" 2>&1
gcloud compute instances create "$NAME" \
  --project="$PROJECT" --zone="$ZONE" --machine-type=e2-standard-4 \
  --image-family=ubuntu-2404-lts-amd64 --image-project=ubuntu-os-cloud \
  --boot-disk-size=150GB --boot-disk-type=pd-balanced \
  --metadata=startup-script='#!/bin/bash
set -e
apt-get update -qq
apt-get install -y -qq docker.io git curl python3-pip python3-venv
systemctl enable --now docker
usermod -aG docker ubuntu
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
apt-get install -y -qq nodejs
git clone --depth=1 https://github.com/Leghis/Smart-Thinking.git /opt/st
cd /opt/st && npm ci --no-audit --no-fund >/dev/null && npm run build >/dev/null
npm install -g /opt/st >/dev/null 2>&1 || true
touch /opt/st-ready
' >>"$LOG" 2>&1 || { log "PROVISION ECHEC"; exit 1; }

log "WAIT: demarrage VM + installation (peut prendre 5-8 min)"
for i in $(seq 1 60); do
  if gcloud compute ssh "$NAME" --project="$PROJECT" --zone="$ZONE" --command='test -f /opt/st-ready' >>"$LOG" 2>&1; then
    log "VM prete (essai $i)"; break
  fi
  sleep 15
done

log "TESTS: reproduction harnais officiel sur la VM (AIME 2025 + MMLU-Pro)"
gcloud compute ssh "$NAME" --project="$PROJECT" --zone="$ZONE" --command='
cd /opt/st
mkdir -p /opt/ob
curl -s -m 60 "https://datasets-server.huggingface.co/rows?dataset=yentinglin%2Faime_2025&config=default&split=train&offset=0&length=100" -o /opt/ob/aime.json
curl -s -m 60 "https://datasets-server.huggingface.co/rows?dataset=TIGER-Lab%2FMMLU-Pro&config=default&split=test&offset=0&length=20" -o /opt/ob/mmlu.json
DEEPSEEK_API_KEY='"$DEEPSEEK_API_KEY"' node scripts/official-bench.cjs --limit=50 --concurrency=8
' >>"$LOG" 2>&1 || log "TESTS reasoning: erreur (voir log)"

log "TESTS: SWE-bench Verified (validation harnais, agent oracle)"
gcloud compute ssh "$NAME" --project="$PROJECT" --zone="$ZONE" --command='
set -e
python3 -m venv /opt/swe && . /opt/swe/bin/activate
pip install -q swebench datasets
cd /opt/st
python -m swebench.harness.run_evaluation \
  --dataset_name princeton-nlp/SWE-bench_Verified \
  --predictions_path gold --max_workers 2 --run_id oracle \
  --instance_ids $(python3 - <<PY
from datasets import load_dataset
ds = load_dataset("princeton-nlp/SWE-bench_Verified", split="test")
print(" ".join(ds[:10]["instance_id"]))
PY
) || true
' >>"$LOG" 2>&1 || log "SWE-bench oracle: erreur (voir log)"

log "TESTS: Terminal-bench (validation harnais, agent oracle)"
gcloud compute ssh "$NAME" --project="$PROJECT" --zone="$ZONE" --command='
pip install -q terminal-bench 2>/dev/null || pip install -q git+https://github.com/laude-institute/terminal-bench.git
terminal-bench --help >/dev/null 2>&1 && (tb run --agent oracle --dataset terminal-bench-core 2>&1 | tail -30) || echo "terminal-bench: CLI indisponible, ignores"
' >>"$LOG" 2>&1 || log "Terminal-bench oracle: erreur (voir log)"

log "RAPATRIEMENT: resultats -> ${OUT}"
gcloud compute scp --project="$PROJECT" --zone="$ZONE" --recurse "$NAME:/opt/st/proofs/." "$OUT/remote/" >>"$LOG" 2>&1 || log "scp: partiel (voir log)"
log "RUN TERMINE — la destruction des ressources suit (trap)"
