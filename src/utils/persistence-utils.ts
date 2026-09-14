import { promises as fs } from 'fs';
import type {
  EvidenceItem,
  EvidenceSourceType,
  EvidenceStance,
  MemoryItem,
  VerificationCheck,
  VerificationCheckName,
  VerificationCheckOutcome,
  VerificationStatus,
} from '../types';
import { LIMITS } from '../constants';
import { PersistenceError, ValidationError } from '../errors';

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

const SAFE_SESSION_ID_PATTERN = /^[A-Za-z0-9._-]+$/;
const MAX_SESSION_ID_LENGTH = 128;
const MAX_FUTURE_DRIFT_MS = 60_000;

export function assertSafeSessionId(value: unknown, fallback: string = LIMITS.DEFAULT_SESSION_ID): string {
  if (value === undefined || value === null) {
    return fallback;
  }

  if (typeof value !== 'string') {
    throw new ValidationError('Invalid session id: expected a string.', { value: String(value) });
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return fallback;
  }

  if (trimmed.length > MAX_SESSION_ID_LENGTH) {
    throw new ValidationError(`Invalid session id: exceeds ${MAX_SESSION_ID_LENGTH} characters.`);
  }

  if (trimmed === '.' || trimmed === '..' || !SAFE_SESSION_ID_PATTERN.test(trimmed)) {
    throw new ValidationError('Invalid session id: only [A-Za-z0-9._-] are allowed.');
  }

  return trimmed;
}

export async function writeFileAtomic(filePath: string, data: string): Promise<void> {
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {
    await fs.writeFile(tempPath, data, 'utf8');
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.unlink(tempPath).catch(() => undefined);
    throw new PersistenceError(`Failed to write file atomically: ${filePath}`, { filePath }, error);
  }
}

export async function writeJsonAtomic(filePath: string, value: unknown): Promise<void> {
  await writeFileAtomic(filePath, JSON.stringify(value, null, 2) ?? 'null');
}

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

function parseDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

/**
 * Lenient for memory items: malformed dates fall back to now, future dates are clamped.
 */
function coerceDate(value: unknown): Date {
  const parsed = parseDate(value);
  if (!parsed) {
    return new Date();
  }

  return parsed.getTime() > Date.now() + MAX_FUTURE_DRIFT_MS ? new Date() : parsed;
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
  evidence?: EvidenceItem[];
  checks?: VerificationCheck[];
  version?: number;
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

const EVIDENCE_SOURCE_TYPES: readonly EvidenceSourceType[] = ['web', 'memory', 'internal', 'user'];
const EVIDENCE_STANCES: readonly EvidenceStance[] = ['supports', 'contradicts', 'neutral'];
const CHECK_NAMES: readonly VerificationCheckName[] = ['calculation', 'consistency', 'web', 'heuristics', 'source_quality'];
const CHECK_OUTCOMES: readonly VerificationCheckOutcome[] = ['passed', 'failed', 'inconclusive', 'unavailable'];

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

function sanitizeEvidenceItem(raw: unknown): EvidenceItem | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const data = raw as Record<string, unknown>;
  const id = typeof data.id === 'string' && data.id.trim() ? data.id.trim() : null;
  const quote = typeof data.quote === 'string' && data.quote.trim() ? data.quote.trim() : null;
  const source = typeof data.source === 'string' && data.source.trim() ? data.source.trim() : null;
  const sourceType = typeof data.sourceType === 'string' && EVIDENCE_SOURCE_TYPES.includes(data.sourceType as EvidenceSourceType)
    ? (data.sourceType as EvidenceSourceType)
    : null;

  if (!id || !quote || !source || !sourceType) {
    return null;
  }

  const stance = typeof data.stance === 'string' && EVIDENCE_STANCES.includes(data.stance as EvidenceStance)
    ? (data.stance as EvidenceStance)
    : 'neutral';
  const confidence = typeof data.confidence === 'number' && Number.isFinite(data.confidence)
    ? Math.min(Math.max(data.confidence, 0), 1)
    : 0;
  const retrievedAt = parseDate(data.retrievedAt)?.toISOString() ?? new Date().toISOString();

  return {
    id,
    quote,
    sourceType,
    source,
    stance,
    confidence,
    retrievedAt,
    ...(typeof data.claim === 'string' && data.claim.trim() ? { claim: data.claim.trim() } : {}),
    ...(typeof data.title === 'string' && data.title.trim() ? { title: data.title.trim() } : {}),
  };
}

function sanitizeVerificationCheck(raw: unknown): VerificationCheck | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const data = raw as Record<string, unknown>;
  const name = typeof data.name === 'string' && CHECK_NAMES.includes(data.name as VerificationCheckName)
    ? (data.name as VerificationCheckName)
    : null;
  const outcome = typeof data.outcome === 'string' && CHECK_OUTCOMES.includes(data.outcome as VerificationCheckOutcome)
    ? (data.outcome as VerificationCheckOutcome)
    : null;
  const summary = typeof data.summary === 'string' && data.summary.trim() ? data.summary.trim() : null;

  if (!name || !outcome || !summary) {
    return null;
  }

  const details = Array.isArray(data.details)
    ? data.details.filter((detail): detail is string => typeof detail === 'string')
    : [];
  const evidenceIds = Array.isArray(data.evidenceIds)
    ? data.evidenceIds.filter((evidenceId): evidenceId is string => typeof evidenceId === 'string')
    : [];

  return {
    name,
    outcome,
    summary,
    ...(details.length > 0 ? { details } : {}),
    ...(evidenceIds.length > 0 ? { evidenceIds } : {}),
    ...(typeof data.durationMs === 'number' && Number.isFinite(data.durationMs) ? { durationMs: data.durationMs } : {}),
  };
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

  const timestamp = parseDate(data.timestamp);
  if (!timestamp) {
    return null;
  }

  const expiresAt = parseDate(data.expiresAt) ?? new Date(timestamp.getTime() + options.defaultTtlMs);

  const confidenceRaw = typeof data.confidence === 'number'
    ? data.confidence
    : typeof data.confidence === 'string'
      ? Number.parseFloat(data.confidence)
      : undefined;
  const confidence = Number.isFinite(confidenceRaw) ? Math.min(Math.max(confidenceRaw as number, 0), 1) : 0;

  const sourcesRaw = Array.isArray(data.sources) ? data.sources : [];
  const sources = sourcesRaw.filter((source): source is string => typeof source === 'string' && source.trim().length > 0);

  let sessionId: string;
  try {
    sessionId = assertSafeSessionId(data.sessionId, options.defaultSessionId);
  } catch {
    sessionId = options.defaultSessionId;
  }

  const evidence = Array.isArray(data.evidence)
    ? data.evidence.map(sanitizeEvidenceItem).filter((item): item is EvidenceItem => item !== null)
    : [];
  const checks = Array.isArray(data.checks)
    ? data.checks.map(sanitizeVerificationCheck).filter((item): item is VerificationCheck => item !== null)
    : [];
  const version = typeof data.version === 'number' && Number.isFinite(data.version) ? data.version : undefined;

  return {
    id,
    text,
    status: coerceVerificationStatus(data.status),
    confidence,
    sources,
    sessionId,
    timestamp,
    expiresAt,
    ...(evidence.length > 0 ? { evidence } : {}),
    ...(checks.length > 0 ? { checks } : {}),
    ...(version !== undefined ? { version } : {}),
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
  evidence?: EvidenceItem[];
  checks?: VerificationCheck[];
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
    version: 2,
    ...(entry.evidence && entry.evidence.length > 0 ? { evidence: entry.evidence } : {}),
    ...(entry.checks && entry.checks.length > 0 ? { checks: entry.checks } : {}),
  };
}
