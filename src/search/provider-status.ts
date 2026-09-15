import { ProviderError } from '../errors';

/** Why a web provider could not deliver, in a stable machine-readable form. */
export type DegradationReason =
  | 'auth'
  | 'quota'
  | 'rate_limit'
  | 'timeout'
  | 'server'
  | 'provider'
  | 'budget'
  | 'unknown';

export interface Degradation {
  degraded: true;
  reason: DegradationReason;
  detail: string;
}

const RETRYABLE_REASONS = new Set<DegradationReason>(['rate_limit', 'timeout', 'server']);

export function isRetryable(reason: DegradationReason): boolean {
  return RETRYABLE_REASONS.has(reason);
}

/**
 * Map any provider failure to a degradation descriptor. Never throws and never
 * pretends the call succeeded: the caller returns whatever it already collected.
 */
export function classifyProviderFailure(error: unknown): Degradation {
  const status =
    error instanceof ProviderError && typeof error.details?.status === 'number'
      ? (error.details.status as number)
      : undefined;
  const message = error instanceof Error ? error.message : String(error ?? 'erreur inconnue');

  if (status === 401 || status === 403) {
    return { degraded: true, reason: 'auth', detail: message };
  }
  if (status === 432 || status === 433) {
    return {
      degraded: true,
      reason: 'quota',
      detail: 'Quota ou plan Tavily insuffisant pour cet appel (432/433).',
    };
  }
  if (status === 429) {
    return { degraded: true, reason: 'rate_limit', detail: message };
  }
  if (error instanceof ProviderError && error.retryable) {
    const isTimeout = /timeout|n'a pas répondu/i.test(message);
    return {
      degraded: true,
      reason: isTimeout ? 'timeout' : 'server',
      detail: message,
    };
  }
  if (error instanceof ProviderError) {
    return { degraded: true, reason: 'provider', detail: message };
  }
  return { degraded: true, reason: 'unknown', detail: message };
}
