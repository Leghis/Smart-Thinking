/* Official-style benchmark: deepseek-flash alone vs deepseek-flash + Smart-Thinking MCP.
 * Suites: AIME 2025 (30, numeric) and MMLU-Pro (20, letter). Deterministic grading.
 * Usage: DEEPSEEK_API_KEY=... node scripts/official-bench.cjs [--limit=50] [--concurrency=8]
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const { OpenAICompatibleProvider } = require(path.join(ROOT, 'build/bench/providers.js'));
const { createEnvironment } = require(path.join(ROOT, 'build/server/environment.js'));
const { createSmartThinkingServer } = require(path.join(ROOT, 'build/server/smart-thinking-server.js'));
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { InMemoryTransport } = require('@modelcontextprotocol/sdk/inMemory.js');

const args = new Map(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')));
const LIMIT = Number(args.get('limit') ?? 50);
const CONCURRENCY = Number(args.get('concurrency') ?? 8);
const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) throw new Error('DEEPSEEK_API_KEY requis');

function loadTasks() {
  const tasks = [];
  const aime = JSON.parse(fs.readFileSync('/tmp/ob/aime.json', 'utf8')).rows;
  for (const { row } of aime.slice(0, 30)) {
    tasks.push({
      id: `AIME-${row.id}`,
      suite: 'AIME 2025',
      prompt: `${row.problem}\n\nRéponds avec l'entier final (0 à 999) sur la dernière ligne, sous la forme: ANSWER: <entier>.`,
      expected: String(parseInt(String(row.answer).replace(/[^0-9]/g, ''), 10)),
      kind: 'int',
    });
  }
  const mmlu = JSON.parse(fs.readFileSync('/tmp/ob/mmlu.json', 'utf8')).rows;
  for (const { row } of mmlu.slice(0, 20)) {
    const letters = 'ABCDEFGHIJ';
    const options = (row.options ?? []).map((opt, i) => `${letters[i]}. ${opt}`).join('\n');
    tasks.push({
      id: `MMLUPro-${row.question_id}`,
      suite: 'MMLU-Pro',
      prompt: `${row.question}\n\n${options}\n\nRéponds avec la lettre finale sur la dernière ligne, sous la forme: ANSWER: <lettre>.`,
      expected: String(row.answer).trim(),
      kind: 'letter',
    });
  }
  return tasks.slice(0, LIMIT);
}

function extractAnswer(text, kind) {
  if (!text) return '';
  if (kind === 'int') {
    const matches = text.replace(/,/g, '').match(/\d{1,3}/g);
    return matches ? String(parseInt(matches[matches.length - 1], 10)) : '';
  }
  const tagged = text.match(/ANSWER:\s*([A-J])/i);
  if (tagged) return tagged[1].toUpperCase();
  const letters = text.match(/\b([A-J])\b/g);
  return letters ? letters[letters.length - 1].toUpperCase() : '';
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

const LEAN_SYSTEM = [
  "Tu es un expert. Tu disposes d'outils MCP que tu peux appeler si tu le juges utile.",
  'Vérifie ce qui doit l\'être, puis rends une réponse finale complète et structurée, jamais tronquée, en français.',
].join(' ');

async function runToolTask(client, toolSchemas, provider, task) {
  const messages = [{ role: 'user', content: task.prompt }];
  const started = Date.now();
  let toolCalls = 0;
  let answer = '';
  let inputTokens = 0;
  let outputTokens = 0;
  for (let i = 0; i < 18; i += 1) {
    const remaining = 18 - i;
    const tools = remaining > 2 ? toolSchemas : [];
    const response = await provider.chat({
      system: remaining <= 2 ? `${LEAN_SYSTEM}\nRéponds maintenant.` : LEAN_SYSTEM,
      messages,
      tools,
    });
    inputTokens += response.usage?.promptTokens ?? 0;
    outputTokens += response.usage?.completionTokens ?? 0;
    if (!response.toolCalls || response.toolCalls.length === 0) {
      if (response.text.trim()) {
        answer = response.text.trim();
        break;
      }
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

async function runBaselineTask(provider, task) {
  const started = Date.now();
  const response = await provider.chat({ system: LEAN_SYSTEM, messages: [{ role: 'user', content: task.prompt }], tools: [] });
  return {
    text: response.text.trim(),
    toolCalls: 0,
    latencyMs: Date.now() - started,
    inputTokens: response.usage?.promptTokens ?? 0,
    outputTokens: response.usage?.completionTokens ?? 0,
  };
}

async function main() {
  const tasks = loadTasks();
  const environment = createEnvironment({ persistenceDisabled: true, search: { provider: 'off' }, runtime: { logLevel: 'silent' } });
  const { server } = createSmartThinkingServer(environment, { includePrompts: false, includeResources: false });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'official-bench', version: '1.0.0' });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  const { tools } = await client.listTools();
  const toolSchemas = tools.map(mcpToolToSchema);
  const provider = new OpenAICompatibleProvider({
    baseUrl: 'https://api.deepseek.com',
    apiKey: API_KEY,
    model: 'deepseek-flash',
    timeoutMs: 180000,
    maxTokens: 16384,
    thinking: 'disabled',
    temperature: 0,
  });

  const results = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= tasks.length) return;
      const task = tasks[index];
      try {
        const base = await runBaselineTask(provider, task);
        const withTool = await runToolTask(client, toolSchemas, provider, task);
        results[index] = {
          id: task.id,
          suite: task.suite,
          expected: task.expected,
          kind: task.kind,
          baseline: { ...base, extracted: extractAnswer(base.text, task.kind), correct: extractAnswer(base.text, task.kind) === task.expected },
          tool: { ...withTool, extracted: extractAnswer(withTool.text, task.kind), correct: extractAnswer(withTool.text, task.kind) === task.expected },
        };
        process.stdout.write(`[${results[index].baseline.correct ? 'B+' : 'B-'}${results[index].tool.correct ? 'T+' : 'T-'}] ${task.id}\n`);
      } catch (error) {
        results[index] = { id: task.id, suite: task.suite, expected: task.expected, error: String(error && error.message ? error.message : error) };
        process.stdout.write(`[ERR] ${task.id}: ${results[index].error}\n`);
      }
    }
  });
  await Promise.all(workers);

  const summarize = (rows, key) => {
    const valid = rows.filter(r => !r.error);
    const correct = valid.filter(r => r[key].correct).length;
    const latency = valid.length ? Math.round(valid.reduce((s, r) => s + r[key].latencyMs, 0) / valid.length) : 0;
    const tokens = valid.reduce((s, r) => s + r[key].inputTokens + r[key].outputTokens, 0);
    return { tasks: valid.length, correct, accuracy: valid.length ? Number((correct / valid.length).toFixed(4)) : 0, meanLatencyMs: latency, tokens };
  };
  const bySuite = {};
  for (const suite of [...new Set(tasks.map(t => t.suite))]) {
    const rows = results.filter(r => r && r.suite === suite);
    bySuite[suite] = { baseline: summarize(rows, 'baseline'), tool: summarize(rows, 'tool') };
  }
  const output = {
    date: new Date().toISOString(),
    model: 'deepseek-flash',
    suites: bySuite,
    total: { baseline: summarize(results.filter(Boolean), 'baseline'), tool: summarize(results.filter(Boolean), 'tool') },
    results,
  };
  fs.mkdirSync(path.join(ROOT, 'proofs'), { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(ROOT, 'proofs', `official-bench-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(output, null, 2), 'utf8');
  for (const [suite, stats] of Object.entries(bySuite)) {
    process.stdout.write(`${suite}: baseline ${(stats.baseline.accuracy * 100).toFixed(1)}% (${stats.baseline.correct}/${stats.baseline.tasks}) vs tool ${(stats.tool.accuracy * 100).toFixed(1)}% (${stats.tool.correct}/${stats.tool.tasks}) | latence ${stats.baseline.meanLatencyMs}->${stats.tool.meanLatencyMs}ms | tokens ${stats.baseline.tokens}->${stats.tool.tokens}\n`);
  }
  const t = output.total;
  process.stdout.write(`TOTAL: baseline ${(t.baseline.accuracy * 100).toFixed(1)}% vs tool ${(t.tool.accuracy * 100).toFixed(1)}% | JSON: ${file}\n`);
  await client.close();
  await server.close();
}

main().catch(error => {
  process.stderr.write(`${error && error.stack ? error.stack : error}\n`);
  process.exitCode = 1;
});
