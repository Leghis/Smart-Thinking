import {
  UNCERTAINTY_WORDS,
  CERTAINTY_WORDS,
  clamp,
  tokenize,
  containsAny,
  sentenceSplit,
  normalizeWhitespace,
} from '../heuristics/constants';

describe('Constantes heuristiques', () => {
  it('contient des listes de mots cohérentes', () => {
    expect(UNCERTAINTY_WORDS).toContain('peut-être');
    expect(CERTAINTY_WORDS).toContain('évidemment');
  });

  it('offre des utilitaires pour analyser le texte', () => {
    expect(clamp(12, 0, 10)).toBe(10);
    expect(clamp(-2, 0, 10)).toBe(0);

    const tokens = tokenize('Ceci est, peut-être, un test.');
    expect(tokens).toEqual(expect.arrayContaining(['peut', 'être', 'test']));
    expect(containsAny('C\'est clairement établi.', CERTAINTY_WORDS)).toBe(true);

    const phrases = sentenceSplit('Première phrase. Seconde phrase ?');
    expect(phrases).toHaveLength(2);

    expect(normalizeWhitespace('A    B\nC')).toBe('A B C');
  });
});
