import { promises as fsp } from 'fs';
import * as fs from 'fs';
import os from 'os';
import path from 'path';

import { MemoryManager } from '../memory-manager';
import { VerificationMemory } from '../verification-memory';
import { PathUtils } from '../utils/path-utils';
import { SimilarityEngine, type TermVector } from '../similarity-engine';
import { LIMITS } from '../constants';
import { ValidationError } from '../errors';
import {
  assertSafeSessionId,
  sanitizeMemoryItem,
  sanitizeVerificationEntry,
  writeFileAtomic,
  writeJsonAtomic,
} from '../utils/persistence-utils';

describe('Persistence hardening', () => {
  let tempDir: string;
  const originalDataDir = process.env.SMART_THINKING_DATA_DIR;

  beforeEach(async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'smart-thinking-tests-'));
    delete process.env.SMART_THINKING_DATA_DIR;
    jest.spyOn(PathUtils, 'getDataDirectory').mockReturnValue(tempDir);
    jest.spyOn(PathUtils, 'getTempDirectory').mockReturnValue(tempDir);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    VerificationMemory.resetInstance();
    if (originalDataDir === undefined) {
      delete process.env.SMART_THINKING_DATA_DIR;
    } else {
      process.env.SMART_THINKING_DATA_DIR = originalDataDir;
    }
    if (tempDir && fs.existsSync(tempDir)) {
      await fsp.rm(tempDir, { recursive: true, force: true });
    }
  });

  test('assertSafeSessionId accepts safe ids and rejects traversal attempts', () => {
    expect(assertSafeSessionId('session-1.v2_x')).toBe('session-1.v2_x');
    expect(assertSafeSessionId('  spaced  ')).toBe('spaced');
    expect(assertSafeSessionId(undefined)).toBe('default');
    expect(assertSafeSessionId('')).toBe('default');
    expect(assertSafeSessionId(null, 'fallback')).toBe('fallback');

    expect(() => assertSafeSessionId('../evil')).toThrow(ValidationError);
    expect(() => assertSafeSessionId('..')).toThrow(ValidationError);
    expect(() => assertSafeSessionId('.')).toThrow(ValidationError);
    expect(() => assertSafeSessionId('a/b')).toThrow(ValidationError);
    expect(() => assertSafeSessionId('a\\b')).toThrow(ValidationError);
    expect(() => assertSafeSessionId('a'.repeat(129))).toThrow(ValidationError);
    expect(() => assertSafeSessionId(42)).toThrow(ValidationError);
  });

  test('atomic write helpers replace files without leaving temp artefacts', async () => {
    const filePath = path.join(tempDir, 'atomic.json');

    await writeFileAtomic(filePath, '{"first":true}');
    expect(await fsp.readFile(filePath, 'utf8')).toBe('{"first":true}');

    await writeJsonAtomic(filePath, { second: true });
    expect(JSON.parse(await fsp.readFile(filePath, 'utf8'))).toEqual({ second: true });

    const leftovers = (await fsp.readdir(tempDir)).filter(file => file.includes('.tmp-'));
    expect(leftovers).toEqual([]);

    await expect(writeFileAtomic(path.join(tempDir, 'missing', 'x.txt'), 'data')).rejects.toThrow();
  });

  test('sanitizers reject invalid verification timestamps and clamp memory dates', () => {
    const options = { defaultSessionId: 'default', defaultTtlMs: 1000 };

    expect(sanitizeVerificationEntry({ id: 'a', text: 't', timestamp: 'not-a-date' }, options)).toBeNull();

    const withTimestamp = sanitizeVerificationEntry(
      { id: 'b', text: 't', timestamp: '2024-01-01T00:00:00.000Z' },
      options
    );
    expect(withTimestamp?.expiresAt.toISOString()).toBe('2024-01-01T00:00:01.000Z');

    const withBadExpiry = sanitizeVerificationEntry(
      { id: 'c', text: 't', timestamp: '2024-01-01T00:00:00.000Z', expiresAt: 'nope' },
      options
    );
    expect(withBadExpiry?.expiresAt.toISOString()).toBe('2024-01-01T00:00:01.000Z');

    const future = sanitizeMemoryItem({
      id: 'm1',
      content: 'x',
      timestamp: new Date(Date.now() + 3_600_000).toISOString(),
    });
    expect(future).not.toBeNull();
    expect(future!.timestamp.getTime()).toBeLessThanOrEqual(Date.now() + 1000);

    const past = sanitizeMemoryItem({ id: 'm2', content: 'x', timestamp: '2020-05-05T00:00:00.000Z' });
    expect(past?.timestamp.toISOString()).toBe('2020-05-05T00:00:00.000Z');
  });

  test('MemoryManager sanitizes legacy payloads and persists clean data', async () => {
    await fsp.mkdir(path.join(tempDir, 'memories'), { recursive: true });

    const legacyMemoryPath = path.join(tempDir, 'memories', 'default.json');
    const legacyKnowledgePath = path.join(tempDir, 'knowledge.json');

    const legacyMemoryPayload = [
      {
        id: 'legacy-1',
        content: 'Contenu hérité',
        tags: ['context'],
        timestamp: '2024-01-01T00:00:00.000Z',
        embedding: [0.12, 0.34],
        metadata: {
          sessionId: 'default',
          openaiTokens: 42,
          notes: 'préserver cette note',
        },
      },
    ];

    const legacyKnowledgePayload = {
      'legacy-entry': {
        description: 'connaissance héritée',
        cohereVector: [0.1, 0.2],
        nested: {
          openaiPrompt: 'should vanish',
          hint: 'keep me',
        },
      },
    };

    await fsp.writeFile(legacyMemoryPath, JSON.stringify(legacyMemoryPayload, null, 2), 'utf8');
    await fsp.writeFile(legacyKnowledgePath, JSON.stringify(legacyKnowledgePayload, null, 2), 'utf8');

    const manager = new MemoryManager();
    await manager.flush();

    const loadedLegacy = manager.getMemory('legacy-1');
    expect(loadedLegacy).toBeDefined();
    expect(loadedLegacy?.metadata).toEqual({ sessionId: 'default', notes: 'préserver cette note' });
    expect((loadedLegacy as unknown as Record<string, unknown>).embedding).toBeUndefined();

    manager.setKnowledge('legacy-entry', {
      openaiPrompt: 'retiré',
      description: 'actualisé',
      nested: {
        cohereScore: 0.99,
        insight: 'préserver',
      },
    });

    const newId = manager.addMemory('Nouvelle mémoire', ['analyse']);
    await manager.flush();

    const storedMemoriesRaw = await fsp.readFile(legacyMemoryPath, 'utf8');
    const storedMemories = JSON.parse(storedMemoriesRaw) as Array<Record<string, unknown>>;

    expect(storedMemoriesRaw).not.toContain('embedding');
    expect(storedMemoriesRaw).not.toContain('openai');
    expect(storedMemories.find(item => item.id === newId)).toBeDefined();
    for (const item of storedMemories) {
      expect(item).not.toHaveProperty('embedding');
      const metadata = item.metadata as Record<string, unknown> | undefined;
      if (metadata) {
        expect(Object.keys(metadata)).not.toEqual(expect.arrayContaining(['openaiTokens']));
      }
    }

    const storedKnowledgeRaw = await fsp.readFile(legacyKnowledgePath, 'utf8');
    expect(storedKnowledgeRaw).not.toContain('openaiPrompt');
    expect(storedKnowledgeRaw).not.toContain('cohere');
    const storedKnowledge = JSON.parse(storedKnowledgeRaw);
    expect(storedKnowledge['legacy-entry']).toEqual({ description: 'actualisé', nested: { insight: 'préserver' } });
  });

  test('a fresh MemoryManager starts empty without demo data', async () => {
    const manager = new MemoryManager();
    await manager.flush();

    expect(manager.getRecentMemories(10)).toEqual([]);
    expect(manager.getKnowledge('raisonnement-efficace')).toBeUndefined();
    expect(manager.getKnowledge('biais-cognitifs')).toBeUndefined();
  });

  test('MemoryManager rejects unsafe session ids and persists graph state', async () => {
    const manager = new MemoryManager();

    await expect(manager.saveGraphState('../escape', '{}')).rejects.toThrow(ValidationError);
    await expect(manager.loadGraphState('a/b')).rejects.toThrow(ValidationError);
    await expect(manager.clear('a/b')).rejects.toThrow(ValidationError);
    expect(() => manager.addMemory('contenu', [], '../boom')).toThrow(ValidationError);

    await manager.saveGraphState('session-a', JSON.stringify({ nodes: 3 }));
    expect(await manager.loadGraphState('session-a')).toBe(JSON.stringify({ nodes: 3 }));
    expect(await manager.loadGraphState('session-missing')).toBeNull();
  });

  test('getRelevantMemories ranks across sessions by default and respects session filters', async () => {
    const manager = new MemoryManager(new SimilarityEngine());
    const graphId = manager.addMemory('Graphe orienté pondéré pour analyse', ['graph'], 'session-a');
    const heuristicId = manager.addMemory('Optimisation heuristique locale', ['heuristic'], 'session-a');
    const archiveId = manager.addMemory('Archive graphe pondéré ancien', ['archive'], 'session-b');

    const globalMatches = await manager.getRelevantMemories('graphe pondéré analyse', 5);
    const globalIds = globalMatches.map(match => match.id);
    expect(globalIds).toContain(graphId);
    expect(globalIds).toContain(archiveId);
    expect(globalIds).not.toContain(heuristicId);
    expect(globalMatches.every(match => (match.relevanceScore ?? 0) > 0)).toBe(true);
    expect(globalMatches.length).toBeLessThanOrEqual(5);

    const sessionMatches = await manager.getRelevantMemories('graphe pondéré analyse', 5, 'session-a');
    expect(sessionMatches.map(match => match.id)).toContain(graphId);
    expect(sessionMatches.map(match => match.id)).not.toContain(archiveId);

    expect(await manager.getRelevantMemories('zorglub quux plop', 5)).toEqual([]);
  });

  test('MemoryManager falls back to keyword ranking when the engine yields nothing', async () => {
    class SilentSimilarityEngine extends SimilarityEngine {
      async generateVectors(): Promise<TermVector[]> {
        return [];
      }
    }

    const manager = new MemoryManager(new SilentSimilarityEngine());
    const memoryId = manager.addMemory('Analyse locale ciblée', ['analyse', 'locale'], 'session-c');
    const matches = await manager.getRelevantMemories('analyse locale approfondie', 2, 'session-c');

    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].id).toBe(memoryId);
  });

  test('MemoryManager evicts the oldest memory beyond the per-session limit', async () => {
    const manager = new MemoryManager();
    const oldestId = manager.addMemory('mémoire ancienne', ['test'], 'limit-session');

    for (let i = 0; i < LIMITS.MAX_MEMORY_ITEMS_PER_SESSION; i++) {
      manager.addMemory(`mémoire ${i}`, ['test'], 'limit-session');
    }

    const memories = manager.getRecentMemories(LIMITS.MAX_MEMORY_ITEMS_PER_SESSION + 10, 'limit-session');
    expect(memories).toHaveLength(LIMITS.MAX_MEMORY_ITEMS_PER_SESSION);
    expect(manager.getMemory(oldestId)).toBeUndefined();
  });

  test('clear removes persisted session and graph files while preserving knowledge', async () => {
    const manager = new MemoryManager();
    const firstId = manager.addMemory('alpha', ['x'], 'session-one');
    manager.addMemory('beta', ['x'], 'session-two');
    manager.setKnowledge('kept', { value: 1 });
    await manager.flush();
    await manager.saveGraphState('session-one', '{"nodes":1}');

    const memoriesDir = path.join(tempDir, 'memories');
    const oneFile = path.join(memoriesDir, 'session-one.json');
    const twoFile = path.join(memoriesDir, 'session-two.json');
    const graphFile = path.join(tempDir, 'graph_state_session-one.json');
    const knowledgeFile = path.join(tempDir, 'knowledge.json');

    expect(fs.existsSync(oneFile)).toBe(true);
    expect(fs.existsSync(twoFile)).toBe(true);
    expect(fs.existsSync(graphFile)).toBe(true);

    await manager.clear('session-one');
    expect(manager.getMemory(firstId)).toBeUndefined();
    expect(fs.existsSync(oneFile)).toBe(false);
    expect(fs.existsSync(graphFile)).toBe(false);
    expect(fs.existsSync(twoFile)).toBe(true);
    expect(fs.existsSync(knowledgeFile)).toBe(true);

    await manager.clear();
    expect(fs.existsSync(twoFile)).toBe(false);
    expect(fs.existsSync(knowledgeFile)).toBe(true);
    expect(manager.getKnowledge('kept')).toEqual({ value: 1 });
  });

  test('VerificationMemory migrates v1 entries, updates duplicates and persists v2', async () => {
    const verificationsPath = path.join(tempDir, 'verifications.json');

    const legacyVerificationPayload = {
      version: 1,
      verifications: [
        {
          id: 'verification-1',
          text: 'Legacy verification',
          status: 'verified',
          confidence: '0.95',
          sources: ['https://legacy.example'],
          timestamp: '2024-01-01T00:00:00.000Z',
          sessionId: 'legacy-session',
          expiresAt: '2099-02-01T00:00:00.000Z',
          embedding: [0.11, 0.22],
          openaiTrace: { tokens: 12 },
        },
      ],
    };

    await fsp.writeFile(verificationsPath, JSON.stringify(legacyVerificationPayload, null, 2), 'utf8');

    const verificationMemory = VerificationMemory.getInstance();
    await verificationMemory.flush();

    const legacyResult = await verificationMemory.findVerification('Legacy verification', 'legacy-session');
    expect(legacyResult).not.toBeNull();
    expect(legacyResult?.confidence).toBeCloseTo(0.95, 5);

    const duplicateId = await verificationMemory.addVerification(
      'Legacy verification',
      'contradicted',
      0.1,
      ['https://dup.example'],
      'legacy-session',
      3600
    );
    expect(duplicateId).toBe('verification-1');

    await verificationMemory.addVerification(
      'Fresh fact',
      'verified',
      0.82,
      ['https://fresh.example'],
      'legacy-session',
      3600
    );
    await verificationMemory.flush();

    const persisted = JSON.parse(await fsp.readFile(verificationsPath, 'utf8'));
    expect(persisted.version).toBe(2);

    VerificationMemory.resetInstance();
    const reloadedMemory = VerificationMemory.getInstance();
    await reloadedMemory.flush();

    const reloadedEntries = reloadedMemory.getSessionVerifications('legacy-session');
    expect(reloadedEntries).toHaveLength(2);
    expect(reloadedEntries.every(entry => !Object.prototype.hasOwnProperty.call(entry, 'embedding'))).toBe(true);
    expect(reloadedEntries.find(entry => entry.id === 'verification-1')?.status).toBe('contradicted');
  });

  test('VerificationMemory restores v1 evidence/checks and drops malformed items', async () => {
    const verificationsPath = path.join(tempDir, 'verifications.json');
    const now = new Date().toISOString();

    const v1Payload = {
      version: 1,
      verifications: [
        {
          id: 'verification-evidence',
          text: 'Calcul vérifié',
          status: 'verified',
          confidence: 0.9,
          sources: ['https://evidence.example'],
          timestamp: now,
          sessionId: 'evidence-session',
          expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
          evidence: [
            {
              id: 'ev-1',
              quote: 'citation',
              sourceType: 'web',
              source: 'https://evidence.example',
              stance: 'supports',
              confidence: 0.8,
              retrievedAt: now,
            },
            { id: 'broken' },
          ],
          checks: [
            { name: 'web', outcome: 'passed', summary: 'ok' },
            { name: 'nope', outcome: 'passed', summary: 'bad' },
          ],
        },
      ],
    };

    await fsp.writeFile(verificationsPath, JSON.stringify(v1Payload, null, 2), 'utf8');

    const verificationMemory = VerificationMemory.getInstance();
    await verificationMemory.flush();

    const internal = verificationMemory as unknown as {
      verifications: Map<string, { evidence?: Array<{ id: string }>; checks?: Array<{ name: string }> }>;
    };
    const entry = internal.verifications.get('verification-evidence');
    expect(entry?.evidence).toHaveLength(1);
    expect(entry?.evidence?.[0].id).toBe('ev-1');
    expect(entry?.checks).toHaveLength(1);

    await verificationMemory.flush();
    const persisted = JSON.parse(await fsp.readFile(verificationsPath, 'utf8'));
    expect(persisted.version).toBe(2);
    expect(persisted.verifications[0].evidence).toHaveLength(1);
    expect(persisted.verifications[0].checks).toHaveLength(1);
  });

  test('VerificationMemory drops expired entries when loading from storage', async () => {
    const verificationsPath = path.join(tempDir, 'verifications.json');
    const now = Date.now();

    await fsp.writeFile(
      verificationsPath,
      JSON.stringify({
        version: 2,
        verifications: [
          {
            id: 'expired',
            text: 'Expirée',
            status: 'verified',
            confidence: 0.9,
            sources: [],
            timestamp: new Date(now - 7_200_000).toISOString(),
            sessionId: 'expired-session',
            expiresAt: new Date(now - 3_600_000).toISOString(),
          },
          {
            id: 'valid',
            text: 'Valide',
            status: 'verified',
            confidence: 0.9,
            sources: [],
            timestamp: now,
            sessionId: 'expired-session',
            expiresAt: new Date(now + 3_600_000).toISOString(),
          },
        ],
      }),
      'utf8'
    );

    const verificationMemory = VerificationMemory.getInstance();
    await verificationMemory.flush();

    const entries = verificationMemory.getSessionVerifications('expired-session');
    expect(entries.map(entry => entry.id)).toEqual(['valid']);
  });

  test('VerificationMemory similarity search, stats and session clearing', async () => {
    VerificationMemory.resetInstance();
    const verificationMemory = VerificationMemory.getInstance();
    verificationMemory.stopCleanupTasks();
    verificationMemory.setSimilarityEngine(new SimilarityEngine());

    const baseId = await verificationMemory.addVerification(
      'Analyse prédictive avancée',
      'verified',
      0.88,
      ['https://analytics.example'],
      'session-y',
      3600
    );
    await verificationMemory.addVerification(
      'Analyse descriptive de base',
      'partially_verified',
      0.6,
      ['https://descriptive.example'],
      'session-y',
      3600
    );

    const similarityHit = await verificationMemory.findVerification('Analyse prédictive avancée', 'session-y');
    expect(similarityHit?.id).toBe(baseId);

    expect(await verificationMemory.findVerification('Entrée inconnue', 'session-y')).toBeNull();
    expect(await verificationMemory.findVerification('Analyse prédictive avancée', 'session-inexistante')).toBeNull();

    const similarityResults = await verificationMemory.searchSimilarVerifications('Analyse prédictive avancée', 'session-y', 5, 0.1);
    expect(similarityResults.some(result => result.id === baseId)).toBe(true);

    const stats = verificationMemory.getStats();
    expect(stats.totalEntries).toBe(2);
    expect(stats.sessionCount).toBe(1);
    expect(stats.entriesByStatus.verified).toBe(1);
    expect(stats.entriesByStatus.partially_verified).toBe(1);

    const paginated = verificationMemory.getSessionVerifications('session-y', 1, 1, 'partially_verified');
    expect(paginated.length).toBe(0);

    verificationMemory.clearSession('session-y');
    verificationMemory.clearSession('session-inexistante');
    await verificationMemory.flush();
    expect(verificationMemory.getSessionVerifications('session-y').length).toBe(0);
  });

  test('VerificationMemory text fallback and duplication without similarity engine', async () => {
    VerificationMemory.resetInstance();
    const verificationMemory = VerificationMemory.getInstance();
    verificationMemory.stopCleanupTasks();

    await verificationMemory.addVerification(
      'Texte original détaillé',
      'verified',
      0.7,
      ['https://original.example'],
      'session-text',
      3600
    );
    await verificationMemory.addVerification(
      'Texte tres proche détaillé',
      'verified',
      0.65,
      ['https://close.example'],
      'session-text',
      3600
    );

    const fallbackMatch = await verificationMemory.findVerification('Texte très proche détaillé', 'session-text');
    expect(fallbackMatch).not.toBeNull();

    const duplicateId = await verificationMemory.addVerification(
      'Texte très proche détaillé',
      'verified',
      0.5,
      ['https://duplicate.example'],
      'session-text',
      3600
    );
    expect(duplicateId).toBeDefined();

    expect(await verificationMemory.searchSimilarVerifications('Texte original détaillé', 'session-text')).toEqual([]);

    const paged = verificationMemory.getSessionVerifications('session-text', 0, 1);
    expect(paged.length).toBe(1);

    await verificationMemory.flush();
    verificationMemory.clearSession('session-text');
    expect(verificationMemory.getSessionVerifications('session-text').length).toBe(0);
  });

  test('VerificationMemory statistics and cleanup cover expiration workflow', async () => {
    VerificationMemory.resetInstance();
    const verificationMemory = VerificationMemory.getInstance();
    verificationMemory.stopCleanupTasks();
    verificationMemory.setSimilarityEngine(new SimilarityEngine());

    await verificationMemory.addVerification('Analyse des données', 'verified', 0.9, ['https://data.example'], 'session-z', 100);
    await verificationMemory.addVerification('Résultats partiels', 'partially_verified', 0.6, ['https://partial.example'], 'session-z', 100);
    await verificationMemory.addVerification('Entrée expirante', 'unverified', 0.3, [], 'session-z', 1);

    await verificationMemory.flush();
    await new Promise(resolve => setTimeout(resolve, 5));

    const beforeCleanup = verificationMemory.getSessionVerifications('session-z').length;
    (verificationMemory as unknown as { cleanExpiredEntries: () => void }).cleanExpiredEntries();
    const afterCleanup = verificationMemory.getSessionVerifications('session-z').length;
    expect(beforeCleanup).toBeGreaterThan(afterCleanup);

    const stats = verificationMemory.getStats();
    expect(stats.totalEntries).toBeGreaterThanOrEqual(2);
    expect(stats.entriesByStatus.partially_verified).toBeGreaterThanOrEqual(1);

    const similar = await verificationMemory.searchSimilarVerifications('Analyse des données', 'session-z');
    expect(similar.length).toBeGreaterThanOrEqual(1);

    const duplicate = await verificationMemory.addVerification('Analyse des données', 'contradicted', 0.2, [], 'session-z', 50);
    expect(duplicate).toBeDefined();

    const updated = verificationMemory.getSessionVerifications('session-z');
    expect(updated.some(entry => entry.status === 'contradicted')).toBe(true);

    verificationMemory.clearAll();
    expect(verificationMemory.getStats().totalEntries).toBe(0);
  });

  test('VerificationMemory rejects unsafe session ids', async () => {
    const verificationMemory = VerificationMemory.getInstance();

    await expect(verificationMemory.addVerification('x', 'verified', 0.5, [], '../evil')).rejects.toThrow(ValidationError);
    await expect(verificationMemory.findVerification('x', 'a/b')).rejects.toThrow(ValidationError);
    await expect(verificationMemory.searchSimilarVerifications('x', '..')).rejects.toThrow(ValidationError);
    expect(() => verificationMemory.clearSession('a\\b')).toThrow(ValidationError);
    expect(() => verificationMemory.getSessionVerifications('.')).toThrow(ValidationError);
  });

  test('VerificationMemory normalizeText keeps math expressions intact', () => {
    const verificationMemory = VerificationMemory.getInstance();
    const normalize = (verificationMemory as unknown as { normalizeText: (text: string) => string }).normalizeText.bind(
      verificationMemory
    );

    expect(normalize('Calcul 2+2 = 4')).toBe('calcul 2+2 NUM');
    expect(normalize('Calcul 10 * 5 puis 3 - 1')).toBe('calcul 10*5 puis 3-1');
    expect(normalize('Version 42')).toBe('version NUM');
    expect(normalize('Total 7 + 3 = 10')).toBe('total 7+3 NUM');
  });

  test('VerificationMemory evicts the oldest entry beyond the per-session limit', async () => {
    VerificationMemory.resetInstance();
    const verificationMemory = VerificationMemory.getInstance();
    verificationMemory.stopCleanupTasks();

    const oldestId = await verificationMemory.addVerification('entrée ancienne', 'unverified', 0.1, [], 'limit-verif', 3_600_000);

    for (let i = 0; i < LIMITS.MAX_VERIFICATION_ENTRIES_PER_SESSION; i++) {
      await verificationMemory.addVerification(`entrée ${i}`, 'unverified', 0.1, [], 'limit-verif', 3_600_000);
    }

    const entries = verificationMemory.getSessionVerifications(
      'limit-verif',
      0,
      LIMITS.MAX_VERIFICATION_ENTRIES_PER_SESSION + 10
    );
    expect(entries).toHaveLength(LIMITS.MAX_VERIFICATION_ENTRIES_PER_SESSION);
    expect(entries.some(entry => entry.id === oldestId)).toBe(false);
  });
});
