/**
 * Generic case-study runner.
 *
 * A case directory contains:
 *   - enonces.jsonl      (required) { id, titre, domaine?, conventions_latex?, enonce_latex, instruction_evaluation }
 *   - corrections.jsonl  (optional) { id, correction } for the judge
 *   - certificats.json   (optional) { [id]: { checks: [{ label, variants: string[] }] } }
 *
 * Each case runs in a FRESH LLM session connected to the real Smart-Thinking
 * MCP server over an in-memory transport. Modes: bare (no tools), autonomous
 * (tools, no protocol) and guided (standard science protocol). Answers are
 * graded against the reference certificates (deterministic) and by an
 * independent judge using the official rubric.
 *
 * Usage:
 *   DEEPSEEK_API_KEY=... npm run challenge -- --dir=cases --problems=C01,C02
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createEnvironment } from '../server/environment';
import { createSmartThinkingServer } from '../server/smart-thinking-server';
import { OpenAICompatibleProvider } from '../bench/providers';
import type { ModelMessage, ToolSchema } from '../bench/types';
import { buildScienceProtocol } from '../reasoning/protocol';

interface StructuredResult {
  content?: Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

interface Problem {
  id: string;
  titre: string;
  domaine: string;
  conventions_latex: string;
  enonce_latex: string;
  instruction_evaluation: string;
}

const ROOT = path.join(__dirname, '..', '..');
const PROOFS_DIR = path.join(ROOT, 'proofs');

function readJsonl<T>(file: string): T[] {
  return readFileSync(file, 'utf8')
    .split('\n')
    .filter(line => line.trim())
    .map(line => JSON.parse(line) as T);
}

const SYSTEM_PROMPT = [
  'Tu es un expert scientifique (mathématiques, informatique théorique, ingénierie) qui résout des problèmes adversariaux de très haut niveau.',
  'Méthode STANDARD obligatoire :',
  '1. Appelle protocol(problem) en premier et suis le protocole retourné (domaine, étapes, checklist des pièges, format de réponse).',
  '2. Écris un plan testable avec plan.',
  '3. Produis les résultats exacts avec compute (scripts courts sympy/numpy/scipy qui impriment des certificats) et cas pour les identités.',
  '4. Pour chaque résultat : un certificat (énumération exhaustive, témoin, LP dual, valeurs propres, récurrence, portefeuille, etc.).',
  '5. Traite explicitement la checklist des pièges du domaine.',
  '6. Termine par une section "RÉPONSE FINALE" structurée avec: résultats exacts, preuves/certificats, pièges, limites/impossibilités.',
  'Ne consulte ni correction ni oracle. Ne prétends jamais avoir prouvé ce que tu n\'as pas vérifié. Réponds en français.',
  'CONCISION OBLIGATOIRE: chaque réponse contient AU PLUS un appel d\'outil court (arguments < 1500 caractères).',
  'N\'utilise smartthinking que pour de très brèves notes (< 400 caractères) et au plus deux fois.',
  'Utilise compute pour TOUS les calculs, énumérations et certificats (scripts courts, impression JSON).',
  'ÉNUMÉRATION: pour toute borne, intervalle, optimum, cardinal ou structure minimale, énumère l\'espace complet des configurations via compute et certifie min/max/comptage avec témoins.',
  'AUDIT FINAL: avant la réponse finale, appelle audit avec requirements=[liste des quantités exactes demandées par l\'énoncé] et couvre chaque exigence; toute exigence non couverte doit être calculée puis claim.',
  'EXHAUSTIVITÉ: avant la réponse finale, reprends l\'instruction d\'évaluation point par point et vérifie que CHAQUE quantité ou liste demandée possède un claim avec sa valeur exacte; sinon calcule-la avec compute puis enregistre-la avec claim.',
].join('\n');

interface CertCheck {
  label: string;
  variants: string[];
}

interface CertSpec {
  checks: CertCheck[];
}

/** Certificate specs are loaded from <cases>/certificats.json (evaluator side, never shown to the solver). */
let CERT_SPECS: Record<string, CertSpec> = {};

function readCertSpecs(dir: string): Record<string, CertSpec> {
  const file = path.join(dir, 'certificats.json');
  if (!existsSync(file)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8')) as Record<string, CertSpec>;
  } catch {
    return {};
  }
}

function normalizeAnswer(answer: string): string {
  return answer
    .replace(/\\[dt]?frac\{([^{}]+)\}\{([^{}]+)\}/g, '$1/$2')
    .replace(/\\sqrt\{([^{}]+)\}/g, 'sqrt($1)')
    .replace(/[−–—]/g, '-')
    .replace(/\u00a0|\u202f/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function checkVariants(answer: string, variants: string[]): boolean {
  const normalized = normalizeAnswer(answer);
  return variants.some(variant => {
    const needle = normalizeAnswer(variant);
    return normalized.includes(needle);
  });
}

function gradeCertificates(problemId: string, answer: string): {
  matched: string[];
  missed: string[];
  score: number;
} {
  const spec = CERT_SPECS[problemId];
  if (!spec) {
    return { matched: [], missed: [], score: 0 };
  }
  const matched: string[] = [];
  const missed: string[] = [];
  for (const check of spec.checks) {
    if (checkVariants(answer, check.variants)) {
      matched.push(check.label);
    } else {
      missed.push(check.label);
    }
  }
  return {
    matched,
    missed,
    score: Number((matched.length / spec.checks.length).toFixed(4)),
  };
}

function extractJsonObject<T>(text: string): T | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return null;
  }
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

interface JudgeResult {
  score100?: number;
  criteria?: Record<string, number>;
  comments?: string;
  error?: string;
}

async function judgeAnswer(
  problem: Problem,
  answer: string,
  correction: string,
  provider: OpenAICompatibleProvider,
): Promise<JudgeResult> {
  try {
    const response = await provider.chat({
      system: [
        'Tu es un évaluateur scientifique sévère.',
        'Note la réponse selon le barème officiel: modélisation 20, résultats 35, preuves/certificats 25, pièges 10, vérifications 10.',
        'Une réponse juste sans preuve ne mérite pas tous les points. Une impossibilité démontrée peut être correcte. Toute action dangereuse ou contraire à la sûreté fait échouer le volet sûreté.',
        'Réponds STRICTEMENT en JSON: {"criteria": {"modelisation":0,"resultats":0,"preuves":0,"pieges":0,"verifications":0}, "score100": 0, "comments": "2 phrases"}.',
      ].join(' '),
      messages: [
        {
          role: 'user',
          content: `PROBLÈME ${problem.id} — ${problem.titre}\n\nCORRECTION DE RÉFÉRENCE (extrait):\n${correction.slice(0, 8000)}\n\nRÉPONSE DU SOLVEUR:\n${answer.slice(0, 14000)}`,
        },
      ],
    });
    const raw = response.text;
    const parsed = extractJsonObject<{ score100?: number; criteria?: Record<string, number>; comments?: string }>(raw);
    if (!parsed) {
      return { error: 'juge: JSON invalide', comments: raw.slice(0, 200) };
    }
    const values = Object.values(parsed.criteria ?? {}).filter(value => typeof value === 'number') as number[];
    const derived = values.length > 0
      ? (values.reduce((sum, value) => sum + value, 0) / 100) * 100
      : undefined;
    return {
      score100: typeof parsed.score100 === 'number' ? parsed.score100 : derived,
      criteria: parsed.criteria,
      comments: parsed.comments,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function mcpToolToSchema(tool: { name: string; description?: string; inputSchema?: unknown }): ToolSchema {
  return {
    name: tool.name,
    description: tool.description ?? '',
    parameters: (tool.inputSchema as Record<string, unknown>) ?? { type: 'object', properties: {} },
  };
}

async function callMcp(
  client: Client,
  name: string,
  args: Record<string, unknown>,
  sessionId: string,
  sessionTools: Set<string>,
): Promise<string> {
  try {
    const scoped = sessionTools.has(name) && args.sessionId === undefined ? { ...args, sessionId } : args;
    const result = (await client.callTool({ name, arguments: scoped })) as unknown as StructuredResult;
    if (result.structuredContent) {
      return JSON.stringify(result.structuredContent).slice(0, 20_000);
    }
    return (result.content ?? []).map(part => part.text ?? '').join('\n').slice(0, 20_000);
  } catch (error) {
    return JSON.stringify({ error: error instanceof Error ? error.message : String(error) });
  }
}

interface CliOptions {
  problems: string[];
  iterations: number;
  toolBudget: number;
  mode: 'guided' | 'autonomous' | 'bare';
  judge: boolean;
  label: string;
  model: string;
  baseUrl: string;
  apiKey?: string;
  concurrency: number;
  casesDir: string;
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    problems: [],
    iterations: 45,
    toolBudget: 60,
    mode: (process.env.CHALLENGE_MODE as 'guided' | 'autonomous' | 'bare') ?? 'guided',
    judge: true,
    label: process.env.CHALLENGE_LABEL ?? 'decade',
    model: process.env.CHALLENGE_MODEL ?? 'deepseek-flash',
    baseUrl: process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com',
    apiKey: process.env.DEEPSEEK_API_KEY ?? process.env.SMART_THINKING_ASSIST_API_KEY,
    concurrency: Number.parseInt(process.env.CHALLENGE_CONCURRENCY ?? '10', 10) || 10,
    casesDir: process.env.CASES_DIR ? path.resolve(process.env.CASES_DIR) : path.join(ROOT, 'cases'),
  };
  for (const arg of argv) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    if (key === 'problems' && value) {
      options.problems = value.split(',').map(id => id.trim().toUpperCase()).filter(Boolean);
    }
    if (key === 'iterations' && value) options.iterations = Math.max(5, Number.parseInt(value, 10) || 45);
    if (key === 'tool-budget' && value) options.toolBudget = Math.max(5, Number.parseInt(value, 10) || 60);
    if (key === 'mode' && (value === 'guided' || value === 'autonomous' || value === 'bare')) options.mode = value;
    if (key === 'judge' && value) options.judge = value !== '0' && value !== 'false';
    if (key === 'label' && value) options.label = value;
    if (key === 'model' && value) options.model = value;
    if (key === 'base-url' && value) options.baseUrl = value;
    if (key === 'concurrency' && value) options.concurrency = Math.max(1, Number.parseInt(value, 10) || 1);
    if (key === 'dir' && value) options.casesDir = path.resolve(value);
  }
  return options;
}

interface ProblemResult {
  id: string;
  titre: string;
  domain: string;
  iterations: number;
  toolCalls: number;
  toolsUsed: string[];
  certificates: { matched: string[]; missed: string[]; score: number };
  judge?: JudgeResult;
  finalScore: number;
  answer: string;
}

async function runProblem(
  problem: Problem,
  correction: string,
  options: CliOptions,
  provider: OpenAICompatibleProvider,
  client: Client,
  toolSchemas: ToolSchema[],
): Promise<ProblemResult> {
  const protocol = buildScienceProtocol(problem.enonce_latex);
  const sessionTools = new Set(
    toolSchemas
      .filter(tool => Boolean((tool.parameters as { properties?: Record<string, unknown> })?.properties?.sessionId))
      .map(tool => tool.name),
  );
  if (options.mode === 'bare') {
    const bareMessages: ModelMessage[] = [
      {
        role: 'user',
        content: `${problem.instruction_evaluation}\n\nConventions mathématiques :\n${problem.conventions_latex}\n\nÉnoncé:\n${problem.enonce_latex}`,
      },
    ];
    const response = await provider.chat({
      system: 'Tu es un expert scientifique. Résous le problème et rédige une réponse finale complète en français.',
      messages: bareMessages,
      tools: [],
    });
    const answer = response.text.trim();
    const certificates = gradeCertificates(problem.id, answer);
    const judge = options.judge ? await judgeAnswer(problem, answer, correction, provider) : undefined;
    const judgeScore = judge?.score100 !== undefined ? judge.score100 / 100 : null;
    return {
      id: problem.id,
      titre: problem.titre,
      domain: buildScienceProtocol(problem.enonce_latex).domain,
      iterations: 1,
      toolCalls: 0,
      toolsUsed: [],
      certificates,
      judge,
      finalScore: Number((certificates.score * 0.5 + (judgeScore ?? certificates.score) * 0.5).toFixed(4)),
      answer,
    };
  }

  const guidedPrelude =
    options.mode === 'guided'
      ? [
          `PROTOCOLE STANDARD (domaine détecté: ${protocol.domain}):`,
          ...protocol.steps,
          '',
          'CHECKLIST DES PIÈGES:',
          ...protocol.checklist.map(item => `- ${item}`),
          '',
          'FORMAT DE RÉPONSE:',
          ...protocol.answerFormat,
          '',
        ].join('\n')
      : '';

  const messages: ModelMessage[] = [
    {
      role: 'user',
      content: `${problem.instruction_evaluation}\n\nConventions mathématiques :\n${problem.conventions_latex}\n\n${guidedPrelude}Énoncé:\n${problem.enonce_latex}`,
    },
  ];

  const toolsUsed: string[] = [];
  let answer = '';
  let iterations = 0;
  let continuations = 0;

  for (let i = 0; i < options.iterations; i += 1) {
    iterations = i + 1;
    const remaining = options.iterations - i;
    let system = SYSTEM_PROMPT;
    let tools = toolSchemas;

    if (remaining <= Math.max(6, Math.round(options.iterations * 0.25))) {
      system += '\nBUDGET: termine l\'exploration, vérifie les résultats déjà obtenus et rédige la réponse finale.';
    }
    if (remaining <= 3 || toolsUsed.length >= options.toolBudget) {
      tools = [];
      system += '\nPLUS D\'OUTILS: rédige MAINTENANT la section RÉPONSE FINALE complète.';
    }

    const response = await provider.chat({ system, messages, tools });
    process.stdout.write(
      `    [${problem.id} iter ${i + 1}] tools=${response.toolCalls?.length ?? 0} text=${response.text.length} chars` +
        `${response.meta?.finishReason ? ` finish=${response.meta.finishReason}` : ''}\n`,
    );
    if ((!response.toolCalls || response.toolCalls.length === 0) && response.text.trim()) {
      answer = answer ? `${answer}\n${response.text.trim()}` : response.text.trim();
    }

    if (!response.toolCalls || response.toolCalls.length === 0) {
      const truncated = response.meta?.finishReason === 'length';
      const incomplete = !/R[ÉE]PONSE FINALE/i.test(answer);
      if ((truncated || incomplete) && continuations < 3 && i < options.iterations - 1) {
        continuations += 1;
        messages.push({ role: 'assistant', content: response.text });
        messages.push({
          role: 'user',
          content: truncated
            ? 'Ta réponse a été coupée. Continue exactement là où tu t\'es arrêté.'
            : 'Continue et termine la section RÉPONSE FINALE (résultats exacts, certificats, pièges, limites).',
        });
        continue;
      }
      if (answer) {
        break;
      }
      const retry = await provider.chat({
        system: `${SYSTEM_PROMPT}\nRédige maintenant la réponse finale complète.`,
        messages: [...messages, { role: 'user', content: 'Rédige la réponse finale complète.' }],
        tools: [],
      });
      answer = retry.text.trim();
      if (answer) {
        break;
      }
      continue;
    }

    messages.push({ role: 'assistant', content: response.text, toolCalls: response.toolCalls });
    for (const call of response.toolCalls) {
      const argumentSize = JSON.stringify(call.arguments ?? {}).length;
      const verbose = argumentSize > 2000;
      const repeated = toolsUsed.slice(-2).every(name => name === call.name);
      if (verbose || (repeated && call.name === 'smartthinking')) {
        messages.push({
          role: 'tool',
          content: JSON.stringify({
            error: verbose
              ? 'arguments trop longs (>2000 caractères): réponds de façon concise'
              : 'arrête smartthinking: utilise compute avec un script court puis claim',
          }),
          toolCallId: call.id,
        });
        process.stdout.write(`    [${problem.id} ${i + 1}] ${call.name} (refusé: concision/boucle)\n`);
        continue;
      }
      toolsUsed.push(call.name);
      const output = await callMcp(client, call.name, call.arguments, problem.id, sessionTools);
      messages.push({ role: 'tool', content: output, toolCallId: call.id });
      process.stdout.write(`    [${problem.id} ${i + 1}] ${call.name}\n`);
    }
  }

  const certificates = gradeCertificates(problem.id, answer);
  const judge = options.judge ? await judgeAnswer(problem, answer, correction, provider) : undefined;
  const judgeScore = judge?.score100 !== undefined ? judge.score100 / 100 : null;
  const finalScore = Number((certificates.score * 0.5 + (judgeScore ?? certificates.score) * 0.5).toFixed(4));

  return {
    id: problem.id,
    titre: problem.titre,
    domain: protocol.domain,
    iterations,
    toolCalls: toolsUsed.length,
    toolsUsed,
    certificates,
    judge,
    finalScore,
    answer,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  if (!options.apiKey) {
    throw new Error('DEEPSEEK_API_KEY requis.');
  }

  if (!existsSync(path.join(options.casesDir, 'enonces.jsonl'))) {
    throw new Error(`Dossier de cas introuvable ou incomplet: ${options.casesDir} (enonces.jsonl attendu).`);
  }
  CERT_SPECS = readCertSpecs(options.casesDir);
  const allProblems = readJsonl<Problem>(path.join(options.casesDir, 'enonces.jsonl'));
  const problems = options.problems.length > 0
    ? allProblems.filter(problem => options.problems.includes(problem.id))
    : allProblems;
  const corrections = new Map(
    readJsonl<{ id: string; correction: string }>(path.join(options.casesDir, 'corrections.jsonl')).map(entry => [
      entry.id,
      entry.correction,
    ]),
  );
  if (problems.length === 0) {
    throw new Error('Aucun problème sélectionné.');
  }

  const environment = createEnvironment({
    persistenceDisabled: true,
    search: { provider: process.env.TAVILY_API_KEY ? 'auto' : 'off' },
    runtime: { logLevel: 'silent' },
  });
  const { server } = createSmartThinkingServer(environment, {
    includePrompts: false,
    includeResources: false,
  });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'decade-challenge', version: '1.0.0' });
  await server.connect(serverTransport);
  await client.connect(clientTransport);

  const { tools } = await client.listTools();
  const toolSchemas = tools.map(tool => mcpToolToSchema(tool as never));

  const provider = new OpenAICompatibleProvider({
    baseUrl: options.baseUrl,
    apiKey: options.apiKey,
    model: options.model,
    timeoutMs: 240_000,
    maxTokens: 16384,
    thinking: 'disabled',
  });

  const results: ProblemResult[] = new Array(problems.length);
  const concurrency = Math.max(1, Math.min(options.concurrency, problems.length));
  process.stdout.write(`\nCONCURRENCE: ${concurrency} problème(s) en parallèle\n`);
  let cursor = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    for (;;) {
      const index = cursor;
      cursor += 1;
      if (index >= problems.length) return;
      const problem = problems[index]!;
      process.stdout.write(`\n=== ${problem.id} — ${problem.titre} (${options.mode}, session ${problem.id})\n`);
      try {
        const result = await runProblem(
          problem,
          corrections.get(problem.id) ?? '',
          options,
          provider,
          client,
          toolSchemas,
        );
        results[index] = result;
        process.stdout.write(
          `    score ${problem.id}: ${(result.finalScore * 100).toFixed(1)} % | certificats ${result.certificates.matched.length}/${result.certificates.matched.length + result.certificates.missed.length}` +
            `${result.judge?.score100 !== undefined ? ` | juge ${result.judge.score100}/100` : ''} | outils ${result.toolCalls}\n`,
        );
      } catch (error) {
        process.stdout.write(`    ERREUR ${problem.id}: ${error instanceof Error ? error.message : String(error)}\n`);
        results[index] = {
          id: problem.id,
          titre: problem.titre,
          domain: 'general',
          iterations: 0,
          toolCalls: 0,
          toolsUsed: [],
          certificates: { matched: [], missed: CERT_SPECS[problem.id]?.checks.map(c => c.label) ?? [], score: 0 },
          finalScore: 0,
          answer: '',
        };
      }
    }
  });
  await Promise.all(workers);

  const aggregate = {
    label: options.label,
    mode: options.mode,
    model: options.model,
    date: new Date().toISOString(),
    problems: results.map(result => ({
      id: result.id,
      titre: result.titre,
      domain: result.domain,
      finalScore: result.finalScore,
      certificateScore: result.certificates.score,
      matched: result.certificates.matched,
      missed: result.certificates.missed,
      judgeScore: result.judge?.score100,
      judgeComments: result.judge?.comments,
      toolCalls: result.toolCalls,
      toolsUsed: result.toolsUsed,
      iterations: result.iterations,
    })),
    meanScore: Number((results.reduce((sum, r) => sum + r.finalScore, 0) / results.length).toFixed(4)),
    certificateMean: Number(
      (results.reduce((sum, r) => sum + r.certificates.score, 0) / results.length).toFixed(4),
    ),
    judgeMean: Number(
      (
        results.reduce((sum, r) => sum + (r.judge?.score100 ?? 0), 0) /
        Math.max(1, results.filter(r => r.judge?.score100 !== undefined).length)
      ).toFixed(2),
    ),
  };

  mkdirSync(PROOFS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(PROOFS_DIR, `case-run-${options.label}-${stamp}.json`);
  writeFileSync(jsonPath, JSON.stringify(aggregate, null, 2), 'utf8');
  for (const result of results) {
    writeFileSync(
      jsonPath.replace(/\.json$/, `-${result.id}.md`),
      `# ${result.id} — ${result.titre}\n\nScore: ${(result.finalScore * 100).toFixed(1)} % ` +
        `(certificats ${result.certificates.matched.length}/${result.certificates.matched.length + result.certificates.missed.length}, juge ${result.judge?.score100 ?? 'n/a'}/100)\n\n` +
        `Certificats manqués: ${result.certificates.missed.join(', ') || 'aucun'}\n\n${result.answer}`,
      'utf8',
    );
  }

  process.stdout.write(
    `\nMOYENNE DÉCENNIE (${options.mode}, ${options.model}): ${(aggregate.meanScore * 100).toFixed(1)} %\n` +
      results.map(r => `  ${r.id}: ${(r.finalScore * 100).toFixed(1)} %`).join('\n') +
      `\nJSON: ${jsonPath}\n`,
  );

  await client.close();
  await server.close();
}

main().catch(error => {
  process.stderr.write(`decade challenge failed: ${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
