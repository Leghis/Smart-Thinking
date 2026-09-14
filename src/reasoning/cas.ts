import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ValidationError, ProviderError } from '../errors';

/**
 * Exact computer-algebra bridge (SymPy + mpmath worker).
 *
 * Gives any LLM a real CAS: symbolic simplification, identity verification,
 * equation solving, minimal polynomials, high-precision numerics and special
 * functions (Gamma, Jacobi elliptic functions). Parameters are validated and
 * passed as JSON; the Python worker ships with the package.
 */

export type CasOperation =
  | 'simplify'
  | 'expand'
  | 'factor'
  | 'verify_identity'
  | 'solve'
  | 'minimal_polynomial'
  | 'evalf'
  | 'poly_roots'
  | 'series'
  | 'gamma'
  | 'elliptic'
  | 'mod_linear'
  | 'lattice_solve'
  | 'weierstrass_duplication'
  | 'compose'
  | 'compare';

export interface CasRequest {
  operation: CasOperation;
  expr?: string;
  lhs?: string;
  rhs?: string;
  equation?: string;
  value?: string;
  symbol?: string;
  symbols?: string[];
  precision?: number;
  subs?: Record<string, number>;
  order?: number;
  kind?: string;
  u?: number;
  m?: number;
  coefficient?: number;
  modulus?: number;
  count?: number;
  a?: number;
  b?: number;
  g2?: number;
  g3?: number;
  rational?: string;
  inner?: string;
  polynomial?: string;
}

export interface CasResult {
  operation: CasOperation;
  ok: boolean;
  result?: unknown;
  equal?: boolean;
  error?: string;
  durationMs: number;
}

const PYTHON_CANDIDATES = ['python3', 'python'];
const EXPRESSION_WHITELIST = /^[\dA-Za-z_+\-*/^().,=<>!%[\]{}:'\s|]*$/;
const FORBIDDEN_FRAGMENTS = ['__', 'import', 'lambda', 'open(', 'exec(', 'eval(', 'os.', 'sys.', 'subprocess', ';', '`', '\n', '\r'];

function validateExpression(value: string | undefined, field: string): void {
  if (value === undefined) {
    return;
  }
  if (value.length > 2_000) {
    throw new ValidationError(`${field} dépasse 2000 caractères.`);
  }
  if (!EXPRESSION_WHITELIST.test(value)) {
    throw new ValidationError(`${field} contient des caractères non autorisés.`);
  }
  const lower = value.toLowerCase();
  for (const fragment of FORBIDDEN_FRAGMENTS) {
    if (lower.includes(fragment)) {
      throw new ValidationError(`${field} contient un motif interdit (${fragment}).`);
    }
  }
}

let workerPath: string | null = null;
let resolvedPython: string | null = null;

async function resolvePython(): Promise<string> {
  if (resolvedPython) {
    return resolvedPython;
  }
  for (const candidate of PYTHON_CANDIDATES) {
    const ok = await new Promise<boolean>(resolve => {
      const child = spawn(candidate, ['-c', 'import sympy'], { stdio: 'ignore' });
      child.on('error', () => resolve(false));
      child.on('exit', code => resolve(code === 0));
    });
    if (ok) {
      resolvedPython = candidate;
      return candidate;
    }
  }
  throw new ProviderError(
    'SymPy introuvable. Installez-le (pip install sympy mpmath) ou désactivez l\'outil cas.',
    { provider: 'cas' },
  );
}

async function ensureWorker(): Promise<string> {
  if (workerPath) {
    return workerPath;
  }
  const target = path.join(os.tmpdir(), `smart-thinking-cas-${process.pid}.py`);
  await fs.writeFile(target, CAS_WORKER_SOURCE, 'utf8');
  workerPath = target;
  return target;
}

export function isCasAvailable(): Promise<boolean> {
  return resolvePython().then(() => true).catch(() => false);
}

export async function runCas(request: CasRequest, timeoutMs = 25_000): Promise<CasResult> {
  const started = Date.now();
  validateRequest(request);
  const python = await resolvePython();
  const worker = await ensureWorker();

  const payload = JSON.stringify(request).replace(/\n/g, ' ');
  const output = await new Promise<string>((resolve, reject) => {
    const child = spawn(python, [worker, payload], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new ProviderError(`CAS timeout (${timeoutMs}ms).`, { provider: 'cas' }, true));
    }, timeoutMs);

    child.stdout.on('data', chunk => {
      stdout += String(chunk);
      if (stdout.length > 400_000) {
        child.kill('SIGKILL');
      }
    });
    child.stderr.on('data', chunk => {
      stderr += String(chunk).slice(0, 2_000);
    });
    child.on('error', error => {
      clearTimeout(timer);
      reject(new ProviderError(`CAS worker introuvable: ${error.message}`, { provider: 'cas' }));
    });
    child.on('exit', code => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new ProviderError(`CAS worker exit ${code}: ${stderr.slice(0, 300)}`, { provider: 'cas' }));
        return;
      }
      resolve(stdout.trim());
    });
  });

  try {
    const parsed = JSON.parse(output) as Omit<CasResult, 'durationMs'>;
    return { ...parsed, durationMs: Date.now() - started };
  } catch {
    throw new ProviderError(`CAS réponse illisible: ${output.slice(0, 300)}`, { provider: 'cas' });
  }
}

function validateRequest(request: CasRequest): void {
  validateExpression(request.expr, 'expr');
  validateExpression(request.lhs, 'lhs');
  validateExpression(request.rhs, 'rhs');
  validateExpression(request.equation, 'equation');
  validateExpression(request.value, 'value');
  validateExpression(request.polynomial, 'polynomial');
  for (const symbol of request.symbols ?? []) {
    validateExpression(symbol, 'symbols');
  }
  if (request.precision !== undefined && (request.precision < 2 || request.precision > 500)) {
    throw new ValidationError('precision doit être comprise entre 2 et 500.');
  }
}

const CAS_WORKER_SOURCE = String.raw`#!/usr/bin/env python3
"""Smart-Thinking exact CAS worker (SymPy + mpmath). JSON in, JSON out."""
import json
import sys

sys.setrecursionlimit(10000)

def main():
    request = json.loads(sys.argv[1])
    operation = request.get("operation")
    precision = int(request.get("precision", 30))
    result = {"operation": operation, "ok": False}

    try:
        import sympy as sp
        from sympy.parsing.sympy_parser import (
            parse_expr, standard_transformations, implicit_multiplication_application,
        )

        names = request.get("symbols") or list("xyzabctuvwq")
        local = {name: sp.Symbol(name) for name in names if isinstance(name, str) and name.isidentifier()}
        local.update({
            "I": sp.I, "i": sp.I, "pi": sp.pi, "E": sp.E, "oo": sp.oo,
            "sqrt": sp.sqrt, "exp": sp.exp, "log": sp.log, "sin": sp.sin, "cos": sp.cos, "tan": sp.tan,
            "diff": sp.diff, "factor": sp.factor, "simplify": sp.simplify, "cancel": sp.cancel, "together": sp.together,
            "Rational": sp.Rational, "conjugate": sp.conjugate, "Abs": sp.Abs,
        })
        transformations = standard_transformations + (implicit_multiplication_application,)

        def parse(text):
            return parse_expr(text, local_dict=local, transformations=transformations, evaluate=True)

        if operation in ("simplify", "expand", "factor"):
            value = parse(request["expr"])
            if operation == "simplify":
                out = sp.simplify(value)
            elif operation == "expand":
                out = sp.expand(value)
            else:
                out = sp.factor(value)
            result.update(ok=True, result=str(out))

        elif operation == "verify_identity":
            lhs = parse(request["lhs"])
            rhs = parse(request["rhs"])
            difference = sp.simplify(sp.expand(lhs - rhs))
            result.update(ok=True, equal=(difference == 0), result=str(difference))

        elif operation == "solve":
            equation = parse(request["equation"])
            symbol = sp.Symbol(request.get("symbol", "x"))
            solutions = sp.solve(sp.Eq(equation, 0), symbol)
            result.update(ok=True, result=[str(solution) for solution in solutions])

        elif operation == "minimal_polynomial":
            value = parse(request["value"])
            symbol = sp.Symbol(request.get("symbol", "x"))
            polynomial = sp.minimal_polynomial(value, symbol)
            result.update(ok=True, result=str(sp.expand(polynomial)))

        elif operation == "evalf":
            value = parse(request["expr"])
            subs = {sp.Symbol(key): sp.Float(number, precision) for key, number in (request.get("subs") or {}).items()}
            evaluated = value.subs(subs).evalf(precision)
            result.update(ok=True, result=sp.nstr(evaluated, precision))

        elif operation == "poly_roots":
            value = parse(request.get("polynomial") or request["expr"])
            symbol = sp.Symbol(request.get("symbol", "t"))
            roots = sp.Poly(value, symbol).nroots(n=precision)
            result.update(ok=True, result=[sp.nstr(root, precision) for root in roots])

        elif operation == "series":
            value = parse(request["expr"])
            symbol = sp.Symbol(request.get("symbol", "x"))
            point = parse(str(request.get("value", "0")))
            series = sp.series(value, symbol, point, int(request.get("order", 6)))
            result.update(ok=True, result=str(series.removeO()))

        elif operation == "gamma":
            import mpmath as mp
            mp.mp.dps = precision
            argument = request.get("value")
            value = mp.gamma(float(argument)) if argument not in (None, "") else mp.gamma(0.25)
            result.update(ok=True, result=mp.nstr(value, precision))

        elif operation == "elliptic":
            import mpmath as mp
            mp.mp.dps = precision
            kind = request.get("kind", "sn")
            u = mp.mpf(str(request.get("u", 0.5)))
            m = mp.mpf(str(request.get("m", 0.5)))
            if kind.upper() == "K":
                value = mp.ellipk(m)
            else:
                value = mp.ellipfun(kind, u, m)
            result.update(ok=True, result=mp.nstr(value, precision))

        elif operation == "mod_linear":
            coefficient = int(request.get("coefficient", 4))
            modulus = int(request.get("modulus", 17))
            count = int(request.get("count", 16))
            residues = [((coefficient * k) % modulus) for k in range(1, count + 1)]
            result.update(ok=True, result=residues)

        elif operation == "weierstrass_duplication":
            g2 = parse(str(request.get("g2", "4")))
            g3 = parse(str(request.get("g3", "0")))
            t = sp.Symbol(request.get("symbol", "t"))
            derivative = sp.sqrt(4 * t**3 - g2 * t - g3)
            R = sp.simplify(-2 * t + sp.Rational(1, 4) * ((6 * t**2 - g2 / 2) ** 2) / (derivative ** 2))
            R = sp.cancel(sp.together(R))
            result.update(ok=True, result=str(R))

        elif operation == "compose":
            rational = parse(request["rational"])
            inner = parse(request["inner"])
            t = sp.Symbol(request.get("symbol", "t"))
            composed = sp.cancel(sp.together(rational.subs(t, inner)))
            result.update(ok=True, result=str(sp.factor(composed)))

        elif operation == "lattice_solve":
            a = int(request.get("a", 4))
            b = int(request.get("b", 1))
            modulus = int(request.get("modulus") or (a * a + b * b))
            count = int(request.get("count") or (modulus - 1))
            if modulus <= 1:
                raise ValueError("modulus doit être > 1")
            inverse_a = pow(a % modulus, -1, modulus)
            points = []
            for u in range(1, min(count, modulus - 1) + 1):
                v = ((-b * inverse_a * u) % modulus)
                points.append({"u": u, "v": v, "z": "(%d + %di)/%d" % (u, v, modulus)})
            result.update(ok=True, result=points, modulus=modulus)

        elif operation == "compare":
            left = sp.Float(request["lhs"], precision)
            right = sp.Float(request["rhs"], precision)
            difference = abs(left - right)
            result.update(ok=True, result=sp.nstr(difference, precision), equal=(difference < sp.Float(10) ** (-(precision - 5))))

        else:
            result.update(error="operation inconnue: %s" % operation)

    except Exception as error:  # noqa: BLE001
        result.update(error="%s: %s" % (type(error).__name__, error))

    print(json.dumps(result, default=str))

if __name__ == "__main__":
    main()
`;
