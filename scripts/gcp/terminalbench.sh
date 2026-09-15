#!/usr/bin/env bash
# Terminal-bench harness validation on the GCP VM (oracle agent, NOT a Smart-Thinking score).
set -uo pipefail
export DEBIAN_FRONTEND=noninteractive
OUT="${1:-/home/ubuntu/bench-results}"
mkdir -p "$OUT"

python3 -m venv /opt/tb || true
# shellcheck disable=SC1091
. /opt/tb/bin/activate
pip install -q --upgrade pip wheel uv || echo "pip upgrade: echec"
if ! pip install -q terminal-bench; then
  echo "pip terminal-bench (pypi) echec, essai git"
  pip install -q "git+https://github.com/laude-institute/terminal-bench.git" || { echo "pip terminal-bench: ECHEC"; exit 1; }
fi

tb --help > "$OUT/tb-help.txt" 2>&1 || true
tb run --help > "$OUT/tb-run-help.txt" 2>&1 || true
tb datasets --help > "$OUT/tb-datasets-help.txt" 2>&1 || true

# Sans jeu de donnees explicite, `tb run` cherche un dossier local `tasks/` et echoue
# (FileNotFoundError: 'tasks'). On interroge le registre puis on retombe sur le depot git.
DS=""
timeout 300 tb datasets list > "$OUT/tb-datasets-list.txt" 2>&1 || true
DS=$(grep -oiE "terminal-bench-core(==[0-9][0-9.]*)?" "$OUT/tb-datasets-list.txt" 2>/dev/null | sort -u | sort -V | tail -1)
[ -n "$DS" ] || DS="terminal-bench-core==0.1.1"
echo "dataset retenu: $DS"

FLAGS="--agent oracle --n-concurrent 2"
if grep -q -- "--dataset-name" "$OUT/tb-run-help.txt"; then
  DS_NAME="${DS%%==*}"
  DS_VER=""
  [ "$DS" != "$DS_NAME" ] && DS_VER="${DS##*==}"
  FLAGS="$FLAGS --dataset-name=$DS_NAME"
  [ -n "$DS_VER" ] && FLAGS="$FLAGS --dataset-version=$DS_VER"
elif grep -q -- "--dataset" "$OUT/tb-run-help.txt"; then
  FLAGS="$FLAGS --dataset $DS"
fi
if grep -q -- "--output-path" "$OUT/tb-run-help.txt"; then FLAGS="$FLAGS --output-path $OUT/terminalbench"; fi
if grep -q -- "--n-tasks" "$OUT/tb-run-help.txt"; then FLAGS="$FLAGS --n-tasks 10"; fi

echo "tb run $FLAGS"
timeout 4800 tb run $FLAGS > "$OUT/terminalbench.log" 2>&1
echo "TB exit=$?"
if grep -q "FileNotFoundError" "$OUT/terminalbench.log" 2>/dev/null; then
  echo "repli: depot git local (dossier tasks/)"
  rm -rf /opt/tb-repo 2>/dev/null || true
  git clone --depth=1 https://github.com/laude-institute/terminal-bench.git /opt/tb-repo >>"$OUT/terminalbench.log" 2>&1
  if [ -d /opt/tb-repo/tasks ]; then
    ls /opt/tb-repo/tasks | head -20 >> "$OUT/terminalbench.log" 2>&1
    timeout 4800 tb run --agent oracle --n-concurrent 2 -p /opt/tb-repo/tasks \
      --output-path "$OUT/terminalbench" --n-tasks 10 >> "$OUT/terminalbench.log" 2>&1
    echo "TB repli exit=$?"
  else
    echo "repli impossible: /opt/tb-repo/tasks absent"
  fi
fi
tail -40 "$OUT/terminalbench.log"
chmod -R a+rX "$OUT" 2>/dev/null || true
