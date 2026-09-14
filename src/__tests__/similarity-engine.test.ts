import { SimilarityEngine, type TermVector } from '../similarity-engine';
import { LIMITS } from '../constants';

describe('SimilarityEngine', () => {
  const engine = new SimilarityEngine();

  it('removes stop words and produces weighted vectors', async () => {
    const [vector] = await engine.generateVectors(['The machine learning model analyses data efficiently.']);
    expect(vector['machine']).toBeGreaterThan(0);
    expect(vector['learning']).toBeGreaterThan(0);
    expect(vector['the']).toBeUndefined();
  });

  it('ranks semantically related texts higher', async () => {
    const reference = 'Machine learning models learn patterns from training data.';
    const candidates = [
      'Deep learning is a subset of machine learning using neural networks.',
      'Painting landscapes requires patience and color mixing.',
      'Soccer teams train tactics before important matches.'
    ];

    const results = await engine.findSimilarTexts(reference, candidates, 3, 0);
    expect(results.length).toBe(3);
    const highest = results[0];
    expect(highest.text).toContain('Deep learning');
    expect(highest.score).toBeGreaterThan(results[1].score);
    expect(highest.score).toBeGreaterThan(results[2].score);
  });

  it('handles empty inputs and zero norms', async () => {
    expect(await engine.findSimilarTexts('', ['quelque chose de précis'])).toEqual([]);
    expect(await engine.findSimilarTexts('référence valide', [])).toEqual([]);
    expect(await engine.calculateTextSimilarity('', '')).toBe(0);
    expect(engine.calculateCosineSimilarity({}, {})).toBe(0);
    expect(engine.calculateCosineSimilarity({ terme: 0 }, { terme: 0 })).toBe(0);
  });

  it('returns 1 for identical texts and matches accents-insensitively', async () => {
    expect(await engine.calculateTextSimilarity('texte identique analysé', 'texte identique analysé')).toBeCloseTo(1, 5);
    expect(await engine.calculateTextSimilarity('décomposition analytique', 'decomposition analytique')).toBeCloseTo(1, 5);
  });

  it('is deterministic regardless of call order', async () => {
    const texts = ['apprentissage automatique', 'réseau de neurones profond', 'analyse statistique'];

    const firstVectors = await engine.generateVectors(texts);
    const secondVectors = await engine.generateVectors(texts);
    expect(secondVectors).toEqual(firstVectors);

    const firstResults = await engine.findSimilarTexts('apprentissage automatique', texts, 3, 0);
    await engine.generateVectors(['bruit total', 'autre bruit complet']);
    const secondResults = await engine.findSimilarTexts('apprentissage automatique', texts, 3, 0);
    expect(secondResults).toEqual(firstResults);
  });

  it('bounds the token cache with LRU eviction', async () => {
    const cacheEngine = new SimilarityEngine();
    const cache = (cacheEngine as unknown as { tokenCache: Map<string, TermVector> }).tokenCache;
    const total = LIMITS.MAX_TOKEN_CACHE_ENTRIES + 25;

    for (let i = 0; i < total; i++) {
      await cacheEngine.generateVectors([`jeton unique ${i}`]);
    }

    expect(cache.size).toBeLessThanOrEqual(LIMITS.MAX_TOKEN_CACHE_ENTRIES);
    expect(cache.has(`jeton unique ${total - 1}`)).toBe(true);
    expect(cache.has('jeton unique 0')).toBe(false);
  });
});
