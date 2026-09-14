import { QualityEvaluator } from '../quality-evaluator';
import { MetricsCalculator } from '../metrics-calculator';
import { ThoughtGraph } from '../thought-graph';
import type { ThoughtMetricBreakdown } from '../types';

function createMetricsCalculatorMock() {
  const breakdown: ThoughtMetricBreakdown = {
    confidence: {
      score: 0.35,
      summary: 'Score de confiance 0.35.',
      contributions: [
        {
          key: 'confidence.modifier',
          label: 'Modalisateurs',
          value: 0.4,
          weight: 0.4,
          impact: 0.16,
          rationale: 'Modalisateurs présents',
        },
        {
          key: 'confidence.structural',
          label: 'Structure factuelle',
          value: 0.4,
          weight: 0.2,
          impact: 0.08,
          rationale: 'Peu de faits',
        },
      ],
    },
    relevance: {
      score: 0.3,
      summary: 'Score de pertinence 0.30.',
      contributions: [
        {
          key: 'relevance.keyword',
          label: 'Recoupement lexical',
          value: 0.3,
          weight: 0.5,
          impact: 0.15,
          rationale: 'Vocabulaire limité',
        },
      ],
    },
    quality: {
      score: 0.45,
      summary: 'Score de qualité 0.45.',
      contributions: [
        {
          key: 'quality.structural',
          label: 'Structure',
          value: 0.4,
          weight: 0.2,
          impact: 0.08,
          rationale: 'Structure faible',
        },
        {
          key: 'quality.coherence',
          label: 'Cohérence',
          value: 0.4,
          weight: 0.3,
          impact: 0.12,
          rationale: 'Cohérence partielle',
        },
      ],
    },
  };

  const mock = {
    calculateConfidence: jest.fn().mockResolvedValue(0.35),
    calculateRelevance: jest.fn().mockResolvedValue(0.3),
    calculateQuality: jest.fn().mockResolvedValue(0.45),
    detectBiases: jest.fn().mockResolvedValue([
      { type: 'certainty_bias', score: 0.6, description: 'Certitudes excessives' },
    ]),
    getMetricBreakdown: jest.fn().mockReturnValue(breakdown),
  };

  return { calculator: mock as unknown as MetricsCalculator, mock, breakdown };
}

describe('QualityEvaluator', () => {
  it('évalue et met en cache les métriques d’une pensée', async () => {
    const { calculator: metricsCalculatorMock, mock } = createMetricsCalculatorMock();
    const evaluator = new QualityEvaluator({ metricsCalculator: metricsCalculatorMock });

    const graph = new ThoughtGraph('session');
    const thoughtId = graph.addThought('Peut-être que cette hypothèse est valide.', 'hypothesis');

    const metricsFirst = await evaluator.evaluate(thoughtId, graph);
    const metricsSecond = await evaluator.evaluate(thoughtId, graph);

    expect(metricsFirst.confidence).toBeCloseTo(0.35);
    expect(metricsSecond.confidence).toBeCloseTo(0.35);
    expect(mock.calculateConfidence).toHaveBeenCalledTimes(1);
  });

  it('utilise le calculateur partagé injecté et expose son breakdown', async () => {
    const sharedCalculator = new MetricsCalculator();
    const evaluator = new QualityEvaluator({ metricsCalculator: sharedCalculator });

    const graph = new ThoughtGraph('session-partagee');
    const thoughtId = graph.addThought(
      'Cette analyse rigoureuse démontre une tendance cohérente avec 12 mesures.',
      'conclusion'
    );

    await evaluator.evaluate(thoughtId, graph);

    expect(sharedCalculator.getMetricBreakdown(thoughtId)).toBeDefined();
    expect(sharedCalculator.getMetricBreakdown(thoughtId)?.confidence).toBeDefined();
    expect(graph.getThought(thoughtId)?.metadata.metricBreakdown).toBeDefined();

    const otherCalculator = new MetricsCalculator();
    const otherEvaluator = new QualityEvaluator();
    otherEvaluator.setMetricsCalculator(otherCalculator);
    await otherEvaluator.evaluate(thoughtId, graph);
    expect(otherCalculator.getMetricBreakdown(thoughtId)).toBeDefined();
  });

  it('invalide réellement le cache pour une pensée modifiée', async () => {
    const { calculator: metricsCalculatorMock, mock } = createMetricsCalculatorMock();
    const evaluator = new QualityEvaluator({ metricsCalculator: metricsCalculatorMock });

    const graph = new ThoughtGraph('session-cache');
    const thoughtId = graph.addThought('Contenu initial.', 'regular');
    const thought = graph.getThought(thoughtId)!;

    await evaluator.evaluate(thoughtId, graph);
    expect(mock.calculateConfidence).toHaveBeenCalledTimes(1);

    mock.calculateConfidence.mockResolvedValue(0.9);
    evaluator.invalidate(thoughtId);
    const afterInvalidate = await evaluator.evaluate(thoughtId, graph);
    expect(afterInvalidate.confidence).toBeCloseTo(0.9);
    expect(mock.calculateConfidence).toHaveBeenCalledTimes(2);

    evaluator.invalidate(thoughtId);
    thought.content = 'Contenu modifié.';
    const afterContentChange = await evaluator.evaluate(thoughtId, graph);
    expect(afterContentChange.confidence).toBeCloseTo(0.9);
    expect(mock.calculateConfidence).toHaveBeenCalledTimes(3);
  });

  it('propose des améliorations heuristiques et respecte le cache', async () => {
    const { calculator: metricsCalculatorMock, mock } = createMetricsCalculatorMock();
    const evaluator = new QualityEvaluator({ metricsCalculator: metricsCalculatorMock });

    const graph = new ThoughtGraph('session-suggestions');
    const hypothesisId = graph.addThought('Peut-être.', 'hypothesis');
    const contradictionId = graph.addThought('Les données montrent l’inverse.', 'regular', [
      { targetId: hypothesisId, type: 'contradicts', strength: 0.6 },
    ]);

    const hypothesis = graph.getThought(hypothesisId)!;
    const contradiction = graph.getThought(contradictionId)!;
    expect(contradiction.connections.find(c => c.targetId === hypothesisId)).toBeDefined();

    const suggestionsA = await evaluator.suggestImprovements(hypothesis, graph);
    const suggestionsB = await evaluator.suggestImprovements(hypothesis, graph);

    expect(mock.calculateConfidence).toHaveBeenCalledTimes(1);
    expect(mock.detectBiases).toHaveBeenCalledTimes(1);
    expect(suggestionsB).toEqual(suggestionsA);
    expect(suggestionsA).toEqual(
      expect.arrayContaining([
        "Renforcez l'argumentation avec des preuves ou des références précises.",
        "Clarifiez les affirmations ambiguës et réduisez les modalisateurs d'incertitude.",
        'Ajoutez des éléments factuels (chiffres, références) pour renforcer la crédibilité.',
        "Réorganisez la pensée pour qu'elle soit plus structurée et facile à suivre.",
        'Reliez explicitement cette pensée aux éléments antérieurs pour améliorer la cohérence.',
        'Réutilisez les concepts clés des pensées reliées pour augmenter la pertinence.',
        'Attention aux biais potentiels: certainty_bias.',
        "Formulez l'hypothèse sous forme conditionnelle (si... alors...).",
        "Résolvez ou clarifiez les contradictions avec d'autres pensées.",
      ])
    );
  });

  it('met en cache les biais et invalide correctement les entrées', async () => {
    const { calculator: metricsCalculatorMock, mock } = createMetricsCalculatorMock();
    const evaluator = new QualityEvaluator({
      metricsCalculator: metricsCalculatorMock,
      verificationService: {
        performPreliminaryVerification: jest.fn().mockResolvedValue({
          initialVerification: true,
          verificationInProgress: false,
          preverifiedThought: 'ok',
        }),
      } as never,
    });

    const graph = new ThoughtGraph('session-bias');
    const thoughtId = graph.addThought('Ceci est clairement une certitude absolue.', 'conclusion');
    const thought = graph.getThought(thoughtId)!;

    const biasesFirst = await evaluator.detectBiases(thought);
    await evaluator.detectBiases(thought);

    expect(biasesFirst.length).toBeGreaterThan(0);
    expect(mock.detectBiases).toHaveBeenCalledTimes(1);

    evaluator.invalidate(thoughtId);
    await evaluator.detectBiases(thought);
    expect(mock.detectBiases).toHaveBeenCalledTimes(2);
  });

  it('transmet thoughtType et connectedThoughtIds à la vérification précédente', async () => {
    const verificationService = {
      checkPreviousVerification: jest.fn().mockResolvedValue({
        previousVerification: null,
        isVerified: false,
        verificationStatus: 'unverified',
        certaintySummary: 'N/A',
        verification: null,
      }),
    };
    const evaluator = new QualityEvaluator({
      metricsCalculator: createMetricsCalculatorMock().calculator,
      verificationService: verificationService as never,
    });

    await evaluator.checkPreviousVerification('contenu', 'session-1', 'hypothesis', ['a', 'b']);

    expect(verificationService.checkPreviousVerification).toHaveBeenCalledWith(
      'contenu',
      'session-1',
      'hypothesis',
      ['a', 'b']
    );
  });

  it('délègue la vérification et l’annotation au service configuré', async () => {
    const verificationService = {
      performPreliminaryVerification: jest.fn().mockResolvedValue({
        initialVerification: true,
        verificationInProgress: false,
        preverifiedThought: 'ok',
      }),
      detectAndVerifyCalculations: jest.fn().mockResolvedValue([]),
      annotateThoughtWithVerifications: jest.fn().mockReturnValue('annotated'),
    };
    const evaluator = new QualityEvaluator({ verificationService: verificationService as never });

    const preliminary = await evaluator.performPreliminaryVerification('test', false);
    expect(preliminary.preverifiedThought).toBe('ok');
    expect(verificationService.performPreliminaryVerification).toHaveBeenCalledWith('test', false);

    await evaluator.detectAndVerifyCalculations('2 + 2 = 4');
    expect(verificationService.detectAndVerifyCalculations).toHaveBeenCalledWith('2 + 2 = 4');

    expect(evaluator.annotateThoughtWithVerifications('texte', [])).toBe('annotated');
  });
});
