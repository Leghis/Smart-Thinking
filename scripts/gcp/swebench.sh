#!/usr/bin/env bash
# SWE-bench harness validation on the GCP VM (gold/oracle predictions, NOT a Smart-Thinking score).
set -uo pipefail
export DEBIAN_FRONTEND=noninteractive
OUT="${1:-/home/ubuntu/bench-results}"
mkdir -p "$OUT"

python3 -m venv /opt/swe || true
# shellcheck disable=SC1091
. /opt/swe/bin/activate
pip install -q --upgrade pip wheel || echo "pip upgrade: echec"
pip install -q swebench datasets || { echo "pip install swebench: ECHEC"; exit 1; }

echo "swebench $(python -c 'import swebench,sys;print(getattr(swebench,"__version__","?"))' 2>/dev/null)"
docker info >/dev/null 2>&1 && echo "docker: OK" || echo "docker: INDISPONIBLE (le harnais va echouer)"

mkdir -p /opt/swe-eval
cd /opt/swe-eval

echo "=== SWE-bench Verified (oracle, 10 instances) ==="
# Attention : l'ancien namespace princeton-nlp/SWE-bench_Verified n'a pas la colonne `image`
# exigee par le harnais 5.x (KeyError: 'image'). Le jeu officiel actuel est SWE-bench/SWE-bench_Verified.
python3 - <<'PY' > /tmp/swe_verified_ids.txt
from datasets import load_dataset
ds = load_dataset("SWE-bench/SWE-bench_Verified", split="test")
ids = list(ds["instance_id"])
step = max(1, len(ids) // 10)
print(" ".join(ids[::step][:10]))
PY
VERIFIED_IDS=$(cat /tmp/swe_verified_ids.txt)
echo "verified ids: $VERIFIED_IDS"
[ -n "$VERIFIED_IDS" ] || { echo "SWE-Verified: aucun identifiant recupere"; }
# -i/--instance_ids est obligatoire : sans lui, les identifiants sont pris pour des positionnels (exit 2).
python -m swebench.harness.run_evaluation --dataset_name SWE-bench/SWE-bench_Verified -s test \
  --predictions_path gold --max_workers 2 -t 1800 --run_id oracle-verified \
  --report_dir "$OUT" -i $VERIFIED_IDS > "$OUT/swebench-verified.log" 2>&1
echo "SWE-Verified exit=$?"
cp -r /opt/swe-eval/logs "$OUT/swebench-verified-logs" 2>/dev/null || true
cp /opt/swe-eval/*.json "$OUT/" 2>/dev/null || true
tail -30 "$OUT/swebench-verified.log"

echo "=== SWE-bench Multilingual (oracle, 8 instances) ==="
python3 - <<'PY' > /tmp/swe_multiling_ids.txt
from datasets import load_dataset
ds = load_dataset("SWE-bench/SWE-bench_Multilingual", split="test")
ids = list(ds["instance_id"])
step = max(1, len(ids) // 8)
print(" ".join(ids[::step][:8]))
PY
MULTILING_IDS=$(cat /tmp/swe_multiling_ids.txt)
echo "multiling ids: $MULTILING_IDS"
[ -n "$MULTILING_IDS" ] || { echo "SWE-Multilingual: aucun identifiant recupere"; }
python -m swebench.harness.run_evaluation --dataset_name SWE-bench/SWE-bench_Multilingual -s test \
  --predictions_path gold --max_workers 2 -t 1800 --run_id oracle-multiling \
  --report_dir "$OUT" -i $MULTILING_IDS > "$OUT/swebench-multilingual.log" 2>&1
echo "SWE-Multilingual exit=$?"
cp -r /opt/swe-eval/logs "$OUT/swebench-multilingual-logs" 2>/dev/null || true
cp /opt/swe-eval/*.json "$OUT/" 2>/dev/null || true
tail -30 "$OUT/swebench-multilingual.log"

chmod -R a+rX "$OUT" 2>/dev/null || true
