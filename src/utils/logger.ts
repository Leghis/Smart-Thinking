/**
 * Smart-Thinking v13 — structured logger.
 *
 * All diagnostics go to stderr so the stdio JSON-RPC stream stays clean.
 * Console methods are patched once on import for backward compatibility.
 */

export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

const LEVELS: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

interface LogContext {
  [key: string]: unknown;
}

interface StructuredLogger {
  error(message: string, context?: LogContext | unknown): void;
  warn(message: string, context?: LogContext | unknown): void;
  info(message: string, context?: LogContext | unknown): void;
  debug(message: string, context?: LogContext | unknown): void;
  child(scope: string): StructuredLogger;
}

let currentLevel: LogLevel = resolveInitialLevel();
let useJsonFormat = resolveInitialFormat();

function resolveInitialLevel(): LogLevel {
  const envLevel = (process.env.SMART_THINKING_LOG_LEVEL ?? '').toLowerCase() as LogLevel;
  if (envLevel in LEVELS) {
    return envLevel;
  }
  return process.env.NODE_ENV === 'test' ? 'silent' : 'info';
}

function resolveInitialFormat(): boolean {
  const format = (process.env.SMART_THINKING_LOG_FORMAT ?? '').toLowerCase();
  if (format === 'json') {
    return true;
  }
  if (format === 'pretty') {
    return false;
  }
  return process.env.NODE_ENV === 'production';
}

export function configureLogger(options: { level?: LogLevel; format?: 'json' | 'pretty' }): void {
  if (options.level && options.level in LEVELS) {
    currentLevel = options.level;
  }
  if (options.format) {
    useJsonFormat = options.format === 'json';
  }
}

export function setLogLevel(level: LogLevel): void {
  configureLogger({ level });
}

export function setLogFormat(format: 'json' | 'pretty'): void {
  configureLogger({ format });
}

function shouldLog(level: Exclude<LogLevel, 'silent'>): boolean {
  return LEVELS[level] <= LEVELS[currentLevel];
}

function stringify(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof Error) {
    return `${value.name}: ${value.message}`;
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function write(level: Exclude<LogLevel, 'silent'>, scope: string, message: string, context?: unknown): void {
  if (!shouldLog(level)) {
    return;
  }
  if (useJsonFormat) {
    process.stderr.write(
      `${JSON.stringify({
        level,
        time: new Date().toISOString(),
        scope,
        message,
        ...(context === undefined ? {} : { context }),
      })}\n`,
    );
    return;
  }
  const contextInfo = context === undefined ? '' : ` ${stringify(context)}`;
  process.stderr.write(`[${level.toUpperCase()}] ${scope}: ${message}${contextInfo}\n`);
}

export function createLogger(scope: string): StructuredLogger {
  return {
    error: (message, context) => write('error', scope, message, context),
    warn: (message, context) => write('warn', scope, message, context),
    info: (message, context) => write('info', scope, message, context),
    debug: (message, context) => write('debug', scope, message, context),
    child: (childScope: string) => createLogger(`${scope}:${childScope}`),
  };
}

const GLOBAL_SYMBOL = Symbol.for('smart-thinking.logger.initialized');

function patchConsole(): void {
  if ((globalThis as Record<symbol, unknown>)[GLOBAL_SYMBOL]) {
    return;
  }
  (globalThis as Record<symbol, unknown>)[GLOBAL_SYMBOL] = true;

  console.log = (...args: unknown[]) => write('info', 'console', args.map(stringify).join(' '));
  console.info = (...args: unknown[]) => write('info', 'console', args.map(stringify).join(' '));
  console.warn = (...args: unknown[]) => write('warn', 'console', args.map(stringify).join(' '));
  console.error = (...args: unknown[]) => write('error', 'console', args.map(stringify).join(' '));
  console.debug = (...args: unknown[]) => write('debug', 'console', args.map(stringify).join(' '));
}

export const Logger = {
  setLevel: (level: LogLevel) => configureLogger({ level }),
  setFormat: (format: 'json' | 'pretty') => configureLogger({ format }),
};

patchConsole();
