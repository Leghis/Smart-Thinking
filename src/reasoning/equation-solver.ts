/**
 * Deterministic equation solver (linear systems, single-variable linear and
 * quadratic). Parses `3x + 5 = 20`, `2x + y = 10`, `x^2 - 5x + 6 = 0`, etc.
 * No eval, no external dependency.
 */

export interface EquationSolution {
  variables: Record<string, number>;
  steps: string[];
  kind: 'linear' | 'quadratic' | 'system';
}

export interface EquationFailure {
  error: string;
}

type Poly = Map<string, number>;

function polyOf(coefficient: number, variable?: string): Poly {
  return new Map([[variable ?? '', coefficient]]);
}

function polyAdd(a: Poly, b: Poly, sign = 1): Poly {
  const result = new Map(a);
  for (const [key, value] of b) {
    result.set(key, (result.get(key) ?? 0) + sign * value);
  }
  return result;
}

function polyMul(a: Poly, b: Poly): Poly {
  const result: Poly = new Map();
  for (const [keyA, valueA] of a) {
    for (const [keyB, valueB] of b) {
      const key = [keyA, keyB].filter(Boolean).sort().join('*');
      result.set(key, (result.get(key) ?? 0) + valueA * valueB);
    }
  }
  return result;
}

function polyScale(poly: Poly, factor: number): Poly {
  const result: Poly = new Map();
  for (const [key, value] of poly) {
    result.set(key, value * factor);
  }
  return result;
}

function normalizeInput(text: string): string {
  return text
    .replace(/[×∗]/g, '*')
    .replace(/[÷]/g, '/')
    .replace(/[−–—]/g, '-')
    .replace(/[’‘]/g, "'")
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/\s+/g, ' ')
    .trim();
}

class Parser {
  private index = 0;
  private readonly tokens: string[];

  constructor(text: string) {
    this.tokens = text.match(/\d+(?:\.\d+)?|[a-zA-Z]+|[+\-*/^()]/g) ?? [];
  }

  parse(): Poly {
    const value = this.parseExpression();
    if (this.index < this.tokens.length) {
      throw new Error(`Jeton inattendu: ${this.tokens[this.index]}`);
    }
    return value;
  }

  private peek(): string | undefined {
    return this.tokens[this.index];
  }

  private next(): string | undefined {
    return this.tokens[this.index++];
  }

  private parseExpression(): Poly {
    let value = this.parseTerm();
    while (this.peek() === '+' || this.peek() === '-') {
      const operator = this.next()!;
      const term = this.parseTerm();
      value = polyAdd(value, term, operator === '+' ? 1 : -1);
    }
    return value;
  }

  private parseTerm(): Poly {
    let value = this.parseFactor();
    for (;;) {
      const token = this.peek();
      if (token === '*') {
        this.next();
        value = polyMul(value, this.parseFactor());
        continue;
      }
      if (token === '/') {
        this.next();
        const factor = this.parseFactor();
        const divisor = factor.get('') ?? 0;
        if (factor.size !== 1 || divisor === 0) {
          throw new Error('Division par une expression dépendant de l\'inconnue non supportée.');
        }
        value = polyScale(value, 1 / divisor);
        continue;
      }
      if (token !== undefined && (/^\d/.test(token) || /^[a-zA-Z]/.test(token) || token === '(')) {
        value = polyMul(value, this.parseFactor());
        continue;
      }
      break;
    }
    return value;
  }

  private parseFactor(): Poly {
    const token = this.next();
    if (token === undefined) {
      throw new Error('Expression incomplète.');
    }
    let base: Poly;
    if (token === '(') {
      base = this.parseExpression();
      if (this.next() !== ')') {
        throw new Error('Parenthèse fermante manquante.');
      }
    } else if (token === '-') {
      base = polyScale(this.parseFactor(), -1);
    } else if (/^\d+(?:\.\d+)?$/.test(token)) {
      base = polyOf(Number.parseFloat(token));
    } else if (/^[a-zA-Z]+$/.test(token)) {
      base = polyOf(1, token);
    } else {
      throw new Error(`Jeton invalide: ${token}`);
    }

    if (this.peek() === '^') {
      this.next();
      const exponentToken = this.next();
      const exponent = exponentToken ? Number.parseInt(exponentToken, 10) : NaN;
      if (!Number.isInteger(exponent) || exponent < 0 || exponent > 3) {
        throw new Error(`Exposant non supporté: ${exponentToken}`);
      }
      let powered = polyOf(1);
      for (let i = 0; i < exponent; i += 1) {
        powered = polyMul(powered, base);
      }
      base = powered;
    }

    while (this.peek() === '(') {
      this.next();
      const nested = this.parseExpression();
      if (this.next() !== ')') {
        throw new Error('Parenthèse fermante manquante.');
      }
      base = polyMul(base, nested);
    }

    return base;
  }
}

export function parsePolynomial(expression: string): Poly {
  return new Parser(normalizeInput(expression)).parse();
}

export function solveLinearEquation(
  equation: string,
): EquationSolution | EquationFailure {
  const parts = equation.split('=');
  if (parts.length !== 2) {
    return { error: 'Une équation doit contenir exactement un signe "=".' };
  }
  try {
    const left = parsePolynomial(parts[0]);
    const right = parsePolynomial(parts[1]);
    const difference = polyAdd(left, right, -1);

    const variables = new Set<string>();
    for (const key of difference.keys()) {
      for (const variable of key.split('*').filter(Boolean)) {
        variables.add(variable);
      }
    }
    if (variables.size !== 1) {
      return {
        error:
          variables.size === 0
            ? 'Aucune inconnue détectée.'
            : `Plusieurs inconnues (${Array.from(variables).join(', ')}) : utilisez solveSystem.`,
      };
    }
    const variable = Array.from(variables)[0];

    const linear = difference.get(variable) ?? 0;
    const quadratic = difference.get(`${variable}*${variable}`) ?? 0;
    const constant = difference.get('') ?? 0;

    if (quadratic !== 0) {
      const discriminant = linear * linear - 4 * quadratic * constant;
      if (discriminant < -1e-12) {
        return { error: 'Aucune solution réelle (discriminant négatif).' };
      }
      const root = Math.sqrt(Math.max(discriminant, 0));
      const solutions = [
        (-linear + root) / (2 * quadratic),
        (-linear - root) / (2 * quadratic),
      ];
      const unique = Array.from(new Set(solutions.map(value => Number(value.toFixed(10)))));
      return {
        kind: 'quadratic',
        variables: Object.fromEntries(unique.map((value, index) => [`${variable}${index > 0 ? index + 1 : ''}`, value])),
        steps: [
          `Équation quadratique ${quadratic}${variable}² + ${linear}${variable} + ${constant} = 0`,
          `Discriminant Δ = ${discriminant}`,
          `Solutions : ${unique.join(', ')}`,
        ],
      };
    }

    if (linear === 0) {
      return constant === 0
        ? { error: 'Équation toujours vraie (infinité de solutions).' }
        : { error: 'Équation impossible (aucune solution).' };
    }

    const value = -constant / linear;
    return {
      kind: 'linear',
      variables: { [variable]: value },
      steps: [
        `${linear}${variable} = ${-constant}`,
        `${variable} = ${value}`,
        `Vérification : ${linear} × ${value} + ${constant} = ${linear * value + constant}`,
      ],
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Équation illisible.' };
  }
}

export function solveLinearSystem(equations: string[]): EquationSolution | EquationFailure {
  if (equations.length === 0) {
    return { error: 'Aucune équation fournie.' };
  }

  try {
    const rows: Array<{ coefficients: Map<string, number>; constant: number }> = [];
    const allVariables = new Set<string>();

    for (const equation of equations) {
      const parts = equation.split('=');
      if (parts.length !== 2) {
        return { error: `Équation invalide: "${equation}"` };
      }
      const difference = polyAdd(parsePolynomial(parts[0]), parsePolynomial(parts[1]), -1);
      const coefficients = new Map<string, number>();
      let constant = 0;

      for (const [key, value] of difference) {
        if (!key) {
          constant += value;
          continue;
        }
        if (key.includes('*')) {
          return { error: 'Système non linéaire non supporté.' };
        }
        coefficients.set(key, value);
        allVariables.add(key);
      }
      rows.push({ coefficients, constant: -constant });
    }

    const variables = Array.from(allVariables);
    const matrix = rows.map(row => [
      ...variables.map(variable => row.coefficients.get(variable) ?? 0),
      row.constant,
    ]);

    const steps: string[] = [];
    const n = variables.length;
    let pivotRow = 0;
    for (let column = 0; column < n && pivotRow < matrix.length; column += 1) {
      let best = pivotRow;
      for (let row = pivotRow + 1; row < matrix.length; row += 1) {
        if (Math.abs(matrix[row][column]) > Math.abs(matrix[best][column])) {
          best = row;
        }
      }
      if (Math.abs(matrix[best][column]) < 1e-12) {
        continue;
      }
      [matrix[pivotRow], matrix[best]] = [matrix[best], matrix[pivotRow]];
      const pivot = matrix[pivotRow][column];
      for (let c = column; c <= n; c += 1) {
        matrix[pivotRow][c] /= pivot;
      }
      for (let row = 0; row < matrix.length; row += 1) {
        if (row === pivotRow) {
          continue;
        }
        const factor = matrix[row][column];
        if (factor === 0) {
          continue;
        }
        for (let c = column; c <= n; c += 1) {
          matrix[row][c] -= factor * matrix[pivotRow][c];
        }
      }
      steps.push(`Pivot sur ${variables[column]} (ligne ${pivotRow + 1}).`);
      pivotRow += 1;
    }

    for (const row of matrix) {
      const allZero = row.slice(0, n).every(value => Math.abs(value) < 1e-12);
      if (allZero && Math.abs(row[n]) > 1e-9) {
        return { error: 'Système incohérent (aucune solution).' };
      }
    }

    const solution: Record<string, number> = {};
    for (const variable of variables) {
      const row = matrix.find(candidate => Math.abs(candidate[variables.indexOf(variable)]) > 1e-9);
      if (!row) {
        return { error: `Système sous-déterminé (${variable} non contraint).` };
      }
      solution[variable] = Number(row[n].toFixed(10));
    }

    return { kind: 'system', variables: solution, steps };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Système illisible.' };
  }
}

const CHUNK_SPLIT = /\s*(?:;|,|\.|\?|!|\bet\b|\bpuis\b|\bdonc\b|\boù\b|\bque\b|\bcombien\b|\bpuisque\b)\s*/i;
const EQUATION_CANDIDATE = /^[\s(]*[0-9a-zA-Z][0-9a-zA-Z\s+\-*/().^²³]*=[0-9a-zA-Z\s+\-*/().^²³]+$/;

export function extractEquations(text: string): string[] {
  const normalized = normalizeInput(text);
  const chunks = normalized.split(CHUNK_SPLIT);
  const equations: string[] = [];
  for (const chunk of chunks) {
    const candidate = chunk.trim();
    if (!candidate || (candidate.match(/=/g) ?? []).length !== 1) {
      continue;
    }
    if (!EQUATION_CANDIDATE.test(candidate)) {
      continue;
    }
    if (!/[a-zA-Z]/.test(candidate) || !/\d/.test(candidate)) {
      continue;
    }
    equations.push(candidate);
  }
  return equations;
}
