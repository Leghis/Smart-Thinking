import { ThoughtGraph } from '../thought-graph';
import { ValidationError } from '../errors';
import type { SimilarityEngine } from '../similarity-engine';
import type { QualityEvaluator } from '../quality-evaluator';
import { buildSuggestionContext, suggestNextStepsHeuristic } from '../step-suggester';

class FakeSimilarityEngine {
  public lastSimilarityRequest: { context: string; texts: string[]; limit: number } | null = null;

  async findSimilarTexts(context: string, texts: string[], limit: number) {
    this.lastSimilarityRequest = { context, texts, limit };
    return texts.slice(0, limit).map(text => ({ text, score: 0.92 }));
  }

  async generateVectors(texts: string[]) {
    return texts.map((text, index) => ({ [`token${index}`]: index + 1 }));
  }

  calculateCosineSimilarity(): number {
    return 0.92;
  }
}

class ReverseSimilarityEngine {
  async findSimilarTexts(_context: string, texts: string[], limit: number) {
    return texts
      .map((text, index) => ({ text, score: 1 - index * 0.01 }))
      .reverse()
      .slice(0, limit);
  }

  async generateVectors(texts: string[]) {
    return texts.map((_, index) => ({ [`token${index}`]: 1 }));
  }

  calculateCosineSimilarity(): number {
    return 0.9;
  }
}

function createGraph(
  sessionId = 'session-tests',
  similarityEngine?: unknown,
  qualityEvaluator?: unknown,
): ThoughtGraph {
  return new ThoughtGraph(
    sessionId,
    similarityEngine as SimilarityEngine | undefined,
    qualityEvaluator as QualityEvaluator | undefined,
  );
}

describe('ThoughtGraph', () => {
  it('ajoute des pensées et crée des connexions réciproques', () => {
    const graph = createGraph();
    const sourceId = graph.addThought('Première pensée', 'regular');
    const targetId = graph.addThought('Réponse à la première', 'regular', [
      { targetId: sourceId, type: 'supports', strength: 0.6 },
    ]);

    const sourceConnections = graph.getThought(sourceId)!.connections;
    const reciprocal = sourceConnections.find((conn) => conn.targetId === targetId);

    expect(reciprocal).toBeDefined();
    expect(reciprocal?.type).toBe('supports');

    const connected = graph.getConnectedThoughts(targetId).map((node) => node.id);
    expect(connected).toContain(sourceId);
  });

  it('rejette les hyperliens avec moins de deux pensées distinctes existantes', () => {
    const graph = createGraph();
    const a = graph.addThought('Noeud unique', 'regular');

    expect(() => graph.createHyperlink([], 'associates')).toThrow(ValidationError);
    expect(() => graph.createHyperlink([a], 'associates')).toThrow(ValidationError);
    expect(() => graph.createHyperlink([a, a], 'associates')).toThrow(ValidationError);
    expect(() => graph.createHyperlink([a, 'ghost-id'], 'associates')).toThrow(ValidationError);

    const b = graph.addThought('Second noeud', 'regular');
    expect(graph.createHyperlink([a, b, b], 'associates')).toContain('hl-');
  });

  it('exporte et importe un graphe enrichi avec hyperliens', () => {
    const graph = createGraph();
    const a = graph.addThought('Point A', 'regular');
    const b = graph.addThought('Point B', 'regular');

    const hyperlinkId = graph.createHyperlink([a, b], 'associates', 'Lien A-B', { nature: 'associatif' }, 0.7);
    expect(graph.getHyperlink(hyperlinkId)).toBeDefined();

    const exported = graph.exportEnrichedGraph();
    const importedGraph = createGraph();
    const imported = importedGraph.importEnrichedGraph(exported);

    expect(imported).toBe(true);
    expect(importedGraph.getThought(a)).toBeDefined();
    expect(importedGraph.getHyperlinksForThought(a)).toHaveLength(1);

    const basicImport = importedGraph.importFromJson(graph.exportToJson());
    expect(basicImport).toBe(true);
  });

  it('fournit des suggestions heuristiques basées sur le contenu récent', async () => {
    const sessionId = 'session-heuristics';
    const graph = createGraph(sessionId);

    const baseId = graph.addThought('Hypothèse initiale.', 'regular');
    const contradictionId = graph.addThought('Observation contraire.', 'regular', [
      { targetId: baseId, type: 'contradicts', strength: 0.6 },
    ]);
    const urlId = graph.addThought('Voir https://example.com pour plus d\'information.', 'regular');
    const calcId = graph.addThought('Nous devons calculer cette source, il est possible que les capteurs mentent.', 'regular');

    const now = Date.now();
    graph.getThought(baseId)!.timestamp = new Date(now - 4000);
    graph.getThought(contradictionId)!.timestamp = new Date(now - 3000);
    graph.getThought(urlId)!.timestamp = new Date(now - 2000);
    graph.getThought(calcId)!.timestamp = new Date(now - 1000);

    const suggestions = await graph.suggestNextSteps(6, sessionId);

    expect(suggestions.map((s) => s.description)).toEqual(
      expect.arrayContaining([
        'Vérifiez les informations avec une recherche web',
        'Exécutez du code pour effectuer les calculs nécessaires',
        'Recherchez des informations supplémentaires en ligne',
        'Résolvez les contradictions en consultant des sources fiables',
        'Formulez une hypothèse basée sur vos observations dans cette session',
        'Extrayez et analysez le contenu des URL mentionnées',
      ]),
    );
  });

  it('sélectionne earliest/latest sur node.timestamp et ignore metadata.timestamp', () => {
    const graph = createGraph('session-timestamps');
    const a = graph.addThought('Pensée A', 'regular');
    const b = graph.addThought('Pensée B', 'regular');
    const c = graph.addThought('Pensée C', 'regular');

    const now = Date.now();
    graph.getThought(a)!.timestamp = new Date(now - 3000);
    graph.getThought(b)!.timestamp = new Date(now - 2000);
    graph.getThought(c)!.timestamp = new Date(now - 1000);
    graph.getThought(a)!.metadata.timestamp = new Date(now + 60_000);
    graph.getThought(c)!.metadata.timestamp = new Date(now - 60_000);

    const thoughts = graph.getAllThoughts('session-timestamps');
    const context = buildSuggestionContext(thoughts);

    expect(context.earliest?.id).toBe(a);
    expect(context.latest?.id).toBe(c);
    expect(context.recent.map((thought) => thought.id)).toEqual([c, b, a]);

    const suggestions = suggestNextStepsHeuristic(thoughts, [], 6);
    expect(suggestions.some((item) => item.type === 'hypothesis')).toBe(true);
  });

  it('propose des pensées pertinentes via le repli sur mots-clés', async () => {
    const graph = createGraph('session-relevance');
    const targetId = graph.addThought('Les capteurs fournissent des statistiques détaillées.', 'regular');
    graph.addThought('Sujet différent sans rapport.', 'regular');

    const results = await graph.getRelevantThoughts('statistiques capteurs', 1, 'session-relevance');

    expect(results[0]?.id).toBe(targetId);
  });

  it('retourne les nœuds réels en gérant les contenus dupliqués', async () => {
    const engine = new FakeSimilarityEngine();
    const graph = createGraph('session-duplicates', engine);
    const first = graph.addThought('Capteurs redondants', 'regular');
    const second = graph.addThought('Capteurs redondants', 'regular');
    graph.addThought('Botanique sans lien', 'regular');

    const results = await graph.getRelevantThoughts('capteurs', 2, 'session-duplicates');

    expect(results.map((node) => node.id)).toEqual([first, second]);
    expect(results[0]).toBe(graph.getThought(first));
    expect(graph.getThought(first)!.metadata.similarityScore).toBeUndefined();

    const reverse = createGraph('session-reverse', new ReverseSimilarityEngine());
    const x = reverse.addThought('Alpha', 'regular');
    const y = reverse.addThought('Beta', 'regular');
    const z = reverse.addThought('Gamma', 'regular');

    const reversed = await reverse.getRelevantThoughts('contraste', 3, 'session-reverse');
    expect(reversed.map((node) => node.id)).toEqual([z, y, x]);
  });

  it('infère des relations à l’aide du SimilarityEngine et met à jour le contenu', async () => {
    const engine = new FakeSimilarityEngine();
    const graph = createGraph('session-inference', engine);

    const id1 = graph.addThought('Analyse des capteurs', 'regular');
    const id2 = graph.addThought('Les capteurs fournissent des mesures répétées', 'regular');

    const inferred = await graph.inferRelations(0.8);
    expect(inferred).toBeGreaterThan(0);

    const thought1 = graph.getThought(id1)!;
    expect(thought1.connections.some((conn) => conn.targetId === id2)).toBe(true);

    const relevant = await graph.getRelevantThoughts('capteurs', 1, 'session-inference');
    expect(relevant[0].id).toBe(id1);
    expect(engine.lastSimilarityRequest).not.toBeNull();

    const updated = graph.updateThoughtContent(id1, 'Analyse actualisée des capteurs.');
    expect(updated).toBe(true);
    expect(graph.getThought(id1)!.content).toContain('actualisée');
  });

  it('ne déclenche plus de vérification ni d’évaluation en arrière-plan', async () => {
    const evaluate = jest.fn().mockResolvedValue({ confidence: 0.5, relevance: 0.5, quality: 0.5 });
    const detectAndVerifyCalculations = jest.fn().mockResolvedValue([]);
    const annotateThoughtWithVerifications = jest.fn((content: string) => content);
    const evaluator = {
      evaluate,
      detectAndVerifyCalculations,
      annotateThoughtWithVerifications,
    } as unknown as QualityEvaluator;

    const graph = new ThoughtGraph('passive-graph', undefined, evaluator);
    const id = graph.addThought('Calcule 2 + 2 = 4 puis vérifie.', 'regular');
    graph.updateThoughtContent(id, 'Calcule 3 + 3 = 6 puis vérifie.');
    await new Promise((resolve) => setImmediate(resolve));

    expect(detectAndVerifyCalculations).not.toHaveBeenCalled();
    expect(annotateThoughtWithVerifications).not.toHaveBeenCalled();
    expect(evaluate).not.toHaveBeenCalled();

    await graph.updateMetricsForThought(id);
    expect(evaluate).toHaveBeenCalledTimes(1);
  });
});
