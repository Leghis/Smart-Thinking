import { MemoryItem, VerificationStatus } from '../types';

/**
 * Legacy keys related to external AI integrations that must be stripped from persisted payloads.
 */
const LEGACY_KEY_PATTERNS = [
  /embedding/i,
  /vector/i,
  /cohere/i,
  /openai/i,
  /openrouter/i,
  /provider/i,
  /apikey/i,
  /api_key/i,
  /llm/i,
  /prompt/i,
  /response/i,
  /usage/i,
];

/**
 * Ensure a value can safely be serialized while removing legacy artefacts.
 */
function sanitizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    const sanitizedArray = value
      .map((item) => sanitizeValue(item))
      .filter((item) => item !== undefined);
    return sanitizedArray.length > 0 ? sanitizedArray : undefined;
  }

  if (typeof value === 'object') {
    const entries: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      if (LEGACY_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
        continue;
      }
      const sanitizedNested = sanitizeValue(nestedValue);
      if (sanitizedNested !== undefined) {
        entries[key] = sanitizedNested;
      }
    }
    return Object.keys(entries).length > 0 ? entries : undefined;
  }

  if (typeof value === 'function') {
    return undefined;
  }

  return value;
}

/**
 * Attempt to parse a date while falling back to the current time.
 */
function coerceDate(value: unknown): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return new Date();
}

export interface PersistedMemoryItem {
  id: string;
  content: string;
  tags: string[];
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export function sanitizeMemoryItem(raw: unknown): MemoryItem | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const data = raw as Record<string, unknown>;
  const id = typeof data.id === 'string' && data.id.trim() ? data.id.trim() : null;
  const content = typeof data.content === 'string' ? data.content : typeof data.text === 'string' ? data.text : null;

  if (!id || !content) {
    return null;
  }

  const tagsRaw = Array.isArray(data.tags) ? data.tags : [];
  const tags = tagsRaw
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean);

  const metadata = sanitizeValue(data.metadata ?? data.meta ?? data.context);

  return {
    id,
    content,
    tags,
    timestamp: coerceDate(data.timestamp),
    ...(metadata ? { metadata: metadata as Record<string, unknown> } : {}),
  };
}

export function prepareMemoryForStorage(memory: MemoryItem): PersistedMemoryItem {
  const metadata = sanitizeValue(memory.metadata);

  return {
    id: memory.id,
    content: memory.content,
    tags: Array.isArray(memory.tags) ? memory.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    timestamp: memory.timestamp.toISOString(),
    ...(metadata ? { metadata: metadata as Record<string, unknown> } : {}),
  };
}

export function sanitizeKnowledgeBase(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!key.trim()) {
      continue;
    }

    if (LEGACY_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      continue;
    }

    const sanitizedValue = sanitizeValue(value);
    if (sanitizedValue !== undefined) {
      result[key] = sanitizedValue;
    }
  }

  return result;
}

export interface PersistedVerificationEntry {
  id: string;
  text: string;
  status: VerificationStatus;
  confidence: number;
  sources: string[];
  timestamp: string;
  sessionId: string;
  expiresAt: string;
}

const VALID_VERIFICATION_STATUSES: VerificationStatus[] = [
  'unverified',
  'partially_verified',
  'verified',
  'contradicted',
  'inconclusive',
  'absence_of_information',
  'uncertain',
  'contradictory',
];

function coerceVerificationStatus(value: unknown): VerificationStatus {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    const match = VALID_VERIFICATION_STATUSES.find((status) => status === normalized);
    if (match) {
      return match;
    }
  }
  return 'unverified';
}

export interface SanitizeVerificationOptions {
  defaultSessionId: string;
  defaultTtlMs: number;
}

export function sanitizeVerificationEntry(
  raw: unknown,
  options: SanitizeVerificationOptions
): (Omit<PersistedVerificationEntry, 'timestamp' | 'expiresAt'> & { timestamp: Date; expiresAt: Date }) | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const data = raw as Record<string, unknown>;
  const id = typeof data.id === 'string' && data.id.trim() ? data.id.trim() : null;
  const text = typeof data.text === 'string' ? data.text : null;

  if (!id || !text) {
    return null;
  }

  const confidenceRaw = typeof data.confidence === 'number'
    ? data.confidence
    : typeof data.confidence === 'string'
      ? Number.parseFloat(data.confidence)
      : undefined;

  const confidence = Number.isFinite(confidenceRaw) ? Math.min(Math.max(confidenceRaw as number, 0), 1) : 0;

  const sourcesRaw = Array.isArray(data.sources) ? data.sources : [];
  const sources = sourcesRaw.filter((source): source is string => typeof source === 'string' && source.trim().length > 0);

  const sessionId = typeof data.sessionId === 'string' && data.sessionId.trim()
    ? data.sessionId.trim()
    : options.defaultSessionId;

  const timestamp = coerceDate(data.timestamp);
  const expiresAt = coerceDate(data.expiresAt ?? (timestamp.getTime() + options.defaultTtlMs));

  return {
    id,
    text,
    status: coerceVerificationStatus(data.status),
    confidence,
    sources,
    sessionId,
    timestamp,
    expiresAt,
  };
}

export function prepareVerificationForStorage(entry: {
  id: string;
  text: string;
  status: VerificationStatus;
  confidence: number;
  sources: string[];
  timestamp: Date;
  sessionId: string;
  expiresAt: Date;
}): PersistedVerificationEntry {
  const sanitizedSources = Array.isArray(entry.sources)
    ? entry.sources.filter((source): source is string => typeof source === 'string' && source.trim().length > 0)
    : [];

  return {
    id: entry.id,
    text: entry.text,
    status: coerceVerificationStatus(entry.status),
    confidence: Number.isFinite(entry.confidence) ? Math.min(Math.max(entry.confidence, 0), 1) : 0,
    sources: sanitizedSources,
    timestamp: entry.timestamp.toISOString(),
    sessionId: entry.sessionId,
    expiresAt: entry.expiresAt.toISOString(),
  };
}

export function stripLegacyKeys<T extends Record<string, unknown>>(payload: T): T {
  const copy = { ...payload };
  for (const key of Object.keys(copy)) {
    if (LEGACY_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      delete copy[key];
    }
  }
  return copy;
}
