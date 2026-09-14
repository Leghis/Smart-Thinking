import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { MemoryItem, SmartThinkingParams } from '../../types';
import type { SmartThinkingEnvironment } from '../environment';
import { createPlan, suggestPlanQueries, updatePlanStep } from '../../planner';
import { isPrivateUrl, normalizeUrl } from '../../search/url-content';
import { toSmartThinkingError } from '../../errors';
import { generateCertaintySummary } from '../../verification-needs';
import { MathEvaluator } from '../../utils/math-evaluator';
import { solveOrdering } from '../../reasoning/constraint-solver';
import {
  extractEquations,
  solveLinearEquation,
  solveLinearSystem,
} from '../../reasoning/equation-solver';
import { deepResearch } from '../../reasoning/research';
import { assistCritique } from '../../reasoning/assist';
import { runCas } from '../../reasoning/cas';
import { listKnowledgeTopics, lookupKnowledge } from '../../reasoning/math-knowledge';
import { runCompute } from '../../reasoning/compute';
import { buildScienceProtocol, type ScienceDomain } from '../../reasoning/protocol';
import { LIMITS } from '../../constants';
import {
  SearchParamsSchema,
  SmartThinkingParamsSchema,
  FetchParamsSchema,
  WebSearchParamsSchema,
  VerifyClaimParamsSchema,
  PlanParamsSchema,
  SessionParamsSchema,
  CalculateParamsSchema,
  WebCrawlParamsSchema,
  SolveLogicParamsSchema,
  SolveMathParamsSchema,
  ResearchParamsSchema,
  CritiqueParamsSchema,
  CasParamsSchema,
  MathKnowledgeParamsSchema,
  ComputeParamsSchema,
  ProtocolParamsSchema,
  ClaimParamsSchema,
  AuditParamsSchema,
  type SearchResultItem,
  type SearchToolParams,
  type SmartThinkingToolParams,
  type FetchToolParams,
  type WebSearchToolParams,
  type VerifyClaimToolParams,
  type PlanToolParams,
  type SessionToolParams,
  type CalculateToolParams,
  type WebCrawlToolParams,
  type SolveLogicToolParams,
  type SolveMathToolParams,
  type ResearchToolParams,
  type CritiqueToolParams,
  type CasToolParams,
  type MathKnowledgeToolParams,
  type ComputeToolParams,
  type ProtocolToolParams,
  type ClaimToolParams,
  type AuditToolParams,
} from '../contracts';

interface ToolRegistrationOptions {
  includeSmartThinkingTool: boolean;
  includeWebTools?: boolean;
}

const MEMORY_URI_PREFIX = 'smart-thinking://memories';

const REASONING_ANNOTATIONS: ToolAnnotations = {
  title: 'Smart-Thinking Reasoning',
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

const READ_ANNOTATIONS: ToolAnnotations = {
  title: 'Read-only',
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const WEB_ANNOTATIONS: ToolAnnotations = {
  title: 'Web search',
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: true,
};

const SESSION_ANNOTATIONS: ToolAnnotations = {
  title: 'Session management',
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: false,
};

function asTextResult(payload: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

function asErrorResult(error: unknown) {
  const normalized = toSmartThinkingError(error);
  return {
    isError: true,
    content: [{
      type: 'text' as const,
      text: JSON.stringify(
        { error: normalized.message, code: normalized.code, details: normalized.details },
        null,
        2,
      ),
    }],
  };
}

function buildMemoryUri(memoryId: string): string {
  return `${MEMORY_URI_PREFIX}/${encodeURIComponent(memoryId)}`;
}

function formatMemoryTitle(memory: MemoryItem): string {
  if (typeof memory.metadata?.title === 'string' && memory.metadata.title.trim()) {
    return memory.metadata.title;
  }
  if (memory.tags.length > 0) {
    return memory.tags.join(' · ');
  }
  return `Mémoire ${memory.id.slice(0, 8)}`;
}

function memoryToResult(memory: MemoryItem): SearchResultItem {
  const snippet = memory.content.length > 400 ? `${memory.content.slice(0, 400)}...` : memory.content;
  const metadata: Record<string, unknown> = { source: 'memory' };
  if (memory.relevanceScore !== undefined) {
    metadata.score = memory.relevanceScore;
  }
  if (memory.tags.length > 0) {
    metadata.tags = memory.tags;
  }
  if (memory.metadata?.sessionId) {
    metadata.sessionId = memory.metadata.sessionId;
  }
  const sourceUrl = memory.metadata?.source;
  return {
    id: memory.id,
    title: formatMemoryTitle(memory),
    text: snippet,
    url: typeof sourceUrl === 'string' && sourceUrl.trim() ? sourceUrl : buildMemoryUri(memory.id),
    metadata,
  };
}

function buildHelpText(): string {
  return [
    '# Smart-Thinking v13 — Guide rapide',
    '',
    '## Outils',
    '- protocol: protocole scientifique standard (classer, planifier, compute, certificats, pièges).',
    '- compute: exécute un script Python exact (sympy/numpy/scipy) pour produire des certificats.',
    '- claim/audit: registre de certificats (aucun résultat sans méthode ni preuve).',
    '- calculate: évalue une expression arithmétique de façon déterministe.',
    '- solve_logic: résout exactement les puzzles d\'ordre et de classement.',
    '- solve_math: résout équations linéaires, systèmes et quadratiques.',
    '- research: rapport profond (agent Tavily Research, sources numérotées) ou multi-hop interne en repli.',
    '- critique: revue adversariale d\'une réponse brouillon.',
    '- smartthinking: ajoute une pensée au graphe (métriques, vérification, plan, hypothèses).',
    '- plan: décompose un objectif en étapes testables.',
    '- verify: vérifie une affirmation (calculs, cohérence, sources web).',
    '- web_search: recherche web via Tavily ou délègue au client natif; enchaîner avec fetch sur les meilleures URLs.',
    '- fetch: mémoire locale ou contenu web complet (Tavily Extract, repli fetch direct).',
    '- web_crawl: exploration d\'un site (crawl) ou cartographie des URLs (map).',
    '- search: mémoires locales et similarité.',
    '- session: état, export, configuration de la recherche Tavily.',
    '',
    '## Paramètres clés de smartthinking',
    '- thought: pensée à analyser (obligatoire).',
    '- thoughtType: regular | revision | meta | hypothesis | conclusion.',
    '- depth: fast | balanced | deep.',
    '- connections: [{ targetId, type, strength }].',
    '- requestVerification: force la vérification.',
    '- containsCalculations: renforce la vérification mathématique.',
    '- plan: { goal, constraints?, maxSteps? }.',
    '- hypotheses: [{ statement, confidence? }].',
    '',
    '## Boucle recommandée',
    '1. plan(goal) pour les tâches complexes.',
    '2. smartthinking pour consigner chaque étape importante.',
    '3. web_search puis fetch sur les 2-3 sources clés (faits récents ou chiffrés); web_crawl pour un site entier; research pour une question multi-sources.',
    '4. verify pour ne jamais présenter une affirmation incertaine comme un fait.',
  ].join('\n');
}

function registerSmartThinkingTool(server: McpServer, env: SmartThinkingEnvironment): void {
  server.registerTool(
    'smartthinking',
    {
      title: 'Smart-Thinking',
      description:
        'Graph-based multi-step reasoning with persistent memory, honest verification and planning. Use it to record thoughts, build on prior steps, track hypotheses and get next-step guidance. Call it for any non-trivial reasoning task, not just for storage.',
      inputSchema: SmartThinkingParamsSchema.shape,
      annotations: REASONING_ANNOTATIONS,
    },
    async (params: SmartThinkingToolParams) => {
      try {
        if (params.help) {
          return { content: [{ type: 'text' as const, text: buildHelpText() }] };
        }
        if (!params.thought?.trim()) {
          return asErrorResult(new Error("Le paramètre 'thought' est obligatoire (ou utilisez help=true)."));
        }
        const safeParams: SmartThinkingParams = { ...params, thought: params.thought.trim() };
        const { response, sessionId } = await env.orchestrator.run(safeParams);

        // Keep the MCP payload compact: the full trace stays available through the
        // library API, but sending it to a model wastes context budget.
        const { reasoningTrace, relevantMemories, ...compact } = response;
        void reasoningTrace;
        const payload: Record<string, unknown> = {
          ...compact,
          sessionId,
          ...(relevantMemories && relevantMemories.length > 0
            ? {
                relevantMemories: relevantMemories.map(memory => ({
                  id: memory.id,
                  content: memory.content.length > 240 ? `${memory.content.slice(0, 240)}...` : memory.content,
                  tags: memory.tags,
                  relevanceScore: memory.relevanceScore,
                  timestamp: memory.timestamp,
                })),
              }
            : {}),
        };
        return asTextResult(payload);
      } catch (error) {
        return asErrorResult(error);
      }
    },
  );
}

function registerSearchTool(server: McpServer, env: SmartThinkingEnvironment): void {
  server.registerTool(
    'search',
    {
      title: 'Search',
      description:
        'Search across session memories and the web. With a configured Tavily key results come from the web; otherwise the response tells the client to use its native web search. Compatible with OpenAI/ChatGPT connector flows.',
      inputSchema: SearchParamsSchema.shape,
      annotations: WEB_ANNOTATIONS,
    },
    async (params: SearchToolParams) => {
      try {
        const { query, limit = 5, sessionId, includeWeb = true, includeMemory = true, provider } = params;
        const sessionConfig = env.sessionStore.getSearchConfig(sessionId);
        const results: SearchResultItem[] = [];
        let providerUsed = 'memory';
        let instruction: string | undefined;

        if (includeWeb) {
          const web = await env.searchService.webSearch(
            {
              query,
              maxResults: limit,
              provider,
              tavilyApiKey: sessionConfig?.tavilyApiKey,
            },
            sessionConfig,
          );
          providerUsed = web.provider;
          instruction = web.instruction;
          for (const result of web.results) {
            results.push({
              id: result.id,
              title: result.title,
              text: result.text,
              url: result.url,
              metadata: { source: 'web', provider: web.provider, score: result.score },
            });
          }
        }

        if (includeMemory && results.length < limit) {
          const matches = await env.memoryManager.getRelevantMemories(query, limit - results.length, sessionId);
          const seen = new Set(results.map(result => result.url));
          for (const memory of matches) {
            const mapped = memoryToResult(memory);
            if (mapped.url && seen.has(mapped.url)) {
              continue;
            }
            results.push(mapped);
          }
        }

        return asTextResult({
          query,
          provider: providerUsed,
          results: results.slice(0, limit),
          ...(instruction ? { requiresClientAction: providerUsed === 'native', instruction } : {}),
        });
      } catch (error) {
        return asErrorResult(error);
      }
    },
  );
}

function registerFetchTool(server: McpServer, env: SmartThinkingEnvironment): void {
  server.registerTool(
    'fetch',
    {
      title: 'Fetch',
      description:
        'Fetch one item by id: a session memory id or an http(s) URL. URLs are extracted with Tavily Extract when configured (clean markdown of the page) and fall back to a direct fetch otherwise. Use it after web_search to read the best sources in full.',
      inputSchema: FetchParamsSchema.shape,
      annotations: READ_ANNOTATIONS,
    },
    async (params: FetchToolParams) => {
      try {
        const { id, maxChars } = params;
        if (/^https?:\/\//i.test(id.trim()) || (!id.startsWith('memory-') && id.includes('.') && !isPrivateUrl(id))) {
          const url = normalizeUrl(id);
          const sessionConfig = env.sessionStore.getSearchConfig(params.sessionId);
          const content = await env.searchService.fetchUrl(url, sessionConfig?.tavilyApiKey);
          const text = maxChars ? content.text.slice(0, maxChars) : content.text;
          return asTextResult({
            id: url,
            title: content.title ?? url,
            text,
            url,
            metadata: { truncated: content.truncated, retrievedAt: content.retrievedAt, source: 'web' },
          });
        }

        const memory = env.memoryManager.getMemory(id);
        if (!memory) {
          return asErrorResult(new Error(`Mémoire introuvable: ${id}`));
        }
        const timestamp = memory.timestamp instanceof Date ? memory.timestamp.toISOString() : memory.timestamp;
        return asTextResult({
          id: memory.id,
          title: formatMemoryTitle(memory),
          text: memory.content,
          url: buildMemoryUri(memory.id),
          metadata: {
            tags: memory.tags,
            timestamp,
            ...(memory.metadata?.sessionId ? { sessionId: memory.metadata.sessionId } : {}),
          },
        });
      } catch (error) {
        return asErrorResult(error);
      }
    },
  );
}

function registerWebSearchTool(server: McpServer, env: SmartThinkingEnvironment): void {
  server.registerTool(
    'web_search',
    {
      title: 'Web Search',
      description:
        'Search the web. provider=auto uses Tavily when a key is configured, otherwise returns a native-search request the model must execute itself. Follow up with fetch (Tavily Extract) on the most relevant URLs to read full page content, web_crawl for whole sites, research for deep multi-source reports. Cite returned URLs in final answers.',
      inputSchema: WebSearchParamsSchema.shape,
      annotations: WEB_ANNOTATIONS,
    },
    async (params: WebSearchToolParams) => {
      try {
        const sessionConfig = env.sessionStore.getSearchConfig(params.sessionId);
        const response = await env.searchService.webSearch(
          {
            query: params.query,
            maxResults: params.maxResults,
            searchDepth: params.searchDepth,
            provider: params.provider,
            includeAnswer: params.includeAnswer,
            topic: params.topic,
            timeRange: params.timeRange,
            includeDomains: params.includeDomains,
            excludeDomains: params.excludeDomains,
            includeRawContent: params.includeRawContent,
            chunksPerSource: params.chunksPerSource,
            country: params.country,
            safeSearch: params.safeSearch,
            tavilyApiKey: params.tavilyApiKey ?? sessionConfig?.tavilyApiKey,
          },
          sessionConfig,
        );
        return asTextResult(response as unknown as Record<string, unknown>);
      } catch (error) {
        return asErrorResult(error);
      }
    },
  );
}

function registerWebCrawlTool(server: McpServer, env: SmartThinkingEnvironment): void {
  server.registerTool(
    'web_crawl',
    {
      title: 'Web Crawl & Map',
      description:
        'Explore a website with Tavily: mode="crawl" returns extracted page content, mode="map" returns the list of discovered URLs. Use it to gather documentation or multi-page evidence before answering.',
      inputSchema: WebCrawlParamsSchema.shape,
      annotations: WEB_ANNOTATIONS,
    },
    async (params: WebCrawlToolParams) => {
      try {
        const sessionConfig = env.sessionStore.getSearchConfig(params.sessionId);
        if (!env.searchService.isTavilyConfigured(params.tavilyApiKey ?? sessionConfig?.tavilyApiKey)) {
          return asTextResult({
            provider: 'native',
            requiresClientAction: true,
            instruction:
              'Tavily n\'est pas configuré : utilisez votre outil natif d\'exploration web ou configurez une clé via session(action="configure_search").',
            url: params.url,
          });
        }

        const request = {
          url: params.url,
          instructions: params.instructions,
          maxDepth: params.maxDepth,
          maxBreadth: params.maxBreadth,
          limit: params.limit,
          selectPaths: params.selectPaths,
          excludePaths: params.excludePaths,
          allowExternal: params.allowExternal,
          extractDepth: params.extractDepth,
          format: params.format,
          tavilyApiKey: params.tavilyApiKey ?? sessionConfig?.tavilyApiKey,
          sessionConfig,
        } as const;

        if (params.mode === 'map') {
          const mapped = await env.searchService.mapSite(request);
          return asTextResult({ ...mapped, mode: 'map' });
        }

        const crawled = await env.searchService.crawlSite(request);
        return asTextResult({ ...crawled, mode: 'crawl' });
      } catch (error) {
        return asErrorResult(error);
      }
    },
  );
}

function registerVerifyTool(server: McpServer, env: SmartThinkingEnvironment): void {
  server.registerTool(
    'verify',
    {
      title: 'Verify Claim',
      description:
        'Verify a factual or mathematical claim. Runs deterministic math checks, scans the session graph for contradictions and, when Tavily is configured, cross-checks web sources. Never marks something verified without evidence.',
      inputSchema: VerifyClaimParamsSchema.shape,
      annotations: READ_ANNOTATIONS,
    },
    async (params: VerifyClaimToolParams) => {
      try {
        const sessionId = params.sessionId ?? LIMITS.DEFAULT_SESSION_ID;
        const sessionConfig = env.sessionStore.getSearchConfig(sessionId);
        const graph = await env.orchestrator.getSessionGraph(sessionId);
        const related = await graph.getRelevantThoughts(params.claim, 5, sessionId);
        const result = await env.verificationService.verifyClaim({
          claim: params.claim,
          sessionId,
          checkCalculation: params.checkMath,
          checkConsistency: params.checkConsistency,
          checkWeb: params.checkWeb,
          connectedThoughts: related,
          searchProvider: params.provider ?? sessionConfig?.provider,
          tavilyApiKey: params.tavilyApiKey ?? sessionConfig?.tavilyApiKey,
        });
        await env.sessionStore.addEvidence(sessionId, result.evidence ?? []);
        return asTextResult({
          claim: params.claim,
          status: result.status,
          confidence: result.confidence,
          certaintySummary: generateCertaintySummary(result.status, result.confidence),
          checks: result.checks ?? [],
          evidence: result.evidence ?? [],
          contradictions: result.contradictions ?? [],
          methodsUnavailable: result.methodsUnavailable ?? [],
          notes: result.notes,
        });
      } catch (error) {
        return asErrorResult(error);
      }
    },
  );
}

function registerPlanTool(server: McpServer, env: SmartThinkingEnvironment): void {
  server.registerTool(
    'plan',
    {
      title: 'Reasoning Plan',
      description:
        'Decompose a goal into 2-20 ordered, testable steps with success criteria. Persist the plan in the session and update step status via session(action="set_plan_step").',
      inputSchema: PlanParamsSchema.shape,
      annotations: REASONING_ANNOTATIONS,
    },
    async (params: PlanToolParams) => {
      try {
        const plan = createPlan(params.goal, params.constraints, params.depth, params.maxSteps);
        await env.sessionStore.setPlan(params.sessionId ?? LIMITS.DEFAULT_SESSION_ID, plan);
        return asTextResult({
          plan,
          searchQueries: suggestPlanQueries(params.goal, 3),
          notes: 'Consignez chaque étape avec smartthinking et citez les preuves avec verify.',
        });
      } catch (error) {
        return asErrorResult(error);
      }
    },
  );
}

function registerCalculateTool(server: McpServer): void {
  server.registerTool(
    'calculate',
    {
      title: 'Calculate',
      description:
        'Deterministic calculator for arithmetic and Math.* functions. Call it for EVERY non-trivial computation instead of doing mental math. Optionally pass "expression = claimed_result" to check a candidate answer.',
      inputSchema: CalculateParamsSchema.shape,
      annotations: READ_ANNOTATIONS,
    },
    async ({ expression }: CalculateToolParams) => {
      try {
        const result = MathEvaluator.evaluateExpression(expression);
        return asTextResult({
          expression: result.expression,
          value: result.value,
          ...(result.claimedResult !== undefined
            ? {
                claimedResult: result.claimedResult,
                matchesClaim: result.matchesClaim,
                verdict: result.matchesClaim ? 'confirmed' : 'contradicted',
              }
            : {}),
        });
      } catch (error) {
        return asErrorResult(error);
      }
    },
  );
}

function registerClaimTool(server: McpServer, env: SmartThinkingEnvironment): void {
  server.registerTool(
    'claim',
    {
      title: 'Register Claim',
      description:
        'Register an intermediate or final result with its method and evidence in the certificate ledger. Every numeric result should be registered. Use audit to find claims missing evidence or conflicting values.',
      inputSchema: ClaimParamsSchema.shape,
      annotations: REASONING_ANNOTATIONS,
    },
    async (params: ClaimToolParams) => {
      try {
        const claim = env.claims.register(params.sessionId ?? LIMITS.DEFAULT_SESSION_ID, params);
        return asTextResult({ claim, audit: env.claims.audit(params.sessionId ?? LIMITS.DEFAULT_SESSION_ID).summary });
      } catch (error) {
        return asErrorResult(error);
      }
    },
  );
}

function registerAuditTool(server: McpServer, env: SmartThinkingEnvironment): void {
  server.registerTool(
    'audit',
    {
      title: 'Audit Certificates',
      description:
        'Audit the certificate ledger: lists claims without method/evidence, conflicting values, values supported by a single method, and (when requirements are given) requested quantities still lacking a certificate. Call it before writing the final answer.',
      inputSchema: AuditParamsSchema.shape,
      annotations: READ_ANNOTATIONS,
    },
    async (params: AuditToolParams) => {
      try {
        return asTextResult(
          env.claims.audit(params.sessionId ?? LIMITS.DEFAULT_SESSION_ID, params.requirements) as unknown as Record<string, unknown>,
        );
      } catch (error) {
        return asErrorResult(error);
      }
    },
  );
}

function registerComputeTool(server: McpServer): void {
  server.registerTool(
    'compute',
    {
      title: 'Compute Sandbox',
      description:
        'Run a short deterministic Python script (sympy, numpy, scipy, mpmath, itertools, fractions…) and get its stdout. Use it to build exact certificates: CRT, exhaustive search, linear programming, finite fields, linear algebra, probabilities, recurrences. No filesystem, network or subprocess.',
      inputSchema: ComputeParamsSchema.shape,
      annotations: REASONING_ANNOTATIONS,
    },
    async (params: ComputeToolParams) => {
      try {
        const result = await runCompute({ code: params.code, timeoutMs: params.timeoutMs });
        return asTextResult(result as unknown as Record<string, unknown>);
      } catch (error) {
        return asErrorResult(error);
      }
    },
  );
}

function registerProtocolTool(server: McpServer): void {
  server.registerTool(
    'protocol',
    {
      title: 'Science Protocol',
      description:
        'Standard solving protocol for hard research-level problems: classify the domain, get the exact workflow, the domain trap checklist and the required answer format. Call it FIRST on any challenge problem, then follow it.',
      inputSchema: ProtocolParamsSchema.shape,
      annotations: READ_ANNOTATIONS,
    },
    async (params: ProtocolToolParams) => {
      try {
        const protocol = buildScienceProtocol(params.problem, params.domain as ScienceDomain | undefined);
        const knowledge = lookupKnowledge(params.problem).slice(0, 3);
        return asTextResult({
          ...protocol,
          knowledge: knowledge.map(entry => ({ id: entry.id, title: entry.title, domain: entry.domain, content: entry.content })),
        } as unknown as Record<string, unknown>);
      } catch (error) {
        return asErrorResult(error);
      }
    },
  );
}

function registerCasTool(server: McpServer): void {
  server.registerTool(
    'cas',
    {
      title: 'Computer Algebra (SymPy)',
      description:
        'Exact symbolic computation: simplify/expand/factor, verify_identity (returns equal=true when lhs-rhs simplifies to 0), solve, minimal_polynomial, evalf with high precision, poly_roots, series, gamma, elliptic (Jacobi sn/cn/dn/K), mod_linear, compare. Use it to PROVE algebraic identities and compute exact algebraic objects instead of approximating.',
      inputSchema: CasParamsSchema.shape,
      annotations: READ_ANNOTATIONS,
    },
    async (params: CasToolParams) => {
      try {
        const result = await runCas(params as never);
        return asTextResult(result as unknown as Record<string, unknown>);
      } catch (error) {
        return asErrorResult(error);
      }
    },
  );
}

function registerMathKnowledgeTool(server: McpServer): void {
  server.registerTool(
    'math_knowledge',
    {
      title: 'Math Knowledge Base',
      description:
        'Curated classical results (Weierstrass ℘, duplication, square lattice values, Jacobi sn relation, Gaussian integers/Eisenstein, minimal polynomials, proof strategies). Query by topic or list all entries. Use it to ground advanced derivations in correct theory.',
      inputSchema: MathKnowledgeParamsSchema.shape,
      annotations: READ_ANNOTATIONS,
    },
    async (params: MathKnowledgeToolParams) => {
      try {
        const entries = lookupKnowledge(params.query, params.domain);
        if (entries.length === 0) {
          return asTextResult({ results: [], topics: listKnowledgeTopics() });
        }
        return asTextResult({
          results: entries.map(entry => ({
            id: entry.id,
            domain: entry.domain,
            title: entry.title,
            content: entry.content,
          })),
        });
      } catch (error) {
        return asErrorResult(error);
      }
    },
  );
}

function registerSolveLogicTool(server: McpServer): void {
  server.registerTool(
    'solve_logic',
    {
      title: 'Solve Logic',
      description:
        'Exact order/ranking solver. Pass the puzzle text and/or explicit relations [{before, after}]; returns the unique order, all valid next candidates, or a contradiction. Use it for scheduling, ranking and logical-deduction tasks.',
      inputSchema: SolveLogicParamsSchema.shape,
      annotations: READ_ANNOTATIONS,
    },
    async (params: SolveLogicToolParams) => {
      try {
        const result = solveOrdering(
          params.problem,
          params.entities ?? [],
          (params.relations ?? []).map(relation => ({ before: relation.before, after: relation.after })),
        );
        return asTextResult(result as unknown as Record<string, unknown>);
      } catch (error) {
        return asErrorResult(error);
      }
    },
  );
}

function registerSolveMathTool(server: McpServer): void {
  server.registerTool(
    'solve_math',
    {
      title: 'Solve Math',
      description:
        'Exact equation solver: linear equations, linear systems and quadratics. Pass explicit equations (["2x + y = 10", "x - y = 2"]) or a word problem containing equations. Use it instead of solving algebra mentally.',
      inputSchema: SolveMathParamsSchema.shape,
      annotations: READ_ANNOTATIONS,
    },
    async (params: SolveMathToolParams) => {
      try {
        const equations = params.equations?.length
          ? params.equations
          : extractEquations(params.problem ?? params.variable ?? '');
        if (equations.length === 0) {
          return asErrorResult(new Error('Aucune équation détectée. Fournissez "equations".'));
        }
        if (equations.length === 1) {
          return asTextResult(solveLinearEquation(equations[0]) as unknown as Record<string, unknown>);
        }
        return asTextResult(solveLinearSystem(equations) as unknown as Record<string, unknown>);
      } catch (error) {
        return asErrorResult(error);
      }
    },
  );
}

function registerResearchTool(server: McpServer, env: SmartThinkingEnvironment): void {
  server.registerTool(
    'research',
    {
      title: 'Deep Research',
      description:
        'Deep research on a question or topic. provider=auto uses the Tavily Research agent when a key is configured (comprehensive report with numbered sources) and falls back to internal multi-hop Tavily searches. Use it for literature-style or multi-source questions; use web_search+fetch for quick targeted lookups.',
      inputSchema: ResearchParamsSchema.shape,
      annotations: WEB_ANNOTATIONS,
    },
    async (params: ResearchToolParams) => {
      try {
        const sessionConfig = env.sessionStore.getSearchConfig(params.sessionId);
        const tavilyKey = params.tavilyApiKey ?? sessionConfig?.tavilyApiKey;
        if (params.provider !== 'internal' && env.searchService.isTavilyConfigured(tavilyKey)) {
          try {
            const report = await env.searchService.tavilyResearch(
              params.question,
              { model: params.model, outputLength: params.outputLength },
              tavilyKey,
            );
            return asTextResult({ provider: 'tavily', mode: 'research', ...report });
          } catch (error) {
            if (params.provider === 'tavily') {
              throw error;
            }
          }
        }
        const result = await deepResearch(
          params.question,
          {
            searchService: env.searchService,
            assist: env.assist,
            sessionConfig,
          },
          {
            maxHops: params.maxHops,
            maxSources: params.maxSources,
            includeAnswer: params.includeAnswer,
            sessionId: params.sessionId,
            tavilyApiKey: tavilyKey,
          },
        );
        await env.sessionStore.addEvidence(params.sessionId ?? LIMITS.DEFAULT_SESSION_ID, result.evidence);
        return asTextResult(result as unknown as Record<string, unknown>);
      } catch (error) {
        return asErrorResult(error);
      }
    },
  );
}

function registerCritiqueTool(server: McpServer, env: SmartThinkingEnvironment): void {
  server.registerTool(
    'critique',
    {
      title: 'Critique Draft',
      description:
        'Adversarial review of a draft answer by an internal critic: lists calculation errors, unsupported facts, contradictions and missing steps, then suggests fixes. Requires an assist LLM key; returns an instruction otherwise.',
      inputSchema: CritiqueParamsSchema.shape,
      annotations: READ_ANNOTATIONS,
    },
    async (params: CritiqueToolParams) => {
      try {
        if (!env.assist.available) {
          return asTextResult({
            available: false,
            instruction:
              'Aucun modèle critique configuré (SMART_THINKING_ASSIST_API_KEY). Relisez la réponse vous-même et vérifiez chaque calcul avec calculate.',
          });
        }
        const critique = await assistCritique(env.assist, params.problem, params.draft);
        if (!critique) {
          return asTextResult({ available: true, issues: [], confidence: 0 });
        }
        return asTextResult({ available: true, criticModel: env.assist.model, ...critique });
      } catch (error) {
        return asErrorResult(error);
      }
    },
  );
}

function registerSessionTool(server: McpServer, env: SmartThinkingEnvironment): void {
  server.registerTool(
    'session',
    {
      title: 'Session',
      description:
        'Inspect or manage the reasoning session: status, summary, export, reset, configure the Tavily web-search key, or update a plan step.',
      inputSchema: SessionParamsSchema.shape,
      annotations: SESSION_ANNOTATIONS,
    },
    async (params: SessionToolParams) => {
      try {
        const sessionId = params.sessionId ?? LIMITS.DEFAULT_SESSION_ID;
        const state = await env.sessionStore.get(sessionId);
        const graph = await env.orchestrator.getSessionGraph(sessionId);

        switch (params.action) {
          case 'configure_search': {
            if (!params.provider && !params.tavilyApiKey) {
              return asErrorResult(new Error('provider ou tavilyApiKey requis pour configure_search.'));
            }
            const configured = await env.sessionStore.setSearchConfig(sessionId, {
              provider: params.provider ?? 'auto',
              tavilyApiKey: params.tavilyApiKey,
              searchDepth: params.searchDepth,
            });
            return asTextResult({
              sessionId,
              searchConfig: configured.searchConfig,
              tavilyConfigured: env.searchService.isTavilyConfigured(params.tavilyApiKey),
              note: 'La clé Tavily est conservée en mémoire uniquement, jamais écrite sur disque.',
            });
          }
          case 'set_plan_step': {
            if (!state.plan) {
              return asErrorResult(new Error('Aucun plan dans cette session.'));
            }
            if (!params.stepId || !params.stepStatus) {
              return asErrorResult(new Error('stepId et stepStatus requis.'));
            }
            const plan = updatePlanStep(state.plan, params.stepId, params.stepStatus);
            await env.sessionStore.setPlan(sessionId, plan);
            return asTextResult({ sessionId, plan });
          }
          case 'reset': {
            graph.clear();
            await env.sessionStore.clear(sessionId);
            await env.memoryManager.clear(sessionId);
            return asTextResult({ sessionId, reset: true });
          }
          case 'summary': {
            return asTextResult({
              sessionId,
              plan: state.plan,
              hypotheses: state.hypotheses,
              evidence: state.evidence.slice(-20),
              recentThoughts: graph.getRecentThoughts(10, sessionId).map(thought => ({
                id: thought.id,
                type: thought.type,
                content: thought.content.slice(0, 240),
                metrics: thought.metrics,
              })),
            });
          }
          case 'export': {
            return asTextResult({
              sessionId,
              state,
              graph: JSON.parse(graph.exportEnrichedGraph()) as Record<string, unknown>,
            });
          }
          case 'status':
          default: {
            const searchConfig = env.sessionStore.getSearchConfig(sessionId);
            return asTextResult({
              sessionId,
              version: env.version,
              thoughts: graph.getAllThoughts(sessionId).length,
              memories: env.memoryManager.getRecentMemories(200, sessionId).length,
              planSteps: state.plan?.steps.length ?? 0,
              planCompleted: state.plan?.steps.filter(step => step.status === 'completed').length ?? 0,
              hypotheses: state.hypotheses.length,
              evidence: state.evidence.length,
              verificationEntries: env.verificationMemory.getSessionVerifications(sessionId).length,
              search: {
                provider: searchConfig?.provider ?? env.runtime.search.provider,
                tavilyConfigured: env.searchService.isTavilyConfigured(searchConfig?.tavilyApiKey),
              },
              suggestedQueries: state.plan ? suggestPlanQueries(state.plan.goal, 3) : [],
            });
          }
        }
      } catch (error) {
        return asErrorResult(error);
      }
    },
  );
}

export function registerCoreTools(
  server: McpServer,
  env: SmartThinkingEnvironment,
  options: ToolRegistrationOptions,
): void {
  if (options.includeSmartThinkingTool) {
    registerSmartThinkingTool(server, env);
  }
  registerSearchTool(server, env);
  registerFetchTool(server, env);

  if (options.includeWebTools !== false) {
    registerCalculateTool(server);
    registerProtocolTool(server);
    registerComputeTool(server);
    registerClaimTool(server, env);
    registerAuditTool(server, env);
    registerCasTool(server);
    registerMathKnowledgeTool(server);
    registerSolveLogicTool(server);
    registerSolveMathTool(server);
    registerWebSearchTool(server, env);
    registerWebCrawlTool(server, env);
    registerResearchTool(server, env);
    registerCritiqueTool(server, env);
    registerVerifyTool(server, env);
    registerPlanTool(server, env);
    registerSessionTool(server, env);
  }
}
