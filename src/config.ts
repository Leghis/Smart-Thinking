/**
 * Smart-Thinking v13 — Runtime configuration.
 *
 * Environment-driven, validated once per process. Platform path helpers live in
 * `utils/path-utils.ts`; this module keeps only runtime knobs and backward
 * compatible aliases used across the codebase.
 */
import { platform } from 'os';
import * as path from 'path';
import type { SearchDepth, SearchProviderPreference } from './types';
import { CACHE_TTL_MS, LIMITS, SIMILARITY_THRESHOLDS, METRIC_THRESHOLDS } from './constants';

export type LogLevel = 'silent' | 'error' | 'warn' | 'info' | 'debug';

export interface RuntimeConfig {
  logLevel: LogLevel;
  logFormat: 'json' | 'pretty';
  maxThoughtLength: number;
  maxConnectionsPerThought: number;
  search: {
    provider: SearchProviderPreference;
    tavilyApiKey?: string;
    searchDepth: SearchDepth;
    cacheTtlMs: number;
    requestTimeoutMs: number;
  };
  persistence: {
    /** Optional override for the data directory (useful for tests and portable runs). */
    dataDir?: string;
    disabled: boolean;
  };
}

const LOG_LEVELS: readonly LogLevel[] = ['silent', 'error', 'warn', 'info', 'debug'];

function parseLogLevel(raw: string | undefined, fallback: LogLevel): LogLevel {
  const value = (raw ?? '').toLowerCase();
  return (LOG_LEVELS as readonly string[]).includes(value) ? (value as LogLevel) : fallback;
}

function parseProvider(raw: string | undefined): SearchProviderPreference {
  const value = (raw ?? '').toLowerCase();
  if (value === 'tavily' || value === 'native' || value === 'off' || value === 'auto') {
    return value;
  }
  return 'auto';
}

function parseSearchDepth(raw: string | undefined): SearchDepth {
  return (raw ?? '').toLowerCase() === 'advanced' ? 'advanced' : 'basic';
}

export function loadRuntimeConfig(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const fallbackLevel: LogLevel = env.NODE_ENV === 'test' ? 'silent' : 'info';
  const fallbackFormat = env.NODE_ENV === 'production' ? 'json' : 'pretty';

  return {
    logLevel: parseLogLevel(env.SMART_THINKING_LOG_LEVEL, fallbackLevel),
    logFormat: (env.SMART_THINKING_LOG_FORMAT ?? '').toLowerCase() === 'json' ? 'json' : fallbackFormat,
    maxThoughtLength: LIMITS.MAX_THOUGHT_LENGTH,
    maxConnectionsPerThought: LIMITS.MAX_CONNECTIONS_PER_THOUGHT,
    search: {
      provider: parseProvider(env.SMART_THINKING_SEARCH_PROVIDER),
      tavilyApiKey: env.TAVILY_API_KEY?.trim() || undefined,
      searchDepth: parseSearchDepth(env.SMART_THINKING_SEARCH_DEPTH),
      cacheTtlMs: CACHE_TTL_MS.SEARCH,
      requestTimeoutMs: LIMITS.WEB_REQUEST_TIMEOUT_MS,
    },
    persistence: {
      dataDir: env.SMART_THINKING_DATA_DIR?.trim() || undefined,
      disabled: env.SMART_THINKING_DISABLE_PERSISTENCE === 'true' || env.NODE_ENV === 'test',
    },
  };
}

/**
 * Backward-compatible system constants (pre-v13 call sites).
 */
export const SystemConfig = {
  DEFAULT_SESSION_ID: LIMITS.DEFAULT_SESSION_ID,
  MAX_THOUGHT_LENGTH: LIMITS.MAX_THOUGHT_LENGTH,
  MAX_CONNECTIONS: LIMITS.MAX_CONNECTIONS_PER_THOUGHT,
} as const;

/**
 * Backward-compatible verification thresholds (pre-v13 call sites).
 */
export const VerificationConfig = {
  CONFIDENCE: {
    MINIMUM_THRESHOLD: 0.7,
    VERIFICATION_REQUIRED: 0.5,
    HIGH_CONFIDENCE: METRIC_THRESHOLDS.HIGH_CONFIDENCE,
    LOW_CONFIDENCE: 0.4,
  },
  SIMILARITY: {
    EXACT_MATCH: SIMILARITY_THRESHOLDS.EXACT_MATCH,
    HIGH_SIMILARITY: SIMILARITY_THRESHOLDS.HIGH,
    MEDIUM_SIMILARITY: SIMILARITY_THRESHOLDS.MEDIUM,
    LOW_SIMILARITY: SIMILARITY_THRESHOLDS.LOW,
    TEXT_MATCH: SIMILARITY_THRESHOLDS.MEDIUM,
  },
  MEMORY: {
    MAX_CACHE_SIZE: LIMITS.MAX_VERIFICATION_ENTRIES_PER_SESSION,
    CACHE_EXPIRATION: CACHE_TTL_MS.SIMILARITY,
    DEFAULT_SESSION_TTL: CACHE_TTL_MS.SESSION,
  },
} as const;

/**
 * Platform detection & path helpers kept for CLI compatibility.
 */
export const PlatformConfig = {
  IS_WINDOWS: platform() === 'win32',
  IS_MAC: platform() === 'darwin',
  IS_LINUX: platform() === 'linux',

  getConfigPath: (): string => {
    if (platform() === 'win32') {
      return process.env.APPDATA
        ? path.join(process.env.APPDATA, 'Smart-Thinking')
        : path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming', 'Smart-Thinking');
    }
    if (platform() === 'darwin') {
      return path.join(process.env.HOME || '', 'Library', 'Application Support', 'Smart-Thinking');
    }
    return path.join(process.env.HOME || '', '.smart-thinking');
  },

  getTempPath: (): string => {
    return path.join(platform() === 'win32' ? (process.env.TEMP || 'C:/Temp') : '/tmp', 'smart-thinking');
  },

  isNvmEnvironment: (): boolean => {
    const nodePath = process.execPath.toLowerCase();
    return nodePath.includes('nvm') || (platform() === 'win32' && nodePath.includes('appdata\\roaming\\nvm'));
  },

  getNvmBasePath: (): string | null => {
    if (!PlatformConfig.isNvmEnvironment()) {
      return null;
    }
    if (platform() === 'win32') {
      return process.execPath.split('\\node.exe')[0];
    }
    return process.env.NVM_DIR ?? null;
  },
};
