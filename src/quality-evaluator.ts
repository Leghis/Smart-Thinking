import {
  BiasFinding,
  CalculationVerificationResult,
  ThoughtMetricBreakdown,
  ThoughtMetrics,
  ThoughtNode,
  VerificationResult,
} from './types';
import { ThoughtGraph } from './thought-graph';
import { MetricsCalculator } from './metrics-calculator';
import { SystemConfig } from './config';
import type { IVerificationService } from './services/verification-service.interface';

export interface QualityEvaluatorOptions {
  metricsCalculator?: MetricsCalculator;
  verificationService?: IVerificationService;
}

export class QualityEvaluator {
  public metricsCalculator: MetricsCalculator;
  private verificationService?: IVerificationService;

  private evaluationCache: Map<string, ThoughtMetrics> = new Map();
  private biasCache: Map<string, BiasFinding[]> = new Map();
  private suggestionCache: Map<string, string[]> = new Map();

  private readonly suggestionMappings = [
    {
      condition: (metrics: ThoughtMetrics) => metrics.confidence < 0.4,
      suggestions: [
        "Renforcez l'argumentation avec des preuves ou des références précises.",
        "Évitez les modalisateurs d'incertitude excessive (\"peut-être\", \"probablement\").",
      ],
    },
    {
      condition: (metrics: ThoughtMetrics) => metrics.relevance < 0.4,
      suggestions: ["Clarifiez le lien avec le contexte ou le sujet principal."],
    },
    {
      condition: (metrics: ThoughtMetrics) => metrics.quality < 0.4,
      suggestions: ['Améliorez la structure et la clarté de cette pensée.'],
    },
  ];

  private readonly typeSuggestionMap: Record<
    string,
    Array<{ condition: (thought: ThoughtNode, connectedThoughts: ThoughtNode[]) => boolean; suggestion: string }>
  > = {
    hypothesis: [
      {
        condition: thought => !thought.content.toLowerCase().includes('si'),
        suggestion: "Formulez l'hypothèse sous forme conditionnelle (si... alors...).",
      },
    ],
    conclusion: [
      {
        condition: (_thought, connectedThoughts) => connectedThoughts.length < 2,
        suggestion: 'Une conclusion devrait synthétiser plusieurs pensées précédentes.',
      },
    ],
    revision: [
      {
        condition: (thought, connectedThoughts) =>
          !connectedThoughts.some(node =>
            thought.connections.some(
              connection =>
                connection.targetId === node.id &&
                ['refines', 'contradicts', 'supports'].includes(connection.type)
            )
          ),
        suggestion: "Une révision devrait clairement indiquer ce qu'elle raffine ou corrige.",
      },
    ],
  };

  constructor(options: QualityEvaluatorOptions = {}) {
    this.metricsCalculator = options.metricsCalculator ?? new MetricsCalculator();
    this.verificationService = options.verificationService;
  }

  public setMetricsCalculator(metricsCalculator: MetricsCalculator): void {
    this.metricsCalculator = metricsCalculator;
    this.evaluationCache.clear();
    this.suggestionCache.clear();
  }

  public setVerificationService(verificationService: IVerificationService): void {
    this.verificationService = verificationService;
  }

  private getVerificationService(): IVerificationService {
    if (!this.verificationService) {
      throw new Error('Aucun service de vérification configuré pour QualityEvaluator.');
    }
    return this.verificationService;
  }

  private hashContent(content: string): string {
    let hash = 5381;
    for (let i = 0; i < content.length; i++) {
      hash = ((hash << 5) + hash) ^ content.charCodeAt(i);
    }
    return (hash >>> 0).toString(36);
  }

  private createCacheKey(thought: ThoughtNode): string {
    const sessionId =
      typeof thought.metadata.sessionId === 'string' ? thought.metadata.sessionId : '';
    const connectionIds = thought.connections
      .map(connection => connection.targetId)
      .sort()
      .join('|');
    return `${thought.id}:${this.hashContent(thought.content)}:${thought.type}:${connectionIds}:${sessionId}`;
  }

  async evaluate(thoughtId: string, thoughtGraph: ThoughtGraph): Promise<ThoughtMetrics> {
    const thought = thoughtGraph.getThought(thoughtId);
    if (!thought) {
      return { confidence: 0.5, relevance: 0.5, quality: 0.5 };
    }

    const cacheKey = this.createCacheKey(thought);
    const cachedMetrics = this.evaluationCache.get(cacheKey);
    if (cachedMetrics) {
      return { ...cachedMetrics };
    }

    const connectedThoughts = thoughtGraph.getConnectedThoughts(thoughtId);
    const [confidence, relevance, quality] = await Promise.all([
      this.metricsCalculator.calculateConfidence(thought, connectedThoughts),
      this.metricsCalculator.calculateRelevance(thought, connectedThoughts),
      this.metricsCalculator.calculateQuality(thought, connectedThoughts),
    ]);

    const metrics: ThoughtMetrics = { confidence, relevance, quality };

    const breakdown = this.metricsCalculator.getMetricBreakdown(thought.id);
    if (breakdown) {
      thought.metadata.metricBreakdown = breakdown;
    }

    this.evaluationCache.set(cacheKey, { ...metrics });
    return metrics;
  }

  public async performPreliminaryVerification(thought: string, explicitlyRequested: boolean = false) {
    return this.getVerificationService().performPreliminaryVerification(thought, explicitlyRequested);
  }

  public async checkPreviousVerification(
    thoughtContent: string,
    sessionId: string = SystemConfig.DEFAULT_SESSION_ID,
    thoughtType?: string,
    connectedThoughtIds?: string[]
  ) {
    return this.getVerificationService().checkPreviousVerification(
      thoughtContent,
      sessionId,
      thoughtType,
      connectedThoughtIds
    );
  }

  public async deepVerify(
    thought: ThoughtNode,
    containsCalculations: boolean = false,
    forceVerification: boolean = false,
    sessionId: string = SystemConfig.DEFAULT_SESSION_ID
  ): Promise<VerificationResult> {
    return this.getVerificationService().deepVerify(
      thought,
      containsCalculations,
      forceVerification,
      sessionId
    );
  }

  public async detectAndVerifyCalculations(content: string) {
    return this.getVerificationService().detectAndVerifyCalculations(content);
  }

  public annotateThoughtWithVerifications(
    thought: string,
    verifications: CalculationVerificationResult[]
  ): string {
    return this.getVerificationService().annotateThoughtWithVerifications(thought, verifications);
  }

  async detectBiases(thought: ThoughtNode): Promise<BiasFinding[]> {
    const cached = this.biasCache.get(thought.id);
    if (cached) {
      return [...cached];
    }

    const biases = await this.metricsCalculator.detectBiases(thought);
    this.biasCache.set(thought.id, [...biases]);
    return biases;
  }

  async suggestImprovements(thought: ThoughtNode, thoughtGraph: ThoughtGraph): Promise<string[]> {
    const cacheKey = this.createCacheKey(thought);
    const cached = this.suggestionCache.get(cacheKey);
    if (cached) {
      return [...cached];
    }

    const metrics = await this.evaluate(thought.id, thoughtGraph);
    const connectedThoughts = thoughtGraph.getConnectedThoughts(thought.id);
    const metricBreakdown = this.metricsCalculator.getMetricBreakdown(thought.id);

    const suggestions: string[] = [];

    for (const mapping of this.suggestionMappings) {
      if (mapping.condition(metrics)) {
        suggestions.push(...mapping.suggestions);
      }
    }

    const content = thought.content.toLowerCase();
    const wordCount = content.split(/\s+/).length;

    if (wordCount < 10) {
      suggestions.push('Développez davantage cette pensée, elle est trop courte pour être complète.');
    } else if (wordCount > SystemConfig.MAX_THOUGHT_LENGTH / 50) {
      suggestions.push('Considérez diviser cette pensée en plusieurs parties plus ciblées.');
    }

    const findContribution = (
      metric: keyof ThoughtMetricBreakdown,
      key: string
    ): number | undefined =>
      metricBreakdown?.[metric]?.contributions.find(contribution => contribution.key === key)?.value;

    const modifierValue = findContribution('confidence', 'confidence.modifier');
    if (modifierValue !== undefined && modifierValue < 0.5) {
      suggestions.push("Clarifiez les affirmations ambiguës et réduisez les modalisateurs d'incertitude.");
    }
    const structuralValue = findContribution('confidence', 'confidence.structural');
    if (structuralValue !== undefined && structuralValue < 0.6) {
      suggestions.push('Ajoutez des éléments factuels (chiffres, références) pour renforcer la crédibilité.');
    }

    const qualityStructure = findContribution('quality', 'quality.structural');
    if (qualityStructure !== undefined && qualityStructure < 0.6) {
      suggestions.push("Réorganisez la pensée pour qu'elle soit plus structurée et facile à suivre.");
    }
    const qualityCoherence = findContribution('quality', 'quality.coherence');
    if (qualityCoherence !== undefined && qualityCoherence < 0.6) {
      suggestions.push('Reliez explicitement cette pensée aux éléments antérieurs pour améliorer la cohérence.');
    }

    const keywordOverlap = findContribution('relevance', 'relevance.keyword');
    if (keywordOverlap !== undefined && keywordOverlap < 0.5) {
      suggestions.push('Réutilisez les concepts clés des pensées reliées pour augmenter la pertinence.');
    }

    const biases = await this.detectBiases(thought);
    if (biases.length > 0) {
      suggestions.push(`Attention aux biais potentiels: ${biases.map(bias => bias.type).join(', ')}.`);
    }

    if (thought.type in this.typeSuggestionMap) {
      for (const mapping of this.typeSuggestionMap[thought.type]) {
        if (mapping.condition(thought, connectedThoughts)) {
          suggestions.push(mapping.suggestion);
        }
      }
    }

    const hasContradictions = connectedThoughts.some(node =>
      thought.connections.some(
        connection => connection.targetId === node.id && connection.type === 'contradicts'
      )
    );
    if (hasContradictions) {
      suggestions.push("Résolvez ou clarifiez les contradictions avec d'autres pensées.");
    }

    const uniqueSuggestions = Array.from(new Set(suggestions));
    this.suggestionCache.set(cacheKey, [...uniqueSuggestions]);
    return uniqueSuggestions;
  }

  public clear(): void {
    this.evaluationCache.clear();
    this.biasCache.clear();
    this.suggestionCache.clear();
  }

  public invalidate(thoughtId: string): void {
    const prefix = `${thoughtId}:`;
    for (const key of this.evaluationCache.keys()) {
      if (key.startsWith(prefix)) {
        this.evaluationCache.delete(key);
      }
    }
    this.biasCache.delete(thoughtId);
    for (const key of this.suggestionCache.keys()) {
      if (key.startsWith(prefix)) {
        this.suggestionCache.delete(key);
      }
    }
  }
}
