/**
 * Logger utilitaire minimaliste avec niveaux configurables et sortie structurée.
 * S'aligne sur les bonnes pratiques de journalisation Node.js : niveaux, structure JSON,
 * et contrôle par variables d'environnement.
 */

const LEVELS = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
} as const;

type LogLevel = keyof typeof LEVELS;

type LogPayload = {
  level: LogLevel;
  timestamp: string;
  message: string;
  origin?: string;
  context?: Record<string, unknown>;
};

const GLOBAL_SYMBOL = Symbol.for('smart-thinking.logger.initialized');

type ConsoleMethod = (...args: unknown[]) => void;

let currentLevel: LogLevel = resolveInitialLevel();
let useJsonFormat = resolveInitialFormat();

function resolveInitialLevel(): LogLevel {
  const envLevel = (process.env.SMART_THINKING_LOG_LEVEL || '').toLowerCase();
  if (envLevel && envLevel in LEVELS) {
    return envLevel as LogLevel;
  }
  if (process.env.NODE_ENV === 'test') {
    return 'silent';
  }
  return 'info';
}

function resolveInitialFormat(): boolean {
  const format = (process.env.SMART_THINKING_LOG_FORMAT || '').toLowerCase();
  if (format === 'json') {
    return true;
  }
  if (format === 'pretty') {
    return false;
  }
  return process.env.NODE_ENV === 'production';
}

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] <= LEVELS[currentLevel];
}

function formatArgs(args: unknown[]): string {
  if (args.length === 1 && typeof args[0] === 'string') {
    return args[0];
  }
  return args
    .map((arg) => {
      if (typeof arg === 'string') {
        return arg;
      }
      if (arg instanceof Error) {
        return `${arg.name}: ${arg.message}\n${arg.stack}`;
      }
      try {
        return JSON.stringify(arg);
      } catch {
        return String(arg);
      }
    })
    .join(' ');
}

function getOrigin(): string | undefined {
  const error = new Error();
  if (!error.stack) {
    return undefined;
  }
  const stackLines = error.stack.split('\n').slice(3);
  for (const line of stackLines) {
    const trimmed = line.trim();
    if (!trimmed.includes('logger.ts')) {
      return trimmed;
    }
  }
  return undefined;
}

function write(payload: LogPayload, stream: NodeJS.WriteStream): void {
  if (useJsonFormat) {
    stream.write(`${JSON.stringify(payload)}\n`);
    return;
  }
  const contextInfo = payload.origin ? ` (${payload.origin})` : '';
  stream.write(`[${payload.timestamp}] ${payload.level.toUpperCase()}${contextInfo}: ${payload.message}\n`);
}

function buildConsoleMethod(level: LogLevel): ConsoleMethod {
  const stream = process.stderr;
  return (...args: unknown[]) => {
    if (!shouldLog(level)) {
      return;
    }

    const payload: LogPayload = {
      level,
      timestamp: new Date().toISOString(),
      message: formatArgs(args),
      origin: getOrigin(),
    };

    write(payload, stream);
  };
}

function patchConsole(): void {
  if ((global as any)[GLOBAL_SYMBOL]) {
    return;
  }

  (global as any)[GLOBAL_SYMBOL] = true;

  const originalConsole = { ...console };

  console.error = buildConsoleMethod('error') as typeof console.error;
  console.warn = buildConsoleMethod('warn') as typeof console.warn;
  console.info = buildConsoleMethod('info') as typeof console.info;
  console.log = buildConsoleMethod('info') as typeof console.log;
  console.debug = buildConsoleMethod('debug') as typeof console.debug;
  console.trace = ((...args: unknown[]) => {
    if (!shouldLog('debug')) {
      return;
    }
    originalConsole.trace(...args);
  }) as typeof console.trace;
}

/**
 * Permet de modifier dynamiquement le niveau de log.
 */
export function setLogLevel(level: LogLevel): void {
  if (!(level in LEVELS)) {
    throw new Error(`Niveau de log inconnu: ${level}`);
  }
  currentLevel = level;
}

/**
 * Permet de basculer entre format JSON (production) et format texte lisible.
 */
export function setLogFormat(format: 'json' | 'pretty'): void {
  useJsonFormat = format === 'json';
}

patchConsole();

export const Logger = {
  setLevel: setLogLevel,
  setFormat: setLogFormat,
};
