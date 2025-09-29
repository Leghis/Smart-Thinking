import { SimilarityEngine } from '../similarity-engine';

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
});
