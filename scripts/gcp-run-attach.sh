#!/usr/bin/env bash
# Orchestration GCP resiliente : le run distant est lance en mode detache sur la VM (setsid),
# donc il survit a une coupure SSH ou a l'arret du script local. Puis rapatriement des
# resultats et suppression de toutes les ressources (trap, meme en cas d'echec).
# Usage : DEEPSEEK_API_KEY=... TAVILY_API_KEY=... bash scripts/gcp-run-attach.sh <nom-vm>
set -uo pipefail

PROJECT="beaming-delight-507904-e4"
ZONE="europe-west1-b"
NAME="${1:?nom de VM requis}"
MOUNT="/Users/leghis/Downloads/Smart-Thinking"
OUT="${MOUNT}/proofs/gcp"
STAGE="${OUT}/staging"
LOG="${OUT}/gcp-attach.log"
MAX_WAIT="${MAX_WAIT:-14400}"
mkdir -p "$OUT" "$STAGE"
: > "$LOG"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }
ssh_vm() { gcloud compute ssh "$NAME" --project="$PROJECT" --zone="$ZONE" --quiet --command="$1" 2>>"$LOG"; }

cleanup() {
  log "CLEANUP: arret du run distant si actif"
  ssh_vm 'pkill -f "[r]emote-run.sh" 2>/dev/null; pkill -f "[g]cp-remote-bench.cjs" 2>/dev/null; pkill -f "[s]webench.sh" 2>/dev/null; pkill -f "[t]erminalbench.sh" 2>/dev/null; true' >/dev/null 2>&1 || true
  log "CLEANUP: suppression VM $NAME (disques inclus)"
  gcloud compute instances delete "$NAME" --project="$PROJECT" --zone="$ZONE" --delete-disks=all --quiet >>"$LOG" 2>&1 || true
  log "CLEANUP: instances restantes: [$(gcloud compute instances list --project="$PROJECT" --format='value(name)' 2>/dev/null | tr '\n' ' ')]"
  log "CLEANUP: disques restants: [$(gcloud compute disks list --project="$PROJECT" --format='value(name)' 2>/dev/null | tr '\n' ' ')]"
}
trap cleanup EXIT INT TERM

RHOME=$(ssh_vm 'echo $HOME' | tail -1 | tr -d '\r')
case "$RHOME" in /*) ;; *) RHOME=/home/leghis;; esac
log "VM $NAME, home distant $RHOME"

log "SCP scripts -> $RHOME"
gcloud compute scp "${STAGE}/gcp-remote-bench.cjs" "${STAGE}/remote-run.sh" "${STAGE}/swebench.sh" "${STAGE}/terminalbench.sh" \
  "$NAME:$RHOME/" --project="$PROJECT" --zone="$ZONE" >>"$LOG" 2>&1 || { log "SCP ECHEC"; exit 1; }

log "LAUNCH distant detache (setsid)"
ssh_vm "mkdir -p $RHOME/bench-results; if pgrep -f '[r]emote-run.sh' >/dev/null; then echo 'run deja actif'; else cd $RHOME && setsid nohup sudo -E bash $RHOME/remote-run.sh '${DEEPSEEK_API_KEY:-}' '${TAVILY_API_KEY:-}' > $RHOME/bench-results/launch.log 2>&1 < /dev/null & fi; sleep 5; pgrep -f '[r]emote-run.sh' | head -3" | tail -5

log "SUIVI (max ${MAX_WAIT}s)"
START=$(date +%s)
DONE=0
while :; do
  sleep 60
  SNAP=$(ssh_vm "grep -E 'SUITE|: baseline|exit=|REMOTE done|TB exit|SWE-Verified exit|SWE-Multilingual exit|LCB|erreur|Echec|ECHEC' $RHOME/bench-results/remote.log 2>/dev/null | tail -4" | tr -d '\r')
  [ -n "$SNAP" ] && log "$(echo "$SNAP" | tr '\n' ' | ')"
  if ssh_vm "grep -q 'REMOTE done' $RHOME/bench-results/remote.log 2>/dev/null && echo YES" | grep -q YES; then DONE=1; log "run distant termine"; break; fi
  if [ "$(( $(date +%s) - START ))" -gt "$MAX_WAIT" ]; then log "plafond de suivi atteint, arret du run distant"; break; fi
done

log "FETCH resultats"
rm -rf "${OUT}/remote" 2>/dev/null || true
gcloud compute scp --recurse "$NAME:$RHOME/bench-results" "${OUT}/remote" --project="$PROJECT" --zone="$ZONE" >>"$LOG" 2>&1 || log "scp partiel"
log "DONE — cleanup suit (trap)"
