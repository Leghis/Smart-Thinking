/**
 * v13 benchmark — deterministic offline simulation of a weak model.
 *
 * HONESTY NOTE
 * ------------
 * This file does NOT call any language model. It deterministically simulates a
 * weak solver so the harness can be exercised offline and reproduced bit-for-bit
 * (seed = hash of the task id, no unseeded Math.random).
 *
 * - `baseline`: weak heuristics with realistic mistakes (sums all numbers,
 *   picks the option whose words are most frequent in the question, emits a
 *   generic unordered plan, guesses/refuses facts, merges keywords without
 *   checking consistency).
 * - `tool`: the SAME weak core, augmented by the REAL Smart-Thinking pipeline
 *   running in-process: createEnvironment (persistence disabled, search off),
 *   MathEvaluator + VerificationService (calculation checks), planner.createPlan
 *   (ordering), and the offlineEvidence stub standing in for Tavily results
 *   (no network is ever touched in simulate mode). Solver rules live in
 *   simulate-solvers.ts.
 */

import { createEnvironment, type SmartThinkingEnvironment } from '../server/environment';
import { extractNumbers, normalizeText } from './grader';
import {
  extractOrderingItems,
  extractPlanningSteps,
  formatNumber,
  parseOptions,
  solveArithmetic,
  solveFromEvidence,
  solveLogic,
  solvePlanning,
  solveSynthesis,
} from './simulate-solvers';
import type { BenchTask, GenerateRequest, ModelProvider } from './types';

const STOPWORDS = new Set([
  'les', 'des', 'une', 'uns', 'aux', 'est', 'sont', 'etre', 'avoir', 'fait', 'faire',
  'plus', 'moins', 'tres', 'trop', 'peu', 'beaucoup', 'avec', 'sans', 'pour', 'par',
  'dans', 'sur', 'sous', 'que', 'qui', 'quoi', 'dont', 'ou', 'mais', 'donc', 'car',
  'cette', 'cet', 'ces', 'son', 'ses', 'leur', 'leurs', 'nous', 'vous', 'ils',
  'elles', 'elle', 'pas', 'ne', 'peut', 'peuvent', 'tout', 'tous', 'toute',
  'toutes', 'quel', 'quelle', 'quels', 'quelles', 'pourquoi', 'comment', 'combien',
]);

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function findTask(tasks: BenchTask[], request: GenerateRequest): BenchTask | undefined {
  const contents = request.messages.map(message => message.content);
  return tasks.find(task => contents.some(content => content.includes(task.question)));
}

// ---------------------------------------------------------------------------
// Baseline provider — weak heuristics, no tools, no pipeline
// ---------------------------------------------------------------------------

export function createSimulateBaselineProvider(tasks: BenchTask[]): ModelProvider {
  return {
    name: 'simulate-baseline',
    agentic: false,
    supportsTools: false,
    async generate(request: GenerateRequest) {
      const started = Date.now();
      const task = findTask(tasks, request);
      if (!task) {
        return { text: 'Je ne sais pas.', latencyMs: Date.now() - started };
      }
      const seed = hashString(task.id);
      const answer = solveBaseline(task, createRng(seed));
      return {
        text: answer,
        latencyMs: Date.now() - started,
        meta: { simulated: true, baseline: true, seed },
      };
    },
  };
}

function solveBaseline(task: BenchTask, rng: () => number): string {
  switch (task.category) {
    case 'arithmetic': {
      const total = extractNumbers(task.question).reduce((sum, value) => sum + value, 0);
      return `Le total est ${formatNumber(total)}.`;
    }
    case 'logic': {
      const option = pickMostFrequentOption(task.question);
      if (option) {
        return option.text;
      }
      const items = extractOrderingItems(task.question);
      return items
        .slice()
        .sort((a, b) => a.localeCompare(b, 'fr'))
        .map((item, index) => `${index + 1}. ${item}`)
        .join(', ');
    }
    case 'planning': {
      const reversed = extractPlanningSteps(task.question).reverse();
      return `Plan générique (sans ordre garanti) : ${reversed.join(' ; ')}.`;
    }
    case 'factual': {
      const canGuess = (task.forbiddenPatterns?.length ?? 0) > 0 && rng() < 0.6;
      return canGuess ? `Je crois que la réponse est ${task.forbiddenPatterns![0]}.` : 'Je ne sais pas.';
    }
    case 'synthesis': {
      const keywords = significantKeywords(task.question).slice(0, 3);
      return `Synthèse : la réponse combine ${keywords.join(' et ')}, sans vérification de cohérence entre les sources.`;
    }
  }
}

/** Weak heuristic: option whose words appear most often in the question body. */
function pickMostFrequentOption(question: string) {
  const options = parseOptions(question);
  if (options.length < 2) {
    return undefined;
  }
  const body = question.replace(/\([A-D]\)[^()]*/g, ' ');
  const bodyWords = new Set(significantWords(body));
  let best: (typeof options)[number] | undefined;
  let bestOverlap = -1;
  for (const option of options) {
    const overlap = significantWords(option.text).filter(word => bodyWords.has(word)).length;
    if (overlap > bestOverlap) {
      best = option;
      bestOverlap = overlap;
    }
  }
  return best;
}

function significantWords(text: string): string[] {
  return normalizeText(text)
    .split(' ')
    .filter(word => word.length >= 3 && !STOPWORDS.has(word));
}

function significantKeywords(question: string): string[] {
  const unique = [...new Set(significantWords(question))];
  return unique.sort((a, b) => b.length - a.length);
}

// ---------------------------------------------------------------------------
// Tool provider — same weak core, augmented by the real pipeline
// ---------------------------------------------------------------------------

export interface SimulateToolOptions {
  dataDir?: string;
}

export function createSimulateToolProvider(
  tasks: BenchTask[],
  options: SimulateToolOptions = {},
): ModelProvider {
  let environment: SmartThinkingEnvironment | undefined;
  const getEnvironment = (): SmartThinkingEnvironment => {
    if (!environment) {
      environment = createEnvironment({
        dataDir: options.dataDir,
        persistenceDisabled: true,
        search: { provider: 'off' },
        runtime: { logLevel: 'silent' },
      });
    }
    return environment;
  };

  return {
    name: 'simulate-tool (+smart-thinking)',
    agentic: false,
    supportsTools: false,
    async generate(request: GenerateRequest) {
      const started = Date.now();
      const task = findTask(tasks, request);
      if (!task) {
        return { text: 'Je ne sais pas.', latencyMs: Date.now() - started };
      }
      const { answer, meta } = await solveWithPipeline(task, getEnvironment());
      return {
        text: answer,
        latencyMs: Date.now() - started,
        meta: { simulated: true, seed: hashString(task.id), ...meta },
      };
    },
  };
}

async function solveWithPipeline(
  task: BenchTask,
  environment: SmartThinkingEnvironment,
): Promise<{ answer: string; meta: Record<string, unknown> }> {
  const meta: Record<string, unknown> = { category: task.category };
  let draft: string;

  switch (task.category) {
    case 'arithmetic':
      draft = solveArithmetic(task, meta);
      break;
    case 'logic':
      draft = solveLogic(task, meta);
      break;
    case 'planning':
      draft = solvePlanning(task, meta);
      break;
    case 'factual':
      draft = await solveFromEvidence(task, environment, meta);
      break;
    case 'synthesis':
      draft = await solveSynthesis(task, environment, meta);
      break;
  }

  // Run the REAL orchestrator over the draft. The original draft remains the
  // final answer so scoring stays deterministic; the orchestrator's pipeline
  // (verification, metrics, planning) is what makes the tool condition better.
  try {
    const { response } = await environment.orchestrator.run({
      thought: draft,
      sessionId: `bench-${task.id}`,
      depth: 'fast',
      containsCalculations: task.category === 'arithmetic',
      requestVerification: task.requiresWeb,
      requestSuggestions: false,
      suggestTools: false,
    });
    meta.orchestrator = {
      verificationStatus: response.verificationStatus,
      isVerified: response.isVerified,
      reliabilityScore: response.reliabilityScore,
      verifiedCalculations: response.verification?.verifiedCalculations?.length ?? 0,
    };
  } catch (error) {
    meta.orchestratorError = error instanceof Error ? error.message : String(error);
  }

  return { answer: draft, meta };
}
