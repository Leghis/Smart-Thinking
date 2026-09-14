import { suggestTools } from '../tool-suggestions';
import type { VerificationResult } from '../types';

const baseContext = {
  depth: 'balanced' as const,
  hasPlan: true,
  openHypotheses: 0,
  evidenceCount: 0,
};

const unverifiedResult: VerificationResult = {
  status: 'unverified',
  confidence: 0.3,
  sources: [],
  verificationSteps: [],
};

describe('tool-suggestions', () => {
  test('suggests verify for content containing calculations', () => {
    const suggestions = suggestTools({ ...baseContext, content: 'Le total est 2 + 2 = 4.' });

    const verify = suggestions.find(suggestion => suggestion.name === 'verify');
    expect(verify).toBeDefined();
    expect(verify?.priority).toBe(0);
  });

  test('suggests web_search for a factual claim without evidence', () => {
    const suggestions = suggestTools({
      ...baseContext,
      content: 'Ceci est une affirmation factuelle à confirmer.',
    });

    expect(suggestions.map(suggestion => suggestion.name)).toContain('web_search');
    expect(suggestions.map(suggestion => suggestion.name)).not.toContain('verify');
  });

  test('suggests smartthinking while hypotheses remain open', () => {
    const suggestions = suggestTools({
      ...baseContext,
      content: 'Analyse structurée du problème.',
      openHypotheses: 2,
    });

    const smartthinking = suggestions.find(suggestion => suggestion.name === 'smartthinking');
    expect(smartthinking).toBeDefined();
    expect(smartthinking?.reason).toContain('2');
  });

  test('deduplicates by tool name and keeps the highest priority suggestion', () => {
    const suggestions = suggestTools({
      depth: 'deep',
      hasPlan: true,
      openHypotheses: 1,
      evidenceCount: 1,
      content: 'Le calcul 2 + 2 = 4.',
      verification: unverifiedResult,
    });

    const names = suggestions.map(suggestion => suggestion.name);
    expect(new Set(names).size).toBe(names.length);

    const verify = suggestions.find(suggestion => suggestion.name === 'verify');
    expect(verify?.priority).toBe(0);

    const smartthinking = suggestions.find(suggestion => suggestion.name === 'smartthinking');
    expect(smartthinking?.priority).toBe(2);
    expect(names.indexOf('verify')).toBeLessThan(names.indexOf('smartthinking'));
  });

  test('suggests verify when the verification status stays unverified', () => {
    const suggestions = suggestTools({
      ...baseContext,
      content: 'Affirmation neutre sans chiffre.',
      verification: unverifiedResult,
    });

    const verify = suggestions.find(suggestion => suggestion.name === 'verify');
    expect(verify?.reason).toContain('statut de vérification');
  });
});
