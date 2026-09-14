import { gradeAnswer } from '../bench/grader';
import type { BenchTask } from '../bench/types';

function task(overrides: Partial<BenchTask>): BenchTask {
  return {
    id: 'test',
    category: 'arithmetic',
    question: 'question',
    referenceAnswer: 'ref',
    keyFacts: [],
    requiresWeb: false,
    difficulty: 1,
    ...overrides,
  };
}

describe('benchmark grader', () => {
  it('accepts the expected number even when it is not the last one', () => {
    const t = task({ numericAnswer: 54, keyFacts: ['54'] });
    const score = gradeAnswer(t, 'Vérification : 0,45 × 120 = 54, soit 45 % de femmes.');
    expect(score.score).toBe(1);
  });

  it('handles thousand separators in big numbers', () => {
    const t = task({ numericAnswer: 4199572, keyFacts: ['4199572'] });
    expect(gradeAnswer(t, 'Le résultat est 4 199 572.').score).toBe(1);
    expect(gradeAnswer(t, 'Le résultat est 4,199,572.').score).toBe(1);
    expect(gradeAnswer(t, 'Le résultat est 4 199 570.').score).toBe(0);
  });

  it('rejects a wrong final number without a matching value', () => {
    const t = task({ numericAnswer: 54, keyFacts: ['54'] });
    const score = gradeAnswer(t, 'La réponse finale est 45.');
    expect(score.score).toBe(0);
  });

  it('requires an explicit error statement for invalid chains', () => {
    const t = task({
      numericAnswer: 19,
      referenceAnswer: '95 ÷ 5 = 18 est faux, le résultat correct est 19',
      keyFacts: ['19'],
    });
    expect(gradeAnswer(t, 'Le résultat est 19.').score).toBe(0);
    expect(gradeAnswer(t, "L'étape 3 est fausse : 95 ÷ 5 = 19, pas 18.").score).toBe(1);
  });

  it('scores multiple-choice letters', () => {
    const t = task({
      category: 'logic',
      expectedLetter: 'C',
      keyFacts: ['le vase est casse'],
    });
    expect(gradeAnswer(t, 'C').score).toBe(1);
    expect(gradeAnswer(t, 'Réponse : (C). Le vase est cassé.').score).toBe(1);
    expect(gradeAnswer(t, 'A').score).toBe(0);
  });

  it('scores ordered facts only when the order is correct', () => {
    const t = task({
      category: 'planning',
      orderedFacts: ['chloe', 'bob', 'alice'],
      keyFacts: ['chloe', 'bob', 'alice'],
    });
    expect(gradeAnswer(t, '1. Chloé, 2. Bob, 3. Alice').score).toBe(1);
    expect(gradeAnswer(t, 'Alice, puis Bob, puis Chloé').score).toBeLessThan(1);
  });

  it('keeps keyFacts coverage for non-ordered tasks', () => {
    const t = task({ category: 'factual', keyFacts: ['canberra', 'australie'] });
    expect(gradeAnswer(t, "Canberra est la capitale de l'Australie.").score).toBe(1);
    expect(gradeAnswer(t, 'Sydney.').score).toBe(0);
  });

  it('matches key facts written with thousand separators', () => {
    const t = task({ category: 'synthesis', keyFacts: ['4620'] });
    expect(gradeAnswer(t, 'Il reste 4 620 €.').score).toBe(1);
  });

  it('handles repeated mentions and single-letter facts in ordering tasks', () => {
    const t = task({
      category: 'logic',
      orderedFacts: ['d', 'a', 'b', 'c'],
      keyFacts: ['d', 'a', 'b', 'c'],
    });
    const answer =
      'Contraintes : D avant A (D < A), A avant B (A < B), C après B (B < C). ' +
      'Par transitivité, on obtient la chaîne unique D < A < B < C. Réponse finale : D, A, B, C.';
    expect(gradeAnswer(t, answer).score).toBe(1);
  });

  it('accepts bilingual yes/no answers', () => {
    const t = task({ category: 'factual', keyFacts: ['no'] });
    expect(gradeAnswer(t, 'Non, ils ne sont pas dans le même quartier.').score).toBe(1);
    expect(gradeAnswer(t, 'No, they are not.').score).toBe(1);
    expect(gradeAnswer(t, 'Oui, ils le sont.').score).toBe(0);
  });
});
