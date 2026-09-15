#!/usr/bin/env bash
# Remote orchestrator, runs as root on the GCP VM (sudo -E bash remote-run.sh KEY TAVILY_KEY).
set -uo pipefail
export DEBIAN_FRONTEND=noninteractive
export DEEPSEEK_API_KEY="${DEEPSEEK_API_KEY:-${1:-}}"
export TAVILY_API_KEY="${TAVILY_API_KEY:-${2:-}}"
export ST_ROOT=/opt/st
BASE=$(cd "$(dirname "$0")" && pwd)
OUT="$BASE/bench-results"
mkdir -p "$OUT"
exec > >(tee -a "$OUT/remote.log") 2>&1

echo "REMOTE start $(date -u) base=$BASE"
echo "keys: deepseek=${DEEPSEEK_API_KEY:+oui} tavily=${TAVILY_API_KEY:+oui}"
df -h / | tail -1
tail -30 /var/log/st-startup.log 2>/dev/null || true

cd /opt/st || { echo "FATAL: /opt/st absent"; exit 1; }
if [ ! -f build/bench/providers.js ]; then
  echo "build manquant: npm ci + npm run build"
  if test -f package-lock.json; then npm ci --no-audit --no-fund || npm install --no-audit --no-fund; else npm install --no-audit --no-fund; fi
  npm run build || echo "npm run build: echec"
fi
test -f build/bench/providers.js && echo "build OK" || echo "build MISSING"

cp "$BASE/gcp-remote-bench.cjs" /opt/st/scripts/gcp-remote-bench.cjs

nohup bash "$BASE/swebench.sh" "$OUT" > "$OUT/swebench-wrapper.log" 2>&1 &
SWE_PID=$!
echo "SWE-bench lance en arriere-plan (pid=$SWE_PID)"

nohup bash "$BASE/terminalbench.sh" "$OUT" > "$OUT/terminalbench-wrapper.log" 2>&1 &
TB_PID=$!
echo "Terminal-bench lance en arriere-plan (pid=$TB_PID)"

echo "=== SUITES RAISONNEMENT ==="
# Garde-fou : 3 h maximum pour les suites raisonnement (les resultats partiels deja
# ecrits dans summary.partial.json restent exploitables si le plafond est atteint).
timeout 10800 node /opt/st/scripts/gcp-remote-bench.cjs \
  --out="$OUT/reasoning" \
  --limit-aime=30 --limit-mmlu=20 --limit-hmmt=30 --limit-simpleqa=30 --limit-lcb=20 \
  --concurrency=8
echo "reasoning exit=$?"

wait "$SWE_PID"
echo "swebench wrapper exit=$?"

wait "$TB_PID"
echo "terminalbench wrapper exit=$?"

chmod -R a+rX "$OUT"
echo "REMOTE done $(date -u)"
df -h / | tail -1
