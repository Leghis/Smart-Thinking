import { MemoryItem } from './types';
import { promises as fs } from 'fs';
import path from 'path';
import { SimilarityEngine } from './similarity-engine';
import { LIMITS } from './constants';
import { PathUtils } from './utils/path-utils';
import {
  assertSafeSessionId,
  prepareMemoryForStorage,
  sanitizeKnowledgeBase,
  sanitizeMemoryItem,
  writeFileAtomic,
  writeJsonAtomic,
} from './utils/persistence-utils';

const isTestEnvironment = process.env.NODE_ENV === 'test';
const SAVE_DEBOUNCE_MS = 50;
const KEYWORD_TOKEN_MIN_LENGTH = 3;
const MEMORY_RELEVANCE_THRESHOLD = 0.3;

export interface MemoryManagerOptions {
  dataDir?: string;
  persistenceDisabled?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export class MemoryManager {
  private memories: Map<string, MemoryItem> = new Map();
  private knowledgeBase: Map<string, unknown> = new Map();
  private sessionMemoryIds: Map<string, string[]> = new Map();

  private readonly similarityEngine?: SimilarityEngine;
  private readonly dataDir: string;
  private readonly memoriesDir: string;
  private readonly knowledgeFilePath: string;
  private readonly initialization: Promise<void>;
  private saveQueue: Promise<void> = Promise.resolve();
  private saveTimer: NodeJS.Timeout | null = null;
  private savePending = false;
  private persistenceEnabled = true;

  constructor(similarityEngine?: SimilarityEngine, options: MemoryManagerOptions = {}) {
    this.similarityEngine = similarityEngine;
    this.dataDir = PathUtils.resolveDataDirectory(options.dataDir);
    this.memoriesDir = path.join(this.dataDir, 'memories');
    this.knowledgeFilePath = path.join(this.dataDir, 'knowledge.json');
    if (options.persistenceDisabled) {
      this.persistenceEnabled = false;
    }

    this.initialization = this.persistenceEnabled ? this.loadFromStorage() : Promise.resolve();
  }

  private resolveSessionId(value: unknown): string {
    try {
      return assertSafeSessionId(value);
    } catch {
      return LIMITS.DEFAULT_SESSION_ID;
    }
  }

  private getMemorySessionId(memory: MemoryItem): string {
    return this.resolveSessionId(memory.metadata?.sessionId);
  }

  private remember(memory: MemoryItem): void {
    this.memories.set(memory.id, memory);
    const sessionId = this.getMemorySessionId(memory);
    const ids = this.sessionMemoryIds.get(sessionId) ?? [];
    if (!ids.includes(memory.id)) {
      ids.push(memory.id);
    }
    this.sessionMemoryIds.set(sessionId, ids);
  }

  private enforceSessionLimit(sessionId: string): void {
    const ids = this.sessionMemoryIds.get(sessionId);
    if (!ids) {
      return;
    }
    while (ids.length > LIMITS.MAX_MEMORY_ITEMS_PER_SESSION) {
      const oldestId = ids.shift();
      if (oldestId === undefined) {
        break;
      }
      this.memories.delete(oldestId);
    }
    if (ids.length === 0) {
      this.sessionMemoryIds.delete(sessionId);
    }
  }

  private requestSave(): void {
    this.savePending = true;
    if (isTestEnvironment || this.saveTimer) {
      return;
    }

    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      void this.enqueueSave().catch(error => {
        console.error('Smart-Thinking: Échec de la sauvegarde asynchrone:', error);
      });
    }, SAVE_DEBOUNCE_MS);
    this.saveTimer.unref?.();
  }

  private enqueueSave(): Promise<void> {
    this.saveQueue = this.saveQueue
      .catch(() => undefined)
      .then(async () => {
        await this.initialization.catch(() => undefined);
        if (!this.savePending || !this.persistenceEnabled) {
          return;
        }
        this.savePending = false;
        await this.saveToStorageInternal();
      });

    return this.saveQueue;
  }

  public async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    await this.enqueueSave();
  }

  private async ensureDirectoriesExist(): Promise<void> {
    try {
      await PathUtils.ensureDirectoryExists(this.dataDir);
      await PathUtils.ensureDirectoryExists(this.memoriesDir);
    } catch (error) {
      this.persistenceEnabled = false;
      console.error('Smart-Thinking: Persistance désactivée, création des répertoires impossible:', error);
    }
  }

  private async loadFromStorage(): Promise<void> {
    try {
      await this.ensureDirectoriesExist();
      if (!this.persistenceEnabled) {
        return;
      }
      await this.loadMemoriesFromFiles();
      await this.loadKnowledgeFromFile();
    } catch (error) {
      console.error('Erreur lors du chargement de la mémoire:', error);
    }
  }

  private async loadMemoriesFromFiles(): Promise<void> {
    const accessible = await fs.access(this.memoriesDir, fs.constants.R_OK)
      .then(() => true)
      .catch(() => false);

    if (!accessible) {
      return;
    }

    const files = await fs.readdir(this.memoriesDir).catch(() => [] as string[]);
    for (const file of files) {
      if (!file.endsWith('.json')) {
        continue;
      }

      const rawSessionId = file.slice(0, -'.json'.length);
      try {
        assertSafeSessionId(rawSessionId);
      } catch {
        continue;
      }

      try {
        const content = await fs.readFile(path.join(this.memoriesDir, file), 'utf8');
        const parsed: unknown = JSON.parse(content);
        const items = Array.isArray(parsed)
          ? parsed
          : isRecord(parsed) && Array.isArray(parsed.memories)
            ? parsed.memories
            : [];

        for (const rawItem of items) {
          const memory = sanitizeMemoryItem(rawItem);
          if (!memory) {
            continue;
          }
          memory.metadata = {
            ...(memory.metadata ?? {}),
            sessionId: this.resolveSessionId(memory.metadata?.sessionId),
          };
          this.remember(memory);
        }
      } catch (error) {
        console.error(`Erreur lors du chargement du fichier ${file}:`, error);
      }
    }
  }

  private async loadKnowledgeFromFile(): Promise<void> {
    try {
      const content = await fs.readFile(this.knowledgeFilePath, 'utf8');
      const knowledge = sanitizeKnowledgeBase(JSON.parse(content));
      for (const [key, value] of Object.entries(knowledge)) {
        this.knowledgeBase.set(key, value);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('Erreur lors du chargement de la base de connaissances:', error);
      }
    }
  }

  private async saveToStorageInternal(): Promise<void> {
    try {
      await this.ensureDirectoriesExist();
      if (!this.persistenceEnabled) {
        return;
      }

      const memoriesBySession = new Map<string, ReturnType<typeof prepareMemoryForStorage>[]>();
      for (const memory of this.memories.values()) {
        const sessionId = this.getMemorySessionId(memory);
        const list = memoriesBySession.get(sessionId) ?? [];
        list.push(prepareMemoryForStorage(memory));
        memoriesBySession.set(sessionId, list);
      }

      for (const [sessionId, memories] of memoriesBySession.entries()) {
        await writeJsonAtomic(path.join(this.memoriesDir, `${sessionId}.json`), memories);
      }

      const knowledgePayload = sanitizeKnowledgeBase(Object.fromEntries(this.knowledgeBase));
      await writeJsonAtomic(this.knowledgeFilePath, knowledgePayload);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la mémoire:', error);
    }
  }

  private generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  public addMemory(content: string, tags: string[] = [], sessionId?: string): string {
    const safeSessionId = assertSafeSessionId(sessionId);
    const id = this.generateUniqueId();

    const memory: MemoryItem = {
      id,
      content,
      tags,
      timestamp: new Date(),
      metadata: { sessionId: safeSessionId },
    };

    this.remember(memory);
    this.enforceSessionLimit(safeSessionId);
    this.requestSave();

    return id;
  }

  public getMemory(id: string): MemoryItem | undefined {
    return this.memories.get(id);
  }

  private getSessionMemories(sessionId: string): MemoryItem[] {
    const ids = this.sessionMemoryIds.get(sessionId);
    if (!ids) {
      return [];
    }

    const memories: MemoryItem[] = [];
    for (const id of ids) {
      const memory = this.memories.get(id);
      if (memory) {
        memories.push(memory);
      }
    }
    return memories;
  }

  public getRecentMemories(limit: number = 5, sessionId?: string): MemoryItem[] {
    const targetSession = sessionId === undefined ? LIMITS.DEFAULT_SESSION_ID : assertSafeSessionId(sessionId);

    return this.getSessionMemories(targetSession)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Ranks memories by relevance; without a sessionId, all sessions compete globally.
   */
  public async getRelevantMemories(context: string, limit: number = 3, sessionId?: string): Promise<MemoryItem[]> {
    const targetSession = sessionId === undefined ? undefined : assertSafeSessionId(sessionId);
    const candidates = targetSession ? this.getSessionMemories(targetSession) : Array.from(this.memories.values());

    if (candidates.length === 0 || limit <= 0) {
      return [];
    }

    const engine = this.similarityEngine;
    if (!engine) {
      return this.getRelevantMemoriesWithKeywords(context, limit, candidates);
    }

    try {
      const vectors = await engine.generateVectors([context, ...candidates.map(memory => memory.content)]);
      const referenceVector = vectors[0] ?? {};

      if (Object.keys(referenceVector).length === 0) {
        return this.getRelevantMemoriesWithKeywords(context, limit, candidates);
      }

      const matches = candidates
        .map((memory, index) => ({
          memory,
          score: engine.calculateCosineSimilarity(referenceVector, vectors[index + 1] ?? {}),
        }))
        .filter(item => item.score > 0 && item.score >= MEMORY_RELEVANCE_THRESHOLD)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map(item => ({ ...item.memory, relevanceScore: item.score }));

      if (matches.length === 0) {
        return this.getRelevantMemoriesWithKeywords(context, limit, candidates);
      }

      return matches;
    } catch (error) {
      console.error('Smart-Thinking: Erreur lors de la recherche de mémoires pertinentes:', error);
      return this.getRelevantMemoriesWithKeywords(context, limit, candidates);
    }
  }

  private extractKeywords(text: string): string[] {
    return text
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > KEYWORD_TOKEN_MIN_LENGTH);
  }

  private getRelevantMemoriesWithKeywords(context: string, limit: number, candidates: MemoryItem[]): MemoryItem[] {
    const contextWords = this.extractKeywords(context);
    if (contextWords.length === 0) {
      return [];
    }

    return candidates
      .map(memory => {
        const memoryWords = this.extractKeywords(memory.content);
        const tagWords = this.extractKeywords(memory.tags.join(' '));
        const contentMatches = contextWords.filter(word => memoryWords.includes(word)).length;
        const tagMatches = contextWords.filter(word => tagWords.includes(word)).length;
        const contentScore = contentMatches / Math.max(contextWords.length, 1);
        const tagScore = tagMatches / Math.max(contextWords.length, 1);
        return { memory, score: contentScore * 0.7 + tagScore * 1.3 };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => ({ ...item.memory, relevanceScore: item.score }));
  }

  public getMemoriesByTag(tag: string, limit: number = 10, sessionId?: string): MemoryItem[] {
    const targetSession = sessionId === undefined ? LIMITS.DEFAULT_SESSION_ID : assertSafeSessionId(sessionId);

    return this.getSessionMemories(targetSession)
      .filter(memory => memory.tags.includes(tag))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  public setKnowledge(key: string, value: unknown): void {
    const sanitizedRecord = sanitizeKnowledgeBase({ [key]: value });

    if (Object.prototype.hasOwnProperty.call(sanitizedRecord, key)) {
      this.knowledgeBase.set(key, sanitizedRecord[key]);
    } else {
      this.knowledgeBase.delete(key);
    }
    this.requestSave();
  }

  public getKnowledge(key: string): unknown {
    return this.knowledgeBase.get(key);
  }

  public async clear(sessionId?: string): Promise<void> {
    const safeSessionId = sessionId === undefined ? undefined : assertSafeSessionId(sessionId);

    if (safeSessionId) {
      for (const memory of this.getSessionMemories(safeSessionId)) {
        this.memories.delete(memory.id);
      }
      this.sessionMemoryIds.delete(safeSessionId);
    } else {
      this.memories.clear();
      this.sessionMemoryIds.clear();
    }

    // Drop pending rewrites before deleting files so nothing can resurrect them.
    this.savePending = false;
    await this.flush();

    if (safeSessionId) {
      await this.deleteSessionFiles(safeSessionId);
    } else {
      await this.deleteAllSessionFiles();
    }
  }

  private async deleteSessionFiles(sessionId: string): Promise<void> {
    await fs.rm(path.join(this.memoriesDir, `${sessionId}.json`), { force: true }).catch(() => undefined);
    await fs.rm(path.join(this.dataDir, `graph_state_${sessionId}.json`), { force: true }).catch(() => undefined);
  }

  private async deleteAllSessionFiles(): Promise<void> {
    const memoryFiles = await fs.readdir(this.memoriesDir).catch(() => [] as string[]);
    for (const file of memoryFiles) {
      if (!file.endsWith('.json')) {
        continue;
      }
      await fs.rm(path.join(this.memoriesDir, file), { force: true }).catch(() => undefined);
    }

    const dataFiles = await fs.readdir(this.dataDir).catch(() => [] as string[]);
    for (const file of dataFiles) {
      if (!file.startsWith('graph_state_') || !file.endsWith('.json')) {
        continue;
      }
      await fs.rm(path.join(this.dataDir, file), { force: true }).catch(() => undefined);
    }
  }

  public async saveGraphState(sessionId: string, graphStateJson: string): Promise<void> {
    const safeSessionId = assertSafeSessionId(sessionId);

    try {
      await this.ensureDirectoriesExist();
      if (!this.persistenceEnabled) {
        return;
      }
      await writeFileAtomic(path.join(this.dataDir, `graph_state_${safeSessionId}.json`), graphStateJson);
    } catch (error) {
      console.error(`Smart-Thinking: Erreur lors de la sauvegarde de l'état du graphe pour la session ${safeSessionId}:`, error);
    }
  }

  public async loadGraphState(sessionId: string): Promise<string | null> {
    const safeSessionId = assertSafeSessionId(sessionId);

    try {
      const filePath = path.join(this.dataDir, `graph_state_${safeSessionId}.json`);
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error(`Smart-Thinking: Erreur lors du chargement de l'état du graphe pour la session ${safeSessionId}:`, error);
      }
      return null;
    }
  }
}
