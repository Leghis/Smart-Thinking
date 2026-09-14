#!/usr/bin/env node
/**
 * Smart-Thinking v13 — full proof orchestrator.
 *
 * 1. Builds the project (tsc -> build/).
 * 2. Runs `npm test -- --coverage --coverageReporters=json-summary` and keeps
 *    the capture (test failures do not abort the proof, they are reported).
 * 3. Runs the deterministic offline benchmark:
 *      node build/bench/run.js --provider=simulate --label=simulated --out=proofs
 * 4. Combines coverage + benchmark stats into proofs/PROOFS.md, including a
 *    "with vs without Smart-Thinking" section and methodology/limits.
 */

'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PROOFS_DIR = path.join(ROOT, 'proofs');
const COVERAGE_SUMMARY = path.join(ROOT, 'coverage', 'coverage-summary.json');
const NPM = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function runStep(command, args) {
  const started = Date.now();
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, CI: '1' },
  });
  return {
    command: [command, ...args].join(' '),
    status: result.status,
    signal: result.signal,
    error: result.error ? String(result.error.message) : null,
    output: `${result.stdout || ''}${result.stderr || ''}`,
    durationMs: Date.now() - started,
  };
}

function log(line) {
  process.stdout.write(`${line}\n`);
}

function parseJestSummary(output) {
  const pick = (label) => {
    const match = output.match(new RegExp(`${label}:\\s+(.*?)(?:\\n|$)`));
    return match ? match[1].trim() : 'n/a';
  };
  return {
    tests: pick('Tests'),
    suites: pick('Test Suites'),
    snapshots: pick('Snapshots'),
    time: pick('Time'),
  };
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function findLatestBenchmark(label) {
  if (!fs.existsSync(PROOFS_DIR)) {
    return null;
  }
  const candidates = fs
    .readdirSync(PROOFS_DIR)
    .filter((name) => name.startsWith(`benchmark-${label}-`) && name.endsWith('.json'))
    .map((name) => ({ name, mtime: fs.statSync(path.join(PROOFS_DIR, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  return candidates.length > 0 ? path.join(PROOFS_DIR, candidates[0].name) : null;
}

function findLiveBenchmarks() {
  if (!fs.existsSync(PROOFS_DIR)) {
    return [];
  }
  const candidates = fs
    .readdirSync(PROOFS_DIR)
    .filter((name) => name.startsWith('benchmark-') && name.endsWith('.json'))
    .map((name) => ({ name, mtime: fs.statSync(path.join(PROOFS_DIR, name)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  const reports = [];
  for (const candidate of candidates) {
    const report = readJson(path.join(PROOFS_DIR, candidate.name));
    const conditions = new Set(report?.conditions || []);
    if (report && report.mode === 'live' && conditions.has('baseline') && conditions.has('tool')) {
      reports.push({ path: path.join(PROOFS_DIR, candidate.name), report });
    }
  }
  return reports;
}

function pct(value) {
  return `${Number(value).toFixed(1)} %`;
}

function categoryAccuracy(report, category, condition) {
  const scores = (report.scores || []).filter(
    (score) => score.category === category && score.condition === condition,
  );
  if (scores.length === 0) {
    return null;
  }
  return scores.reduce((sum, score) => sum + score.score, 0) / scores.length;
}

function meanTaskScore(report, taskId, condition) {
  const scores = (report.scores || []).filter(
    (score) => score.taskId === taskId && score.condition === condition,
  );
  if (scores.length === 0) {
    return null;
  }
  return scores.reduce((sum, score) => sum + score.score, 0) / scores.length;
}

function coverageRows(summary) {
  if (!summary) {
    return [];
  }
  return Object.entries(summary)
    .filter(([key]) => key !== 'total')
    .map(([key, value]) => ({ file: path.relative(ROOT, key), ...value }))
    .sort((a, b) => a.file.localeCompare(b.file));
}

function buildCoverageSection(summary) {
  if (!summary || !summary.total) {
    return ['_Coverage summary unavailable._', ''];
  }
  const total = summary.total;
  const rows = coverageRows(summary);
  const lines = [];
  lines.push('| Scope | Lines | Statements | Functions | Branches |');
  lines.push('| --- | ---: | ---: | ---: | ---: |');
  lines.push(
    `| **total** | ${pct(total.lines.pct)} | ${pct(total.statements.pct)} | ${pct(total.functions.pct)} | ${pct(total.branches.pct)} |`,
  );
  for (const row of rows) {
    lines.push(
      `| \`${row.file}\` | ${pct(row.lines.pct)} | ${pct(row.statements.pct)} | ${pct(row.functions.pct)} | ${pct(row.branches.pct)} |`,
    );
  }
  lines.push('');
  return lines;
}

function buildBenchmarkSection(report, jsonPath, markdownPath) {
  if (!report) {
    return ['_Benchmark report unavailable._', ''];
  }
  const lines = [];
  lines.push(
    `Provider: \`${report.provider}\` — mode **${report.mode}** — ${report.tasks} tâches — seed ${report.seed}.`,
  );
  lines.push('');
  lines.push('| Condition | Accuracy | Exact match | Mean latency | p50 | p95 | Tokens in/out | Hallucinations |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const stat of report.stats || []) {
    lines.push(
      `| ${stat.condition} | ${(stat.accuracy * 100).toFixed(1)} % | ${(stat.exactMatchRate * 100).toFixed(1)} % | ${stat.meanLatencyMs.toFixed(1)} ms | ${stat.p50LatencyMs.toFixed(1)} ms | ${stat.p95LatencyMs.toFixed(1)} ms | ${stat.inputTokens ?? 0} / ${stat.outputTokens ?? 0} | ${stat.hallucinations} |`,
    );
  }
  lines.push('');

  if (report.delta) {
    const delta = report.delta;
    lines.push('### With vs without Smart-Thinking');
    lines.push('');
    lines.push(
      `- Accuracy delta: **${delta.absolutePp >= 0 ? '+' : ''}${delta.absolutePp} points de pourcentage**` +
        (delta.relativePct === null ? '' : ` (${delta.relativePct >= 0 ? '+' : ''}${delta.relativePct} % relatif)`),
    );
    lines.push(`- Wins / losses / ties (par tâche): **${delta.wins} / ${delta.losses} / ${delta.ties}**`);
    lines.push(`- Sign test binomial exact (two-sided): **p = ${delta.signTestPValue}**`);
    lines.push('');
  }

  lines.push('### Accuracy per category');
  lines.push('');
  lines.push('| Category | Baseline | Tool (+ Smart-Thinking) |');
  lines.push('| --- | ---: | ---: |');
  for (const category of ['arithmetic', 'logic', 'planning', 'factual', 'synthesis']) {
    const baseline = categoryAccuracy(report, category, 'baseline');
    const tool = categoryAccuracy(report, category, 'tool');
    lines.push(
      `| ${category} | ${baseline === null ? '—' : `${(baseline * 100).toFixed(1)} %`} | ${tool === null ? '—' : `${(tool * 100).toFixed(1)} %`} |`,
    );
  }
  lines.push('');

  lines.push('### Task-by-task');
  lines.push('');
  lines.push('| Task | Category | Baseline | Tool | Delta |');
  lines.push('| --- | --- | ---: | ---: | ---: |');
  const taskIds = [...new Set((report.scores || []).map((score) => score.taskId))];
  for (const taskId of taskIds) {
    const baseline = meanTaskScore(report, taskId, 'baseline');
    const tool = meanTaskScore(report, taskId, 'tool');
    const category = (report.scores.find((score) => score.taskId === taskId) || {}).category || '—';
    const delta =
      baseline !== null && tool !== null ? `${tool - baseline >= 0 ? '+' : ''}${(tool - baseline).toFixed(2)}` : '—';
    lines.push(
      `| \`${taskId}\` | ${category} | ${baseline === null ? '—' : baseline.toFixed(2)} | ${tool === null ? '—' : tool.toFixed(2)} | ${delta} |`,
    );
  }
  lines.push('');
  lines.push(`Artifacts: \`${path.relative(ROOT, jsonPath)}\`, \`${path.relative(ROOT, markdownPath)}\`.`);
  lines.push('');
  return lines;
}

function methodSection(report) {
  const lines = [];
  lines.push('## Methodology & limits');
  lines.push('');
  lines.push('### What is measured');
  lines.push('');
  lines.push(
    '- **baseline**: a single completion with no tools. In simulate mode this is a deterministic weak heuristic solver (sums every number found, picks the answer option whose words appear most in the question, emits a generic unordered plan, guesses/refuses facts, merges keywords without checking consistency).',
  );
  lines.push(
    '- **tool**: the SAME weak core plus the REAL Smart-Thinking pipeline running in-process: `createEnvironment` (persistence disabled, search off), `ReasoningOrchestrator`, `MathEvaluator` + `VerificationService` calculation checks, `planner.createPlan` for ordering, and `offlineEvidence` used as a clearly-labelled stand-in for Tavily results.',
  );
  lines.push('');
  lines.push('### Honesty notes');
  lines.push('');
  lines.push(
    '- **simulate mode is a deterministic offline simulation, not a language model.** It exercises the harness and the real pipeline modules; it does not prove how a real LLM would perform. Same seed produces identical answers and scores (timestamps only appear in filenames/report headers).',
  );
  lines.push(
    '- Latency is measured on the current machine and varies between runs; accuracy and scores are the stable metrics.',
  );
  lines.push(
    '- Web search/fetch are disabled unless `TAVILY_API_KEY` is set. The simulate provider never touches the network.',
  );
  lines.push('');
  lines.push('### How to run a real model A/B');
  lines.push('');
  lines.push('```bash');
  lines.push('# OpenCode CLI (model must be provider/model, e.g. anthropic/claude-sonnet-4-5)');
  lines.push('node build/bench/run.js --provider=opencode --model=<provider/model> --conditions=baseline,tool --label=opencode-ab');
  lines.push('');
  lines.push('# Any OpenAI-compatible endpoint');
  lines.push('OPENAI_API_KEY=... node build/bench/run.js --provider=openai --model=gpt-4o-mini --label=openai-ab');
  lines.push('');
  lines.push('# Enable real web tools during the A/B (Tavily)');
  lines.push('TAVILY_API_KEY=... node build/bench/run.js --provider=openai --model=gpt-4o-mini --conditions=baseline,tool');
  lines.push('```');
  lines.push('');
  lines.push(
    '- The grader is deterministic: arithmetic accepts the expected value from the final-answer marker or any matching number (and requires an explicit error statement when the reference declares the chain invalid); multiple-choice tasks accept the expected letter; ordering tasks require the expected order; other tasks use `keyFacts` coverage after accent/case-insensitive normalization.',
  );
  if (report && report.mode === 'simulate') {
    lines.push(
      '- Section 2 (simulate) validates the harness + pipeline integration; section 2bis reports the same 33-task A/B run against real LLMs (reproducible via `npm run bench:ab`).',
    );
  }
  lines.push('');
  return lines;
}

function main() {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
  log('== Smart-Thinking proof run ==');

  log('[1/4] Build...');
  const build = runStep(NPM, ['run', 'build']);
  log(`      exit=${build.status} (${(build.durationMs / 1000).toFixed(1)}s)${build.error ? ` error=${build.error}` : ''}`);

  log('[2/4] Tests + coverage...');
  fs.rmSync(COVERAGE_SUMMARY, { force: true });
  const tests = runStep(NPM, ['test', '--', '--coverage', '--coverageReporters=json-summary']);
  const jest = parseJestSummary(tests.output);
  log(`      exit=${tests.status} | tests: ${jest.tests} | suites: ${jest.suites} (${(tests.durationMs / 1000).toFixed(1)}s)`);
  const coverage = readJson(COVERAGE_SUMMARY);
  if (!coverage) {
    log(`      WARNING: ${path.relative(ROOT, COVERAGE_SUMMARY)} not found.`);
  }

  log('[3/4] Offline benchmark (simulate)...');
  const bench = runStep('node', [
    'build/bench/run.js',
    '--provider=simulate',
    '--label=simulated',
    '--out=proofs',
  ]);
  log(`      exit=${bench.status} (${(bench.durationMs / 1000).toFixed(1)}s)`);
  const benchJsonPath = findLatestBenchmark('simulated');
  const report = benchJsonPath ? readJson(benchJsonPath) : null;
  const benchMarkdownPath = benchJsonPath ? benchJsonPath.replace(/\.json$/, '.md') : null;

  log('[4/4] Writing proofs/PROOFS.md...');
  const lines = [];
  lines.push('# Smart-Thinking v13 — PROOFS');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`Environment: node ${process.version}, ${os.platform()} ${os.release()} (${os.arch()}).`);
  lines.push('');
  lines.push('This document is generated by `node scripts/run-proofs.js` (see `scripts/run-proofs.js`).');
  lines.push('It combines the test/coverage capture with the deterministic offline benchmark.');
  lines.push('');
  lines.push('## 1. Tests & coverage');
  lines.push('');
  lines.push(`- Command: \`${tests.command}\``);
  lines.push(`- Exit code: **${tests.status}**${tests.error ? ` (${tests.error})` : ''}`);
  lines.push(`- Tests: **${jest.tests}**`);
  lines.push(`- Test suites: **${jest.suites}**`);
  const testFailed = tests.status !== 0;
  if (testFailed) {
    lines.push('- **Note:** the test command exited non-zero (failure or coverage threshold). Details are preserved in `coverage/` and the raw output below.');
  }
  lines.push('');
  lines.push(...buildCoverageSection(coverage));
  lines.push('## 2. Benchmark (simulated, offline, deterministic)');
  lines.push('');
  lines.push(...buildBenchmarkSection(report, benchJsonPath || '', benchMarkdownPath || ''));
  const liveReports = findLiveBenchmarks();
  if (liveReports.length > 0) {
    lines.push('## 2bis. Benchmark A/B avec des modèles réels (live)');
    lines.push('');
    lines.push(
      'Campagnes exécutées avec le provider `opencode-http` (API locale d\'opencode, agent isolé sans outils de code). ' +
        'Reproductible avec `npm run bench:ab -- --model=<provider/model>`.',
    );
    lines.push('');
    for (const live of liveReports) {
      lines.push(`### ${live.report.provider}`);
      lines.push('');
      lines.push(...buildBenchmarkSection(live.report, live.path, live.path.replace(/\.json$/, '.md')));
    }
  }
  lines.push('## 3. Raw proof commands');
  lines.push('');
  lines.push('```text');
  lines.push(`$ ${build.command}`);
  lines.push(`exit=${build.status}`);
  lines.push(`$ ${tests.command}`);
  lines.push(`exit=${tests.status}`);
  lines.push(`$ ${bench.command}`);
  lines.push(`exit=${bench.status}`);
  lines.push('```');
  lines.push('');
  lines.push('Jest summary:');
  lines.push('');
  lines.push('```text');
  lines.push(tests.output.trim().split('\n').slice(-40).join('\n'));
  lines.push('```');
  lines.push('');
  lines.push('Benchmark stdout:');
  lines.push('');
  lines.push('```text');
  lines.push(bench.output.trim().split('\n').slice(-40).join('\n'));
  lines.push('```');
  lines.push('');
  lines.push(...methodSection(report));
  lines.push('## Artifacts');
  lines.push('');
  lines.push(`- Coverage summary: \`${path.relative(ROOT, COVERAGE_SUMMARY)}\``);
  if (benchJsonPath) {
    lines.push(`- Benchmark JSON: \`${path.relative(ROOT, benchJsonPath)}\``);
  }
  if (benchMarkdownPath) {
    lines.push(`- Benchmark Markdown: \`${path.relative(ROOT, benchMarkdownPath)}\``);
  }
  for (const live of liveReports) {
    lines.push(`- Live A/B JSON: \`${path.relative(ROOT, live.path)}\``);
  }
  lines.push('');

  fs.writeFileSync(path.join(PROOFS_DIR, 'PROOFS.md'), `${lines.join('\n')}\n`, 'utf8');
  log('      wrote proofs/PROOFS.md');
  log('== done ==');

  if (bench.status !== 0 || !report) {
    process.exitCode = 1;
  }
}

main();
