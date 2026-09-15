import { randomUUID } from 'node:crypto';
import { ThoughtGraph } from './thought-graph';
import { SimilarityEngine } from './similarity-engine';
import { QualityEvaluator } from './quality-evaluator';
import { MetricsCalculator } from './metrics-calculator';
import { Visualizer } from './visualizer';
import { MemoryManager } from './memory-manager';
import { SessionStore } from './session-store';
import { SearchService, buildSearchQueries } from './search/search-service';
import { IVerificationService } from './services/verification-service.interface';
import { createPlan, suggestPlanQueries } from './planner';
import { upsertHypotheses, recordHypothesisEvidence, deriveHypothesisReport } from './hypotheses';
import { suggestTools as suggestToolsForContext } from './tool-suggestions';
import { generateCertaintySummary } from './verification-needs';
import { extractKeywords } from './keywords';
import { DEPTH_PROFILES, LIMITS } from './constants';
import { ValidationError } from './errors';
import type { RuntimeConfig } from './config';
import type {
  CritiqueReport,
  HeuristicTrace,
  HypothesisNode,
  MemoryItem,
  MetricContribution,
  NextStepSuggestion,
  Plan,
  ReasoningDepth,
  ReasoningJustification,
  ReasoningStep,
  ReasoningStepKind,
  ReasoningStepStatus,
  SmartThinkingParams,
  SmartThinkingResponse,
  ThoughtMetricBreakdown,
  ThoughtMetrics,
  VerificationResult,
  VerificationStatus,
} from './types';

export interface ReasoningOrchestratorDependencies {
  similarityEngine: SimilarityEngine;
  qualityEvaluator: QualityEvaluator;
  verificationService: IVerificationService;
  metricsCalculator: MetricsCalculator;
  visualizer: Visualizer;
  memoryManager: MemoryManager;
  sessionStore: SessionStore;
  searchService?: SearchService;
  runtime?: RuntimeConfig;
}

class ReasoningStepTracker {
  private readonly steps: ReasoningStep[] = [];
  private readonly stepIndex = new Map<string, ReasoningStep>();
  private readonly startedAt = new Map<string, number>();

  start(
    kind: ReasoningStepKind,
    label: string,
    description: string,
    parents: string[] = [],
    details?: Record<string, unknown>,
  ): string {
    const id = randomUUID();
    const timestamp = new Date();
    const step: ReasoningStep = {
      id,
      label,
      kind,
      description,
      status: 'in_progress',
      timestamp: timestamp.toISOString(),
      parents,
      details,
    };
    this.steps.push(step);
    this.stepIndex.set(id, step);
    this.startedAt.set(id, timestamp.getTime());
    return id;
  }

  complete(stepId: string, details?: Record<string, unknown>): void {
    const step = this.stepIndex.get(stepId);
    if (!step) {
      return;
    }
    step.status = 'completed';
    if (details) {
      step.details = { ...(step.details ?? {}), ...details };
    }
    const started = this.startedAt.get(stepId);
    if (started !== undefined) {
      step.durationMs = Date.now() - started;
      this.startedAt.delete(stepId);
    }
  }

  skip(stepId: string, reason: string): void {
    const step = this.stepIndex.get(stepId);
    if (!step) {
      return;
    }
    step.status = 'skipped';
    step.details = { ...(step.details ?? {}), reason };
  }

  fail(stepId: string, error: unknown): void {
    const step = this.stepIndex.get(stepId);
    if (!step) {
      return;
    }
    step.status = 'failed';
    step.details = {
      ...(step.details ?? {}),
      error: error instanceof Error ? error.message : String(error),
    };
    const started = this.startedAt.get(stepId);
    if (started !== undefined) {
      step.durationMs = Date.now() - started;
      this.startedAt.delete(stepId);
    }
  }

  addJustification(stepId: string, justification: ReasoningJustification): void {
    const step = this.stepIndex.get(stepId);
    if (!step) {
      return;
    }
    step.justifications = [...(step.justifications ?? []), justification];
  }

  getSteps(): ReasoningStep[] {
    return this.steps;
  }

  getTimeline(): Array<{
    stepId: string;
    label: string;
    status: ReasoningStepStatus;
    timestamp: string;
  }> {
    return this.steps.map(step => ({
      stepId: step.id,
      label: step.label,
      status: step.status,
      timestamp: step.timestamp,
    }));
  }
}

export class ReasoningOrchestrator {
  private readonly deps: ReasoningOrchestratorDependencies;
  private readonly graphs = new Map<string, ThoughtGraph>();

  constructor(dependencies: ReasoningOrchestratorDependencies) {
    this.deps = dependencies;
  }

  /** Returns the shared graph for a session, loading persisted state on first access. */
  async getSessionGraph(sessionId?: string): Promise<ThoughtGraph> {
    return this.getGraph(sessionId?.trim() || LIMITS.DEFAULT_SESSION_ID);
  }

  async run(params: SmartThinkingParams): Promise<{
    response: SmartThinkingResponse;
    sessionId: string;
    thoughtGraph: ThoughtGraph;
  }> {    const depth: ReasoningDepth = params.depth ?? 'balanced';
    const profile = DEPTH_PROFILES[depth];
    const sessionId = params.sessionId?.trim() || LIMITS.DEFAULT_SESSION_ID;
    const content = params.thought?.trim();

    if (!content) {
      throw new ValidationError("Le paramètre 'thought' est obligatoire et ne peut pas être vide.");
    }
    if (content.length > (this.deps.runtime?.maxThoughtLength ?? LIMITS.MAX_THOUGHT_LENGTH)) {
      throw new ValidationError(
        `La pensée dépasse la longueur maximale (${LIMITS.MAX_THOUGHT_LENGTH} caractères).`,
      );
    }

    const tracker = new ReasoningStepTracker();
    const contextStep = tracker.start(
      'context',
      'Initialisation',
      `Préparation de la session (profondeur: ${depth})`,
    );

    const graph = await this.getGraph(sessionId);
    const session = await this.deps.sessionStore.get(sessionId);
    tracker.complete(contextStep, {
      sessionId,
      existingThoughts: graph.getAllThoughts(sessionId).length,
      depth,
    });

    const plan = await this.resolvePlan(sessionId, session.plan, params, depth, tracker);
    const { hypotheses, hypothesesChanged } = await this.resolveHypotheses(
      sessionId,
      session.hypotheses,
      params,
      tracker,
    );

    const verificationStep = tracker.start(
      'verification',
      'Vérification préliminaire',
      'Détection des calculs et anomalies évidentes',
    );
    let preliminary;
    try {
      preliminary = await this.deps.verificationService.performPreliminaryVerification(
        content,
        Boolean(params.containsCalculations || params.requestVerification),
      );
      tracker.complete(verificationStep, {
        calculations: preliminary.verifiedCalculations?.length ?? 0,
      });
    } catch (error) {
      tracker.fail(verificationStep, error);
      preliminary = {
        verifiedCalculations: undefined,
        initialVerification: false,
        verificationInProgress: false,
        preverifiedThought: content,
      };
    }

    const thoughtContent = content;
    const graphStep = tracker.start('graph', 'Intégration au graphe', 'Insertion de la pensée et connexions');
    const thoughtId = graph.addThought(thoughtContent, params.thoughtType ?? 'regular', params.connections ?? []);
    const thought = graph.getThought(thoughtId);
    if (!thought) {
      throw new ValidationError('Échec de l\'insertion de la pensée dans le graphe.');
    }
    tracker.complete(graphStep, { thoughtId, connections: thought.connections.length });

    const inferenceStep = tracker.start(
      'graph',
      'Inférence relationnelle',
      'Connexions déduites par similarité et transitivité dans la session',
    );
    if (profile.runInference) {
      try {
        const sessionNodes = graph.getAllThoughts(sessionId);
        const inferred = await graph.inferRelations(0.7, sessionId);
        tracker.complete(inferenceStep, { nodes: sessionNodes.length, inferred });
      } catch (error) {
        tracker.fail(inferenceStep, error);
      }
    } else {
      tracker.skip(inferenceStep, 'Inférence désactivée pour ce profil de profondeur.');
    }

    const evaluationStep = tracker.start(
      'evaluation',
      'Évaluation heuristique',
      'Calcul des métriques de confiance, pertinence et qualité',
    );
    const metrics = await this.deps.qualityEvaluator.evaluate(thoughtId, graph);
    graph.updateThoughtMetrics(thoughtId, metrics);
    tracker.complete(evaluationStep, { ...metrics });

    const deepVerificationStep = tracker.start(
      'verification',
      'Vérification approfondie',
      'Calculs, cohérence de session et sources web',
    );
    const connectedThoughts = graph.getConnectedThoughts(thoughtId);
    const shouldVerify =
      Boolean(params.requestVerification) ||
      profile.verificationLevel === 'thorough' ||
      Boolean(preliminary.verifiedCalculations && preliminary.verifiedCalculations.length > 0) ||
      metrics.confidence < 0.5;

    let verification: VerificationResult | undefined;
    if (shouldVerify) {
      try {
        const sessionSearchConfig = this.deps.sessionStore.getSearchConfig(sessionId);
        verification = await this.deps.verificationService.verifyClaim({
          claim: thoughtContent,
          sessionId,
          checkCalculation: true,
          checkConsistency: connectedThoughts.length > 0,
          checkWeb: profile.verificationLevel !== 'minimal',
          connectedThoughts,
          searchProvider: sessionSearchConfig?.provider,
          tavilyApiKey: sessionSearchConfig?.tavilyApiKey,
        });
        tracker.complete(deepVerificationStep, {
          status: verification.status,
          confidence: verification.confidence,
          evidence: verification.evidence?.length ?? 0,
        });
      } catch (error) {
        tracker.fail(deepVerificationStep, error);
      }
    } else {
      tracker.skip(deepVerificationStep, 'Vérification approfondie non requise pour ce profil.');
    }

    const evidence = verification?.evidence ?? [];
    await this.deps.sessionStore.addEvidence(sessionId, evidence);

    const searchQueries = this.buildSearchQueries(content, plan, depth);

    const memoryStep = tracker.start('memory', 'Mémoire', 'Recherche de souvenirs pertinents et enregistrement');
    const relevantMemories = await this.safeMemories(content, sessionId);
    const memoryId = this.deps.memoryManager.addMemory(thoughtContent, this.buildTags(params, verification), sessionId);
    tracker.complete(memoryStep, {
      relevant: relevantMemories.length,
      memoryId,
    });

    const searchStep = tracker.start('search', 'Recherches suggérées', 'Requêtes web recommandées');
    tracker.complete(searchStep, { queries: searchQueries });
    const hypothesisReport = deriveHypothesisReport(hypotheses, [...session.evidence, ...evidence]);
    const suggestionStep = tracker.start('suggestion', 'Suggestions', 'Prochaines étapes et outils pertinents');
    const suggestedNextSteps = this.shouldSuggest(params, depth)
      ? await this.safeSuggestions(graph, profile.maxSuggestions, sessionId)
      : [];
    const suggestedTools = params.suggestTools === false
      ? undefined
      : suggestToolsForContext({
          content,
          depth,
          verification,
          hasPlan: Boolean(plan),
          openHypotheses: hypothesisReport.ranked.filter(
            hypothesis => hypothesis.status === 'open' || hypothesis.status === 'inconclusive',
          ).length,
          evidenceCount: evidence.length + session.evidence.length,
        });
    tracker.complete(suggestionStep, {
      nextSteps: suggestedNextSteps.length,
      tools: suggestedTools?.length ?? 0,
    });

    const critique = await this.buildCritique(thought, graph, params);
    if (hypothesesChanged || hypothesisReport.ranked.some((hypothesis, index) => hypothesis.status !== hypotheses[index]?.status)) {
      await this.deps.sessionStore.setHypotheses(sessionId, hypothesisReport.ranked);
    }

    let visualization;
    if (params.generateVisualization || profile.includeVisualizationByDefault) {
      const visualizationStep = tracker.start('visualization', 'Visualisation', 'Génération de la vue du graphe');
      try {
        visualization = this.generateVisualization(graph, thoughtId, params);
        tracker.complete(visualizationStep);
      } catch (error) {
        tracker.fail(visualizationStep, error);
      }
    }

    const persistenceStep = tracker.start('persistence', 'Persistance', 'Sauvegarde du graphe et de la session');
    try {
      await this.deps.memoryManager.saveGraphState(sessionId, graph.exportEnrichedGraph());
      await this.deps.sessionStore.addEvidence(sessionId, evidence);
      tracker.complete(persistenceStep);
    } catch (error) {
      tracker.fail(persistenceStep, error);
    }

    this.evictStaleGraphs(sessionId);

    const calculations = verification?.verifiedCalculations ?? preliminary.verifiedCalculations ?? [];
    const incorrectCalculations = calculations.filter(calculation => !calculation.isCorrect);
    // A decisive exact computation is a proof: it is `verified`, not "partially".
    const deterministicFallback: VerificationStatus | undefined =
      calculations.length === 0
        ? undefined
        : incorrectCalculations.length > 0
          ? 'contradicted'
          : 'verified';
    const status: VerificationStatus = verification?.status ?? deterministicFallback ?? 'unverified';
    const isVerified =
      (status === 'verified' || status === 'partially_verified') && incorrectCalculations.length === 0;
    const reliabilityScore = this.deps.metricsCalculator.calculateReliabilityScore(
      metrics,
      status,
      calculations,
    );
    const fallbackConfidence =
      deterministicFallback === 'verified'
        ? 1
        : deterministicFallback === 'contradicted'
          ? 1
          : 0.4;
    const certaintySummary = generateCertaintySummary(
      status,
      verification?.confidence ?? fallbackConfidence,
      verification?.verificationBasis ??
        (deterministicFallback ? { kind: 'deterministic' as const } : undefined),
    );

    const response: SmartThinkingResponse = {
      thoughtId,
      thought: thoughtContent,
      thoughtType: params.thoughtType ?? 'regular',
      qualityMetrics: metrics,
      metricsBasis: buildMetricsBasis(thought.metadata.metricBreakdown),
      sessionId,
      suggestedTools,
      visualization,
      relevantMemories: relevantMemories.length > 0 ? relevantMemories : undefined,
      suggestedNextSteps: suggestedNextSteps.length > 0 ? suggestedNextSteps : undefined,
      verification,
      isVerified,
      verificationStatus: status,
      certaintySummary,
      reliabilityScore,
      reasoningTrace: tracker.getSteps(),
      reasoningTimeline: tracker.getTimeline(),
      depth,
      plan,
      hypotheses: hypothesisReport.ranked.length > 0 ? hypothesisReport.ranked : undefined,
      evidence: evidence.length > 0 ? evidence : undefined,
      searchQueries: searchQueries.length > 0 ? searchQueries : undefined,
      critique,
      hypothesisWarnings: hypothesisReport.warnings.length > 0 ? hypothesisReport.warnings : undefined,
      memoryId,
    };

    this.attachHeuristicTraces(tracker, thoughtId, metrics);
    return { response, sessionId, thoughtGraph: graph };
  }

  private async resolvePlan(
    sessionId: string,
    existing: Plan | undefined,
    params: SmartThinkingParams,
    depth: ReasoningDepth,
    tracker: ReasoningStepTracker,
  ): Promise<Plan | undefined> {
    if (params.plan?.goal) {
      const step = tracker.start('planning', 'Planification', 'Décomposition de l\'objectif en étapes testables');
      const plan = createPlan(params.plan.goal, params.plan.constraints ?? [], depth, params.plan.maxSteps);
      await this.deps.sessionStore.setPlan(sessionId, plan);
      tracker.complete(step, { steps: plan.steps.length });
      return plan;
    }
    return existing;
  }

  private async resolveHypotheses(
    sessionId: string,
    existing: HypothesisNode[],
    params: SmartThinkingParams,
    tracker: ReasoningStepTracker,
  ): Promise<{ hypotheses: HypothesisNode[]; hypothesesChanged: boolean }> {
    let hypotheses = existing;
    let changed = false;

    if (params.hypotheses?.length) {
      const step = tracker.start('planning', 'Hypothèses', 'Enregistrement ou mise à jour d\'hypothèses');
      hypotheses = upsertHypotheses(hypotheses, params.hypotheses);
      await this.deps.sessionStore.setHypotheses(sessionId, hypotheses);
      tracker.complete(step, { count: params.hypotheses.length });
      changed = true;
    }

    if (params.hypothesisUpdate) {
      const step = tracker.start('planning', 'Preuve d\'hypothèse', 'Mise à jour d\'une hypothèse avec une preuve');
      hypotheses = recordHypothesisEvidence(hypotheses, params.hypothesisUpdate);
      await this.deps.sessionStore.setHypotheses(sessionId, hypotheses);
      tracker.complete(step, { id: params.hypothesisUpdate.id });
      changed = true;
    }

    return { hypotheses, hypothesesChanged: changed };
  }

  private buildSearchQueries(content: string, plan: Plan | undefined, depth: ReasoningDepth): string[] {
    const profile = DEPTH_PROFILES[depth];
    if (profile.maxSearchQueries === 0) {
      return [];
    }
    const queries = buildSearchQueries(content, profile.maxSearchQueries);
    if (queries.length === 0 && plan) {
      return suggestPlanQueries(plan.goal, profile.maxSearchQueries);
    }
    return queries;
  }

  private shouldSuggest(params: SmartThinkingParams, depth: ReasoningDepth): boolean {
    if (params.requestSuggestions === false) {
      return false;
    }
    return params.requestSuggestions === true || depth !== 'fast';
  }

  private async safeMemories(content: string, sessionId: string): Promise<MemoryItem[]> {
    try {
      return await this.deps.memoryManager.getRelevantMemories(content, 3, sessionId);
    } catch {
      return [];
    }
  }

  private async safeSuggestions(
    graph: ThoughtGraph,
    limit: number,
    sessionId: string,
  ): Promise<NextStepSuggestion[]> {
    try {
      return await graph.suggestNextSteps(limit, sessionId);
    } catch {
      return [];
    }
  }

  private async buildCritique(
    thought: NonNullable<ReturnType<ThoughtGraph['getThought']>>,
    graph: ThoughtGraph,
    params: SmartThinkingParams,
  ): Promise<CritiqueReport | undefined> {
    try {
      const biases = await this.deps.qualityEvaluator.detectBiases(thought);
      const improvements = params.requestSuggestions
        ? await this.deps.qualityEvaluator.suggestImprovements(thought, graph)
        : [];
      const warnings: string[] = [];
      if (biases.length > 0) {
        warnings.push(`Biais potentiels détectés: ${biases.map(bias => bias.type).join(', ')}.`);
      }
      if (improvements.length === 0 && warnings.length === 0) {
        return undefined;
      }
      return { biases, improvements, warnings };
    } catch {
      return undefined;
    }
  }

  private buildTags(params: SmartThinkingParams, verification?: VerificationResult): string[] {
    const tags = new Set<string>([params.thoughtType ?? 'regular']);
    if (verification) {
      tags.add(`verification:${verification.status}`);
    }
    if (params.depth) {
      tags.add(`depth:${params.depth}`);
    }
    for (const keyword of extractKeywords(params.thought).slice(0, 3)) {
      tags.add(keyword);
    }
    return Array.from(tags);
  }

  private attachHeuristicTraces(tracker: ReasoningStepTracker, thoughtId: string, metrics: ThoughtMetrics): void {
    const breakdown = this.deps.metricsCalculator.getMetricBreakdown(thoughtId);
    const evaluationStep = tracker
      .getSteps()
      .find(step => step.kind === 'evaluation' && step.status === 'completed');
    if (!evaluationStep || !breakdown) {
      return;
    }

    const traces: HeuristicTrace[] = [];
    const sources: Array<['confidence' | 'relevance' | 'quality', number]> = [
      ['confidence', metrics.confidence],
      ['relevance', metrics.relevance],
      ['quality', metrics.quality],
    ];
    for (const [metric, score] of sources) {
      const metricBreakdown = breakdown[metric];
      if (!metricBreakdown) {
        continue;
      }
      for (const contribution of metricBreakdown.contributions) {
        traces.push({
          metric: `${metric}.${contribution.key ?? contribution.label}`,
          weight: contribution.weight,
          score: contribution.value,
          rationale: contribution.rationale,
        });
      }
      traces.push({
        metric,
        weight: 1,
        score,
        rationale: metricBreakdown.summary,
      });
    }

    tracker.addJustification(evaluationStep.id, {
      summary: `Confiance ${formatPercent(metrics.confidence)}, pertinence ${formatPercent(metrics.relevance)}, qualité ${formatPercent(metrics.quality)}.`,
      heuristics: traces,
      timestamp: new Date().toISOString(),
    });
  }

  private async getGraph(sessionId: string): Promise<ThoughtGraph> {
    const cached = this.graphs.get(sessionId);
    if (cached) {
      this.graphs.delete(sessionId);
      this.graphs.set(sessionId, cached);
      return cached;
    }

    const graph = new ThoughtGraph(sessionId, this.deps.similarityEngine, this.deps.qualityEvaluator);
    try {
      const saved = await this.deps.memoryManager.loadGraphState(sessionId);
      if (saved) {
        graph.importEnrichedGraph(saved);
      }
    } catch {
      // A corrupt graph state must not prevent reasoning from starting.
    }
    this.graphs.set(sessionId, graph);
    return graph;
  }

  private evictStaleGraphs(currentSessionId: string): void {
    const maxGraphs = 8;
    if (this.graphs.size <= maxGraphs) {
      return;
    }
    for (const sessionId of this.graphs.keys()) {
      if (sessionId !== currentSessionId) {
        this.graphs.delete(sessionId);
        if (this.graphs.size <= maxGraphs) {
          break;
        }
      }
    }
  }

  private generateVisualization(
    graph: ThoughtGraph,
    thoughtId: string,
    params: SmartThinkingParams,
  ) {
    const type = params.visualizationType ?? 'graph';
    const options = params.visualizationOptions ?? {};
    switch (type) {
      case 'chronological':
        return this.deps.visualizer.generateChronologicalVisualization(graph);
      case 'thematic':
        return this.deps.visualizer.generateThematicVisualization(graph);
      case 'hierarchical':
        return this.deps.visualizer.generateHierarchicalVisualization(graph, options.centerNode, {
          direction: options.direction,
          levelSeparation: 100,
          clusterBy: options.clusterBy,
        } as never);
      case 'force':
        return this.deps.visualizer.generateForceDirectedVisualization(graph, {
          clusterBy: options.clusterBy,
          forceStrength: 0.5,
          centerNode: options.centerNode,
        } as never);
      case 'radial':
        return this.deps.visualizer.generateRadialVisualization(graph, options.centerNode, {
          maxDepth: options.maxDepth,
          radialDistance: 120,
        } as never);
      case 'graph':
      default:
        return this.deps.visualizer.generateVisualization(graph, thoughtId);
    }
  }
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

const METRIC_BASIS_LIMIT = 3;

function topContributions(contributions: MetricContribution[] | undefined): MetricContribution[] {
  if (!contributions || contributions.length === 0) {
    return [];
  }
  return [...contributions]
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, METRIC_BASIS_LIMIT)
    .map(contribution => ({
      key: contribution.key,
      label: contribution.label,
      weight: contribution.weight,
      value: contribution.value,
      impact: contribution.impact,
      rationale: contribution.rationale,
    }));
}

/** Makes the heuristic metrics auditable instead of opaque. */
function buildMetricsBasis(
  breakdown?: ThoughtMetricBreakdown,
): SmartThinkingResponse['metricsBasis'] {
  if (!breakdown) {
    return undefined;
  }
  const contributions: Record<string, MetricContribution[]> = {};
  for (const key of ['confidence', 'relevance', 'quality'] as const) {
    const top = topContributions(breakdown[key]?.contributions);
    if (top.length > 0) {
      contributions[key] = top;
    }
  }
  if (Object.keys(contributions).length === 0) {
    return undefined;
  }
  return {
    heuristic: true,
    scale: '0..1 (heuristique, non probabiliste)',
    disclaimer:
      'Scores heuristiques de forme (modalisation, vocabulaire, structure, type de pensée) : ce ne sont PAS des mesures de vérité ni de fiabilité. Pour la vérité, utilisez verificationStatus, claim/audit et verify.',
    contributions,
  };
}

export { ReasoningStepTracker };
