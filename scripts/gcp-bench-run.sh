#!/usr/bin/env bash
# GCP benchmark run v2: remote script via scp (fixes gcloud ssh multiline), full run, guaranteed cleanup.
set -uo pipefail

PROJECT="beaming-delight-507904-e4"
ZONE="europe-west1-b"
NAME="st-bench-$(date +%s)"
MOUNT="/Users/leghis/Downloads/Smart-Thinking"
OUT="${MOUNT}/proofs/gcp"
mkdir -p "$OUT"
LOG="${OUT}/gcp-run.log"
: > "${OUT}/remote-run.sh"

log() { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }

cleanup() {
  log "CLEANUP: suppression"
  gcloud compute instances delete "$NAME" --project="$PROJECT" --zone="$ZONE" --delete-disks=all --quiet >>"$LOG" 2>&1 || true
  gcloud compute firewall-rules delete "${NAME}-ssh" --project="$PROJECT" --quiet >>"$LOG" 2>&1 || true
  log "CLEANUP: instances restantes: $(gcloud compute instances list --project="$PROJECT" --format='value(name)' | tr '\n' ' ')"
}
trap cleanup EXIT

cat > "${OUT}/remote-run.sh" <<'REMOTE'
#!/usr/bin/env bash
set -uo pipefail
export DEBIAN_FRONTEND=noninteractive
echo "REMOTE: start $(date)"
cd /opt/st
mkdir -p /opt/ob proofs/gcp
curl -s -m 60 "https://datasets-server.huggingface.co/rows?dataset=yentinglin%2Faime_2025&config=default&split=train&offset=0&length=100" -o /opt/ob/aime.json
curl -s -m 60 "https://datasets-server.huggingface.co/rows?dataset=TIGER-Lab%2FMMLU-Pro&config=default&split=test&offset=0&length=20" -o /opt/ob/mmlu.json
echo "REMOTE: reasoning suites (AIME+MMLU-Pro) with deepseek-flash"
node scripts/official-bench.cjs --limit=50 --concurrency=8 > /opt/st/proofs/gcp/reasoning.txt 2>&1
echo "REMOTE: reasoning exit=$?"
python3 -m venv /opt/swe >/dev/null 2>&1
. /opt/swe/bin/activate
pip install -q swebench datasets >/dev/null 2>&1
echo "REMOTE: SWE-bench Verified oracle (10 instances)"
python - <<'PY' > /tmp/ids.txt 2>/dev/null
from datasets import load_dataset
ds = load_dataset("princeton-nlp/SWE-bench_Verified", split="test")
print(" ".join(ds[:10]["instance_id"]))
PY
python -m swebench.harness.run_evaluation --dataset_name princeton-nlp/SWE-bench_Verified \
  --predictions_path gold --max_workers 2 --run_id oracle $(cat /tmp/ids.txt) > /opt/st/proofs/gcp/swebench.txt 2>&1
echo "REMOTE: swebench exit=$?"
pip install -q git+https://github.com/laude-institute/terminal-bench.git >/dev/null 2>&1
echo "REMOTE: terminal-bench oracle"
(tb run --agent oracle --dataset terminal-bench-core 2>&1 | tail -40) > /opt/st/proofs/gcp/terminalbench.txt 2>&1
echo "REMOTE: terminal exit=$?"
echo "REMOTE: done $(date)"
REMOTE

log "PROVISION VM $NAME"
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
touch /opt/st-ready
' >>"$LOG" 2>&1 || { log "PROVISION ECHEC"; exit 1; }

log "WAIT readiness"
READY=0
for i in $(seq 1 80); do
  if gcloud compute ssh "$NAME" --project="$PROJECT" --zone="$ZONE" --command='test -f /opt/st-ready' >>"$LOG" 2>&1; then READY=1; log "VM prete (essai $i)"; break; fi
  sleep 15
done
[ "$READY" = 1 ] || { log "VM non prete"; exit 1; }

gcloud compute scp "${OUT}/remote-run.sh" "$NAME:/opt/remote-run.sh" --project="$PROJECT" --zone="$ZONE" >>"$LOG" 2>&1
log "RUN remote (single-line ssh)"
gcloud compute ssh "$NAME" --project="$PROJECT" --zone="$ZONE" \
  --command="DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-} bash /opt/remote-run.sh" >>"$LOG" 2>&1
log "RUN remote exit=$?"

log "FETCH results"
gcloud compute scp --recurse "$NAME:/opt/st/proofs/gcp" "${OUT}/remote" --project="$PROJECT" --zone="$ZONE" >>"$LOG" 2>&1 || log "scp partiel"
log "DONE — cleanup follows"
