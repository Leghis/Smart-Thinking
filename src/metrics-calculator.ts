import {
  CONFIDENCE_WEIGHTS,
  CONNECTION_WEIGHTS,
  METRIC_THRESHOLDS,
  NEGATIVE_WORDS,
  PATTERNS,
  POSITIVE_WORDS,
  QUALITY_INDICATORS,
  QUALITY_WEIGHTS,
  RELIABILITY_WEIGHTS,
  RELEVANCE_WEIGHTS,
  TYPE_ADJUSTMENTS,
  TYPE_SCORES,
  UNCERTAINTY_MODIFIERS,
  CERTAINTY_MODIFIERS,
  VERIFICATION_SCORE,
} from './constants';
import {
  BiasFinding,
  CalculationVerificationResult,
  Connection,
  MetricBreakdown,
  MetricContribution,
  ThoughtMetricBreakdown,
  ThoughtMetrics,
  ThoughtNode,
  ThoughtType,
  VerificationStatus,
} from './types';
import {
  computeTokenOverlap,
  extractAndWeightContextKeywords as weightContextKeywords,
  extractKeywords,
} from './keywords';
import {
  detectBiases as detectBiasesInThought,
  determineVerificationRequirements as determineRequirements,
  evaluateVerificationHeuristics as evaluateHeuristics,
  generateCertaintySummary as buildCertaintySummary,
  HeuristicVerificationResult,
  VerificationRequirements,
} from './verification-needs';

export interface TypeAdjustment {
  confidence: number;
  quality: number;
  coherence: number;
}

export interface MetricsCalculatorConfig {
  confidenceWeights: {
    modifierAnalysis: number;
    thoughtType: number;
    structuralIndicators: number;
    sentimentBalance: number;
  };
  relevanceWeights: {
    keywordOverlap: number;
    connectionStrength: number;
  };
  qualityWeights: {
    wordIndicators: number;
    typeSpecificIndicators: number;
    structuralBalance: number;
    coherence: number;
  };
  typeAdjustments: Record<ThoughtType, TypeAdjustment>;
  tfIdf: {
    minFrequency: number;
    maxDocumentPercentage: number;
  };
}

export interface MetricsCalculatorOptions {
  confidenceWeights?: Partial<MetricsCalculatorConfig['confidenceWeights']>;
  relevanceWeights?: Partial<MetricsCalculatorConfig['relevanceWeights']>;
  qualityWeights?: Partial<MetricsCalculatorConfig['qualityWeights']>;
  typeAdjustments?: Partial<Record<ThoughtType, Partial<TypeAdjustment>>>;
  tfIdf?: Partial<MetricsCalculatorConfig['tfIdf']>;
}

const WHITESPACE = /\s+/;
const ESCAPE_REGEX = /[.*+?^${}()|[\]\\]/g;
const TYPE_ADJUSTMENT_LABEL = 'Ajustement type';

function escapeTerm(term: string): string {
  return term.replace(ESCAPE_REGEX, '\\$&');
}

function buildWordRegex(words: readonly string[]): RegExp {
  return new RegExp(`\\b(?:${words.map(escapeTerm).join('|')})\\b`, 'gi');
}

function buildIndicatorRegex(words: readonly string[]): RegExp {
  return new RegExp(words.map(escapeTerm).join('|'), 'gi');
}

function normalizeWeightObject(
  weights: Record<string, number>,
  defaults: Record<string, number>,
  warn: (message: string) => void,
  label: string
): void {
  const sum = Object.values(weights).reduce(
    (total, weight) => total + (Number.isFinite(weight) ? weight : 0),
    0
  );

  if (sum <= 0) {
    warn(`Poids de ${label} invalides (somme ${sum}) : retour aux valeurs par défaut.`);
    for (const key of Object.keys(weights)) {
      weights[key] = defaults[key] ?? 0;
    }
    return;
  }

  if (Math.abs(sum - 1) > METRIC_THRESHOLDS.WEIGHT_TOLERANCE) {
    warn(`Poids de ${label} normalisés (somme initiale ${sum}).`);
    for (const key of Object.keys(weights)) {
      weights[key] = weights[key] / sum;
    }
  }
}

function mergeTypeAdjustments(
  custom?: Partial<Record<ThoughtType, Partial<TypeAdjustment>>>
): Record<ThoughtType, TypeAdjustment> {
  const merged = {} as Record<ThoughtType, TypeAdjustment>;
  for (const type of Object.keys(TYPE_ADJUSTMENTS) as ThoughtType[]) {
    merged[type] = { ...TYPE_ADJUSTMENTS[type], ...(custom?.[type] ?? {}) };
  }
  return merged;
}

export class MetricsCalculator {
  private metricBreakdowns: Map<string, ThoughtMetricBreakdown> = new Map();
  private readonly config: MetricsCalculatorConfig;
  private readonly uncertaintyRegex: RegExp;
  private readonly certaintyRegex: RegExp;
  private readonly positiveWordRegex: RegExp;
  private readonly negativeWordRegex: RegExp;
  private readonly qualityRegexes: Record<ThoughtType, { positive: RegExp; negative: RegExp }>;
  private hasWarnedWeights = false;

  constructor(customConfig: MetricsCalculatorOptions = {}) {
    this.config = {
      confidenceWeights: { ...CONFIDENCE_WEIGHTS, ...customConfig.confidenceWeights },
      relevanceWeights: { ...RELEVANCE_WEIGHTS, ...customConfig.relevanceWeights },
      qualityWeights: { ...QUALITY_WEIGHTS, ...customConfig.qualityWeights },
      typeAdjustments: mergeTypeAdjustments(customConfig.typeAdjustments),
      tfIdf: { minFrequency: 2, maxDocumentPercentage: 0.7, ...customConfig.tfIdf },
    };

    this.normalizeWeights();

    this.uncertaintyRegex = buildWordRegex(UNCERTAINTY_MODIFIERS);
    this.certaintyRegex = buildWordRegex(CERTAINTY_MODIFIERS);
    this.positiveWordRegex = buildWordRegex(POSITIVE_WORDS);
    this.negativeWordRegex = buildWordRegex(NEGATIVE_WORDS);

    this.qualityRegexes = {} as Record<ThoughtType, { positive: RegExp; negative: RegExp }>;
    for (const type of Object.keys(QUALITY_INDICATORS) as ThoughtType[]) {
      const indicators = QUALITY_INDICATORS[type];
      this.qualityRegexes[type] = {
        positive: buildIndicatorRegex(indicators.positive),
        negative: buildIndicatorRegex(indicators.negative),
      };
    }
  }

  private normalizeWeights(): void {
    const warnOnce = (message: string): void => {
      if (!this.hasWarnedWeights) {
        this.hasWarnedWeights = true;
        console.warn(`MetricsCalculator: ${message}`);
      }
    };
    normalizeWeightObject(this.config.confidenceWeights, CONFIDENCE_WEIGHTS, warnOnce, 'confiance');
    normalizeWeightObject(this.config.relevanceWeights, RELEVANCE_WEIGHTS, warnOnce, 'pertinence');
    normalizeWeightObject(this.config.qualityWeights, QUALITY_WEIGHTS, warnOnce, 'qualité');
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private countMatches(content: string, regex: RegExp): number {
    return content.match(regex)?.length ?? 0;
  }

  async calculateConfidence(thought: ThoughtNode, connectedThoughts: ThoughtNode[] = []): Promise<number> {
    const breakdown = this.computeConfidenceBreakdown(thought, connectedThoughts);
    this.storeBreakdown(thought.id, 'confidence', breakdown);
    return breakdown.score;
  }

  private computeConfidenceBreakdown(
    thought: ThoughtNode,
    connectedThoughts: ThoughtNode[]
  ): MetricBreakdown {
    const content = thought.content.toLowerCase();
    const weights = this.config.confidenceWeights;
    const typeAdjustment = this.config.typeAdjustments[thought.type]?.confidence ?? 1;

    const uncertaintyCount = this.countMatches(content, this.uncertaintyRegex);
    const certaintyCount = this.countMatches(content, this.certaintyRegex);
    const totalModifiers = uncertaintyCount + certaintyCount;
    const modifierScore = totalModifiers === 0 ? 0.5 : this.clamp(certaintyCount / totalModifiers, 0, 1);

    const referenceMatches = content.match(PATTERNS.REFERENCES) ?? [];
    const numberMatches = content.match(PATTERNS.NUMBERS) ?? [];
    const referenceScore = this.clamp(0.5 + Math.min(referenceMatches.length * 0.05, 0.2), 0, 1);
    const numberScore = Math.min(numberMatches.length * 0.03, 0.15);
    const structuralScore = this.clamp(referenceScore + numberScore, 0.3, 0.9);

    const typeScore = TYPE_SCORES[thought.type] ?? 0.65;

    const positiveMatches = content.match(this.positiveWordRegex) ?? [];
    const negativeMatches = content.match(this.negativeWordRegex) ?? [];
    const totalSentiment = positiveMatches.length + negativeMatches.length;
    const sentimentBalance =
      totalSentiment === 0
        ? 0.5
        : this.clamp(
            0.5 + (positiveMatches.length - negativeMatches.length) / (totalSentiment * 2),
            0,
            1
          );

    const connectionBoost = this.computeConnectionBoost(thought, connectedThoughts);

    const contributions: MetricContribution[] = [
      {
        key: 'confidence.modifier',
        label: 'Modalisateurs de certitude',
        weight: weights.modifierAnalysis,
        value: modifierScore,
        impact: modifierScore * weights.modifierAnalysis,
        rationale:
          totalModifiers === 0
            ? 'Peu de modalisateurs explicites détectés.'
            : `${certaintyCount} marqueurs de certitude contre ${uncertaintyCount} d'incertitude.`,
      },
      {
        key: 'confidence.structural',
        label: 'Structure factuelle',
        weight: weights.structuralIndicators,
        value: structuralScore,
        impact: structuralScore * weights.structuralIndicators,
        rationale: `${referenceMatches.length} références et ${numberMatches.length} éléments chiffrés détectés.`,
      },
      {
        key: 'confidence.type',
        label: 'Type de pensée',
        weight: weights.thoughtType,
        value: typeScore,
        impact: typeScore * weights.thoughtType,
        rationale: `Le type ${thought.type} est associé à un niveau de certitude ${typeScore >= 0.7 ? 'élevé' : 'modéré'}.`,
      },
      {
        key: 'confidence.sentiment',
        label: 'Équilibre lexical',
        weight: weights.sentimentBalance,
        value: sentimentBalance,
        impact: sentimentBalance * weights.sentimentBalance,
        rationale:
          totalSentiment === 0
            ? 'Aucun lexique évaluatif particulier.'
            : `${positiveMatches.length} termes positifs contre ${negativeMatches.length} négatifs.`,
      },
    ];

    if (connectionBoost.impact !== 0) {
      contributions.push({
        key: 'confidence.connection',
        label: 'Contexte des connexions',
        weight: 0,
        value: this.clamp(0.5 + connectionBoost.impact, 0, 1),
        impact: connectionBoost.impact,
        rationale: connectionBoost.rationale,
      });
    }

    const baseScore = contributions.reduce((sum, item) => sum + item.impact, 0);
    const adjustedScore = this.clamp(
      baseScore * typeAdjustment,
      METRIC_THRESHOLDS.MIN_CONFIDENCE,
      METRIC_THRESHOLDS.MAX_CONFIDENCE
    );

    contributions.push({
      key: 'confidence.typeAdjustment',
      label: TYPE_ADJUSTMENT_LABEL,
      weight: typeAdjustment,
      value: this.clamp(typeAdjustment, 0, 2),
      impact: adjustedScore - baseScore,
      rationale: `Le type ${thought.type} applique un facteur ${typeAdjustment.toFixed(2)}.`,
    });

    return {
      score: adjustedScore,
      contributions,
      summary: this.buildMetricSummary('confiance', adjustedScore, contributions),
    };
  }

  private computeConnectionBoost(
    thought: ThoughtNode,
    connectedThoughts: ThoughtNode[]
  ): { impact: number; rationale: string } {
    if (connectedThoughts.length === 0 || thought.connections.length === 0) {
      return { impact: 0, rationale: '' };
    }

    const byId = new Map(connectedThoughts.map(node => [node.id, node]));
    let supportImpact = 0;
    let contradictionImpact = 0;

    for (const connection of thought.connections) {
      const neighbor = byId.get(connection.targetId);
      if (!neighbor) {
        continue;
      }
      const overlap = computeTokenOverlap(thought.content, neighbor.content);
      const isNegative = connection.type === 'contradicts' || connection.type === 'questions';
      if (isNegative) {
        contradictionImpact = Math.min(
          contradictionImpact + connection.strength * (0.05 + overlap * 0.1),
          0.15,
        );
      } else {
        supportImpact = Math.max(supportImpact, Math.min(overlap * 0.1, 0.1));
      }
    }

    const impact = this.clamp(supportImpact - contradictionImpact, -0.15, 0.15);
    if (impact === 0) {
      return { impact: 0, rationale: '' };
    }
    return {
      impact,
      rationale:
        impact > 0
          ? 'Soutien lexical pondéré des pensées reliées.'
          : 'Contradictions reliées réduisant la certitude.',
    };
  }

  async calculateRelevance(thought: ThoughtNode, connectedThoughts: ThoughtNode[]): Promise<number> {
    const breakdown = this.computeRelevanceBreakdown(thought, connectedThoughts);
    this.storeBreakdown(thought.id, 'relevance', breakdown);
    return breakdown.score;
  }

  private computeRelevanceBreakdown(
    thought: ThoughtNode,
    connectedThoughts: ThoughtNode[]
  ): MetricBreakdown {
    const contextContent = connectedThoughts.map(node => node.content).join(' ');
    const keywordWeights = this.extractAndWeightContextKeywords(contextContent);
    const thoughtKeywords = extractKeywords(thought.content);

    let keywordScore = 0;
    let totalWeight = 0;
    for (const [keyword, weight] of Object.entries(keywordWeights)) {
      totalWeight += weight;
      if (thoughtKeywords.includes(keyword)) {
        keywordScore += weight;
      }
    }
    const keywordOverlapScore = totalWeight > 0 ? keywordScore / totalWeight : 0.4;

    const { score: connectionScore, outbound, inbound } = this.computeConnectionScore(
      thought,
      connectedThoughts
    );

    const weights = this.config.relevanceWeights;
    const baseScore =
      keywordOverlapScore * weights.keywordOverlap + connectionScore * weights.connectionStrength;

    let typeAdjustment = 1;
    if (thought.type === 'revision') typeAdjustment = 1.1;
    if (thought.type === 'meta') typeAdjustment = 0.9;

    const adjustedScore = Math.max(
      METRIC_THRESHOLDS.MIN_RELEVANCE,
      Math.min(baseScore * typeAdjustment, METRIC_THRESHOLDS.MAX_RELEVANCE)
    );

    const contributions: MetricContribution[] = [
      {
        key: 'relevance.keyword',
        label: 'Recoupement lexical',
        weight: weights.keywordOverlap,
        value: this.clamp(keywordOverlapScore, 0, 1),
        impact: keywordOverlapScore * weights.keywordOverlap,
        rationale:
          totalWeight === 0
            ? 'Peu de mots-clés partagés avec le contexte.'
            : `${Math.round(keywordScore * 100) / 100} poids cumulés sur ${Math.round(totalWeight * 100) / 100}.`,
      },
      {
        key: 'relevance.connection',
        label: 'Connexions',
        weight: weights.connectionStrength,
        value: this.clamp(connectionScore, 0, 1),
        impact: connectionScore * weights.connectionStrength,
        rationale: `Connexions sortantes ${outbound.toFixed(2)} | entrantes non réciproques ${inbound.toFixed(2)}.`,
      },
      {
        key: 'relevance.typeAdjustment',
        label: TYPE_ADJUSTMENT_LABEL,
        weight: typeAdjustment,
        value: this.clamp(typeAdjustment, 0, 2),
        impact: adjustedScore - baseScore,
        rationale:
          typeAdjustment === 1
            ? 'Type ne modifiant pas la pertinence.'
            : `Le type ${thought.type} applique un facteur ${typeAdjustment.toFixed(2)}.`,
      },
    ];

    return {
      score: adjustedScore,
      contributions,
      summary: this.buildMetricSummary('pertinence', adjustedScore, contributions),
    };
  }

  private computeConnectionScore(
    thought: ThoughtNode,
    connectedThoughts: ThoughtNode[]
  ): { score: number; outbound: number; inbound: number } {
    const outboundEdges: number[] = [];
    const inboundEdges: number[] = [];
    const negativeEdges: number[] = [];
    const reciprocalTargets = new Set<string>();

    const signedWeight = (type: Connection['type'], strength: number): number =>
      strength * (CONNECTION_WEIGHTS[type] ?? 0.5);

    for (const connection of thought.connections) {
      reciprocalTargets.add(connection.targetId);
      const weight = signedWeight(connection.type, connection.strength);
      outboundEdges.push(weight);
      if (connection.type === 'contradicts' || connection.type === 'questions') {
        negativeEdges.push(weight);
      }
    }

    for (const node of connectedThoughts) {
      if (reciprocalTargets.has(node.id)) {
        continue;
      }
      for (const connection of node.connections) {
        if (connection.targetId === thought.id) {
          const weight = signedWeight(connection.type, connection.strength);
          inboundEdges.push(weight);
          if (connection.type === 'contradicts' || connection.type === 'questions') {
            negativeEdges.push(weight);
          }
        }
      }
    }

    const edges = [...outboundEdges, ...inboundEdges];
    const average = (values: number[], fallback: number): number =>
      values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : fallback;

    const positiveAverage = average(
      edges.filter(edge => !negativeEdges.includes(edge)),
      0.5,
    );
    const negativePenalty = negativeEdges.length > 0 ? average(negativeEdges, 0) : 0;

    return {
      score: this.clamp(positiveAverage - negativePenalty * 0.5, 0, 1),
      outbound: average(outboundEdges, 0.5),
      inbound: average(inboundEdges, 0.5),
    };
  }

  async calculateQuality(thought: ThoughtNode, connectedThoughts: ThoughtNode[] = []): Promise<number> {
    const breakdown = this.computeQualityBreakdown(thought, connectedThoughts);
    this.storeBreakdown(thought.id, 'quality', breakdown);
    return breakdown.score;
  }

  private computeQualityBreakdown(
    thought: ThoughtNode,
    connectedThoughts: ThoughtNode[]
  ): MetricBreakdown {
    const content = thought.content.toLowerCase();
    const weights = this.config.qualityWeights;
    const typeAdjustment = this.config.typeAdjustments[thought.type]?.quality ?? 1;

    const positiveMatches = content.match(this.positiveWordRegex) ?? [];
    const negativeMatches = content.match(this.negativeWordRegex) ?? [];
    const totalMatches = positiveMatches.length + negativeMatches.length;
    const lexicalScore =
      totalMatches === 0
        ? 0.5
        : this.clamp(
            0.5 + (positiveMatches.length - negativeMatches.length) / (totalMatches * 2),
            0.25,
            0.95
          );

    const qualityRegex = this.qualityRegexes[thought.type] ?? this.qualityRegexes.regular;
    const positiveTypeMatches = content.match(qualityRegex.positive) ?? [];
    const negativeTypeMatches = content.match(qualityRegex.negative) ?? [];
    const typeIndicatorScore = this.clamp(
      0.5 + (positiveTypeMatches.length - negativeTypeMatches.length) * 0.1,
      0.2,
      0.95
    );

    const wordsArray = content.split(WHITESPACE).filter(Boolean);
    const wordCount = wordsArray.length;
    const sentenceCount = content.split(PATTERNS.SENTENCES).filter(sentence => sentence.trim().length > 0)
      .length;
    const avgSentenceLength = sentenceCount === 0 ? wordCount : wordCount / sentenceCount;

    let structuralScore: number;
    if (wordCount < 5) structuralScore = 0.3;
    else if (wordCount > 300) structuralScore = 0.45;
    else if (wordCount >= 150) structuralScore = 0.65;
    else if (wordCount >= 40) structuralScore = 0.8;
    else structuralScore = 0.55;

    if (avgSentenceLength > 28 || (avgSentenceLength < 6 && sentenceCount > 1)) {
      structuralScore *= 0.85;
    }

    if (PATTERNS.ORDERED_MARKERS.test(content)) {
      structuralScore = this.clamp(structuralScore + 0.1, 0, 1);
    }

    let coherenceScore = 0.5;
    if (thought.connections.length > 0) {
      const avgStrength =
        thought.connections.reduce((sum, connection) => sum + connection.strength, 0) /
        thought.connections.length;
      coherenceScore = this.clamp(0.5 + avgStrength * 0.3, 0.4, 0.9);
    }
    if (connectedThoughts.length > 0) {
      const overlap = connectedThoughts.reduce(
        (acc, node) => acc + computeTokenOverlap(thought.content, node.content),
        0
      );
      coherenceScore = this.clamp(coherenceScore + overlap * 0.1, 0.4, 0.95);
    }

    const baseScore =
      lexicalScore * weights.wordIndicators +
      typeIndicatorScore * weights.typeSpecificIndicators +
      structuralScore * weights.structuralBalance +
      coherenceScore * weights.coherence;

    const adjustedScore = this.clamp(
      baseScore * typeAdjustment,
      METRIC_THRESHOLDS.MIN_QUALITY,
      METRIC_THRESHOLDS.MAX_QUALITY
    );

    const contributions: MetricContribution[] = [
      {
        key: 'quality.lexical',
        label: 'Lexique qualitatif',
        weight: weights.wordIndicators,
        value: lexicalScore,
        impact: lexicalScore * weights.wordIndicators,
        rationale:
          totalMatches === 0
            ? 'Aucun terme qualitatif spécifique détecté.'
            : `${positiveMatches.length} indices positifs vs ${negativeMatches.length} négatifs.`,
      },
      {
        key: 'quality.typeIndicators',
        label: 'Indicateurs spécifiques au type',
        weight: weights.typeSpecificIndicators,
        value: typeIndicatorScore,
        impact: typeIndicatorScore * weights.typeSpecificIndicators,
        rationale: `${positiveTypeMatches.length} indices attendus, ${negativeTypeMatches.length} signaux défavorables.`,
      },
      {
        key: 'quality.structural',
        label: 'Structure',
        weight: weights.structuralBalance,
        value: structuralScore,
        impact: structuralScore * weights.structuralBalance,
        rationale: `${wordCount} mots, ${sentenceCount} phrases (longueur moyenne ${avgSentenceLength.toFixed(1)}).`,
      },
      {
        key: 'quality.coherence',
        label: 'Cohérence',
        weight: weights.coherence,
        value: coherenceScore,
        impact: coherenceScore * weights.coherence,
        rationale:
          thought.connections.length === 0
            ? "Peu de liens explicites avec d'autres pensées."
            : `${thought.connections.length} connexions utilisées pour valider la cohérence.`,
      },
      {
        key: 'quality.typeAdjustment',
        label: TYPE_ADJUSTMENT_LABEL,
        weight: typeAdjustment,
        value: this.clamp(typeAdjustment, 0, 2),
        impact: adjustedScore - baseScore,
        rationale:
          typeAdjustment === 1
            ? 'Type sans ajustement spécifique.'
            : `Le type ${thought.type} applique un facteur ${typeAdjustment.toFixed(2)}.`,
      },
    ];

    return {
      score: adjustedScore,
      contributions,
      summary: this.buildMetricSummary('qualité', adjustedScore, contributions),
    };
  }

  private extractAndWeightContextKeywords(text: string): Record<string, number> {
    return weightContextKeywords(text);
  }

  private buildMetricSummary(
    metricLabel: string,
    score: number,
    contributions: MetricContribution[]
  ): string {
    const formattedScore = (Math.round(score * 100) / 100).toFixed(2);
    const descriptors = contributions
      .filter(item => item.label !== TYPE_ADJUSTMENT_LABEL)
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3)
      .map(item => `${item.label.toLowerCase()} (${(item.value * 100).toFixed(0)}%)`);

    return `Score de ${metricLabel} ${formattedScore}. Principaux facteurs : ${descriptors.join(', ')}.`;
  }

  private storeBreakdown(
    thoughtId: string,
    metric: keyof ThoughtMetricBreakdown,
    breakdown: MetricBreakdown
  ): void {
    const existing = this.metricBreakdowns.get(thoughtId) ?? {};
    this.metricBreakdowns.set(thoughtId, { ...existing, [metric]: breakdown });
  }

  public getMetricBreakdown(thoughtId: string): ThoughtMetricBreakdown | undefined {
    const breakdown = this.metricBreakdowns.get(thoughtId);
    if (!breakdown) {
      return undefined;
    }
    return {
      confidence: breakdown.confidence
        ? { ...breakdown.confidence, contributions: [...breakdown.confidence.contributions] }
        : undefined,
      relevance: breakdown.relevance
        ? { ...breakdown.relevance, contributions: [...breakdown.relevance.contributions] }
        : undefined,
      quality: breakdown.quality
        ? { ...breakdown.quality, contributions: [...breakdown.quality.contributions] }
        : undefined,
    };
  }

  public clearMetricBreakdown(thoughtId?: string): void {
    if (thoughtId) {
      this.metricBreakdowns.delete(thoughtId);
    } else {
      this.metricBreakdowns.clear();
    }
  }

  public clear(): void {
    this.metricBreakdowns.clear();
  }

  /**
   * `previousScore` must be a genuine prior reliability score; passing the current
   * score would double-count the same evidence through the smoothing factor.
   */
  calculateReliabilityScore(
    metrics: ThoughtMetrics,
    verificationStatus: VerificationStatus,
    calculationResults?: CalculationVerificationResult[],
    previousScore?: number
  ): number {
    const verificationScore = VERIFICATION_SCORE[verificationStatus] ?? 0.45;
    const weights =
      calculationResults && calculationResults.length > 0
        ? RELIABILITY_WEIGHTS.withCalculations
        : RELIABILITY_WEIGHTS.withoutCalculations;

    let rawScore =
      weights.confidence * metrics.confidence +
      weights.relevance * metrics.relevance +
      weights.quality * metrics.quality +
      weights.verification * verificationScore;

    if (calculationResults && calculationResults.length > 0) {
      const correctCalculations = calculationResults.filter(result => result.isCorrect).length;
      rawScore += (correctCalculations / calculationResults.length) * 0.1;
    }

    if (verificationStatus === 'verified' && metrics.confidence > METRIC_THRESHOLDS.HIGH_CONFIDENCE) {
      rawScore *= 1.1;
    } else if (verificationStatus === 'absence_of_information') {
      rawScore = Math.min(rawScore, 0.75);
    }

    if (previousScore !== undefined) {
      rawScore = 0.7 * rawScore + 0.3 * previousScore;
    }

    return this.clamp(rawScore, METRIC_THRESHOLDS.MIN_RELIABILITY, METRIC_THRESHOLDS.MAX_RELIABILITY);
  }

  extractKeywords(text: string): string[] {
    return extractKeywords(text);
  }

  generateCertaintySummary(status: VerificationStatus, confidence: number = 0.5): string {
    return buildCertaintySummary(status, confidence);
  }

  async detectBiases(thought: ThoughtNode): Promise<BiasFinding[]> {
    return detectBiasesInThought(thought);
  }

  evaluateVerificationHeuristics(thought: ThoughtNode): HeuristicVerificationResult {
    return evaluateHeuristics(thought);
  }

  async determineVerificationRequirements(content: string): Promise<VerificationRequirements> {
    return determineRequirements(content);
  }
}
