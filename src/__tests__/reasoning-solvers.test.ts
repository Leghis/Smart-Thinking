import { solveOrdering } from '../reasoning/constraint-solver';
import {
  extractEquations,
  parsePolynomial,
  solveLinearEquation,
  solveLinearSystem,
} from '../reasoning/equation-solver';

describe('constraint solver', () => {
  it('solves a French ordering puzzle with a unique order', () => {
    const result = solveOrdering(
      'Chloé a terminé avant Bob et Bob a terminé avant Alice.',
      ['Chloé', 'Bob', 'Alice'],
    );
    expect(result.contradictions).toEqual([]);
    expect(result.unique).toBe(true);
    expect(result.order).toEqual(['Chloé', 'Bob', 'Alice']);
  });

  it('handles mixed French/English comparisons and explicit relations', () => {
    const result = solveOrdering(
      'The red car is faster than the blue car. The blue car is faster than the green car.',
      ['red car', 'blue car', 'green car'],
    );
    expect(result.order).toEqual(['red car', 'blue car', 'green car']);

    const explicit = solveOrdering('', ['A', 'B', 'C'], [
      { before: 'A', after: 'C' },
      { before: 'B', after: 'C' },
    ]);
    expect(explicit.unique).toBe(false);
    expect(explicit.order?.indexOf('C')).toBe(2);
  });

  it('detects contradictions (cycles) and ambiguity', () => {
    const cyclic = solveOrdering(
      'A est avant B, B est avant C, C est avant A.',
      ['A', 'B', 'C'],
    );
    expect(cyclic.contradictions.length).toBeGreaterThan(0);
    expect(cyclic.order).toBeUndefined();

    const ambiguous = solveOrdering('A est avant C, B est avant C.', ['A', 'B', 'C']);
    expect(ambiguous.unique).toBe(false);
    expect(ambiguous.order?.[2]).toBe('C');
  });

  it('solves the scheduling regression case with repeated single-letter mentions', () => {
    const result = solveOrdering(
      'Contraintes : D avant A (D < A), A avant B (A < B), C après B (B < C). ' +
        'Par transitivité, on obtient D < A < B < C. Réponse finale : D, A, B, C.',
      ['D', 'A', 'B', 'C'],
    );
    expect(result.order).toEqual(['D', 'A', 'B', 'C']);
    expect(result.unique).toBe(true);
  });
});

describe('equation solver', () => {
  it('parses and solves linear equations with implicit multiplication', () => {
    const result = solveLinearEquation('3x + 5 = 20');
    expect('variables' in result && result.variables.x).toBeCloseTo(5, 10);

    const withParens = solveLinearEquation('2(x - 3) = 4x + 8');
    expect('variables' in withParens && withParens.variables.x).toBeCloseTo(-7, 10);
  });

  it('solves quadratics', () => {
    const result = solveLinearEquation('x^2 - 5x + 6 = 0');
    expect('variables' in result && result.kind).toBe('quadratic');
    const values = 'variables' in result ? Object.values(result.variables).sort() : [];
    expect(values[0]).toBeCloseTo(2, 6);
    expect(values[1]).toBeCloseTo(3, 6);
  });

  it('solves linear systems with Gaussian elimination', () => {
    const result = solveLinearSystem(['2x + y = 10', 'x - y = 2']);
    expect('variables' in result && result.variables.x).toBeCloseTo(4, 8);
    expect('variables' in result && result.variables.y).toBeCloseTo(2, 8);

    const inconsistent = solveLinearSystem(['x + y = 1', 'x + y = 2']);
    expect('error' in inconsistent).toBe(true);
  });

  it('parses polynomials and extracts equations from text', () => {
    const poly = parsePolynomial('2x + 3(x + 1)');
    expect(poly.get('x')).toBeCloseTo(5, 10);
    expect(poly.get('')).toBeCloseTo(3, 10);

    const extracted = extractEquations(
      'On sait que 2x + y = 10 et que x - y = 2. Combien vaut x ?',
    );
    expect(extracted).toContain('2x + y = 10');
    expect(extracted).toContain('x - y = 2');
  });
});
