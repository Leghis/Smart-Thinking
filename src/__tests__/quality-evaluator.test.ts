import { QualityEvaluator } from '../quality-evaluator';
import { ThoughtGraph } from '../thought-graph';
import type { MetricsCalculator } from '../metrics-calculator';

function createMetricsCalculatorMock(): jest.Mocked<MetricsCalculator> {
  const breakdown = {
    confidence: {
      score: 0.35,
      contributions: [
        { label: 'Modalisateurs', value: 0.4, weight: 0.5, rationale: 'Modalisateurs présents' },
        { label: 'Structure factuelle', value: 0.4, weight: 0.5, rationale: 'Peu de faits' },
      ],
    },
    relevance: {
      score: 0.3,
      contributions: [
        { label: 'Recoupement lexical', value: 0.3, weight: 0.5, rationale: 'Vocabulaire limité' },
      ],
    },
    quality: {
      score: 0.45,
      contributions: [
        { label: 'Structure', value: 0.4, weight: 0.5, rationale: 'Structure faible' },
        { label: 'Cohérence', value: 0.4, weight: 0.5, rationale: 'Cohérence partielle' },
      ],
    },
  } as any;

  return {
    calculateConfidence: jest.fn().mockResolvedValue(0.35),
    calculateRelevance: jest.fn().mockResolvedValue(0.3),
    calculateQuality: jest.fn().mockResolvedValue(0.45),
    detectBiases: jest.fn().mockResolvedValue([
      { type: 'certainty_bias', score: 0.6, description: 'Certitudes excessives' },
    ]),
    getMetricBreakdown: jest.fn().mockReturnValue(breakdown),
    calculateReliabilityScore: jest.fn() as any,
    generateCertaintySummary: jest.fn() as any,
    determineVerificationRequirements: jest.fn().mockResolvedValue([]) as any,
  } as unknown as jest.Mocked<MetricsCalculator>;
}

describe('QualityEvaluator', () => {
  it('évalue et met en cache les métriques d’une pensée', async () => {
    const evaluator = new QualityEvaluator();
    const metricsCalculatorMock = createMetricsCalculatorMock();
    evaluator.metricsCalculator = metricsCalculatorMock;

    const graph = new ThoughtGraph('session');
    const thoughtId = graph.addThought('Peut-être que cette hypothèse est valide.', 'hypothesis');

    const metricsFirst = await evaluator.evaluate(thoughtId, graph);
    const metricsSecond = await evaluator.evaluate(thoughtId, graph);

    expect(metricsFirst.confidence).toBeCloseTo(0.35);
    expect(metricsSecond.confidence).toBeCloseTo(0.35);
    expect(metricsCalculatorMock.calculateConfidence).toHaveBeenCalledTimes(1);
  });

  it('propose des améliorations heuristiques et respecte le cache', async () => {
    const evaluator = new QualityEvaluator();
    const metricsCalculatorMock = createMetricsCalculatorMock();
    evaluator.metricsCalculator = metricsCalculatorMock;

    const graph = new ThoughtGraph('session');
    const hypothesisId = graph.addThought('Peut-être.', 'hypothesis');
    const contradictionId = graph.addThought('Les données montrent l’inverse.', 'regular', [
      { targetId: hypothesisId, type: 'contradicts', strength: 0.6 },
    ]);

    // Garantir que la pensée principale dispose d'un lien contradiction via le réciproque
    const hypothesis = graph.getThought(hypothesisId)!;
    const contradiction = graph.getThought(contradictionId)!;
    expect(contradiction.connections.find((c) => c.targetId === hypothesisId)).toBeDefined();

    const suggestionsA = await evaluator.suggestImprovements(hypothesis, graph);
    const suggestionsB = await evaluator.suggestImprovements(hypothesis, graph);

    expect(metricsCalculatorMock.calculateConfidence).toHaveBeenCalledTimes(1);
    expect(metricsCalculatorMock.detectBiases).toHaveBeenCalledTimes(1);

    expect(suggestionsA).toEqual(expect.arrayContaining([
      'Renforcez l\'argumentation avec des preuves ou des références précises.',
      'Clarifiez les affirmations ambiguës et réduisez les modalisateurs d\'incertitude.',
      'Ajoutez des éléments factuels (chiffres, références) pour renforcer la crédibilité.',
      'Réorganisez la pensée pour qu\'elle soit plus structurée et facile à suivre.',
      'Reliez explicitement cette pensée aux éléments antérieurs pour améliorer la cohérence.',
      'Réutilisez les concepts clés des pensées reliées pour augmenter la pertinence.',
      'Attention aux biais potentiels: certainty_bias.',
      'Formulez l\'hypothèse sous forme conditionnelle (si... alors...).',
      'Résolvez ou clarifiez les contradictions avec d\'autres pensées.',
    ]));

    expect(suggestionsB).toEqual(suggestionsA);
  });

  it('met en cache les biais et invalide correctement les entrées', async () => {
    const evaluator = new QualityEvaluator();
    const metricsCalculatorMock = createMetricsCalculatorMock();
    evaluator.metricsCalculator = metricsCalculatorMock;

    const verificationStub = {
      performPreliminaryVerification: jest.fn().mockResolvedValue({
        initialVerification: true,
        verificationInProgress: false,
        preverifiedThought: 'ok',
      }),
      checkPreviousVerification: jest.fn().mockResolvedValue({
        previousVerification: null,
        isVerified: false,
        verificationStatus: 'unverified',
        certaintySummary: 'N/A',
        verification: null,
      }),
      deepVerify: jest.fn().mockResolvedValue({ status: 'verified', verifiedCalculations: [] }),
      detectAndVerifyCalculations: jest.fn().mockResolvedValue([]),
      annotateThoughtWithVerifications: jest.fn().mockReturnValue('annotated'),
    } as any;

    evaluator.setVerificationService(verificationStub);

    const graph = new ThoughtGraph('session-bias');
    const thoughtId = graph.addThought('Ceci est clairement une certitude absolue.', 'conclusion');

    const thought = graph.getThought(thoughtId)!;
    const biasesFirst = await evaluator.detectBiases(thought);
    await evaluator.detectBiases(thought);

    expect(biasesFirst.length).toBeGreaterThan(0);
    expect(metricsCalculatorMock.detectBiases).toHaveBeenCalledTimes(1);

    evaluator.invalidateCacheForThought(thoughtId);
    await evaluator.detectBiases(thought);
    expect(metricsCalculatorMock.detectBiases).toHaveBeenCalledTimes(2);

    const preliminary = await evaluator.performPreliminaryVerification('test', false);
    expect(preliminary.preverifiedThought).toBe('ok');
    expect(verificationStub.performPreliminaryVerification).toHaveBeenCalled();
  });
});
