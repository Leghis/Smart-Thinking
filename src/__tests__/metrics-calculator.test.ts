import { MetricsCalculator } from '../metrics-calculator';
import { ThoughtNode, ThoughtMetrics } from '../types';

const createThought = (id: string, content: string, type: ThoughtNode['type'] = 'regular'): ThoughtNode => ({
  id,
  content,
  type,
  timestamp: new Date(),
  connections: [],
  metrics: { confidence: 0.5, relevance: 0.5, quality: 0.5 } as ThoughtMetrics,
  metadata: {}
});

describe('MetricsCalculator heuristics', () => {
  const calculator = new MetricsCalculator();

  it('computes confident breakdown for assertive statements', async () => {
    const assertiveThought = createThought(
      'conf-high',
      'Il est clairement démontré par deux études indépendantes publiées en 2024 que cette méthode réduit les erreurs de 25 %.'
    );

    const confidence = await calculator.calculateConfidence(assertiveThought, []);
    expect(confidence).toBeGreaterThan(0.6);

    const breakdown = calculator.getMetricBreakdown(assertiveThought.id);
    expect(breakdown?.confidence?.contributions.length).toBeGreaterThan(0);
    const structuralContribution = breakdown?.confidence?.contributions.find(c => c.label === 'Structure factuelle');
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

  it('detects heuristic bias patterns', async () => {
    const biasedThought = createThought(
      'bias-test',
      'Je sais absolument que ces gens sont toujours dans l\'erreur, c\'est totalement évident !'
    );

    const biases = await calculator.detectBiases(biasedThought);
    expect(biases.length).toBeGreaterThan(0);
    expect(biases[0].score).toBeGreaterThan(0.3);
  });

  it('determines verification requirements heuristically', async () => {
    const factualContent = 'Selon le rapport de 2023, 62 % des cas ont augmenté de 15 points.';
    const requirements = await calculator.determineVerificationRequirements(factualContent);
    expect(requirements.needsFactCheck).toBe(true);
    expect(requirements.priority).toBe('high');
  });

  it('provides heuristic verification fallback', () => {
    const thought = createThought(
      'verification',
      'Il est absolument certain que 2 + 2 = 4, cette vérité est indiscutable.'
    );
    const result = calculator.evaluateVerificationHeuristics(thought);
    expect(result.status === 'verified' || result.status === 'unverified' || result.status === 'uncertain' || result.status === 'contradicted').toBe(true);
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('calculates relevance and stores metric breakdown for connected thoughts', async () => {
    const base = createThought('base', 'Analyse détaillée de capteurs thermiques industriels', 'regular');
    const related = createThought('related', 'Ces capteurs thermiques produisent des données fiables', 'revision');
    base.connections.push({
      targetId: related.id,
      type: 'supports',
      strength: 0.8,
    });

    const relevance = await calculator.calculateRelevance(base, [related]);
    expect(relevance).toBeGreaterThan(0.3);

    const breakdown = calculator.getMetricBreakdown(base.id);
    expect(breakdown?.relevance?.summary).toContain('pertinence');
    expect((breakdown?.relevance?.contributions.length || 0)).toBeGreaterThan(1);
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

  it('covers relevance score, keyword extraction and weighted context extraction', () => {
    const thought = createThought(
      'relevance',
      'capteurs capteurs thermiques maintenance prédictive industrielle avancée',
      'hypothesis'
    );
    thought.connections.push({
      targetId: 'x',
      type: 'supports',
      strength: 0.9,
    });

    const keywords = calculator.extractKeywords(thought.content);
    const weighted = calculator.extractAndWeightContextKeywords('maintenance capteurs thermiques énergie');
    const score = calculator.calculateRelevanceScore(thought, 'maintenance capteurs thermiques énergie');

    expect(keywords.length).toBeGreaterThan(0);
    expect(Object.keys(weighted).length).toBeGreaterThan(0);
    expect(score).toBeGreaterThan(0.1);
  });

  it('covers status determination from confidence and result arrays', () => {
    expect(calculator.determineVerificationStatus(0.9)).toBe('verified');
    expect(calculator.determineVerificationStatus(0.6)).toBe('partially_verified');
    expect(calculator.determineVerificationStatus(0.1)).toBe('unverified');
    expect(calculator.determineVerificationStatus(0.1, true)).toBe('contradictory');
    expect(calculator.determineVerificationStatus(0.4, true)).toBe('uncertain');
    expect(calculator.determineVerificationStatus(0.8, false, false)).toBe('absence_of_information');

    const contradictoryResults = [
      { confidence: 0.9, result: { isValid: false } },
      { confidence: 0.8, result: { isValid: false } },
      { confidence: 0.7, result: { isValid: true } },
    ];
    expect(calculator.determineVerificationStatus(contradictoryResults)).toBe('contradictory');

    const uncertainResults = [
      { confidence: 0.5, result: { isValid: 'uncertain' } },
      { confidence: 0.5, result: { isValid: 'uncertain' } },
    ];
    expect(calculator.determineVerificationStatus(uncertainResults)).toBe('uncertain');

    const absenceResults = [
      { confidence: 0.8, result: { isValid: 'absence_of_information' } },
      { confidence: 0.7, result: { isValid: 'absence_of_information' } },
    ];
    expect(calculator.determineVerificationStatus(absenceResults)).toBe('absence_of_information');
  });

  it('generates certainty summaries and connection weights', () => {
    const verified = calculator.generateCertaintySummary('verified', 0.92);
    const uncertain = calculator.generateCertaintySummary('uncertain', 0.22);

    expect(verified).toContain('fiable');
    expect(uncertain).toContain('spéculative');
    expect(calculator.getConnectionTypeWeight('supports')).toBeGreaterThan(0.5);
    expect(calculator.getConnectionTypeWeight('associates')).toBeGreaterThan(0);
  });

  it('evaluates verification confidence from mixed tool results', () => {
    const confidence = calculator.calculateVerificationConfidence([
      { toolType: 'search', confidence: 0.8, result: { isValid: true } },
      { toolType: 'database', confidence: 0.9, result: { isValid: true } },
      { toolType: 'external_api', confidence: 0.6, result: { isValid: false } },
    ]);

    const neutral = calculator.calculateVerificationConfidence([]);
    expect(confidence).toBeGreaterThan(neutral);
    expect(confidence).toBeLessThanOrEqual(0.95);
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
  });
});
