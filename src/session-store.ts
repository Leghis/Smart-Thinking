import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { Claim, EvidenceItem, HypothesisNode, Plan, SearchConfig, SessionState } from './types';
import { LIMITS, CACHE_TTL_MS } from './constants';
import { assertSafeSessionId, writeJsonAtomic } from './utils/persistence-utils';
import { PathUtils } from './utils/path-utils';

export interface SessionStoreOptions {
  dataDir?: string;
  persistenceDisabled?: boolean;
}

interface PersistedSessionState extends Omit<SessionState, 'searchConfig'> {
  searchConfig?: NonNullable<SessionState['searchConfig']>;
}

export class SessionStore {
  private readonly sessions = new Map<string, SessionState>();
  private readonly secrets = new Map<string, string>();
  private readonly loaded = new Set<string>();
  private readonly dirty = new Set<string>();
  private flushTimer?: NodeJS.Timeout;
  private readonly dataDir: string;
  private readonly persistenceDisabled: boolean;

  constructor(options: SessionStoreOptions = {}) {
    this.dataDir = options.dataDir ?? PathUtils.resolveDataDirectory();
    this.persistenceDisabled = options.persistenceDisabled ?? false;
  }

  async get(sessionId?: string): Promise<SessionState> {
    const safeId = assertSafeSessionId(sessionId, LIMITS.DEFAULT_SESSION_ID);
    await this.load(safeId);
    const existing = this.sessions.get(safeId);
    if (existing) {
      return existing;
    }
    const now = new Date().toISOString();
    const created: SessionState = {
      sessionId: safeId,
      hypotheses: [],
      evidence: [],
      createdAt: now,
      updatedAt: now,
    };
    this.sessions.set(safeId, created);
    return created;
  }

  async setPlan(sessionId: string, plan: Plan): Promise<SessionState> {
    return this.update(sessionId, state => ({ ...state, plan }));
  }

  async setHypotheses(sessionId: string, hypotheses: HypothesisNode[]): Promise<SessionState> {
    return this.update(sessionId, state => ({ ...state, hypotheses }));
  }

  async addEvidence(sessionId: string, evidence: EvidenceItem[]): Promise<SessionState> {
    if (evidence.length === 0) {
      return this.get(sessionId);
    }
    return this.update(sessionId, state => {
      const known = new Set(state.evidence.map(item => item.id));
      const merged = [...state.evidence];
      for (const item of evidence) {
        // Neutral web hits are not evidence: the pre-13.1 code stored them and
        // they polluted sessions (an arithmetic claim "corroborated" by an
        // unrelated page). They are never stored again.
        if (item.sourceType === 'web' && item.stance === 'neutral') {
          continue;
        }
        if (!known.has(item.id)) {
          merged.push(item);
          known.add(item.id);
        }
      }
      return { ...state, evidence: merged.slice(-500) };
    });
  }

  async setClaims(sessionId: string, claims: Claim[]): Promise<SessionState> {
    // Durable by contract: a restart (or a killed process) must not lose the
    // certificate ledger, so this write is not debounced.
    const next = await this.update(sessionId, state => ({ ...state, claims: claims.slice(-500) }));
    await this.persistNow(sessionId);
    return next;
  }

  /** Absolute value (not a delta): the in-memory ledger stays the source of truth. */
  async setWebCreditsUsed(sessionId: string, creditsUsed: number): Promise<SessionState> {
    const normalized = Number.isFinite(creditsUsed) ? Math.max(0, Math.floor(creditsUsed)) : 0;
    const next = await this.update(sessionId, state => ({
      ...state,
      webCreditsUsed: Math.max(state.webCreditsUsed ?? 0, normalized),
    }));
    await this.persistNow(sessionId);
    return next;
  }

  async setPurgedNeutralEvidence(sessionId: string, count: number): Promise<SessionState> {
    return this.update(sessionId, state => ({ ...state, purgedNeutralEvidence: count }));
  }

  async setSearchConfig(sessionId: string, config: SearchConfig): Promise<SessionState> {
    const safeId = assertSafeSessionId(sessionId, LIMITS.DEFAULT_SESSION_ID);
    if (config.tavilyApiKey) {
      this.secrets.set(safeId, config.tavilyApiKey);
    } else if (config.provider !== 'tavily') {
      this.secrets.delete(safeId);
    }
    return this.update(safeId, state => ({
      ...state,
      searchConfig: {
        provider: config.provider,
        searchDepth: config.searchDepth,
        hasApiKey: this.secrets.has(safeId),
      },
    }));
  }

  getSearchConfig(sessionId?: string): SearchConfig | undefined {
    const safeId = assertSafeSessionId(sessionId, LIMITS.DEFAULT_SESSION_ID);
    const state = this.sessions.get(safeId);
    const apiKey = this.secrets.get(safeId);
    if (!state?.searchConfig && !apiKey) {
      return undefined;
    }
    return {
      provider: state?.searchConfig?.provider ?? 'auto',
      searchDepth: state?.searchConfig?.searchDepth,
      tavilyApiKey: apiKey,
    };
  }

  async clear(sessionId?: string): Promise<void> {
    const safeId = sessionId
      ? assertSafeSessionId(sessionId, LIMITS.DEFAULT_SESSION_ID)
      : undefined;
    if (safeId) {
      this.sessions.delete(safeId);
      this.secrets.delete(safeId);
      this.loaded.delete(safeId);
      this.dirty.delete(safeId);
      if (!this.persistenceDisabled) {
        await this.removeFile(safeId);
      }
      return;
    }
    this.sessions.clear();
    this.secrets.clear();
    this.loaded.clear();
    this.dirty.clear();
    if (!this.persistenceDisabled) {
      await fs.rm(this.dataDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    const ids = Array.from(this.dirty);
    this.dirty.clear();
    for (const id of ids) {
      await this.persist(id);
    }
  }

  list(): SessionState[] {
    return Array.from(this.sessions.values());
  }

  private async update(
    sessionId: string,
    updater: (state: SessionState) => SessionState,
  ): Promise<SessionState> {
    const safeId = assertSafeSessionId(sessionId, LIMITS.DEFAULT_SESSION_ID);
    const current = await this.get(safeId);
    const next: SessionState = {
      ...updater(current),
      sessionId: safeId,
      updatedAt: new Date().toISOString(),
    };
    this.sessions.set(safeId, next);
    this.schedulePersist(safeId);
    return next;
  }

  private async load(sessionId: string): Promise<void> {
    if (this.loaded.has(sessionId) || this.persistenceDisabled) {
      return;
    }
    this.loaded.add(sessionId);
    try {
      const raw = await fs.readFile(this.filePath(sessionId), 'utf8');
      const parsed = JSON.parse(raw) as PersistedSessionState;
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.hypotheses)) {
        return;
      }
      const age = Date.now() - new Date(parsed.updatedAt ?? 0).getTime();
      if (age > CACHE_TTL_MS.SESSION * 30) {
        return;
      }
      const rawEvidence = Array.isArray(parsed.evidence) ? parsed.evidence : [];
      // Migration: drop neutral web hits persisted by versions < 13.1.
      const evidence = rawEvidence.filter(
        item => !(item?.sourceType === 'web' && item?.stance === 'neutral'),
      );
      const purged = rawEvidence.length - evidence.length;
      this.sessions.set(sessionId, {
        sessionId,
        plan: parsed.plan,
        hypotheses: parsed.hypotheses,
        evidence,
        ...(Array.isArray(parsed.claims) ? { claims: parsed.claims } : {}),
        ...(typeof parsed.webCreditsUsed === 'number' ? { webCreditsUsed: parsed.webCreditsUsed } : {}),
        ...(purged > 0 ? { purgedNeutralEvidence: purged } : {}),
        searchConfig: parsed.searchConfig,
        createdAt: parsed.createdAt ?? new Date().toISOString(),
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
      });
      if (purged > 0) {
        this.schedulePersist(sessionId);
      }
    } catch {
      // Missing or corrupt session file: start fresh.
    }
  }

  private schedulePersist(sessionId: string): void {
    if (this.persistenceDisabled) {
      return;
    }
    this.dirty.add(sessionId);
    if (this.flushTimer) {
      return;
    }
    this.flushTimer = setTimeout(() => {
      this.flushTimer = undefined;
      void this.flush();
    }, 50);
    this.flushTimer.unref?.();
  }

  /** Immediate, awaited persistence for writes that must survive a hard restart. */
  private async persistNow(sessionId: string): Promise<void> {
    if (this.persistenceDisabled) {
      return;
    }
    this.dirty.delete(sessionId);
    await this.persist(sessionId);
  }

  private async persist(sessionId: string): Promise<void> {
    const state = this.sessions.get(sessionId);
    if (!state) {
      return;
    }
    try {
      const target = this.filePath(sessionId);
      await PathUtils.ensureDirectoryExists(path.dirname(target));
      const { searchConfig, ...rest } = state;
      const payload: PersistedSessionState = {
        ...rest,
        ...(searchConfig
          ? { searchConfig: { provider: searchConfig.provider, searchDepth: searchConfig.searchDepth, hasApiKey: searchConfig.hasApiKey } }
          : {}),
      };
      await writeJsonAtomic(target, payload);
    } catch {
      // Session persistence is best-effort; reasoning must not fail because of I/O.
    }
  }

  private async removeFile(sessionId: string): Promise<void> {
    try {
      await fs.rm(this.filePath(sessionId), { force: true });
    } catch {
      // ignore
    }
  }

  private filePath(sessionId: string): string {
    return path.join(this.dataDir, 'sessions', `session_state_${sessionId}.json`);
  }
}
