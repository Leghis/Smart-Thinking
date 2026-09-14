import {
  CERTAINTY_MODIFIERS,
  CONFIDENCE_WEIGHTS,
  DEPTH_PROFILES,
  LIMITS,
  METRIC_THRESHOLDS,
  PATTERNS,
  QUALITY_WEIGHTS,
  RELEVANCE_WEIGHTS,
  STOP_WORDS,
  UNCERTAINTY_MODIFIERS,
  VERIFICATION_SCORE,
} from '../constants';
import type { VerificationStatus } from '../types';

function sum(values: Record<string, number>): number {
  return Object.values(values).reduce((total, value) => total + value, 0);
}

describe('constants', () => {
  test('depth profiles grow from fast to deep', () => {
    const { fast, balanced, deep } = DEPTH_PROFILES;

    expect(fast.verificationLevel).toBe('minimal');
    expect(balanced.verificationLevel).toBe('standard');
    expect(deep.verificationLevel).toBe('thorough');
    expect(fast.maxSuggestions).toBeLessThan(balanced.maxSuggestions);
    expect(balanced.maxSuggestions).toBeLessThan(deep.maxSuggestions);
    expect(fast.maxSearchQueries).toBeLessThan(deep.maxSearchQueries);
    expect(fast.maxPlanSteps).toBeLessThan(deep.maxPlanSteps);
    expect(fast.evidenceLookback).toBeLessThan(deep.evidenceLookback);
  });

  test('metric weights each sum to one', () => {
    expect(sum(CONFIDENCE_WEIGHTS)).toBeCloseTo(1, 10);
    expect(sum(RELEVANCE_WEIGHTS)).toBeCloseTo(1, 10);
    expect(sum(QUALITY_WEIGHTS)).toBeCloseTo(1, 10);
  });

  test('verification scores cover every status within bounds', () => {
    const statuses: VerificationStatus[] = [
      'unverified',
      'partially_verified',
      'verified',
      'contradicted',
      'inconclusive',
      'absence_of_information',
      'uncertain',
      'contradictory',
    ];

    for (const status of statuses) {
      const score = VERIFICATION_SCORE[status];
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  test('shared patterns detect their target markers', () => {
    expect(PATTERNS.MATH_CALCULATION.test('2 + 2')).toBe(true);
    expect(PATTERNS.FACTUAL_CLAIM.test('Ceci est une affirmation')).toBe(true);
    expect(PATTERNS.SOURCE_REFERENCE.test("selon l'étude")).toBe(true);
    expect(PATTERNS.STATISTICS.test('42% des cas')).toBe(true);
    expect(PATTERNS.RECENCY.test("aujourd'hui")).toBe(true);
  });

  test('lexicons and thresholds are coherent', () => {
    expect(UNCERTAINTY_MODIFIERS).toContain('peut-être');
    expect(CERTAINTY_MODIFIERS).toContain('évidemment');
    expect(STOP_WORDS.has('le')).toBe(true);
    expect(METRIC_THRESHOLDS.MIN_CONFIDENCE).toBeLessThan(METRIC_THRESHOLDS.MAX_CONFIDENCE);
    expect(LIMITS.MAX_SEARCH_RESULTS).toBeGreaterThan(0);
    expect(LIMITS.MAX_THOUGHT_LENGTH).toBeGreaterThan(0);
  });
});
