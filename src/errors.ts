/**
 * Smart-Thinking v13 — Typed errors.
 *
 * All thrown errors map to stable codes so MCP adapters and the benchmark
 * harness can react programmatically instead of parsing messages.
 */

export type SmartThinkingErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'PERSISTENCE_ERROR'
  | 'PROVIDER_ERROR'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'RATE_LIMITED'
  | 'TIMEOUT'
  | 'LIMIT_EXCEEDED'
  | 'INTERNAL_ERROR';

export class SmartThinkingError extends Error {
  readonly code: SmartThinkingErrorCode;
  readonly details?: Record<string, unknown>;
  readonly retryable: boolean;

  constructor(
    code: SmartThinkingErrorCode,
    message: string,
    options: { details?: Record<string, unknown>; retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = 'SmartThinkingError';
    this.code = code;
    this.details = options.details;
    this.retryable = options.retryable ?? false;
  }
}

export class ValidationError extends SmartThinkingError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, { details });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends SmartThinkingError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('NOT_FOUND', message, { details });
    this.name = 'NotFoundError';
  }
}

export class PersistenceError extends SmartThinkingError {
  constructor(message: string, details?: Record<string, unknown>, cause?: unknown) {
    super('PERSISTENCE_ERROR', message, { details, retryable: true, cause });
    this.name = 'PersistenceError';
  }
}

export class ProviderError extends SmartThinkingError {
  constructor(message: string, details?: Record<string, unknown>, retryable = false) {
    super('PROVIDER_ERROR', message, { details, retryable });
    this.name = 'ProviderError';
  }
}

export class ProviderNotConfiguredError extends SmartThinkingError {
  constructor(provider: string) {
    super('PROVIDER_NOT_CONFIGURED', `Provider "${provider}" is not configured.`, {
      details: { provider },
    });
    this.name = 'ProviderNotConfiguredError';
  }
}

export class TimeoutError extends SmartThinkingError {
  constructor(operation: string, timeoutMs: number) {
    super('TIMEOUT', `Operation "${operation}" timed out after ${timeoutMs}ms.`, {
      details: { operation, timeoutMs },
      retryable: true,
    });
    this.name = 'TimeoutError';
  }
}

export class LimitExceededError extends SmartThinkingError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('LIMIT_EXCEEDED', message, { details });
    this.name = 'LimitExceededError';
  }
}

export function toSmartThinkingError(error: unknown, fallbackMessage = 'Unexpected error'): SmartThinkingError {
  if (error instanceof SmartThinkingError) {
    return error;
  }
  if (error instanceof Error) {
    return new SmartThinkingError('INTERNAL_ERROR', error.message || fallbackMessage, { cause: error });
  }
  return new SmartThinkingError('INTERNAL_ERROR', fallbackMessage, { details: { value: String(error) } });
}
