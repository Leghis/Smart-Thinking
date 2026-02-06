jest.mock('../utils/openrouter-client', () => ({
  callInternalLlm: jest.fn(),
}));

import { callInternalLlm } from '../utils/openrouter-client';
import { ThoughtGraph } from '../thought-graph';

const mockedCallInternalLlm = callInternalLlm as jest.MockedFunction<typeof callInternalLlm>;

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
    // Retourne volontairement une taille incorrecte pour couvrir le garde-fou.
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

describe('ThoughtGraph advanced behaviors', () => {
  beforeEach(() => {
    mockedCallInternalLlm.mockReset();
    mockedCallInternalLlm.mockResolvedValue(null);
  });

  it('gère les imports/exports, hyperliens invalides, sessions et clear', () => {
    const graph = new ThoughtGraph('tg-advanced');
    const a = graph.addThought('Noeud A', 'regular');
    const b = graph.addThought('Noeud B', 'meta');

    expect(graph.createHyperlink([a, 'ghost-id'], 'associates')).toBe('');

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

    graph.clear();
    expect(graph.getAllThoughts()).toEqual([]);
    expect(graph.getAllHyperlinks()).toEqual([]);
  });

  it('retombe sur les mots-clés quand SimilarityEngine échoue', async () => {
    const graph = new ThoughtGraph('tg-keywords', new ThrowingSimilarityEngine() as any);
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

    const mismatchGraph = new ThoughtGraph('tg-mismatch', new MismatchVectorEngine() as any);
    mismatchGraph.addThought('A capteurs', 'regular');
    mismatchGraph.addThought('B capteurs', 'regular');
    const mismatchResult = await mismatchGraph.inferRelations(0.7);
    expect(mismatchResult).toBe(0);
  });

  it('infère des relations (similarité/transitivité/patterns) puis enrichit les attributs', async () => {
    const graph = new ThoughtGraph('tg-infer', new DenseSimilarityEngine() as any);

    const a = graph.addThought('A supporte le socle énergétique', 'regular');
    const b = graph.addThought('B précise le socle énergétique', 'regular', [
      { targetId: a, type: 'supports', strength: 0.9 },
    ]);
    const c = graph.addThought('C consolide le socle énergétique', 'regular', [
      { targetId: b, type: 'supports', strength: 0.85 },
    ]);

    // Connexion explicitement non enrichie pour couvrir enrichThoughtConnections.
    const thoughtC = graph.getThought(c)!;
    thoughtC.connections.push({
      targetId: a,
      type: 'derives',
      strength: 0.7,
      description: 'Lien à enrichir'
    });

    const inferredCount = await graph.inferRelations(0.7);
    expect(inferredCount).toBeGreaterThan(0);

    const thoughtA = graph.getThought(a)!;
    expect(thoughtA.connections.length).toBeGreaterThan(0);

    const enriched = graph.enrichThoughtConnections(c);
    expect(enriched).toBeGreaterThan(0);
    expect(graph.getThought(c)!.connections.some(conn => conn.attributes)).toBe(true);

    // Couvre les helpers privés de connexion inférée et certitude.
    const manualInfer = (graph as any).addInferredConnection(a, c, 'associates', 0.93);
    expect(manualInfer).toBe(true);
    expect(graph.getThought(a)!.connections.some(conn => conn.inferred && conn.attributes?.certainty === 'definite')).toBe(true);
  });

  it('utilise les suggestions LLM JSON et bascule vers heuristique en cas d’échec', async () => {
    const graph = new ThoughtGraph('tg-llm');
    const a = graph.addThought('Observation initiale sur les capteurs', 'regular');
    const b = graph.addThought('Peut-être faut-il calculer les chiffres ?', 'hypothesis', [
      { targetId: a, type: 'contradicts', strength: 0.6 },
    ]);
    const c = graph.addThought('Voir https://example.com pour vérifier les données', 'regular', [
      { targetId: b, type: 'supports', strength: 0.7 },
    ]);

    graph.getThought(a)!.metadata.timestamp = new Date('2025-01-01T00:00:00.000Z');
    graph.getThought(b)!.metadata.timestamp = new Date('2025-01-02T00:00:00.000Z');
    graph.getThought(c)!.metadata.timestamp = new Date('2025-01-03T00:00:00.000Z');

    mockedCallInternalLlm.mockResolvedValueOnce(
      '[{"description":"Tester l’hypothèse avec un calcul","type":"regular","confidence":0.88,"reasoning":"La contradiction exige une vérification."}]'
    );

    const llmSuggestions = await graph.suggestNextSteps(2, 'tg-llm');
    expect(llmSuggestions[0].description).toContain('Tester l’hypothèse');
    expect(llmSuggestions[0].confidence).toBeCloseTo(0.88, 2);

    mockedCallInternalLlm.mockResolvedValueOnce('not-json');
    const fallbackSuggestions = await graph.suggestNextSteps(6, 'tg-llm');
    const descriptions = fallbackSuggestions.map(item => item.description);

    expect(descriptions).toEqual(expect.arrayContaining([
      'Exécutez du code pour effectuer les calculs nécessaires',
      'Recherchez des informations supplémentaires en ligne',
      'Résolvez les contradictions en consultant des sources fiables',
      'Extrayez et analysez le contenu des URL mentionnées',
    ]));
  });

  it('met à jour le contenu des pensées et gère le cas non trouvé', () => {
    const graph = new ThoughtGraph('tg-update');
    const id = graph.addThought('Contenu initial', 'regular');

    expect(graph.updateThoughtContent(id, 'Contenu mis à jour')).toBe(true);
    expect(graph.getThought(id)?.content).toBe('Contenu mis à jour');
    expect(graph.updateThoughtContent('missing', 'x')).toBe(false);
  });
});
