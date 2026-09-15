/* GCP remote benchmark harness: deepseek-flash alone vs deepseek-flash + Smart-Thinking MCP.
 * Suites: AIME 2025, MMLU-Pro (replay), HMMT 2025, SimpleQA (Tavily search enabled), LiveCodeBench.
 * Deterministic grading. Designed to run on the GCP VM (repo at /opt/st, harness at /opt/bench).
 * Usage: DEEPSEEK_API_KEY=... TAVILY_API_KEY=... node gcp-remote-bench.cjs --out=/opt/st/proofs/gcp/reasoning
 */
const fs = require('node:fs');
const path = require('node:path');

const ST_ROOT = process.env.ST_ROOT || '/opt/st';
const { OpenAICompatibleProvider } = require(path.join(ST_ROOT, 'build/bench/providers.js'));
const { createEnvironment } = require(path.join(ST_ROOT, 'build/server/environment.js'));
const { createSmartThinkingServer } = require(path.join(ST_ROOT, 'build/server/smart-thinking-server.js'));
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { InMemoryTransport } = require('@modelcontextprotocol/sdk/inMemory.js');

const args = new Map(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const CONCURRENCY = Number(args.get('concurrency') ?? 8);
const OUT = args.get('out') ?? path.join(ST_ROOT, 'proofs/gcp/reasoning');
const LIMITS = {
  aime: Number(args.get('limit-aime') ?? 30),
  mmlu: Number(args.get('limit-mmlu') ?? 20),
  hmml: Number(args.get('limit-hmmt') ?? 30),
  simpleqa: Number(args.get('limit-simpleqa') ?? 30),
  lcb: Number(args.get('limit-lcb') ?? 20),
};
const API_KEY = process.env.DEEPSEEK_API_KEY;
const TAVILY_KEY = process.env.TAVILY_API_KEY || '';
if (!API_KEY) throw new Error('DEEPSEEK_API_KEY requis');

fs.mkdirSync(OUT, { recursive: true });

function log(...parts) {
  const line = `[${new Date().toISOString().slice(11, 19)}] ${parts.join(' ')}`;
  process.stdout.write(`${line}\n`);
}

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

function parseCsv(text) {
  const rows = [];
  let field = '';
  let row = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else { quoted = false; }
      } else { field += ch; }
    } else if (ch === '"') { quoted = true; }
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (ch !== '\r') { field += ch; }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  const header = rows.shift();
  return rows.filter(r => r.length === header.length).map(r => Object.fromEntries(header.map((h, i) => [h, r[i]])));
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(array, seed) {
  const rand = mulberry32(seed);
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

async function loadAime(limit) {
  const data = await fetchJson('https://datasets-server.huggingface.co/rows?dataset=yentinglin%2Faime_2025&config=default&split=train&offset=0&length=100');
  return data.rows.slice(0, limit).map(({ row }) => ({
    id: `AIME-${row.id}`,
    suite: 'AIME 2025',
    kind: 'int',
    prompt: `${row.problem}\n\nRéponds avec l'entier final (0 à 999) sur la dernière ligne, sous la forme: ANSWER: <entier>.`,
    expected: String(parseInt(String(row.answer).replace(/[^0-9]/g, ''), 10)),
  }));
}

async function loadMmlu(limit) {
  const data = await fetchJson('https://datasets-server.huggingface.co/rows?dataset=TIGER-Lab%2FMMLU-Pro&config=default&split=test&offset=0&length=100');
  const letters = 'ABCDEFGHIJ';
  return data.rows.slice(0, limit).map(({ row }) => {
    const options = (row.options ?? []).map((opt, i) => `${letters[i]}. ${opt}`).join('\n');
    return {
      id: `MMLUPro-${row.question_id}`,
      suite: 'MMLU-Pro',
      kind: 'letter',
      prompt: `${row.question}\n\n${options}\n\nRéponds avec la lettre finale sur la dernière ligne, sous la forme: ANSWER: <lettre>.`,
      expected: String(row.answer).trim(),
    };
  });
}

async function loadHmmt(limit) {
  const data = await fetchJson('https://datasets-server.huggingface.co/rows?dataset=MathArena%2Fhmmt_feb_2025&config=default&split=train&offset=0&length=100');
  return data.rows.slice(0, limit).map(({ row }) => ({
    id: `HMMT-${row.problem_idx}`,
    suite: 'HMMT 2025',
    kind: 'num',
    prompt: `${row.problem}\n\nRéponds avec la valeur numérique finale sur la dernière ligne, sous la forme: ANSWER: <valeur>.`,
    expected: String(row.answer).trim(),
  }));
}

async function loadSimpleQa(limit) {
  const res = await fetch('https://huggingface.co/datasets/basicv8vc/SimpleQA/resolve/main/simple_qa_test_set.csv', { signal: AbortSignal.timeout(120000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} SimpleQA`);
  const rows = parseCsv(await res.text());
  const tasks = seededShuffle(rows, 13).slice(0, limit).map((row, i) => ({
    id: `SimpleQA-${i}`,
    suite: 'SimpleQA',
    kind: 'short',
    prompt: `${row.problem}\n\nGive a short, direct answer. If you are unsure, still commit to your best answer. End with a final line: ANSWER: <answer>.`,
    expected: String(row.answer).trim(),
  }));
  return tasks;
}

async function loadLcb(limit) {
  if (limit <= 0) return [];
  // Le fichier officiel fait ~1,25 Go : telechargement en flux, plafonne en octets, avec retentatives.
  const url = 'https://huggingface.co/datasets/livecodebench/code_generation_lite/resolve/main/test.jsonl';
  const BYTE_CAP = 400 * 1024 * 1024;
  let res = null;
  for (let attempt = 1; attempt <= 3 && !res; attempt += 1) {
    try {
      const candidate = await fetch(url, { signal: AbortSignal.timeout(600000) });
      if (candidate.ok && candidate.body) res = candidate;
      else log(`LCB tentative ${attempt}: HTTP ${candidate.status}`);
    } catch (error) {
      log(`LCB tentative ${attempt} echouee: ${String(error && error.message ? error.message : error).split('\n')[0]}`);
    }
    if (!res && attempt < 3) await new Promise(resolve => setTimeout(resolve, 5000 * attempt));
  }
  if (!res) throw new Error('LiveCodeBench: telechargement impossible apres 3 tentatives');
  const decoder = new TextDecoder();
  let buffer = '';
  let bytes = 0;
  const tasks = [];
  const seen = new Set();
  for await (const chunk of res.body) {
    bytes += chunk.length;
    buffer += decoder.decode(chunk, { stream: true });
    let index = buffer.indexOf('\n');
    while (index >= 0 && tasks.length < limit * 3) {
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      index = buffer.indexOf('\n');
      if (!line.trim()) continue;
      let row;
      try { row = JSON.parse(line); } catch { continue; }
      let cases = [];
      try { cases = JSON.parse(row.public_test_cases ?? '[]'); } catch { cases = []; }
      const stdinCases = cases.filter(c => c.testtype === 'stdin' && typeof c.input === 'string' && typeof c.output === 'string').slice(0, 3);
      if (stdinCases.length === 0 || seen.has(row.question_id)) continue;
      if (tasks.length >= limit) break;
      seen.add(row.question_id);
      tasks.push({
        id: `LCB-${row.question_id}`,
        suite: 'LiveCodeBench',
        kind: 'code',
        difficulty: row.difficulty,
        prompt: [
          'Solve this competitive programming problem in Python 3.',
          'The solution must read from stdin and write to stdout.',
          'Return the complete solution in a single ```python code block.',
          '',
          `Title: ${row.question_title}`,
          '',
          row.question_content,
          row.starter_code ? `\nStarter code:\n${row.starter_code}` : '',
        ].join('\n'),
        tests: stdinCases,
      });
    }
    if (tasks.length >= limit) break;
    if (bytes >= BYTE_CAP) {
      log(`LCB: plafond ${Math.round(BYTE_CAP / 1048576)} Mo atteint, ${tasks.length} taches exploitables`);
      break;
    }
  }
  log(`LCB: ${tasks.length} taches (${Math.round(bytes / 1048576)} Mo lus)`);
  return tasks;
}

function normalizeOutput(text) {
  return String(text ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.replace(/\s+$/g, ''))
    .join('\n')
    .replace(/\n+$/g, '');
}

function extractAnswer(text, kind) {
  if (!text) return '';
  if (kind === 'int') {
    const matches = String(text).replace(/,/g, '').match(/\d{1,4}/g);
    return matches ? String(parseInt(matches[matches.length - 1], 10)) : '';
  }
  if (kind === 'num') {
    const cleaned = String(text).replace(/,/g, '').replace(/\$/g, '');
    const matches = cleaned.match(/-?\d+(?:\.\d+)?/g);
    return matches ? matches[matches.length - 1] : '';
  }
  if (kind === 'letter') {
    const tagged = String(text).match(/ANSWER:\s*([A-J])/i);
    if (tagged) return tagged[1].toUpperCase();
    const letters = String(text).match(/\b([A-J])\b/g);
    return letters ? letters[letters.length - 1].toUpperCase() : '';
  }
  if (kind === 'short') {
    const tagged = String(text).match(/ANSWER:\s*(.+)/i);
    return (tagged ? tagged[1] : String(text)).trim();
  }
  return '';
}

function normalizeShort(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\b(a|an|the)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function gradeShort(expected, text) {
  const normExpected = normalizeShort(expected);
  if (!normExpected) return false;
  const tagged = String(text ?? '').match(/ANSWER:\s*(.+)/i);
  const target = normalizeShort(tagged ? tagged[1] : text);
  if (!target) return false;
  if (target === normExpected) return true;
  const expTokens = normExpected.split(' ');
  const targetTokens = target.split(' ');
  if (expTokens.length === 1) {
    if (targetTokens.includes(expTokens[0])) return true;
    const digits = expTokens[0].replace(/\D/g, '');
    if (digits.length >= 3 && target.replace(/\D/g, '').includes(digits)) return true;
    return false;
  }
  if (normExpected.length >= 4 && target.includes(normExpected)) return true;
  const digits = normExpected.replace(/\D/g, '');
  if (digits && digits.length >= 3 && target.replace(/\D/g, '').includes(digits)) return true;
  return false;
}

function extractCode(text) {
  const blocks = [...String(text ?? '').matchAll(/```(?:python|py)?\s*\n([\s\S]*?)```/gi)];
  if (blocks.length > 0) return blocks[blocks.length - 1][1];
  return String(text ?? '');
}

function gradeTask(task, text) {
  if (task.kind === 'code') return false; // graded later by execution
  if (task.kind === 'short') return gradeShort(task.expected, text);
  return extractAnswer(text, task.kind) === task.expected;
}

function mcpToolToSchema(tool) {
  return { name: tool.name, description: tool.description ?? '', parameters: tool.inputSchema ?? { type: 'object', properties: {} } };
}

async function callMcp(client, name, toolArgs) {
  try {
    const result = await client.callTool({ name, arguments: toolArgs });
    if (result.structuredContent) return JSON.stringify(result.structuredContent).slice(0, 16000);
    return (result.content ?? []).map(p => p.text ?? '').join('\n').slice(0, 16000);
  } catch (error) {
    return JSON.stringify({ error: String(error && error.message ? error.message : error) });
  }
}

const SYSTEMS = {
  math: [
    "Tu es un expert. Tu disposes d'outils MCP que tu peux appeler si tu le juges utile.",
    'Vérifie ce qui doit l\'être, puis rends une réponse finale complète et structurée, jamais tronquée, en français.',
  ].join(' '),
  factual: [
    "Tu es un expert factuel. Tu disposes d'outils MCP (recherche web Tavily, vérification) que tu dois utiliser pour vérifier chaque fait.",
    'Effectue les recherches nécessaires, cite tes sources, puis rends une réponse finale complète, jamais tronquée.',
  ].join(' '),
  code: [
    "Tu es un expert en algorithmique. Tu disposes d'outils MCP que tu peux appeler si tu le juges utile (calculs exacts, vérification).",
    'Rends une solution finale complète en Python 3 dans un unique bloc ```python.',
  ].join(' '),
};

const BASELINE_SYSTEMS = {
  math: 'Tu es un expert. Réponds directement à la question, de façon complète et structurée, en français. Termine par la ligne demandée.',
  factual: 'Tu es un expert factuel. Réponds directement à la question avec ta meilleure réponse courte. Termine par la ligne demandée.',
  code: 'Tu es un expert en algorithmique. Rends une solution finale complète en Python 3 dans un unique bloc ```python.',
};

async function withRetry(fn, attempts = 3) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try { return await fn(); } catch (error) {
      lastError = error;
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
  throw lastError;
}

async function runBaseline(provider, task, system) {
  const started = Date.now();
  const response = await withRetry(() => provider.chat({ system, messages: [{ role: 'user', content: task.prompt }], tools: [] }));
  return {
    text: (response.text ?? '').trim(),
    toolCalls: 0,
    latencyMs: Date.now() - started,
    inputTokens: response.inputTokens ?? 0,
    outputTokens: response.outputTokens ?? 0,
  };
}

async function runToolTask(client, toolSchemas, provider, task, system, maxIters) {
  const messages = [{ role: 'user', content: task.prompt }];
  const started = Date.now();
  let toolCalls = 0;
  let answer = '';
  let inputTokens = 0;
  let outputTokens = 0;
  for (let i = 0; i < maxIters; i += 1) {
    const remaining = maxIters - i;
    const tools = remaining > 2 ? toolSchemas : [];
    const response = await withRetry(() => provider.chat({
      system: remaining <= 2 ? `${system}\nRéponds maintenant.` : system,
      messages,
      tools,
    }));
    inputTokens += response.inputTokens ?? 0;
    outputTokens += response.outputTokens ?? 0;
    if (!response.toolCalls || response.toolCalls.length === 0) {
      if ((response.text ?? '').trim()) { answer = response.text.trim(); break; }
      if (i > 0) break;
      messages.push({ role: 'user', content: 'Réponds à la question.' });
      continue;
    }
    messages.push({ role: 'assistant', content: response.text, toolCalls: response.toolCalls });
    for (const call of response.toolCalls) {
      toolCalls += 1;
      const output = await callMcp(client, call.name, call.arguments ?? {});
      messages.push({ role: 'tool', content: output, toolCallId: call.id });
    }
  }
  return { text: answer, toolCalls, latencyMs: Date.now() - started, inputTokens, outputTokens };
}

function summarize(rows, key) {
  const valid = rows.filter(r => !r.error);
  const correct = valid.filter(r => r[key].correct).length;
  const latency = valid.length ? Math.round(valid.reduce((s, r) => s + r[key].latencyMs, 0) / valid.length) : 0;
  const tokens = valid.reduce((s, r) => s + r[key].inputTokens + r[key].outputTokens, 0);
  return { tasks: valid.length, correct, accuracy: valid.length ? Number((correct / valid.length).toFixed(4)) : 0, meanLatencyMs: latency, tokens };
}

async function runSuite({ provider, client, toolSchemas, suite, tasks, system, baseSystem, maxIters }) {
  log(`SUITE ${suite}: ${tasks.length} taches`);
  const results = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= tasks.length) return;
      const task = tasks[index];
      try {
        const base = await runBaseline(provider, task, baseSystem ?? system);
        const tool = await runToolTask(client, toolSchemas, provider, task, system, maxIters);
        const row = {
          id: task.id,
          suite: suite,
          kind: task.kind,
          expected: task.expected,
          detail: task.detail,
          baseline: { ...base, extracted: extractAnswer(base.text, task.kind), correct: gradeTask(task, base.text) },
          tool: { ...tool, extracted: extractAnswer(tool.text, task.kind), correct: gradeTask(task, tool.text) },
        };
        row.toolCode = task.kind === 'code' ? extractCode(tool.text) : undefined;
        row.baseCode = task.kind === 'code' ? extractCode(base.text) : undefined;
        row.tests = task.tests;
        results[index] = row;
        process.stdout.write(`[${row.baseline.correct ? 'B+' : 'B-'}${row.tool.correct ? 'T+' : 'T-'}] ${task.id}\n`);
      } catch (error) {
        results[index] = { id: task.id, suite, expected: task.expected, error: String(error && error.message ? error.message : error) };
        process.stdout.write(`[ERR] ${task.id}: ${results[index].error}\n`);
      }
    }
  });
  await Promise.all(workers);
  return results;
}

class DockerRunner {
  constructor(workdir) {
    this.workdir = workdir;
    this.name = 'st-lcb';
    this.available = false;
  }

  static exec(command, timeoutMs = 60000) {
    const { execSync } = require('node:child_process');
    return execSync(command, { encoding: 'utf8', timeout: timeoutMs, stdio: ['ignore', 'pipe', 'pipe'] });
  }

  start() {
    try {
      fs.mkdirSync(this.workdir, { recursive: true });
      DockerRunner.exec(`docker rm -f ${this.name} >/dev/null 2>&1 || true`);
      DockerRunner.exec(`docker run -d --name ${this.name} -v ${this.workdir}:/work python:3.12-slim sleep infinity`, 600000);
      DockerRunner.exec(`docker exec ${this.name} python3 --version`, 60000);
      this.available = true;
      log('LCB docker: disponible');
    } catch (error) {
      this.available = false;
      log(`LCB docker indisponible: ${String(error.message).split('\n')[0]}`);
    }
  }

  runTest(code, input, expected, timeoutMs = 15000) {
    const fsSync = require('node:fs');
    fsSync.writeFileSync(path.join(this.workdir, 'main.py'), code, 'utf8');
    fsSync.writeFileSync(path.join(this.workdir, 'input.txt'), input, 'utf8');
    let stdout = '';
    try {
      stdout = DockerRunner.exec(`docker exec ${this.name} sh -c 'timeout 10 python3 /work/main.py < /work/input.txt'`, timeoutMs);
    } catch (error) {
      stdout = error.stdout ?? '';
      if (!stdout) return { pass: false, reason: 'runtime-error' };
    }
    return { pass: normalizeOutput(stdout) === normalizeOutput(expected), reason: '' };
  }

  stop() {
    if (!this.available) return;
    try { DockerRunner.exec(`docker rm -f ${this.name}`, 60000); } catch { /* ignore */ }
  }
}

async function gradeCodeSuite(results, workdir) {
  const docker = new DockerRunner(workdir);
  docker.start();
  if (!docker.available) {
    for (const row of results) {
      if (!row || row.error) continue;
      row.baseline.correct = false;
      row.tool.correct = false;
      row.graderNote = 'docker indisponible';
    }
    return;
  }
  for (const row of results) {
    if (!row || row.error) continue;
    const tests = row.tests ?? [];
    const runAll = (code) => {
      if (!code || !code.trim()) return { correct: false, passed: 0, total: tests.length };
      let passed = 0;
      for (const test of tests) {
        const outcome = docker.runTest(code, test.input, test.output);
        if (outcome.pass) passed += 1;
        else if (outcome.reason === 'runtime-error') return { correct: false, passed, total: tests.length };
      }
      return { correct: tests.length > 0 && passed === tests.length, passed, total: tests.length };
    };
    const base = runAll(row.baseCode);
    const tool = runAll(row.toolCode);
    row.baseline.correct = base.correct;
    row.tool.correct = tool.correct;
    row.detail = `base ${base.passed}/${base.total} | tool ${tool.passed}/${tool.total}`;
    process.stdout.write(`[code ${row.id}] base ${base.passed}/${base.total} tool ${tool.passed}/${tool.total}\n`);
  }
  docker.stop();
}

async function main() {
  const environment = createEnvironment({
    persistenceDisabled: true,
    search: TAVILY_KEY
      ? { provider: 'tavily', tavilyApiKey: TAVILY_KEY }
      : { provider: 'off' },
    runtime: { logLevel: 'silent' },
  });
  const { server } = createSmartThinkingServer(environment, { includePrompts: false, includeResources: false });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'gcp-remote-bench', version: '1.0.0' });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const { tools } = await client.listTools();
  const toolSchemas = tools.map(mcpToolToSchema);
  const provider = new OpenAICompatibleProvider({
    baseUrl: 'https://api.deepseek.com',
    apiKey: API_KEY,
    model: 'deepseek-flash',
    timeoutMs: 300000,
    maxTokens: 16384,
    thinking: 'disabled',
    temperature: 0,
  });

  const suites = [];
  try {
    const aime = await loadAime(LIMITS.aime);
    suites.push({ suite: 'AIME 2025', tasks: aime, system: SYSTEMS.math, baseSystem: BASELINE_SYSTEMS.math, maxIters: 18 });
    log(`AIME 2025: ${aime.length} taches`);
  } catch (error) { log(`AIME load error: ${error.message}`); }
  try {
    const mmlu = await loadMmlu(LIMITS.mmlu);
    suites.push({ suite: 'MMLU-Pro', tasks: mmlu, system: SYSTEMS.math, baseSystem: BASELINE_SYSTEMS.math, maxIters: 18 });
    log(`MMLU-Pro: ${mmlu.length} taches`);
  } catch (error) { log(`MMLU load error: ${error.message}`); }
  try {
    const hmml = await loadHmmt(LIMITS.hmml);
    suites.push({ suite: 'HMMT 2025', tasks: hmml, system: SYSTEMS.math, baseSystem: BASELINE_SYSTEMS.math, maxIters: 18 });
    log(`HMMT 2025: ${hmml.length} taches`);
  } catch (error) { log(`HMMT load error: ${error.message}`); }
  try {
    const simpleqa = await loadSimpleQa(LIMITS.simpleqa);
    suites.push({ suite: 'SimpleQA', tasks: simpleqa, system: SYSTEMS.factual, baseSystem: BASELINE_SYSTEMS.factual, maxIters: 12 });
    log(`SimpleQA: ${simpleqa.length} taches (tavily=${TAVILY_KEY ? 'oui' : 'non'})`);
  } catch (error) { log(`SimpleQA load error: ${error.message}`); }
  try {
    const lcb = await loadLcb(LIMITS.lcb);
    suites.push({ suite: 'LiveCodeBench', tasks: lcb, system: SYSTEMS.code, baseSystem: BASELINE_SYSTEMS.code, maxIters: 10, code: true });
    log(`LiveCodeBench: ${lcb.length} taches`);
  } catch (error) { log(`LCB load error: ${error.message}`); }

  const output = { date: new Date().toISOString(), model: 'deepseek-flash', suites: {}, results: [] };
  for (const { suite, tasks, system, baseSystem, maxIters, code } of suites) {
    const rows = await runSuite({ provider, client, toolSchemas, suite, tasks, system, baseSystem, maxIters });
    if (code) await gradeCodeSuite(rows, path.join(OUT, 'lcb-work'));
    output.suites[suite] = { baseline: summarize(rows, 'baseline'), tool: summarize(rows, 'tool') };
    output.results.push(...rows.filter(Boolean).map(r => ({
      ...r,
      baseCode: undefined,
      toolCode: undefined,
      tests: undefined,
      code: code ? { base: r.baseCode, tool: r.toolCode } : undefined,
    })));
    fs.writeFileSync(path.join(OUT, `${suite.replace(/[^A-Za-z0-9]+/g, '-')}.json`), JSON.stringify(rows, null, 2));
    const stats = output.suites[suite];
    log(`${suite}: baseline ${(stats.baseline.accuracy * 100).toFixed(1)}% (${stats.baseline.correct}/${stats.baseline.tasks}) vs tool ${(stats.tool.accuracy * 100).toFixed(1)}% (${stats.tool.correct}/${stats.tool.tasks}) | latence ${stats.baseline.meanLatencyMs}->${stats.tool.meanLatencyMs}ms`);
    fs.writeFileSync(path.join(OUT, 'summary.partial.json'), JSON.stringify(output, null, 2));
  }

  const all = output.results.filter(r => !r.error);
  output.total = { baseline: summarize(all, 'baseline'), tool: summarize(all, 'tool') };
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(output, null, 2));
  const lines = [];
  for (const [suite, stats] of Object.entries(output.suites)) {
    lines.push(`${suite}: baseline ${(stats.baseline.accuracy * 100).toFixed(1)}% (${stats.baseline.correct}/${stats.baseline.tasks}) vs tool ${(stats.tool.accuracy * 100).toFixed(1)}% (${stats.tool.correct}/${stats.tool.tasks}) | latence ${stats.baseline.meanLatencyMs}->${stats.tool.meanLatencyMs}ms | tokens ${stats.baseline.tokens}->${stats.tool.tokens}`);
  }
  lines.push(`TOTAL: baseline ${(output.total.baseline.accuracy * 100).toFixed(1)}% vs tool ${(output.total.tool.accuracy * 100).toFixed(1)}%`);
  fs.writeFileSync(path.join(OUT, 'summary.txt'), `${lines.join('\n')}\n`);
  log(lines.join('\n'));
  await client.close();
  await server.close();
}

main().catch(error => {
  process.stderr.write(`${error && error.stack ? error.stack : error}\n`);
  process.exitCode = 1;
});
