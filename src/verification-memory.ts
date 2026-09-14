import { promises as fs } from 'fs';
import path from 'path';
import type { EvidenceItem, VerificationCheck, VerificationStatus } from './types';
import { SimilarityEngine } from './similarity-engine';
import { CACHE_TTL_MS, LIMITS, SIMILARITY_THRESHOLDS } from './constants';
import { PathUtils } from './utils/path-utils';
import {
  assertSafeSessionId,
  prepareVerificationForStorage,
  sanitizeVerificationEntry,
  writeJsonAtomic,
} from './utils/persistence-utils';

const isTestEnvironment = process.env.NODE_ENV === 'test';
const STORAGE_VERSION = 2;

interface VerificationEntry {
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
}

export interface VerificationMemoryAddOptions {
  ttl?: number;
  evidence?: EvidenceItem[];
  checks?: VerificationCheck[];
}

export interface VerificationSearchResult {
  id: string;
  status: VerificationStatus;
  confidence: number;
  sources: string[];
  timestamp: Date;
  similarity: number;
  text: string;
  evidence?: EvidenceItem[];
  checks?: VerificationCheck[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class VerificationMemory {
  private static instance: VerificationMemory | null = null;
  private similarityEngine?: SimilarityEngine;

  private verifications: Map<string, VerificationEntry> = new Map();
  private sessionIndex: Map<string, Set<string>> = new Map();

  private cleanupTimers: NodeJS.Timeout[] = [];
  private dataDir: string;
  private storageFilePath: string;
  private initialization: Promise<void>;
  private initialized = false;
  private persistenceQueue: Promise<void> = Promise.resolve();
  private persistenceDisabled = false;

  private emit(level: 'log' | 'warn' | 'error', ...args: unknown[]): void {
    if (isTestEnvironment) {
      return;
    }
    (console[level] as (...messages: unknown[]) => void)(...args);
  }

  public static getInstance(options?: { dataDir?: string; persistenceDisabled?: boolean }): VerificationMemory {
    if (!VerificationMemory.instance) {
      VerificationMemory.instance = new VerificationMemory(options);
    } else if (options?.dataDir && VerificationMemory.instance.dataDir !== options.dataDir) {
      VerificationMemory.instance.stopCleanupTasks();
      VerificationMemory.instance = new VerificationMemory(options);
    }
    return VerificationMemory.instance;
  }

  public static resetInstance(): void {
    if (VerificationMemory.instance) {
      VerificationMemory.instance.disablePersistence();
      VerificationMemory.instance.stopCleanupTasks();
      VerificationMemory.instance = null;
    }
  }

  private constructor(options: { dataDir?: string; persistenceDisabled?: boolean } = {}) {
    this.dataDir = options.dataDir ?? PathUtils.getDataDirectory();
    this.persistenceDisabled = options.persistenceDisabled ?? false;
    this.storageFilePath = path.join(this.dataDir, 'verifications.json');
    this.initialization = this.loadFromStorage()
      .catch((error) => {
        this.emit('error', 'VerificationMemory: Erreur lors du chargement du stockage persistant', error);
      })
      .finally(() => {
        this.initialized = true;
      });

    if (!isTestEnvironment) {
      const cleanupTimer = setInterval(() => this.cleanExpiredEntries(), CACHE_TTL_MS.SIMILARITY / 2);
      cleanupTimer.unref?.();
      this.cleanupTimers.push(cleanupTimer);
    }

    this.emit('log', 'VerificationMemory: Système de mémoire de vérification initialisé');
  }

  public stopCleanupTasks(): void {
    for (const timer of this.cleanupTimers) {
      clearInterval(timer);
    }
    this.cleanupTimers = [];
  }

  private disablePersistence(): void {
    this.persistenceDisabled = true;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.initialization;
    } catch (error) {
      this.emit('error', 'VerificationMemory: Erreur lors de l\'initialisation', error);
    } finally {
      this.initialized = true;
    }
  }

  private indexEntry(entry: VerificationEntry): void {
    const ids = this.sessionIndex.get(entry.sessionId) ?? new Set<string>();
    ids.add(entry.id);
    this.sessionIndex.set(entry.sessionId, ids);
  }

  private toEntry(sanitized: NonNullable<ReturnType<typeof sanitizeVerificationEntry>>, sessionId: string): VerificationEntry {
    return {
      id: sanitized.id,
      text: sanitized.text,
      status: sanitized.status,
      confidence: sanitized.confidence,
      sources: sanitized.sources,
      timestamp: sanitized.timestamp,
      sessionId,
      expiresAt: sanitized.expiresAt,
      ...(sanitized.evidence ? { evidence: sanitized.evidence } : {}),
      ...(sanitized.checks ? { checks: sanitized.checks } : {}),
    };
  }

  private async loadFromStorage(): Promise<void> {
    await PathUtils.ensureDirectoryExists(this.dataDir);

    const exists = await fs.stat(this.storageFilePath).then(() => true).catch(() => false);

    if (!exists) {
      return;
    }

    const content = await fs.readFile(this.storageFilePath, 'utf8');
    const parsed: unknown = JSON.parse(content);
    const entries = Array.isArray(parsed)
      ? parsed
      : isRecord(parsed) && Array.isArray(parsed.verifications)
        ? parsed.verifications
        : [];

    this.verifications.clear();
    this.sessionIndex.clear();

    const now = Date.now();
    for (const rawEntry of entries) {
      const sanitized = sanitizeVerificationEntry(rawEntry, {
        defaultSessionId: LIMITS.DEFAULT_SESSION_ID,
        defaultTtlMs: CACHE_TTL_MS.SESSION,
      });

      if (!sanitized || sanitized.expiresAt.getTime() <= now) {
        continue;
      }

      const entry = this.toEntry(sanitized, sanitized.sessionId);
      this.verifications.set(entry.id, entry);
      this.indexEntry(entry);
    }

    if (this.verifications.size > 0) {
      this.emit('log', `VerificationMemory: ${this.verifications.size} entrées restaurées depuis le stockage`);
    }
  }

  private async persistToStorageInternal(): Promise<void> {
    const payload = {
      version: STORAGE_VERSION,
      updatedAt: new Date().toISOString(),
      verifications: Array.from(this.verifications.values()).map((entry) =>
        prepareVerificationForStorage(entry)
      ),
    };

    await PathUtils.ensureDirectoryExists(this.dataDir);
    await writeJsonAtomic(this.storageFilePath, payload);
  }

  private enqueuePersist(): Promise<void> {
    this.persistenceQueue = this.persistenceQueue
      .catch(() => undefined)
      .then(async () => {
        await this.initialization.catch(() => undefined);
        if (!this.persistenceDisabled) {
          await this.persistToStorageInternal();
        }
      });

    return this.persistenceQueue;
  }

  public async flush(): Promise<void> {
    await this.enqueuePersist();
  }

  private requestPersist(): void {
    if (isTestEnvironment) {
      return;
    }
    this.enqueuePersist().catch((error) => {
      this.emit('error', 'VerificationMemory: Erreur lors de la sauvegarde du stockage persistant', error);
    });
  }

  public setSimilarityEngine(similarityEngine: SimilarityEngine): void {
    this.similarityEngine = similarityEngine;
    this.emit('log', 'VerificationMemory: SimilarityEngine configuré');
  }

  public async addVerification(
    text: string,
    status: VerificationStatus,
    confidence: number,
    sources: string[] = [],
    sessionId: string = LIMITS.DEFAULT_SESSION_ID,
    ttlOrOptions: number | VerificationMemoryAddOptions = {}
  ): Promise<string> {
    await this.ensureInitialized();

    const options = typeof ttlOrOptions === 'number' ? { ttl: ttlOrOptions } : ttlOrOptions;
    const safeSessionId = assertSafeSessionId(sessionId);
    const ttl = options.ttl ?? CACHE_TTL_MS.SESSION;
    const { evidence, checks } = options;

    const existingEntry = await this.findExactDuplicate(text, safeSessionId);
    if (existingEntry) {
      this.verifications.set(existingEntry.id, {
        ...existingEntry,
        status,
        confidence,
        sources,
        timestamp: new Date(),
        expiresAt: new Date(Date.now() + ttl),
        ...(evidence !== undefined ? { evidence } : {}),
        ...(checks !== undefined ? { checks } : {}),
      });
      this.requestPersist();
      return existingEntry.id;
    }

    const id = `verification-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const entry: VerificationEntry = {
      id,
      text,
      status,
      confidence,
      sources,
      timestamp: new Date(),
      sessionId: safeSessionId,
      expiresAt: new Date(Date.now() + ttl),
      ...(evidence !== undefined ? { evidence } : {}),
      ...(checks !== undefined ? { checks } : {}),
    };

    this.verifications.set(id, entry);
    this.indexEntry(entry);
    this.enforceSessionLimit(safeSessionId);
    this.requestPersist();

    return id;
  }

  private enforceSessionLimit(sessionId: string): void {
    const ids = this.sessionIndex.get(sessionId);
    if (!ids) {
      return;
    }

    while (ids.size > LIMITS.MAX_VERIFICATION_ENTRIES_PER_SESSION) {
      let oldestId: string | null = null;
      let oldestTime = Number.POSITIVE_INFINITY;

      for (const id of ids) {
        const entry = this.verifications.get(id);
        if (entry && entry.timestamp.getTime() < oldestTime) {
          oldestTime = entry.timestamp.getTime();
          oldestId = id;
        }
      }

      if (!oldestId) {
        break;
      }

      ids.delete(oldestId);
      this.verifications.delete(oldestId);
    }

    if (ids.size === 0) {
      this.sessionIndex.delete(sessionId);
    }
  }

  private async findExactDuplicate(text: string, sessionId: string): Promise<VerificationEntry | null> {
    await this.ensureInitialized();
    const sessionEntries = this.getSessionEntriesArray(sessionId);

    if (sessionEntries.length === 0) {
      return null;
    }

    const exactMatch = sessionEntries.find(entry => entry.text === text);
    if (exactMatch) {
      return exactMatch;
    }

    if (!this.similarityEngine) {
      return null;
    }

    try {
      const candidateTexts = sessionEntries.map(entry => entry.text);
      const results = await this.similarityEngine.findSimilarTexts(text, candidateTexts, 1, SIMILARITY_THRESHOLDS.HIGH);

      if (results.length > 0) {
        const bestMatch = sessionEntries.find(entry => entry.text === results[0].text);
        if (bestMatch) {
          return bestMatch;
        }
      }
    } catch (error) {
      this.emit('error', 'VerificationMemory: Erreur lors de la recherche de duplicata:', error);
    }

    return null;
  }

  public async findVerification(
    text: string,
    sessionId: string = LIMITS.DEFAULT_SESSION_ID,
    similarityThreshold: number = SIMILARITY_THRESHOLDS.LOW * 0.9
  ): Promise<VerificationSearchResult | null> {
    await this.ensureInitialized();
    const safeSessionId = assertSafeSessionId(sessionId);

    const sessionIds = this.sessionIndex.get(safeSessionId);
    if (!sessionIds || sessionIds.size === 0) {
      return null;
    }

    const sessionEntries = this.getSessionEntriesArray(safeSessionId);
    if (!this.similarityEngine) {
      return this.fallbackToTextSearch(text, sessionEntries);
    }

    try {
      const candidateTexts = sessionEntries.map(entry => entry.text);
      const results = await this.similarityEngine.findSimilarTexts(text, candidateTexts, candidateTexts.length, similarityThreshold);

      if (results.length === 0) {
        return this.fallbackToTextSearch(text, sessionEntries);
      }

      const bestEntry = sessionEntries.find(entry => entry.text === results[0].text);
      if (bestEntry) {
        return this.toSearchResult(bestEntry, results[0].score);
      }
    } catch (error) {
      this.emit('error', 'VerificationMemory: Erreur lors de la recherche via SimilarityEngine:', error);
      return this.fallbackToTextSearch(text, sessionEntries);
    }

    return null;
  }

  private toSearchResult(entry: VerificationEntry, similarity: number): VerificationSearchResult {
    return {
      id: entry.id,
      status: entry.status,
      confidence: entry.confidence,
      sources: entry.sources,
      timestamp: entry.timestamp,
      similarity,
      text: entry.text,
      evidence: entry.evidence,
      checks: entry.checks,
    };
  }

  private fallbackToTextSearch(text: string, sessionEntries: VerificationEntry[]): VerificationSearchResult | null {
    const exactMatch = sessionEntries.find(entry => entry.text === text);
    if (exactMatch) {
      return this.toSearchResult(exactMatch, 1.0);
    }

    const normalizedText = this.normalizeText(text);
    const textWords = new Set(normalizedText.split(/\s+/).filter(word => word.length > 3));

    const matches = sessionEntries
      .map(entry => {
        const normalizedEntry = this.normalizeText(entry.text);
        const entryWords = new Set(normalizedEntry.split(/\s+/).filter(word => word.length > 3));
        const commonWords = Array.from(textWords).filter(word => entryWords.has(word)).length;
        const totalUniqueWords = new Set([...textWords, ...entryWords]).size;
        const jaccard = totalUniqueWords > 0 ? commonWords / totalUniqueWords : 0;

        let sequenceBonus = 0;
        const textChunks = normalizedText.split(/[.!?;]/).filter(chunk => chunk.trim().length > 0);
        const entryChunks = normalizedEntry.split(/[.!?;]/).filter(chunk => chunk.trim().length > 0);
        for (const chunk of textChunks) {
          if (entryChunks.some(entryChunk => entryChunk.includes(chunk) && chunk.split(/\s+/).length >= 3)) {
            sequenceBonus = 0.2;
            break;
          }
        }

        return { entry, similarity: Math.min(jaccard + sequenceBonus, 0.95) };
      })
      .sort((a, b) => b.similarity - a.similarity);

    const threshold = SIMILARITY_THRESHOLDS.MEDIUM * 0.9;
    if (matches.length > 0 && matches[0].similarity >= threshold) {
      return this.toSearchResult(matches[0].entry, matches[0].similarity);
    }

    return null;
  }

  /**
   * Masks math expressions as whole tokens so punctuation/number normalization cannot split them.
   */
  private normalizeText(text: string): string {
    const mathPattern = /(\d+(?:[.,]\d+)?(?:\s*[+\-*/^]\s*\d+(?:[.,]\d+)?)+)/g;
    const parts: string[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mathPattern.exec(text)) !== null) {
      parts.push(this.normalizeSegment(text.slice(lastIndex, match.index)));
      parts.push(match[1].toLowerCase().replace(/\s+/g, ''));
      lastIndex = match.index + match[1].length;
    }
    parts.push(this.normalizeSegment(text.slice(lastIndex)));

    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  private normalizeSegment(segment: string): string {
    return segment
      .toLowerCase()
      .replace(/[^\w\s]|_/g, ' ')
      .replace(/\d+/g, 'NUM')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getSessionEntriesArray(sessionId: string): VerificationEntry[] {
    const sessionIds = this.sessionIndex.get(sessionId);
    if (!sessionIds) {
      return [];
    }

    const entries: VerificationEntry[] = [];
    for (const id of sessionIds) {
      const entry = this.verifications.get(id);
      if (entry) {
        entries.push(entry);
      }
    }
    return entries;
  }

  public getSessionVerifications(
    sessionId: string = LIMITS.DEFAULT_SESSION_ID,
    offset: number = 0,
    limit: number = 100,
    statusFilter?: VerificationStatus
  ): {
    text: string;
    status: VerificationStatus;
    confidence: number;
    sources: string[];
    timestamp: Date;
    id: string;
  }[] {
    const safeSessionId = assertSafeSessionId(sessionId);
    let sessionEntries = this.getSessionEntriesArray(safeSessionId);

    if (statusFilter) {
      sessionEntries = sessionEntries.filter(entry => entry.status === statusFilter);
    }

    return sessionEntries
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(offset, offset + limit)
      .map(entry => ({
        id: entry.id,
        text: entry.text,
        status: entry.status,
        confidence: entry.confidence,
        sources: entry.sources,
        timestamp: entry.timestamp,
      }));
  }

  public async searchSimilarVerifications(
    text: string,
    sessionId: string = LIMITS.DEFAULT_SESSION_ID,
    limit: number = 5,
    minSimilarity: number = SIMILARITY_THRESHOLDS.MEDIUM
  ): Promise<VerificationSearchResult[]> {
    await this.ensureInitialized();
    const safeSessionId = assertSafeSessionId(sessionId);

    if (!this.similarityEngine) {
      return [];
    }

    try {
      const sessionEntries = this.getSessionEntriesArray(safeSessionId);
      if (sessionEntries.length === 0) {
        return [];
      }

      const candidateTexts = sessionEntries.map(entry => entry.text);
      const results = await this.similarityEngine.findSimilarTexts(text, candidateTexts, candidateTexts.length, minSimilarity);

      return results
        .map(result => {
          const entry = sessionEntries.find(item => item.text === result.text);
          return entry ? this.toSearchResult(entry, result.score) : null;
        })
        .filter((item): item is VerificationSearchResult => item !== null)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      this.emit('error', 'Erreur lors de la recherche de vérifications similaires:', error);
      return [];
    }
  }

  public clearSession(sessionId: string): void {
    const safeSessionId = assertSafeSessionId(sessionId);
    const sessionIds = this.sessionIndex.get(safeSessionId);
    if (!sessionIds) {
      return;
    }

    for (const id of sessionIds) {
      this.verifications.delete(id);
    }
    this.sessionIndex.delete(safeSessionId);
    this.requestPersist();
  }

  private cleanExpiredEntries(): void {
    const now = new Date();
    const expiredIds = new Set<string>();

    for (const [id, entry] of this.verifications.entries()) {
      if (entry.expiresAt < now) {
        expiredIds.add(id);
      }
    }

    if (expiredIds.size === 0) {
      return;
    }

    for (const id of expiredIds) {
      const entry = this.verifications.get(id);
      if (!entry) {
        continue;
      }
      const sessionIds = this.sessionIndex.get(entry.sessionId);
      if (sessionIds) {
        sessionIds.delete(id);
        if (sessionIds.size === 0) {
          this.sessionIndex.delete(entry.sessionId);
        }
      }
      this.verifications.delete(id);
    }

    this.emit('log', `VerificationMemory: ${expiredIds.size} entrées expirées supprimées`);
    this.requestPersist();
  }

  public clearAll(): void {
    this.verifications.clear();
    this.sessionIndex.clear();
    this.requestPersist();
  }

  public getStats(): { totalEntries: number; sessionCount: number; entriesByStatus: Record<VerificationStatus, number> } {
    const allStatuses: VerificationStatus[] = [
      'verified', 'partially_verified', 'unverified', 'contradicted',
      'inconclusive', 'absence_of_information', 'uncertain', 'contradictory',
    ];
    const entriesByStatus = {} as Record<VerificationStatus, number>;
    for (const status of allStatuses) {
      entriesByStatus[status] = 0;
    }

    for (const entry of this.verifications.values()) {
      entriesByStatus[entry.status]++;
    }

    return {
      totalEntries: this.verifications.size,
      sessionCount: this.sessionIndex.size,
      entriesByStatus,
    };
  }
}
