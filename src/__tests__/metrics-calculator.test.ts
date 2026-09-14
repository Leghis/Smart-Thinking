import { MetricsCalculator } from '../metrics-calculator';
import { detectBiases } from '../verification-needs';
import { extractAndWeightContextKeywords } from '../keywords';
import { ThoughtNode, ThoughtMetrics } from '../types';

const createThought = (
  id: string,
  content: string,
  type: ThoughtNode['type'] = 'regular'
): ThoughtNode => ({
  id,
  content,
  type,
  timestamp: new Date(),
  connections: [],
  metrics: { confidence: 0.5, relevance: 0.5, quality: 0.5 } as ThoughtMetrics,
  metadata: {},
});

describe('MetricsCalculator heuristics', () => {
  let calculator: MetricsCalculator;

  beforeEach(() => {
    calculator = new MetricsCalculator();
  });

  it('computes confident breakdown for assertive statements', async () => {
    const assertiveThought = createThought(
      'conf-high',
      'Il est clairement démontré par deux études indépendantes publiées en 2024 que cette méthode réduit les erreurs de 25 %.'
    );

    const confidence = await calculator.calculateConfidence(assertiveThought, []);
    expect(confidence).toBeGreaterThan(0.6);

    const breakdown = calculator.getMetricBreakdown(assertiveThought.id);
    expect(breakdown?.confidence?.contributions.length).toBeGreaterThan(0);
    const structuralContribution = breakdown?.confidence?.contributions.find(
      c => c.key === 'confidence.structural'
    );
    expect(structuralContribution?.value).toBeGreaterThan(0.5);
  });

  it('reduces confidence for speculative statements', async () => {
    const speculativeThought = createThought(
      'conf-low',
      'Peut-être que cette hypothèse fonctionne, mais il faudra vérifier si certains éléments se confirment.'
    );

    const confidence = await calculator.calculateConfidence(speculativeThought, []);
    expect(confidence).toBeLessThan(0.55);
  });

  it('captures lexical quality signals', async () => {
    const wellStructured = createThought(
      'quality-high',
      'Premièrement, nous posons le cadre. Ensuite, nous évaluons les résultats mesurés. En conclusion, cette démarche reste cohérente.'
    );

    const quality = await calculator.calculateQuality(wellStructured, []);
    expect(quality).toBeGreaterThan(0.5);
  });

  it('exposes stable keys and sane weights/impacts for every contribution', async () => {
    const thought = createThought(
      'keys',
      'Cette analyse rigoureuse démontre clairement que 42 % des cas suivent une tendance cohérente.'
    );
    const neighbor = createThought('keys-neighbor', 'Analyse rigoureuse des tendances cohérentes observées.');
    thought.connections.push({ targetId: neighbor.id, type: 'supports', strength: 0.9 });

    await calculator.calculateConfidence(thought, [neighbor]);
    await calculator.calculateRelevance(thought, [neighbor]);
    await calculator.calculateQuality(thought, [neighbor]);

    const breakdown = calculator.getMetricBreakdown(thought.id)!;
    for (const metric of ['confidence', 'relevance', 'quality'] as const) {
      const contributions = breakdown[metric]!.contributions;
      expect(contributions.length).toBeGreaterThan(0);
      for (const contribution of contributions) {
        expect(typeof contribution.key).toBe('string');
        expect(contribution.weight).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(contribution.value)).toBe(true);
        expect(Number.isFinite(contribution.impact)).toBe(true);
      }
    }
  });

  it('never produces NaN/Infinity when custom weights sum to zero', async () => {
    const zeroWeights = { modifierAnalysis: 0, thoughtType: 0, structuralIndicators: 0, sentimentBalance: 0 };
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const customCalculator = new MetricsCalculator({
      confidenceWeights: zeroWeights,
      relevanceWeights: { keywordOverlap: 0, connectionStrength: 0 },
    });

    const thought = createThought('zero-weights', 'Affirmation factuelle avec 12 éléments.');
    const confidence = await customCalculator.calculateConfidence(thought, []);
    const relevance = await customCalculator.calculateRelevance(thought, []);

    expect(Number.isFinite(confidence)).toBe(true);
    expect(Number.isFinite(relevance)).toBe(true);
    expect(confidence).toBeGreaterThanOrEqual(0.1);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });

  it('does not mutate the caller-provided configuration', () => {
    const custom = {
      confidenceWeights: { modifierAnalysis: 0.5, thoughtType: 0.5, structuralIndicators: 0.5, sentimentBalance: 0.5 },
      typeAdjustments: { hypothesis: { confidence: 0.5, quality: 1, coherence: 1 } },
    };
    const snapshot = JSON.parse(JSON.stringify(custom));

    new MetricsCalculator(custom);

    expect(custom).toEqual(snapshot);
  });

  it('detects heuristic bias patterns', async () => {
    const biasedThought = createThought(
      'bias-test',
      "Je sais absolument que ces gens sont toujours dans l'erreur, c'est totalement évident !"
    );

    const biases = await calculator.detectBiases(biasedThought);
    expect(biases.length).toBeGreaterThan(0);
    expect(biases[0].score).toBeGreaterThan(0.3);
    expect(detectBiases(biasedThought).length).toBeGreaterThan(0);
  });

  it('determines verification requirements heuristically with real tool names', async () => {
    const factualContent = 'Selon le rapport de 2023, 62 % des cas ont augmenté de 15 points.';
    const requirements = await calculator.determineVerificationRequirements(factualContent);
    expect(requirements.needsFactCheck).toBe(true);
    expect(requirements.needsSourceCheck).toBe(true);
    expect(requirements.priority).toBe('high');
    expect(requirements.suggestedTools).toEqual(
      expect.arrayContaining(['web_search', 'source_check'])
    );
    expect(new Set(requirements.suggestedTools).size).toBe(requirements.suggestedTools.length);

    const mathRequirements = await calculator.determineVerificationRequirements('2 + 2 = 4');
    expect(mathRequirements.suggestedTools).toContain('calculator');
    expect(mathRequirements.suggestedTools).not.toContain('math_evaluator');
  });

  it('keeps heuristic verification honest: categorical language is never verified', () => {
    const categorical = createThought(
      'heuristic-categorical',
      'Toujours, cette méthode est nécessairement correcte et la preuve est indiscutable.'
    );
    const categoricalResult = calculator.evaluateVerificationHeuristics(categorical);
    expect(categoricalResult.status).not.toBe('verified');
    expect(categoricalResult.status).toBe('unverified');
    expect(categoricalResult.confidence).toBeLessThanOrEqual(0.75);

    const speculative = createThought(
      'heuristic-speculative',
      'Peut-être que cette hypothèse pourrait fonctionner, une vérification semble nécessaire.'
    );
    expect(calculator.evaluateVerificationHeuristics(speculative).status).toBe('uncertain');
  });

  it('calculates relevance and stores metric breakdown for connected thoughts', async () => {
    const base = createThought('base', 'Analyse détaillée de capteurs thermiques industriels', 'regular');
    const related = createThought('related', 'Ces capteurs thermiques produisent des données fiables', 'revision');
    base.connections.push({ targetId: related.id, type: 'supports', strength: 0.8 });

    const relevance = await calculator.calculateRelevance(base, [related]);
    expect(relevance).toBeGreaterThan(0.3);

    const breakdown = calculator.getMetricBreakdown(base.id);
    expect(breakdown?.relevance?.summary).toContain('pertinence');
    expect(breakdown?.relevance?.contributions.length).toBeGreaterThan(1);
  });

  it('counts reciprocal edges only once in relevance', async () => {
    const base = createThought('rel-base', 'Analyse détaillée de capteurs thermiques industriels');
    const related = createThought('rel-related', 'Ces capteurs thermiques produisent des données fiables');
    base.connections.push({ targetId: related.id, type: 'supports', strength: 0.8 });
    related.connections.push({ targetId: base.id, type: 'supports', strength: 0.2 });

    await calculator.calculateRelevance(base, [related]);

    const connectionContribution = calculator
      .getMetricBreakdown(base.id)!
      .relevance!.contributions.find(c => c.key === 'relevance.connection');
    expect(connectionContribution?.value).toBeCloseTo(0.72, 5);
  });

  it('adds connection boosts with weight 0 and clamped impacts', async () => {
    const thought = createThought('boost', 'Capteurs thermiques industriels fiables');
    const neighbor = createThought('boost-neighbor', 'Capteurs thermiques industriels précis');
    thought.connections.push({ targetId: neighbor.id, type: 'supports', strength: 0.9 });

    await calculator.calculateConfidence(thought, [neighbor]);

    const boost = calculator
      .getMetricBreakdown(thought.id)!
      .confidence!.contributions.find(c => c.key === 'confidence.connection');
    expect(boost?.weight).toBe(0);
    expect(boost?.impact).toBeGreaterThan(0);
    expect(boost?.impact).toBeLessThanOrEqual(0.1);
  });

  it('applies a negative connection impact for contradictory neighbors', async () => {
    const thought = createThought('contradiction', 'Capteurs thermiques industriels fiables');
    const neighbor = createThought('contradiction-neighbor', 'Capteurs thermiques industriels imprécis');
    thought.connections.push({ targetId: neighbor.id, type: 'contradicts', strength: 0.9 });

    await calculator.calculateConfidence(thought, [neighbor]);

    const contribution = calculator
      .getMetricBreakdown(thought.id)!
      .confidence!.contributions.find(c => c.key === 'confidence.connection');
    expect(contribution?.weight).toBe(0);
    expect(contribution?.impact).toBeLessThan(0);
    expect(contribution?.impact).toBeGreaterThanOrEqual(-0.15);
  });

  it('penalizes relevance for contradicting neighbours compared to supporting ones', async () => {
    const supportThought = createThought('relevance-support', 'Le protocole de mesure est fiable et documenté');
    const contradictionThought = createThought('relevance-contradiction', 'Le protocole de mesure est fiable et documenté');
    const neighbor = createThought('relevance-neighbor', 'Le protocole de mesure est fiable et documenté');

    supportThought.connections.push({ targetId: neighbor.id, type: 'supports', strength: 0.9 });
    contradictionThought.connections.push({ targetId: neighbor.id, type: 'contradicts', strength: 0.9 });

    const supportScore = await calculator.calculateRelevance(supportThought, [neighbor]);
    const contradictionScore = await calculator.calculateRelevance(contradictionThought, [neighbor]);

    expect(contradictionScore).toBeLessThan(supportScore);
  });

  it('covers reliability score variants and smoothing', () => {
    const metrics: ThoughtMetrics = { confidence: 0.9, relevance: 0.7, quality: 0.8 };
    const withCalcs = calculator.calculateReliabilityScore(metrics, 'verified', [
      { original: '2+2', verified: '4', isCorrect: true, confidence: 0.95 },
      { original: '3+3', verified: '6', isCorrect: true, confidence: 0.95 },
    ]);
    const withoutCalcs = calculator.calculateReliabilityScore(metrics, 'absence_of_information');
    const smoothed = calculator.calculateReliabilityScore(metrics, 'verified', undefined, 0.4);

    expect(withCalcs).toBeGreaterThan(withoutCalcs);
    expect(smoothed).toBeGreaterThan(0.4);
    expect(smoothed).toBeLessThanOrEqual(0.95);
  });

  it('extracts keywords and weighted context keywords', () => {
    const thought = createThought(
      'relevance',
      'capteurs capteurs thermiques maintenance prédictive industrielle avancée',
      'hypothesis'
    );

    const keywords = calculator.extractKeywords(thought.content);
    const weighted = extractAndWeightContextKeywords('maintenance capteurs thermiques énergie');

    expect(keywords.length).toBeGreaterThan(0);
    expect(Object.keys(weighted).length).toBeGreaterThan(0);
    expect(keywords).toContain('capteurs');
  });

  it('generates certainty summaries', () => {
    const verified = calculator.generateCertaintySummary('verified', 0.92);
    const uncertain = calculator.generateCertaintySummary('uncertain', 0.22);

    expect(verified).toContain('fiable');
    expect(uncertain).toContain('spéculative');
  });

  it('clears metric breakdowns globally and per thought', async () => {
    const t1 = createThought('clear-1', 'Contenu de test', 'regular');
    const t2 = createThought('clear-2', 'Contenu de test 2', 'meta');

    await calculator.calculateConfidence(t1, []);
    await calculator.calculateQuality(t2, []);
    expect(calculator.getMetricBreakdown(t1.id)).toBeDefined();
    expect(calculator.getMetricBreakdown(t2.id)).toBeDefined();

    calculator.clearMetricBreakdown(t1.id);
    expect(calculator.getMetricBreakdown(t1.id)).toBeUndefined();
    expect(calculator.getMetricBreakdown(t2.id)).toBeDefined();

    calculator.clearMetricBreakdown();
    expect(calculator.getMetricBreakdown(t2.id)).toBeUndefined();

    await calculator.calculateConfidence(t2, []);
    expect(calculator.getMetricBreakdown(t2.id)).toBeDefined();
    calculator.clear();
    expect(calculator.getMetricBreakdown(t2.id)).toBeUndefined();
  });

  it('no longer exposes dead computation helpers', () => {
    const asRecord = calculator as unknown as Record<string, unknown>;
    expect(asRecord.calculateRelevanceScore).toBeUndefined();
    expect(asRecord.getConnectionTypeWeight).toBeUndefined();
    expect(asRecord.determineVerificationStatus).toBeUndefined();
    expect(asRecord.calculateVerificationConfidence).toBeUndefined();
  });
});
