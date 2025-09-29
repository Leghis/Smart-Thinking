import { v4 as uuidv4 } from 'uuid';
import { ThoughtGraph } from './thought-graph';
import { SimilarityEngine } from './similarity-engine';
import { QualityEvaluator } from './quality-evaluator';
import { ToolIntegrator } from './tool-integrator';
import { MetricsCalculator } from './metrics-calculator';
import { Visualizer } from './visualizer';
import { SmartThinkingParams, SmartThinkingResponse, ThoughtMetrics, MemoryItem, ReasoningStep, ReasoningStepKind, ReasoningJustification, HeuristicTrace, ReasoningStepStatus } from './types';
import { IVerificationService } from './services/verification-service.interface';
import { VerificationConfig } from './config';
import { VerificationResult, VerificationStatus, VerificationDetailedStatus } from './types';

interface MemoryManagerLike {
  loadGraphState(sessionId: string): Promise<string | null>;
  saveGraphState(sessionId: string, graphState: string): Promise<void>;
  addMemory(content: string, tags: string[], sessionId: string): Promise<void> | void;
  getRelevantMemories(content: string, limit: number, sessionId: string): Promise<MemoryItem[]>;
}

interface ReasoningOrchestratorDependencies {
  similarityEngine: SimilarityEngine;
  qualityEvaluator: QualityEvaluator;
  verificationService: IVerificationService;
  toolIntegrator: ToolIntegrator;
  metricsCalculator: MetricsCalculator;
  visualizer: Visualizer;
  memoryManager: MemoryManagerLike;
}

class ReasoningStepTracker {
  private steps: ReasoningStep[] = [];
  private stepIndex = new Map<string, ReasoningStep>();
  private startedAt = new Map<string, number>();

  start(kind: ReasoningStepKind, label: string, description: string, parents: string[] = [], details?: Record<string, any>): string {
    const id = uuidv4();
    const timestamp = new Date();
    const step: ReasoningStep = {
      id,
      label,
      kind,
      description,
      status: 'in_progress',
      timestamp: timestamp.toISOString(),
      parents,
      details
    };
    this.steps.push(step);
    this.stepIndex.set(id, step);
    this.startedAt.set(id, timestamp.getTime());
    return id;
  }

  complete(stepId: string, details?: Record<string, any>): void {
    const step = this.stepIndex.get(stepId);
    if (!step) return;
    const now = Date.now();
    step.status = 'completed';
    if (details) {
      step.details = { ...(step.details || {}), ...details };
    }
    const started = this.startedAt.get(stepId);
    if (started) {
      step.durationMs = now - started;
      this.startedAt.delete(stepId);
    }
  }

  fail(stepId: string, error: unknown): void {
    const step = this.stepIndex.get(stepId);
    if (!step) return;
    const now = Date.now();
    step.status = 'failed';
    step.details = {
      ...(step.details || {}),
      error: error instanceof Error ? error.message : String(error)
    };
    const started = this.startedAt.get(stepId);
    if (started) {
      step.durationMs = now - started;
      this.startedAt.delete(stepId);
    }
  }

  addJustification(stepId: string, justification: ReasoningJustification): void {
    const step = this.stepIndex.get(stepId);
    if (!step) return;
    const justifications = step.justifications || [];
    justifications.push(justification);
    step.justifications = justifications;
  }

  getSteps(): ReasoningStep[] {
    return this.steps;
  }

  getTimeline(): Array<{ stepId: string; label: string; status: ReasoningStepStatus; timestamp: string; durationMs?: number; kind: ReasoningStepKind }>{
    return this.steps.map(step => ({
      stepId: step.id,
      label: step.label,
      status: step.status,
      timestamp: step.timestamp,
      durationMs: step.durationMs,
      kind: step.kind
    }));
  }
}

export class ReasoningOrchestrator {
  private readonly deps: ReasoningOrchestratorDependencies;

  constructor(dependencies: ReasoningOrchestratorDependencies) {
    this.deps = dependencies;
  }

  public async run(params: SmartThinkingParams): Promise<{ response: SmartThinkingResponse; sessionId: string; thoughtGraph: ThoughtGraph }>
  {
    const tracker = new ReasoningStepTracker();
    const sessionInitializationStep = tracker.start('context', 'Initialisation', 'Préparation de la session de raisonnement');
    const sessionId = params.sessionId || uuidv4();
    tracker.complete(sessionInitializationStep, { sessionId });

    const thoughtGraph = new ThoughtGraph(sessionId, this.deps.similarityEngine, this.deps.qualityEvaluator);

    const loadStep = tracker.start('context', 'Chargement du graphe', 'Récupération de l’état précédent');
    const previousState = await this.deps.memoryManager.loadGraphState(sessionId);
    if (previousState) {
      const imported = thoughtGraph.importEnrichedGraph(previousState);
      tracker.complete(loadStep, { imported, nodeCount: thoughtGraph.getAllThoughts(sessionId).length });
    } else {
      tracker.complete(loadStep, { imported: false });
    }

    const verificationStep = tracker.start('verification', 'Pré-vérification', 'Analyse initiale des calculs et garde-fous');
    const preliminaryVerification = await this.deps.verificationService.performPreliminaryVerification(
      params.thought,
      !!params.containsCalculations
    );
    tracker.complete(verificationStep, {
      detectedCalculations: preliminaryVerification.verifiedCalculations?.length || 0,
      initialVerification: preliminaryVerification.initialVerification
    });

    const graphStep = tracker.start('graph', 'Insertion de la pensée', 'Ajout de la pensée dans le graphe');
    const thoughtId = thoughtGraph.addThought(
      preliminaryVerification.preverifiedThought,
      params.thoughtType ?? 'regular',
      params.connections ?? []
    );
    tracker.complete(graphStep, { thoughtId, connectionCount: params.connections?.length ?? 0 });

    const evaluationStep = tracker.start('evaluation', 'Évaluation heuristique', 'Calcul des métriques locales', [graphStep]);
    const metrics: ThoughtMetrics = await this.deps.qualityEvaluator.evaluate(thoughtId, thoughtGraph);
    thoughtGraph.updateThoughtMetrics(thoughtId, metrics);
    tracker.complete(evaluationStep, {
      confidence: metrics.confidence,
      relevance: metrics.relevance,
      quality: metrics.quality
    });

    const heuristics = this.buildHeuristicTraces(thoughtId, metrics);
    const heuristicsJustification: ReasoningJustification = {
      summary: `Heuristiques calculées (confiance ${this.formatScore(metrics.confidence)}, pertinence ${this.formatScore(metrics.relevance)}, qualité ${this.formatScore(metrics.quality)})`,
      heuristics,
      timestamp: new Date().toISOString()
    };
    tracker.addJustification(evaluationStep, heuristicsJustification);

    const currentThought = thoughtGraph.getThought(thoughtId);
    if (currentThought) {
      const existingJustifications = currentThought.reasoning?.justifications || [];
      currentThought.reasoning = {
        createdByStepId: evaluationStep,
        updatedAt: heuristicsJustification.timestamp,
        justifications: [...existingJustifications, heuristicsJustification],
        heuristicWeights: heuristics
      };
    }
    this.decorateConnections(thoughtGraph, thoughtId, params.connections ?? [], heuristics, evaluationStep);

    const response: SmartThinkingResponse = {
      thoughtId,
      thought: preliminaryVerification.preverifiedThought,
      thoughtType: params.thoughtType ?? 'regular',
      qualityMetrics: metrics,
      sessionId,
      isVerified: preliminaryVerification.initialVerification,
      verificationStatus: preliminaryVerification.verificationInProgress
        ? 'verification_in_progress'
        : preliminaryVerification.initialVerification
          ? 'partially_verified'
          : 'unverified',
      certaintySummary: preliminaryVerification.verificationInProgress
        ? 'Vérification des calculs en cours...'
        : `Information ${preliminaryVerification.initialVerification ? 'partiellement vérifiée' : 'non vérifiée'}, niveau de confiance: ${Math.round(metrics.confidence * 100)}%.`,
      reliabilityScore: this.deps.metricsCalculator.calculateReliabilityScore(
        metrics,
        preliminaryVerification.initialVerification ? 'partially_verified' : 'unverified',
        preliminaryVerification.verifiedCalculations,
        undefined
      )
    };

    if (preliminaryVerification.verifiedCalculations?.length) {
      response.verification = {
        status: 'partially_verified',
        confidence: metrics.confidence,
        sources: ['Vérification interne des calculs'],
        verificationSteps: ['Annotation automatique des calculs détectés'],
        verifiedCalculations: preliminaryVerification.verifiedCalculations
      } as VerificationResult;
      response.isVerified = true;
      response.verificationStatus = 'partially_verified';
      response.certaintySummary = `Calculs vérifiés automatiquement (${preliminaryVerification.verifiedCalculations.length}). Niveau de confiance: ${Math.round(metrics.confidence * 100)}%.`;
    }

    const previousVerificationStep = tracker.start('verification', 'Recherche de vérifications antérieures', 'Consultation de la mémoire de vérification', [evaluationStep]);
    const connectedIds = (params.connections ?? []).map(conn => conn.targetId);
    const previousVerification = await this.deps.verificationService.checkPreviousVerification(
      currentThought?.content || params.thought,
      sessionId,
      params.thoughtType ?? 'regular',
      connectedIds
    );
    tracker.complete(previousVerificationStep, {
      previousMatch: !!previousVerification.previousVerification,
      similarity: previousVerification.previousVerification?.similarity
    });

    if (previousVerification.previousVerification) {
      response.isVerified = previousVerification.isVerified;
      response.verificationStatus = previousVerification.verificationStatus;
      response.certaintySummary = previousVerification.certaintySummary;
      response.verification = previousVerification.verification;
      response.reliabilityScore = this.deps.metricsCalculator.calculateReliabilityScore(
        metrics,
        previousVerification.verificationStatus as VerificationStatus,
        preliminaryVerification.verifiedCalculations,
        response.reliabilityScore
      );
      if (currentThought) {
        currentThought.metadata.previousVerification = {
          similarity: previousVerification.previousVerification.similarity,
          status: previousVerification.previousVerification.status,
          confidence: previousVerification.previousVerification.confidence,
          timestamp: previousVerification.previousVerification.timestamp
        };
      }
    }

    const needsDeepVerification = (metrics.confidence < VerificationConfig.CONFIDENCE.VERIFICATION_REQUIRED || params.requestVerification) && !previousVerification.previousVerification;
    if (needsDeepVerification && currentThought) {
      const deepVerificationStep = tracker.start('verification', 'Vérification approfondie', 'Lancement d’une vérification complète', [previousVerificationStep]);
      try {
        const verification = await this.deps.verificationService.deepVerify(
          currentThought,
          params.containsCalculations ?? false,
          false,
          sessionId
        );
        response.verification = verification;
        response.isVerified = ['verified', 'partially_verified'].includes(verification.status);
        response.verificationStatus = verification.status as VerificationDetailedStatus;
        response.reliabilityScore = this.deps.metricsCalculator.calculateReliabilityScore(
          metrics,
          verification.status as VerificationStatus,
          verification.verifiedCalculations,
          response.reliabilityScore
        );
        response.certaintySummary = this.deps.metricsCalculator.generateCertaintySummary(
          verification.status as VerificationStatus,
          response.reliabilityScore
        );
        if (verification.verifiedCalculations?.length) {
          response.thought = this.deps.verificationService.annotateThoughtWithVerifications(
            response.thought,
            verification.verifiedCalculations
          );
          thoughtGraph.updateThoughtContent(thoughtId, response.thought);
        }
        tracker.complete(deepVerificationStep, {
          status: verification.status,
          verifiedCalculations: verification.verifiedCalculations?.length || 0
        });
      } catch (error) {
        tracker.fail(deepVerificationStep, error);
        response.verificationStatus = 'inconclusive';
        response.certaintySummary = `Erreur lors de la vérification: ${error instanceof Error ? error.message : 'Erreur inconnue'}. Niveau de confiance: ${Math.round(metrics.confidence * 100)}%.`;
      }
    }

    if (params.suggestTools) {
      const toolStep = tracker.start('suggestion', 'Suggestion d’outils', 'Identification des outils pertinents', [evaluationStep]);
      response.suggestedTools = await this.deps.toolIntegrator.suggestTools(params.thought);
      tracker.complete(toolStep, { suggestions: response.suggestedTools.length });
    }

    if (params.generateVisualization) {
      const visualizationStep = tracker.start('visualization', 'Visualisation du graphe', 'Construction des vues demandées', [graphStep]);
      try {
        response.visualization = await this.generateVisualization(thoughtGraph, thoughtId, params);
        tracker.complete(visualizationStep, {
          nodeCount: response.visualization?.nodes.length || 0,
          linkCount: response.visualization?.links.length || 0
        });
      } catch (error) {
        tracker.fail(visualizationStep, error);
      }
    }

    const memoryStep = tracker.start('memory', 'Mémorisation', 'Mise à jour de la mémoire persistante', [evaluationStep]);
    const tags = params.thought
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 4)
      .slice(0, 5);
    await Promise.resolve(this.deps.memoryManager.addMemory(response.thought, tags, sessionId));
    response.relevantMemories = await this.deps.memoryManager.getRelevantMemories(params.thought, 3, sessionId);
    tracker.complete(memoryStep, { storedTags: tags.length, relevantMemories: response.relevantMemories.length });

    const suggestionStep = tracker.start('planning', 'Prochaines étapes', 'Génération de suggestions de raisonnement', [evaluationStep]);
    response.suggestedNextSteps = await thoughtGraph.suggestNextSteps(3, sessionId);
    tracker.complete(suggestionStep, { suggestions: response.suggestedNextSteps.length });

    const persistenceStep = tracker.start('persistence', 'Sauvegarde du graphe', 'Persistances des données de session', [graphStep]);
    const graphState = thoughtGraph.exportEnrichedGraph();
    await this.deps.memoryManager.saveGraphState(sessionId, graphState);
    tracker.complete(persistenceStep, { persisted: true });

    response.reasoningTrace = tracker.getSteps();
    response.reasoningTimeline = tracker.getTimeline().map(item => ({
      stepId: item.stepId,
      label: item.label,
      status: item.status,
      timestamp: item.timestamp
    }));

    return { response, sessionId, thoughtGraph };
  }

  private buildHeuristicTraces(thoughtId: string, metrics: ThoughtMetrics): HeuristicTrace[] {
    const breakdown = this.deps.metricsCalculator.getMetricBreakdown(thoughtId);
    const traces: HeuristicTrace[] = [];
    const pushBreakdown = (metric: string, _score?: number) => {
      const metricBreakdown = breakdown?.[metric as keyof typeof breakdown];
      if (!metricBreakdown) return;
      for (const contribution of metricBreakdown.contributions) {
        traces.push({
          metric: `${metric}:${contribution.label}`,
          weight: contribution.weight,
          score: contribution.value,
          rationale: contribution.rationale
        });
      }
    };
    pushBreakdown('confidence', metrics.confidence);
    pushBreakdown('relevance', metrics.relevance);
    pushBreakdown('quality', metrics.quality);
    if (traces.length === 0) {
      traces.push({
        metric: 'confidence',
        weight: metrics.confidence,
        score: metrics.confidence,
        rationale: 'Score calculé sans décomposition détaillée'
      });
      traces.push({
        metric: 'relevance',
        weight: metrics.relevance,
        score: metrics.relevance,
        rationale: 'Score calculé sans décomposition détaillée'
      });
      traces.push({
        metric: 'quality',
        weight: metrics.quality,
        score: metrics.quality,
        rationale: 'Score calculé sans décomposition détaillée'
      });
    }
    return traces;
  }

  private decorateConnections(
    thoughtGraph: ThoughtGraph,
    sourceThoughtId: string,
    requestedConnections: { targetId: string }[],
    heuristics: HeuristicTrace[],
    originatingStepId: string
  ): void {
    if (!requestedConnections.length) {
      return;
    }
    const connectionTargets = new Set(requestedConnections.map(conn => conn.targetId));
    const sourceThought = thoughtGraph.getThought(sourceThoughtId);
    if (!sourceThought) return;
    const timestamp = new Date().toISOString();
    for (const connection of sourceThought.connections) {
      if (!connectionTargets.has(connection.targetId)) continue;
      const justification: ReasoningJustification = {
        summary: 'Connexion pondérée par les heuristiques de la pensée source',
        heuristics,
        timestamp
      };
      connection.createdByStepId = originatingStepId;
      connection.heuristicWeights = heuristics;
      connection.justification = justification;

      const reciprocal = thoughtGraph.getThought(connection.targetId)?.connections.find(c => c.targetId === sourceThoughtId);
      if (reciprocal) {
        reciprocal.createdByStepId = originatingStepId;
        reciprocal.heuristicWeights = heuristics;
        reciprocal.justification = justification;
      }
    }
  }

  private async generateVisualization(
    thoughtGraph: ThoughtGraph,
    thoughtId: string,
    params: SmartThinkingParams
  ) {
    const type = params.visualizationType ?? 'graph';
    const options = params.visualizationOptions || {};
    switch (type) {
      case 'chronological':
        return this.deps.visualizer.generateChronologicalVisualization(thoughtGraph);
      case 'thematic':
        return this.deps.visualizer.generateThematicVisualization(thoughtGraph);
      case 'hierarchical':
        return this.deps.visualizer.generateHierarchicalVisualization(
          thoughtGraph,
          options.centerNode,
          {
            direction: options.direction as any,
            levelSeparation: 100,
            clusterBy: options.clusterBy as any
          }
        );
      case 'force':
        return this.deps.visualizer.generateForceDirectedVisualization(thoughtGraph, {
          clusterBy: options.clusterBy as any,
          forceStrength: 0.5,
          centerNode: options.centerNode
        });
      case 'radial':
        return this.deps.visualizer.generateRadialVisualization(
          thoughtGraph,
          options.centerNode,
          {
            maxDepth: options.maxDepth,
            radialDistance: 120
          }
        );
      case 'graph':
      default:
        return this.deps.visualizer.generateVisualization(thoughtGraph, thoughtId);
    }
  }

  private formatScore(value: number): string {
    return `${Math.round(value * 100)}%`;
  }
}
