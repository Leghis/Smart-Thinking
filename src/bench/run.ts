#!/usr/bin/env node
/**
 * v13 benchmark CLI.
 *
 * Usage:
 *   node build/bench/run.js [--provider=simulate|openai|opencode] [--model=...]
 *     [--base-url=...] [--api-key=...] [--conditions=baseline,tool]
 *     [--category=...] [--limit=N] [--repeat=N] [--out=proofs/] [--label=name]
 *
 * The simulate provider is a deterministic offline simulation (no network).
 * Real providers are opt-in; TAVILY_API_KEY (or the provider's own tooling)
 * enables web search/fetch, otherwise the agent runs fully offline.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  createEnvironment,
  resetSmartThinkingEnvironment,
  type SmartThinkingEnvironment,
} from '../server/environment';
import { selectTasks, getBenchTasks } from './datasets';
import { gradeAnswer } from './grader';
import {
  createSimulateBaselineProvider,
  createSimulateToolProvider,
  hashString,
} from './simulate';
import { OpenCodeCliProvider, OpenCodeHttpProvider, OpenAICompatibleProvider } from './providers';
import { runBaseline, runToolLoop } from './agent-runner';
import { buildReport, renderJson, renderMarkdown } from './report';
import type {
  BenchCategory,
  BenchReport,
  BenchTask,
  CliOptions,
  Condition,
  ModelProvider,
  RunResult,
  TaskScore,
} from './types';

const BENCH_SEED = 1337;
const CATEGORIES: BenchCategory[] = ['arithmetic', 'logic', 'planning', 'factual', 'synthesis'];

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  runBenchmark(options).catch(error => {
    process.stderr.write(`benchmark failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    try {
      resetSmartThinkingEnvironment();
    } catch {
      // Best-effort cleanup only.
    }
    process.exitCode = 1;
  });
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    provider: 'simulate',
    conditions: ['baseline', 'tool'],
    repeat: 1,
    out: 'proofs',
    label: 'default',
  };

  for (const arg of argv) {
    const [rawKey, ...rest] = arg.replace(/^--/, '').split('=');
    const value = rest.join('=');
    switch (rawKey) {
      case 'provider':
        if (value !== 'simulate' && value !== 'openai' && value !== 'opencode' && value !== 'opencode-cli') {
          throw new Error(`--provider invalide: ${value}`);
        }
        options.provider = value;
        break;
      case 'server-url':
        options.serverUrl = value;
        break;
      case 'model':
        options.model = value;
        break;
      case 'base-url':
        options.baseUrl = value;
        break;
      case 'api-key':
        options.apiKey = value;
        break;
      case 'conditions':
        options.conditions = parseConditions(value);
        break;
      case 'category': {
        if (!CATEGORIES.includes(value as BenchCategory)) {
          throw new Error(`--category invalide: ${value}`);
        }
        options.category = value as BenchCategory;
        break;
      }
      case 'prefix':
        options.prefix = value;
        break;
      case 'limit':
        options.limit = Number.parseInt(value, 10);
        break;
      case 'repeat':
        options.repeat = Math.max(1, Number.parseInt(value, 10) || 1);
        break;
      case 'out':
        options.out = value;
        break;
      case 'label':
        options.label = value || 'default';
        break;
      default:
        throw new Error(`Option inconnue: ${arg}`);
    }
  }
  return options;
}

function parseConditions(value: string): Condition[] {
  const conditions = value
    .split(',')
    .map(entry => entry.trim())
    .filter((entry): entry is Condition => entry === 'baseline' || entry === 'tool');
  if (conditions.length === 0) {
    throw new Error('--conditions doit contenir baseline et/ou tool');
  }
  return [...new Set(conditions)];
}

async function runBenchmark(options: CliOptions): Promise<void> {
  const tasks = selectTasks({ category: options.category, prefix: options.prefix, limit: options.limit });
  if (tasks.length === 0) {
    throw new Error('Aucune tâche sélectionnée.');
  }

  const enableWeb = Boolean(process.env.TAVILY_API_KEY);

  // Validate/build providers before creating any environment so a missing key
  // fails fast without leaving the cleanup interval of VerificationMemory open.
  const providerFor = buildProviderFactory(options);
  const providerLabel = options.provider === 'simulate' ? 'simulate (offline)' : providerFor('baseline').name;
  const environment =
    options.provider === 'simulate' ? undefined : createBenchEnvironment(enableWeb);

  try {
    const results: RunResult[] = [];
    const scores: TaskScore[] = [];
    const generatedAt = new Date();

    for (const condition of options.conditions) {
      for (const task of tasks) {
        for (let repeat = 0; repeat < options.repeat; repeat += 1) {
          const seed = hashString(`${task.id}:${condition}:${BENCH_SEED}`);
          const result = await runOne(providerFor(condition), environment, task, condition, {
            seed,
            enableWeb,
          });
          results.push(result);
          scores.push(gradeAnswer(task, result.answer, condition));
        }
        process.stdout.write('.');
      }
    }
    process.stdout.write('\n');

    const report = buildReport({
      label: options.label,
      provider: providerLabel,
      mode: options.provider === 'simulate' ? 'simulate' : 'live',
      seed: BENCH_SEED,
      conditions: options.conditions,
      results,
      scores,
      notes: buildNotes(options, enableWeb),
    });

    const { jsonPath, markdownPath } = writeReports(options, report, tasks, generatedAt);
    printSummary(report, jsonPath, markdownPath);
  } finally {
    try {
      await providerFor('baseline').dispose?.();
    } catch {
      // Best-effort provider shutdown.
    }
  }

  // VerificationMemory installs an unref'd-less cleanup interval (source bug:
  // src/verification-memory.ts:105), which keeps the event loop alive. Stop it
  // explicitly so this CLI exits naturally without process.exit().
  try {
    resetSmartThinkingEnvironment();
  } catch {
    // Best-effort cleanup only.
  }
}

interface RunOneOptions {
  seed: number;
  enableWeb: boolean;
}

async function runOne(
  provider: ModelProvider,
  environment: SmartThinkingEnvironment | undefined,
  task: BenchTask,
  condition: Condition,
  options: RunOneOptions,
): Promise<RunResult> {
  if (condition === 'baseline') {
    return runBaseline(provider, task, { seed: options.seed, enableWeb: options.enableWeb });
  }
  if (provider.agentic && environment) {
    return runToolLoop(provider, environment, task, {
      seed: options.seed,
      enableWeb: options.enableWeb,
    });
  }
  // Simulated tool provider: generate() already runs the real pipeline.
  const started = Date.now();
  try {
    const response = await provider.generate({
      system: 'Benchmark tool condition (pipeline in-process).',
      messages: [{ role: 'user', content: buildSimulatePrompt(task) }],
    });
    return {
      taskId: task.id,
      category: task.category,
      condition: 'tool',
      provider: provider.name,
      answer: response.text.trim(),
      latencyMs: response.latencyMs || Date.now() - started,
      inputTokens: response.inputTokens,
      outputTokens: response.outputTokens,
      seed: options.seed,
      raw: response.meta,
    };
  } catch (error) {
    return {
      taskId: task.id,
      category: task.category,
      condition: 'tool',
      provider: provider.name,
      answer: '',
      latencyMs: Date.now() - started,
      seed: options.seed,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildSimulatePrompt(task: BenchTask): string {
  return `Question : ${task.question}\nRéponds de façon concise.`;
}

function buildProviderFactory(options: CliOptions): (condition: Condition) => ModelProvider {
  if (options.provider === 'simulate') {
    const allTasks = getBenchTasks();
    const baseline = createSimulateBaselineProvider(allTasks);
    const tool = createSimulateToolProvider(allTasks, {
      dataDir: path.join(os.tmpdir(), 'smart-thinking-bench-sim'),
    });
    return condition => (condition === 'baseline' ? baseline : tool);
  }
  let provider: ModelProvider | undefined;
  return () => {
    if (!provider) {
      provider = buildRealProvider(options);
    }
    return provider;
  };
}

function buildRealProvider(options: CliOptions): ModelProvider {
  if (options.provider === 'opencode-cli') {
    return new OpenCodeCliProvider({ model: options.model });
  }
  if (options.provider === 'opencode') {
    if (!options.model) {
      throw new Error('--model requis pour --provider=opencode (ex: --model=deepseek/deepseek-flash)');
    }
    return new OpenCodeHttpProvider({
      model: options.model,
      serverUrl: options.serverUrl,
    });
  }
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('--api-key ou OPENAI_API_KEY requis pour --provider=openai');
  }
  if (!options.model) {
    throw new Error('--model requis pour --provider=openai');
  }
  return new OpenAICompatibleProvider({
    baseUrl: options.baseUrl ?? process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
    apiKey,
    model: options.model,
  });
}

function createBenchEnvironment(enableWeb: boolean): SmartThinkingEnvironment {
  return createEnvironment({
    dataDir: path.join(os.tmpdir(), 'smart-thinking-bench'),
    persistenceDisabled: true,
    search: { provider: enableWeb ? 'auto' : 'off' },
    runtime: { logLevel: 'silent' },
  });
}

function buildNotes(options: CliOptions, enableWeb: boolean): string[] {
  const notes: string[] = [];
  if (options.provider === 'simulate') {
    notes.push(
      'Mode simulate: simulation offline déterministe (aucun appel réseau, aucun modèle réel). Le seed dérive de l\'id de tâche; les métriques de latence dépendent de la machine.',
    );
    notes.push(
      'Condition tool: même noyau faible que baseline, augmenté du pipeline Smart-Thinking réel (environment, orchestrator, MathEvaluator, VerificationService, planner) avec offlineEvidence comme substitut Tavily.',
    );
  } else {
    notes.push(
      enableWeb
        ? 'TAVILY_API_KEY détecté: les outils web_search/fetch peuvent accéder au réseau.'
        : 'Aucune TAVILY_API_KEY: web_search/fetch restent hors ligne et les prompts ne demandent pas de recherche web.',
    );
    notes.push(
      `Provider réel: ${options.provider} (résultats non déterministes). Agent opencode isolé: aucun outil de code, aucun accès au dépôt.`,
    );
  }
  if (options.conditions.length < 2) {
    notes.push('Une seule condition exécutée: le delta baseline → tool est absent.');
  }
  return notes;
}

function writeReports(
  options: CliOptions,
  report: BenchReport,
  tasks: BenchTask[],
  generatedAt: Date,
): { jsonPath: string; markdownPath: string } {
  const stamp = formatTimestamp(generatedAt);
  const outDir = path.resolve(options.out);
  mkdirSync(outDir, { recursive: true });
  const base = path.join(outDir, `benchmark-${options.label}-${stamp}`);
  const jsonPath = `${base}.json`;
  const markdownPath = `${base}.md`;
  const tasksById = new Map(tasks.map(task => [task.id, { question: task.question, difficulty: task.difficulty }]));
  writeFileSync(jsonPath, renderJson(report), 'utf8');
  writeFileSync(markdownPath, renderMarkdown(report, tasksById), 'utf8');
  return { jsonPath, markdownPath };
}

function printSummary(report: BenchReport, jsonPath: string, markdownPath: string): void {
  const lines: string[] = [];
  lines.push(`Benchmark "${report.label}" — ${report.provider} (${report.mode}) — ${report.tasks} tâches`);
  for (const stat of report.stats) {
    const tokens =
      stat.inputTokens !== undefined || stat.outputTokens !== undefined
        ? ` | tokens ${stat.inputTokens ?? 0}/${stat.outputTokens ?? 0}`
        : '';
    lines.push(
      `  ${stat.condition.padEnd(8)} accuracy ${(stat.accuracy * 100).toFixed(1)}% | exact ${(stat.exactMatchRate * 100).toFixed(1)}% | mean ${stat.meanLatencyMs.toFixed(0)}ms | p95 ${stat.p95LatencyMs.toFixed(0)}ms | hallucinations ${stat.hallucinations}${tokens}`,
    );
  }
  if (report.delta) {
    lines.push(
      `  delta baseline→tool: ${report.delta.absolutePp >= 0 ? '+' : ''}${report.delta.absolutePp} pp (${report.delta.relativePct === null ? 'n/a' : `${report.delta.relativePct}%`}) | wins ${report.delta.wins} / losses ${report.delta.losses} / ties ${report.delta.ties} | sign test p=${report.delta.signTestPValue}`,
    );
  }
  lines.push(`  JSON: ${jsonPath}`);
  lines.push(`  MD:   ${markdownPath}`);
  process.stdout.write(`${lines.join('\n')}\n`);
}

function formatTimestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('') + `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

main();
