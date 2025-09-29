import { ThoughtGraph } from '../thought-graph';

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

function createGraph(sessionId = 'session-tests', similarityEngine?: any): ThoughtGraph {
  return new ThoughtGraph(sessionId, similarityEngine);
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

    const basicImport = importedGraph.importFromJson(JSON.stringify(Array.from(graph.getAllThoughts().values())));
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

    // Forcer des timestamps distincts pour garantir l'ordre temporel.
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

  it('propose des pensées pertinentes via le repli sur mots-clés', async () => {
    const graph = createGraph('session-relevance');
    const targetId = graph.addThought('Les capteurs fournissent des statistiques détaillées.', 'regular');
    graph.addThought('Sujet différent sans rapport.', 'regular');

    const results = await graph.getRelevantThoughts('statistiques capteurs', 1, 'session-relevance');

    expect(results[0]?.id).toBe(targetId);
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
});
