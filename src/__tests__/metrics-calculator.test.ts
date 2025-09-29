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
});
