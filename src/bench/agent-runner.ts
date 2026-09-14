/**
 * v13 benchmark — agentic loop for the `tool` condition with a real provider.
 *
 * Baseline = one completion, no tools. Tool = up to 8 iterations of
 * chat -> execute tool in-process against the REAL Smart-Thinking environment
 * -> feed results back -> final answer. Search stays offline unless
 * TAVILY_API_KEY (or the provider flags) explicitly enables the network.
 */

import type { SmartThinkingEnvironment } from '../server/environment';
import { createPlan, suggestPlanQueries } from '../planner';
import { MathEvaluator } from '../utils/math-evaluator';
import { solveOrdering } from '../reasoning/constraint-solver';
import { extractEquations, solveLinearEquation, solveLinearSystem } from '../reasoning/equation-solver';
import { deepResearch } from '../reasoning/research';
import { assistCritique } from '../reasoning/assist';
import { LIMITS } from '../constants';
import type { ReasoningDepth } from '../types';
import type {
  BenchTask,
  GenerateRequest,
  ModelMessage,
  ModelProvider,
  RunResult,
  ToolCall,
  ToolSchema,
} from './types';

export const MAX_TOOL_ITERATIONS = 5;

const BASELINE_SYSTEM_PROMPT =
  "Tu es un assistant qui répond de façon concise et factuelle. Donne la réponse finale explicitement.";

const TOOL_SYSTEM_PROMPT = [
  "Tu es un agent de raisonnement. Raisonne d'abord par toi-même, puis n'appelle un outil que",
  "s'il apporte une information ou une vérification décisive.",
  "Règles: calcul non trivial ou équation -> calculate/solve_math; puzzle d'ordre/classement -> solve_logic;",
  "fait récent ou incertain ou multi-hop -> web_search/research; identité mathématique avancée -> cas;",
  "théorie mathématique -> math_knowledge.",
  "Après au plus 3 ou 4 appels d'outils, rédige la réponse finale.",
  "Si un outil est indisponible ou renvoie une erreur, réponds quand même avec tes connaissances",
  "et signale l'incertitude : ne refuse jamais de répondre.",
  "N'invente jamais une source. Termine toujours par une réponse finale explicite en français.",
].join(' ');

export function buildTaskPrompt(task: BenchTask, enableWeb: boolean = false): string {
  const lines = [`Question : ${task.question}`];
  if (enableWeb && task.requiresWeb) {
    lines.push(
      "Cette question porte sur des faits vérifiables : utilise web_search pour obtenir des sources avant de répondre.",
    );
  }
  lines.push('Réponds de façon concise et termine par la réponse finale explicite.');
  return lines.join('\n');
}

export function buildBenchTools(enableWeb: boolean): ToolSchema[] {
  const tools: ToolSchema[] = [
    {
      name: 'calculate',
      description:
        'Calcule une expression arithmétique de façon déterministe (ex: "(120*0.45)", "250*0.8*1.1", "Math.sqrt(144)"). Accepte "expression = résultat_attendu" pour vérifier une valeur.',
      parameters: {
        type: 'object',
        properties: {
          expression: { type: 'string', description: 'Expression à calculer' },
        },
        required: ['expression'],
      },
    },
    {
      name: 'solve_logic',
      description:
        'Résout exactement un puzzle d\'ordre/de classement. Fournis le texte du problème et/ou des relations [{before, after}].',
      parameters: {
        type: 'object',
        properties: {
          problem: { type: 'string', description: 'Énoncé du puzzle' },
          entities: { type: 'array', items: { type: 'string' }, description: 'Entités à ordonner' },
          relations: {
            type: 'array',
            items: {
              type: 'object',
              properties: { before: { type: 'string' }, after: { type: 'string' } },
              required: ['before', 'after'],
            },
          },
        },
        required: ['problem'],
      },
    },
    {
      name: 'solve_math',
      description:
        'Résout exactement des équations (["3x + 5 = 20"] ou système ["2x + y = 10", "x - y = 2"]).',
      parameters: {
        type: 'object',
        properties: {
          equations: { type: 'array', items: { type: 'string' } },
          problem: { type: 'string' },
        },
      },
    },
    {
      name: 'research',
      description:
        'Recherche web multi-hop: décompose la question, enchaîne plusieurs recherches Tavily et renvoie des réponses candidates sourcées.',
      parameters: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          maxHops: { type: 'number' },
          maxSources: { type: 'number' },
        },
        required: ['question'],
      },
    },
    {
      name: 'critique',
      description:
        'Critique adversariale d\'une réponse brouillon (erreurs, faits non prouvés, étapes manquantes).',
      parameters: {
        type: 'object',
        properties: {
          problem: { type: 'string' },
          draft: { type: 'string' },
        },
        required: ['problem', 'draft'],
      },
    },
    {
      name: 'smartthinking',
      description:
        'Enregistre une pensée dans le graphe de raisonnement, vérifie les calculs et la cohérence.',
      parameters: {
        type: 'object',
        properties: {
          thought: { type: 'string', description: 'Pensée à analyser et vérifier' },
          depth: { type: 'string', enum: ['fast', 'balanced', 'deep'] },
          containsCalculations: { type: 'boolean' },
          requestVerification: { type: 'boolean' },
        },
        required: ['thought'],
      },
    },
    {
      name: 'plan',
      description: 'Décompose un objectif en étapes ordonnées et testables.',
      parameters: {
        type: 'object',
        properties: {
          goal: { type: 'string' },
          constraints: { type: 'array', items: { type: 'string' } },
          maxSteps: { type: 'number' },
        },
        required: ['goal'],
      },
    },
    {
      name: 'verify',
      description: 'Vérifie une affirmation (calculs, cohérence). Retourne un statut et des preuves.',
      parameters: {
        type: 'object',
        properties: {
          claim: { type: 'string' },
          checkMath: { type: 'boolean' },
          checkConsistency: { type: 'boolean' },
        },
        required: ['claim'],
      },
    },
  ];

  if (enableWeb) {
    tools.push({
      name: 'web_search',
      description: 'Recherche web (Tavily). Cite les URLs obtenues.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          maxResults: { type: 'number' },
        },
        required: ['query'],
      },
    });
  }

  tools.push(
    {
      name: 'search',
      description: 'Recherche dans les mémoires de la session et le web.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' }, limit: { type: 'number' } },
        required: ['query'],
      },
    },
    {
      name: 'fetch',
      description: 'Récupère une mémoire par id ou un contenu web par URL.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' }, maxChars: { type: 'number' } },
        required: ['id'],
      },
    },
    {
      name: 'session',
      description: 'Inspecte ou gère la session: status, summary, reset.',
      parameters: {
        type: 'object',
        properties: { action: { type: 'string', enum: ['status', 'summary', 'reset'] } },
        required: ['action'],
      },
    },
  );

  return tools;
}

export interface RunOptions {
  seed: number;
  maxIterations?: number;
  enableWeb?: boolean;
  systemPrompt?: string;
}

export async function runBaseline(
  provider: ModelProvider,
  task: BenchTask,
  options: RunOptions,
): Promise<RunResult> {
  const started = Date.now();
  try {
    const request: GenerateRequest = {
      system: options.systemPrompt ?? BASELINE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildTaskPrompt(task, options.enableWeb ?? false) }],
    };
    let response = await provider.generate(request);
    if (!response.text.trim()) {
      response = await provider.generate({
        system: `${options.systemPrompt ?? BASELINE_SYSTEM_PROMPT} Réponds en texte pur.`,
        messages: [
          ...request.messages,
          { role: 'user', content: 'Donne maintenant ta réponse finale explicite.' },
        ],
      });
    }
    return {
      taskId: task.id,
      category: task.category,
      condition: 'baseline',
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
      condition: 'baseline',
      provider: provider.name,
      answer: '',
      latencyMs: Date.now() - started,
      seed: options.seed,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function runToolLoop(
  provider: ModelProvider,
  environment: SmartThinkingEnvironment,
  task: BenchTask,
  options: RunOptions,
): Promise<RunResult> {
  const started = Date.now();
  const maxIterations = options.maxIterations ?? MAX_TOOL_ITERATIONS;
  const enableWeb = options.enableWeb ?? false;
  const tools = buildBenchTools(enableWeb);
  const sessionId = `bench-${task.id}`;
  const messages: ModelMessage[] = [{ role: 'user', content: buildTaskPrompt(task, options.enableWeb ?? false) }];
  let toolCalls = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  if (!provider.chat) {
    return runBaseline(provider, task, options);
  }

  try {
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      const response = await provider.chat({
        system: options.systemPrompt ?? TOOL_SYSTEM_PROMPT,
        messages,
        tools,
      });
      inputTokens += response.inputTokens ?? 0;
      outputTokens += response.outputTokens ?? 0;

      if (!response.toolCalls || response.toolCalls.length === 0) {
        let answer = response.text.trim();
        if (!answer) {
          const fallback = [...messages]
            .reverse()
            .find(message => message.role === 'assistant' && message.content.trim().length > 0);
          answer = fallback?.content.trim() ?? '';
        }
        if (!answer) {
          const retry = await provider.chat({
            system: `${TOOL_SYSTEM_PROMPT} Réponds en texte pur, sans bloc de code.`,
            messages: [
              ...messages,
              { role: 'user', content: 'Donne maintenant ta réponse finale explicite.' },
            ],
            tools: [],
          });
          inputTokens += retry.inputTokens ?? 0;
          outputTokens += retry.outputTokens ?? 0;
          answer = retry.text.trim();
        }
        return {
          taskId: task.id,
          category: task.category,
          condition: 'tool',
          provider: provider.name,
          answer,
          latencyMs: Date.now() - started,
          inputTokens: inputTokens || undefined,
          outputTokens: outputTokens || undefined,
          toolCalls,
          seed: options.seed,
          raw: { ...(response.meta ?? {}), transcript: messages.slice(-20) },
        };
      }

      messages.push({ role: 'assistant', content: response.text, toolCalls: response.toolCalls });
      for (const call of response.toolCalls) {
        toolCalls += 1;
        let output: unknown;
        try {
          output = await executeTool(environment, call, task, sessionId, enableWeb);
        } catch (error) {
          output = {
            error: error instanceof Error ? error.message : String(error),
            tool: call.name,
          };
        }
        messages.push({
          role: 'tool',
          content: serializeToolResult(output),
          toolCallId: call.id,
        });
      }
    }

    messages.push({
      role: 'user',
      content: "Limite d'outils atteinte. Donne maintenant ta réponse finale explicite sans appeler d'outil.",
    });
    const final = await provider.chat({
      system: `${TOOL_SYSTEM_PROMPT} Réponds maintenant en texte pur, sans bloc de code ni appel d'outil.`,
      messages,
      tools: [],
    });
    inputTokens += final.inputTokens ?? 0;
    outputTokens += final.outputTokens ?? 0;
    let answer = final.text.trim();
    if (!answer) {
      const fallback = [...messages]
        .reverse()
        .find(message => message.role === 'assistant' && message.content.trim().length > 0);
      answer = fallback?.content.trim() ?? '';
    }
    return {
      taskId: task.id,
      category: task.category,
      condition: 'tool',
      provider: provider.name,
      answer,
      latencyMs: Date.now() - started,
      inputTokens: inputTokens || undefined,
      outputTokens: outputTokens || undefined,
      toolCalls,
      seed: options.seed,
      raw: { ...(final.meta ?? {}), transcript: messages.slice(-20) },
    };
  } catch (error) {
    return {
      taskId: task.id,
      category: task.category,
      condition: 'tool',
      provider: provider.name,
      answer: '',
      latencyMs: Date.now() - started,
      inputTokens: inputTokens || undefined,
      outputTokens: outputTokens || undefined,
      toolCalls,
      seed: options.seed,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function serializeToolResult(value: unknown): string {
  let text: string;
  try {
    text = typeof value === 'string' ? value : JSON.stringify(value);
  } catch {
    text = String(value);
  }
  return text.length > 3000 ? `${text.slice(0, 3000)}…(tronqué)` : text;
}

async function executeTool(
  environment: SmartThinkingEnvironment,
  call: ToolCall,
  task: BenchTask,
  sessionId: string,
  enableWeb: boolean,
): Promise<unknown> {
  const args = call.arguments ?? {};
  switch (call.name) {
    case 'calculate': {
      const result = MathEvaluator.evaluateExpression(String(args.expression ?? ''));
      return {
        expression: result.expression,
        value: result.value,
        ...(result.claimedResult !== undefined
          ? { claimedResult: result.claimedResult, matchesClaim: result.matchesClaim }
          : {}),
      };
    }
    case 'solve_logic': {
      const result = solveOrdering(
        String(args.problem ?? task.question),
        Array.isArray(args.entities) ? args.entities.map(String) : [],
        Array.isArray(args.relations)
          ? (args.relations as Array<{ before?: unknown; after?: unknown }>).map(relation => ({
              before: String(relation.before ?? ''),
              after: String(relation.after ?? ''),
            }))
          : [],
      );
      return result;
    }
    case 'solve_math': {
      const equations = Array.isArray(args.equations)
        ? args.equations.map(String)
        : extractEquations(String(args.problem ?? task.question));
      if (equations.length === 0) {
        return { error: 'Aucune équation détectée.' };
      }
      return equations.length === 1 ? solveLinearEquation(equations[0]) : solveLinearSystem(equations);
    }
    case 'research': {
      const result = await deepResearch(
        String(args.question ?? task.question),
        { searchService: environment.searchService, assist: environment.assist, sessionConfig: undefined },
        {
          maxHops: typeof args.maxHops === 'number' ? args.maxHops : 2,
          maxSources: typeof args.maxSources === 'number' ? args.maxSources : 8,
        },
      );
      return {
        provider: result.provider,
        requiresClientAction: result.requiresClientAction,
        instruction: result.instruction,
        subQuestions: result.subQuestions,
        answerCandidates: result.answerCandidates.slice(0, 5),
        citations: result.citations.slice(0, 8),
        evidence: result.evidence.slice(0, 6).map(item => ({ title: item.title, url: item.source, quote: item.quote.slice(0, 400) })),
      };
    }
    case 'critique': {
      const critique = await assistCritique(
        environment.assist,
        String(args.problem ?? task.question),
        String(args.draft ?? ''),
      );
      return critique ?? { available: false, instruction: 'Critique indisponible.' };
    }
    case 'smartthinking': {
      const { response } = await environment.orchestrator.run({
        thought: String(args.thought ?? task.question),
        sessionId,
        depth: normalizeDepth(args.depth),
        containsCalculations: Boolean(args.containsCalculations),
        requestVerification: Boolean(args.requestVerification),
        requestSuggestions: false,
        suggestTools: false,
      });
      return {
        thought: response.thought.slice(0, 1500),
        isVerified: response.isVerified,
        verificationStatus: response.verificationStatus,
        certaintySummary: response.certaintySummary,
        plan: response.plan?.steps.map(step => step.description),
      };
    }
    case 'plan': {
      const plan = createPlan(
        String(args.goal ?? task.question),
        Array.isArray(args.constraints) ? args.constraints.map(String) : [],
        normalizeDepth(args.depth),
        typeof args.maxSteps === 'number' ? args.maxSteps : undefined,
      );
      await environment.sessionStore.setPlan(sessionId, plan);
      return {
        goal: plan.goal,
        steps: plan.steps.map(step => ({
          index: step.index,
          description: step.description,
          successCriteria: step.successCriteria,
        })),
        searchQueries: suggestPlanQueries(plan.goal, 3),
      };
    }
    case 'verify': {
      const result = await environment.verificationService.verifyClaim({
        claim: String(args.claim ?? ''),
        sessionId,
        checkCalculation: args.checkMath !== false,
        checkConsistency: args.checkConsistency !== false,
        checkWeb: false,
      });
      return {
        status: result.status,
        confidence: result.confidence,
        contradictions: result.contradictions ?? [],
        checks: result.checks ?? [],
      };
    }
    case 'web_search': {
      const response = await environment.searchService.webSearch({
        query: String(args.query ?? task.question),
        maxResults: typeof args.maxResults === 'number' ? args.maxResults : 5,
        provider: enableWeb ? 'auto' : 'off',
      });
      return {
        provider: response.provider,
        requiresClientAction: response.requiresClientAction,
        instruction: response.instruction,
        results: response.results.slice(0, 5).map(result => ({
          title: result.title,
          url: result.url,
          text: result.text.slice(0, 1200),
        })),
      };
    }
    case 'search': {
      const query = String(args.query ?? task.question);
      const limit = typeof args.limit === 'number' ? args.limit : 5;
      const web = enableWeb
        ? await environment.searchService.webSearch({ query, maxResults: limit, provider: 'auto' })
        : { provider: 'off' as const, results: [], instruction: 'Recherche web désactivée (hors ligne).' };
      const memories = await environment.memoryManager.getRelevantMemories(query, limit, sessionId);
      return {
        provider: web.provider,
        instruction: web.instruction,
        web: web.results.slice(0, limit).map(result => ({
          title: result.title,
          url: result.url,
          text: result.text.slice(0, 800),
        })),
        memories: memories.map(memory => ({
          id: memory.id,
          content: memory.content.slice(0, 800),
        })),
      };
    }
    case 'fetch': {
      const id = String(args.id ?? '');
      if (/^https?:\/\//i.test(id)) {
        if (!enableWeb) {
          return {
            error:
              'fetch réseau désactivé en mode hors ligne. Définissez TAVILY_API_KEY pour autoriser les accès web.',
          };
        }
        const content = await environment.searchService.fetchUrl(id);
        return { url: content.url, title: content.title, text: content.text.slice(0, 4000) };
      }
      const memory = environment.memoryManager.getMemory(id);
      return memory
        ? { id: memory.id, content: memory.content.slice(0, 2000), tags: memory.tags }
        : { error: `Mémoire introuvable: ${id}` };
    }
    case 'session': {
      const action = String(args.action ?? 'status');
      const state = await environment.sessionStore.get(sessionId);
      if (action === 'reset') {
        const graph = await environment.orchestrator.getSessionGraph(sessionId);
        graph.clear();
        await environment.sessionStore.clear(sessionId);
        await environment.memoryManager.clear(sessionId);
        return { sessionId, reset: true };
      }
      if (action === 'summary') {
        const graph = await environment.orchestrator.getSessionGraph(sessionId);
        return {
          sessionId,
          plan: state.plan?.steps.map(step => step.description),
          recentThoughts: graph
            .getRecentThoughts(5, sessionId)
            .map(thought => thought.content.slice(0, 400)),
        };
      }
      return {
        sessionId,
        version: environment.version,
        thoughts: state.plan?.steps.length ?? 0,
        evidence: state.evidence.length,
        maxThoughtLength: LIMITS.MAX_THOUGHT_LENGTH,
      };
    }
    default:
      return { error: `Outil inconnu: ${call.name}` };
  }
}

function normalizeDepth(value: unknown): ReasoningDepth {
  return value === 'fast' || value === 'deep' || value === 'balanced' ? value : 'fast';
}
