import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { ProviderError, ValidationError } from '../errors';

/**
 * Safe programmable compute sandbox (Python + SymPy/NumPy/SciPy/mpmath).
 *
 * Lets the calling model write a small deterministic script to build exact
 * certificates (CRT, LP, finite fields, exhaustive search, linear algebra,
 * quantum feasibility…). The script is statically validated: no filesystem,
 * network, subprocess, dunder introspection or dynamic imports.
 */

const MAX_SOURCE_CHARS = 20_000;
const MAX_OUTPUT_CHARS = 60_000;
const DEFAULT_TIMEOUT_MS = 45_000;
const MAX_TIMEOUT_MS = 120_000;

const ALLOWED_IMPORTS = new Set([
  'math', 'cmath', 'fractions', 'decimal', 'itertools', 'functools', 'collections',
  'statistics', 'random', 'bisect', 'heapq', 'copy', 'operator', 'json', 're',
  'dataclasses', 'typing', 'sympy', 'mpmath', 'numpy', 'scipy',
]);

const FORBIDDEN_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /__/, reason: 'introspection interdite (__)' },
  { pattern: /\b(import|from)\s+(os|sys|subprocess|socket|shutil|pathlib|requests|urllib|http|ftplib|ctypes|multiprocessing|asyncio|importlib|pickle|marshal|pty|signal|resource|platform|tempfile|glob|io|code|codeop)\b/, reason: 'import non autorisé' },
  { pattern: /\b(open|exec|eval|compile|input)\s*\(/, reason: 'fonction interdite (open/exec/eval/compile/input)' },
  { pattern: /\b(__import__|getattr|setattr|delattr|globals|locals|vars|breakpoint)\s*\(/, reason: 'introspection dynamique interdite' },
  { pattern: /\b(os|sys|subprocess|socket|shutil|requests|urllib)\s*\./, reason: 'module système non autorisé' },
  { pattern: /\bsys\.(exit|stdout|stderr|path|modules)\b/, reason: 'accès à sys interdit' },
  { pattern: /while\s+True\s*:\s*pass/, reason: 'boucle infinie détectée' },
];

export interface ComputeRequest {
  code: string;
  timeoutMs?: number;
}

export interface ComputeResult {
  ok: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  truncated: boolean;
  durationMs: number;
}

function validateSource(code: string): void {
  if (!code.trim()) {
    throw new ValidationError('Le code est vide.');
  }
  if (code.length > MAX_SOURCE_CHARS) {
    throw new ValidationError(`Code trop long (max ${MAX_SOURCE_CHARS} caractères).`);
  }

  for (const line of code.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const importMatch = /^(?:import\s+([A-Za-z_][\w.]*)|from\s+([A-Za-z_][\w.]*)\s+import)/.exec(trimmed);
    if (importMatch) {
      const moduleName = (importMatch[1] ?? importMatch[2]).split('.')[0];
      if (!ALLOWED_IMPORTS.has(moduleName)) {
        throw new ValidationError(`Import non autorisé: ${moduleName}.`);
      }
    }
  }

  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    if (pattern.test(code)) {
      throw new ValidationError(`Code refusé: ${reason}.`);
    }
  }
}

const PYTHON_PREAMBLE = [
  'import json, math',
  'import mpmath as mp',
  'mp.mp.dps = 50',
  'try:',
  '    import numpy as np',
  '    np.set_printoptions(precision=12, suppress=False, linewidth=120)',
  'except Exception:',
  '    np = None',
  'try:',
  '    import sympy as sp',
  'except Exception:',
  '    sp = None',
  '',
  '# --- user script ---',
].join('\n');

export async function runCompute(
  request: ComputeRequest,
  options: { python?: string } = {},
): Promise<ComputeResult> {
  validateSource(request.code);
  const timeoutMs = Math.min(
    Math.max(request.timeoutMs ?? DEFAULT_TIMEOUT_MS, 1_000),
    MAX_TIMEOUT_MS,
  );

  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'smart-thinking-compute-'));
  const scriptPath = path.join(dir, 'script.py');
  const started = Date.now();

  try {
    await fs.writeFile(scriptPath, `${PYTHON_PREAMBLE}\n${request.code}\n`, 'utf8');
    const python = options.python ?? (await resolvePython());

    const { stdout, stderr, exitCode, truncated } = await new Promise<{
      stdout: string;
      stderr: string;
      exitCode: number | null;
      truncated: boolean;
    }>((resolve, reject) => {
      const child = spawn(python, ['-I', scriptPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          PATH: process.env.PATH ?? '/usr/bin:/bin',
          HOME: os.tmpdir(),
          PYTHONHASHSEED: '0',
          PYTHONDONTWRITEBYTECODE: '1',
          MPLBACKEND: 'Agg',
        },
      });

      let stdout = '';
      let stderr = '';
      let truncated = false;
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        stderr += `\n[compute] timeout après ${timeoutMs}ms`;
      }, timeoutMs);

      child.stdout.on('data', (chunk: Buffer) => {
        if (stdout.length < MAX_OUTPUT_CHARS) {
          stdout += chunk.toString('utf8');
        } else {
          truncated = true;
        }
      });
      child.stderr.on('data', (chunk: Buffer) => {
        if (stderr.length < MAX_OUTPUT_CHARS / 4) {
          stderr += chunk.toString('utf8');
        }
      });
      child.on('error', error => {
        clearTimeout(timer);
        reject(new ProviderError(`Exécution Python impossible: ${error.message}`, { provider: 'compute' }));
      });
      child.on('close', code => {
        clearTimeout(timer);
        resolve({ stdout: stdout.slice(0, MAX_OUTPUT_CHARS), stderr, exitCode: code, truncated });
      });
    });

    return {
      ok: exitCode === 0,
      exitCode,
      stdout,
      stderr,
      truncated,
      durationMs: Date.now() - started,
    };
  } finally {
    await fs.rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

let cachedPython: string | null = null;

async function resolvePython(): Promise<string> {
  if (cachedPython) {
    return cachedPython;
  }
  for (const candidate of ['python3', 'python']) {
    const ok = await new Promise<boolean>(resolve => {
      const child = spawn(candidate, ['-I', '-c', 'import sympy, numpy, scipy'], { stdio: 'ignore' });
      child.on('error', () => resolve(false));
      child.on('close', code => resolve(code === 0));
    });
    if (ok) {
      cachedPython = candidate;
      return candidate;
    }
  }
  throw new ProviderError(
    'Python avec sympy/numpy/scipy introuvable pour le sandbox compute.',
    { provider: 'compute' },
  );
}
