import { ThoughtGraph } from '../thought-graph';
import { ValidationError } from '../errors';
import { ConnectionInference, detectClusters } from '../connection-inference';
import type { SimilarityEngine } from '../similarity-engine';

class ThrowingSimilarityEngine {
  async findSimilarTexts(): Promise<Array<{ text: string; score: number }>> {
    throw new Error('similarity failure');
  }

  async generateVectors(texts: string[]): Promise<Record<string, number>[]> {
    return texts.map((_, index) => ({ [`k${index}`]: 1 }));
  }

  calculateCosineSimilarity(): number {
    return 0.9;
  }
}

class MismatchVectorEngine {
  async findSimilarTexts(reference: string, candidates: string[], limit: number): Promise<Array<{ text: string; score: number }>> {
    return candidates.slice(0, limit).map(text => ({ text, score: reference ? 0.88 : 0.4 }));
  }

  async generateVectors(texts: string[]): Promise<Record<string, number>[]> {
    return texts.slice(0, Math.max(0, texts.length - 1)).map((_, index) => ({ [`m${index}`]: 1 }));
  }

  calculateCosineSimilarity(): number {
    return 0.9;
  }
}

class DenseSimilarityEngine {
  async findSimilarTexts(_reference: string, candidates: string[], limit: number, threshold = 0): Promise<Array<{ text: string; score: number }>> {
    return candidates
      .map(text => ({ text, score: 0.95 }))
      .filter(item => item.score >= threshold)
      .slice(0, limit);
  }

  async generateVectors(texts: string[]): Promise<Record<string, number>[]> {
    return texts.map(() => ({ token: 1, overlap: 1 }));
  }

  calculateCosineSimilarity(): number {
    return 0.95;
  }
}

function createGraph(sessionId: string, similarityEngine?: unknown): ThoughtGraph {
  return new ThoughtGraph(sessionId, similarityEngine as SimilarityEngine | undefined);
}

describe('ThoughtGraph advanced behaviors', () => {
  it('gère les imports/exports, hyperliens invalides, sessions et clear', () => {
    const graph = new ThoughtGraph('tg-advanced');
    const a = graph.addThought('Noeud A', 'regular');
    const b = graph.addThought('Noeud B', 'meta');

    expect(() => graph.createHyperlink([a, 'ghost-id'], 'associates')).toThrow(ValidationError);
    expect(() => graph.createHyperlink([], 'associates')).toThrow(ValidationError);

    const hyperlinkId = graph.createHyperlink([a, b], 'associates', 'A-B');
    expect(hyperlinkId).toContain('hl-');
    expect(graph.getHyperlink(hyperlinkId)).toBeDefined();
    expect(graph.getHyperlinksForThought(a, 'other-session')).toEqual([]);

    const exported = graph.exportToJson();
    expect(graph.importFromJson(exported)).toBe(true);
    expect(graph.importFromJson('{bad json')).toBe(false);

    const enriched = graph.exportEnrichedGraph();
    expect(graph.importEnrichedGraph(enriched)).toBe(true);
    expect(graph.importEnrichedGraph('{bad json')).toBe(false);

    // Les tableaux présents remplacent leur collection ; les champs absents sont conservés.
    expect(graph.importEnrichedGraph(JSON.stringify({ hyperlinks: [] }))).toBe(true);
    expect(graph.getAllThoughts()).toHaveLength(2);
    expect(graph.getAllHyperlinks()).toEqual([]);

    expect(graph.importEnrichedGraph(JSON.stringify({}))).toBe(true);
    expect(graph.getAllThoughts()).toHaveLength(2);

    graph.clear();
    expect(graph.getAllThoughts()).toEqual([]);
    expect(graph.getAllHyperlinks()).toEqual([]);
  });

  it('retombe sur les mots-clés quand SimilarityEngine échoue', async () => {
    const graph = createGraph('tg-keywords', new ThrowingSimilarityEngine());
    const relevantId = graph.addThought('Capteurs thermiques et maintenance prédictive', 'regular');
    graph.addThought('Sujet de botanique sans rapport', 'regular');

    const results = await graph.getRelevantThoughts('capteurs maintenance', 2, 'tg-keywords');
    expect(results.length).toBeGreaterThan(0);
    expect(results.map(r => r.id)).toContain(relevantId);
  });

  it('couvre les garde-fous d’inférence sans moteur et avec vecteurs incohérents', async () => {
    const noEngineGraph = new ThoughtGraph('tg-no-engine');
    noEngineGraph.addThought('A', 'regular');
    noEngineGraph.addThought('B', 'regular');
    const noEngineResult = await noEngineGraph.inferRelations(0.8);
    expect(noEngineResult).toBe(0);

    const mismatchGraph = createGraph('tg-mismatch', new MismatchVectorEngine());
    mismatchGraph.addThought('A capteurs', 'regular');
    mismatchGraph.addThought('B capteurs', 'regular');
    const mismatchResult = await mismatchGraph.inferRelations(0.7);
    expect(mismatchResult).toBe(0);
  });

  it('infère des relations (similarité/transitivité/patterns) puis enrichit les attributs', async () => {
    const graph = createGraph('tg-infer', new DenseSimilarityEngine());

    const a = graph.addThought('A supporte le socle énergétique', 'regular');
    const b = graph.addThought('B précise le socle énergétique', 'regular', [
      { targetId: a, type: 'supports', strength: 0.9 },
    ]);
    const c = graph.addThought('C consolide le socle énergétique', 'regular', [
      { targetId: b, type: 'supports', strength: 0.85 },
    ]);

    const thoughtC = graph.getThought(c)!;
    thoughtC.connections.push({
      targetId: a,
      type: 'derives',
      strength: 0.7,
      description: 'Lien à enrichir',
    });

    const inferredCount = await graph.inferRelations(0.7);
    expect(inferredCount).toBeGreaterThan(0);

    const thoughtA = graph.getThought(a)!;
    expect(thoughtA.connections.length).toBeGreaterThan(0);

    const enriched = graph.enrichThoughtConnections(c);
    expect(enriched).toBeGreaterThan(0);
    expect(graph.getThought(c)!.connections.some(conn => conn.attributes)).toBe(true);

    const inference = new ConnectionInference(graph);
    const manualInfer = inference.addInferredConnection(a, c, 'associates', 0.93);
    expect(manualInfer).toBe(true);
    expect(graph.getThought(a)!.connections.some(conn => conn.inferred && conn.attributes?.certainty === 'definite')).toBe(true);
  });

  it('génère des suggestions heuristiques déterministes sans LLM', async () => {
    const graph = new ThoughtGraph('tg-heuristic');
    const a = graph.addThought('Observation initiale sur les capteurs', 'regular');
    const b = graph.addThought('Peut-être faut-il calculer les chiffres ?', 'hypothesis', [
      { targetId: a, type: 'contradicts', strength: 0.6 },
    ]);
    graph.addThought('Voir https://example.com pour vérifier les données', 'regular', [
      { targetId: b, type: 'supports', strength: 0.7 },
    ]);

    const first = await graph.suggestNextSteps(6, 'tg-heuristic');
    const second = await graph.suggestNextSteps(6, 'tg-heuristic');

    expect(second).toEqual(first);
    expect(first.map(item => item.description)).toEqual(expect.arrayContaining([
      'Exécutez du code pour effectuer les calculs nécessaires',
      'Recherchez des informations supplémentaires en ligne',
      'Résolvez les contradictions en consultant des sources fiables',
      'Extrayez et analysez le contenu des URL mentionnées',
    ]));
  });

  it('limite l’inférence et les suggestions à la session demandée', async () => {
    const graph = createGraph('session-a', new DenseSimilarityEngine());
    const a1 = graph.addThought('Capteurs et énergie solaire', 'regular');
    const a2 = graph.addThought('Analyse des capteurs énergétiques', 'regular');
    const foreign = graph.addThought('Voir https://example.com et calculer les chiffres', 'regular');
    graph.getThought(foreign)!.metadata.sessionId = 'session-b';

    const explicit = await graph.inferRelations(0.7, 'session-a');
    expect(explicit).toBeGreaterThan(0);
    expect(graph.getThought(a1)!.connections.some(conn => conn.targetId === foreign)).toBe(false);
    expect(graph.getThought(a2)!.connections.some(conn => conn.targetId === foreign)).toBe(false);
    expect(graph.getThought(foreign)!.connections).toHaveLength(0);

    const implicit = await graph.inferRelations(0.7);
    expect(implicit).toBe(0);
    expect(graph.getThought(foreign)!.connections).toHaveLength(0);

    const suggestions = await graph.suggestNextSteps(6, 'session-a');
    const descriptions = suggestions.map(item => item.description);
    expect(descriptions).not.toContain('Extrayez et analysez le contenu des URL mentionnées');
    expect(descriptions).not.toContain('Exécutez du code pour effectuer les calculs nécessaires');
  });

  it('ne compte pas les liens inter-clusters dans la cohésion', () => {
    const graph = new ThoughtGraph('tg-cohesion');
    const a = graph.addThought('Cluster A1', 'regular');
    const b = graph.addThought('Cluster A2', 'regular', [
      { targetId: a, type: 'associates', strength: 0.9 },
    ]);
    const c = graph.addThought('Cluster B1', 'regular', [
      { targetId: a, type: 'associates', strength: 0.3 },
    ]);
    const d = graph.addThought('Cluster B2', 'regular', [
      { targetId: c, type: 'associates', strength: 0.9 },
    ]);

    const clusters = detectClusters(graph.getAllThoughts());
    const clusterA = clusters.find(cluster => cluster.nodeIds.includes(a));
    const clusterB = clusters.find(cluster => cluster.nodeIds.includes(c));

    expect(clusterA?.nodeIds.sort()).toEqual([a, b].sort());
    expect(clusterB?.nodeIds.sort()).toEqual([c, d].sort());
    expect(clusterA?.cohesion).toBeCloseTo(0.9, 5);
    expect(clusterB?.cohesion).toBeCloseTo(0.9, 5);
  });

  it('met à jour le contenu des pensées et gère le cas non trouvé', () => {
    const graph = new ThoughtGraph('tg-update');
    const id = graph.addThought('Contenu initial', 'regular');

    expect(graph.updateThoughtContent(id, 'Contenu mis à jour')).toBe(true);
    expect(graph.getThought(id)?.content).toBe('Contenu mis à jour');
    expect(graph.updateThoughtContent('missing', 'x')).toBe(false);
  });
});
