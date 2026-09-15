#!/usr/bin/env bash
# Rattrapage : rejoue SWE-bench Verified (oracle, 10 instances) avec le jeu de donnees
# officiel SWE-bench/SWE-bench_Verified, seul a fournir la colonne `image` requise par le harnais 5.x.
set -uo pipefail
export DEBIAN_FRONTEND=noninteractive
OUT="${1:-/home/leghis/bench-results}"
mkdir -p "$OUT"

# shellcheck disable=SC1091
. /opt/swe/bin/activate
cd /opt/swe-eval

python3 - <<'PY' > /tmp/swe_verified_ids.txt
from datasets import load_dataset
ds = load_dataset("SWE-bench/SWE-bench_Verified", split="test")
ids = list(ds["instance_id"])
step = max(1, len(ids) // 10)
print(" ".join(ids[::step][:10]))
PY
VERIFIED_IDS=$(cat /tmp/swe_verified_ids.txt)
echo "verified ids: $VERIFIED_IDS"

python -m swebench.harness.run_evaluation --dataset_name SWE-bench/SWE-bench_Verified -s test \
  --predictions_path gold --max_workers 2 -t 1800 --run_id oracle-verified \
  --report_dir "$OUT" -i $VERIFIED_IDS > "$OUT/swebench-verified.log" 2>&1
echo "SWE-Verified exit=$?"
cp -r /opt/swe-eval/logs "$OUT/swebench-verified-logs" 2>/dev/null || true
cp /opt/swe-eval/*.json "$OUT/" 2>/dev/null || true
tail -30 "$OUT/swebench-verified.log"
chmod -R a+rX "$OUT" 2>/dev/null || true
