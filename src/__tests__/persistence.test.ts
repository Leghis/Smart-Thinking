import { promises as fsp } from 'fs';
import * as fs from 'fs';
import os from 'os';
import path from 'path';

import { MemoryManager } from '../memory-manager';
import { VerificationMemory } from '../verification-memory';
import { PathUtils } from '../utils/path-utils';
import { SimilarityEngine } from '../similarity-engine';

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const waitUntil = async (predicate: () => boolean | Promise<boolean>, timeoutMs = 500): Promise<void> => {
  const start = Date.now();
  while (!(await predicate())) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }
    await sleep(10);
  }
};

describe('Persistence hardening', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'smart-thinking-tests-'));
    jest.spyOn(PathUtils, 'getDataDirectory').mockReturnValue(tempDir);
    jest.spyOn(PathUtils, 'getTempDirectory').mockReturnValue(tempDir);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    VerificationMemory.resetInstance();
    if (tempDir && fs.existsSync(tempDir)) {
      await fsp.rm(tempDir, { recursive: true, force: true });
    }
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
          notes: 'préserver cette note'
        }
      }
    ];

    const legacyKnowledgePayload = {
      'legacy-entry': {
        description: 'connaissance héritée',
        cohereVector: [0.1, 0.2],
        nested: {
          openaiPrompt: 'should vanish',
          hint: 'keep me'
        }
      }
    };

    await fsp.writeFile(legacyMemoryPath, JSON.stringify(legacyMemoryPayload, null, 2), 'utf8');
    await fsp.writeFile(legacyKnowledgePath, JSON.stringify(legacyKnowledgePayload, null, 2), 'utf8');

    const manager = new MemoryManager();

    await waitUntil(() => Boolean(manager.getMemory('legacy-1')));

    const loadedLegacy = manager.getMemory('legacy-1');
    expect(loadedLegacy).toBeDefined();
    expect(loadedLegacy?.metadata).toEqual({ sessionId: 'default', notes: 'préserver cette note' });
    expect((loadedLegacy as Record<string, unknown>).embedding).toBeUndefined();

    manager.setKnowledge('legacy-entry', {
      openaiPrompt: 'retiré',
      description: 'actualisé',
      nested: {
        cohereScore: 0.99,
        insight: 'préserver'
      }
    });

    const newId = manager.addMemory('Nouvelle mémoire', ['analyse']);

    await (manager as unknown as { saveToStorage: () => Promise<void> }).saveToStorage();

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

  test('MemoryManager falls back to embedded samples when no persisted data exists', async () => {
    const manager = new MemoryManager();

    await waitUntil(() => manager.getRecentMemories().length > 0);

    const fallbackMemories = manager.getRecentMemories(10);
    expect(fallbackMemories.length).toBeGreaterThan(0);
    fallbackMemories.forEach(memory => {
      expect(memory).not.toHaveProperty('embedding');
      expect(memory.content.length).toBeGreaterThan(0);
    });

    const knowledgeKeys = ['raisonnement-efficace', 'biais-cognitifs'];
    knowledgeKeys.forEach(key => {
      const knowledge = manager.getKnowledge(key);
      expect(knowledge).toBeDefined();
    });
  });

  test('MemoryManager handles directory creation fallback gracefully', async () => {
    const tempFallback = path.join(os.tmpdir(), 'smart-thinking-temp-fallback');
    jest.spyOn(PathUtils, 'getTempDirectory').mockReturnValue(tempFallback);
    const ensureSpy = jest
      .spyOn(PathUtils, 'ensureDirectoryExists')
      .mockImplementationOnce(async () => {
        throw new Error('permission denied');
      })
      .mockImplementation(async () => undefined);

    const manager = new MemoryManager();
    await waitUntil(() => manager.getRecentMemories().length > 0);
    await (manager as unknown as { ensureDirectoriesExist: () => Promise<void> }).ensureDirectoriesExist();

    expect(manager['dataDir']).toContain('smart-thinking-temp-fallback');
    ensureSpy.mockRestore();
    await fsp.rm(tempFallback, { recursive: true, force: true });
  });

  test('MemoryManager retrieval helpers leverage similarity engine and graph persistence', async () => {
    const managerWithoutEngine = new MemoryManager();
    const fallbackId = managerWithoutEngine.addMemory('Analyse contextuelle avancée', ['analysis', 'context']);

    const fallbackMatches = await managerWithoutEngine.getRelevantMemories('analyse contextuelle');
    expect(fallbackMatches[0].id).toBe(fallbackId);

    await (managerWithoutEngine as unknown as { saveToStorage: () => Promise<void> }).saveToStorage();

    expect(await managerWithoutEngine.loadGraphState('inconnue')).toBeNull();

    const engine = new SimilarityEngine();
    const withEngine = new MemoryManager(engine);
    const nodeId = withEngine.addMemory('Graphe orienté pondéré', ['graph', 'analysis'], 'session-a');
    const heuristicId = withEngine.addMemory('Optimisation heuristique locale', ['heuristic', 'analysis'], 'session-a');
    withEngine.addMemory('Mémoire d\'archive', ['archive'], 'session-b');
    const defaultId = withEngine.addMemory('Mise à jour globale', ['analysis']);

    const sessionARecent = withEngine.getRecentMemories(5, 'session-a');
    expect(sessionARecent.map(item => item.id).sort()).toEqual([heuristicId, nodeId].sort());

    const defaultRecent = withEngine.getRecentMemories(2);
    expect(defaultRecent.map(item => item.id)).toContain(defaultId);

    const analysisMatches = withEngine.getMemoriesByTag('analysis', 10, 'session-a');
    expect(analysisMatches.map(item => item.id).sort()).toEqual([heuristicId, nodeId].sort());

    const engineMatches = await withEngine.getRelevantMemories('optimisation heuristique du graphe', 2, 'session-a');
    expect(engineMatches.length).toBeGreaterThan(0);
    expect(engineMatches.some(match => match.id === heuristicId || match.id === nodeId)).toBe(true);

    await withEngine.saveGraphState('session-a', JSON.stringify({ nodes: 3 }));
    const graphState = await withEngine.loadGraphState('session-a');
    expect(graphState).toBe(JSON.stringify({ nodes: 3 }));

    withEngine.clear();
    expect(withEngine.getRecentMemories().length).toBe(0);

    withEngine.addMemory('Session B mémoire', ['archive'], 'session-b');
    expect(withEngine.getRecentMemories(5, 'session-b').length).toBe(1);

    await (withEngine as unknown as { saveToStorage: () => Promise<void> }).saveToStorage();

    expect(await withEngine.loadGraphState('session-missing')).toBeNull();

    class EmptySimilarityEngine extends SimilarityEngine {
      async findSimilarTexts(): Promise<Array<{ text: string; score: number }>> {
        return [];
      }
    }

    const fallbackEngine = new MemoryManager(new EmptySimilarityEngine());
    fallbackEngine.addMemory('Analyse locale ciblée', ['analyse', 'locale'], 'session-c');
    const fallbackEngineMatches = await fallbackEngine.getRelevantMemories('analyse locale approfondie', 2, 'session-c');
    expect(fallbackEngineMatches.length).toBeGreaterThan(0);
    await (fallbackEngine as unknown as { saveToStorage: () => Promise<void> }).saveToStorage();
  });

  test('VerificationMemory migrates legacy entries and keeps persistence consistent', async () => {
    const verificationsPath = path.join(tempDir, 'verifications.json');

    const legacyVerificationPayload = {
      version: 0,
      verifications: [
        {
          id: 'verification-1',
          text: 'Legacy verification',
          status: 'verified',
          confidence: '0.95',
          sources: ['https://legacy.example'],
          timestamp: '2024-01-01T00:00:00.000Z',
          sessionId: 'legacy-session',
          expiresAt: '2024-02-01T00:00:00.000Z',
          embedding: [0.11, 0.22],
          openaiTrace: { tokens: 12 }
        }
      ]
    };

    await fsp.writeFile(verificationsPath, JSON.stringify(legacyVerificationPayload, null, 2), 'utf8');

    const verificationMemory = VerificationMemory.getInstance();

    const legacyResult = await verificationMemory.findVerification('Legacy verification', 'legacy-session');
    expect(legacyResult).not.toBeNull();
    expect(legacyResult?.confidence).toBeCloseTo(0.95, 5);

    const sessionEntries = verificationMemory.getSessionVerifications('legacy-session');
    expect(sessionEntries).toHaveLength(1);
    expect(sessionEntries[0].confidence).toBeCloseTo(0.95, 5);

    const duplicateId = await verificationMemory.addVerification(
      'Legacy verification',
      'contradicted',
      0.1,
      ['https://dup.example'],
      'legacy-session',
      3600
    );
    expect(duplicateId).toBe('verification-1');

    const freshId = await verificationMemory.addVerification(
      'Fresh fact',
      'verified',
      0.82,
      ['https://fresh.example'],
      'legacy-session',
      3600
    );
    expect(freshId).toBeDefined();

    await (verificationMemory as unknown as { persistToStorage: () => Promise<void> }).persistToStorage();

    VerificationMemory.resetInstance();
    const reloadedMemory = VerificationMemory.getInstance();
    reloadedMemory.stopCleanupTasks();

    await waitUntil(() => reloadedMemory.getSessionVerifications('legacy-session').length === 2);
    const reloadedEntries = reloadedMemory.getSessionVerifications('legacy-session');
    reloadedEntries.forEach(entry => {
      expect(entry).not.toHaveProperty('embedding');
    });
    const updatedLegacy = reloadedEntries.find(item => item.id === 'verification-1');
    expect(updatedLegacy).toBeDefined();
    expect(updatedLegacy?.status).toBe('contradicted');
  });

  test('VerificationMemory similarity cache and session management', async () => {
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

    const statsWithCache = verificationMemory.getStats();
    expect(statsWithCache.cacheSize).toBeGreaterThanOrEqual(0);

    (verificationMemory as unknown as { cleanSimilarityCache: () => void }).cleanSimilarityCache();
    const statsWithoutCache = verificationMemory.getStats();
    expect(statsWithoutCache.cacheSize).toBe(0);

    const paginated = verificationMemory.getSessionVerifications('session-y', 1, 1, 'partially_verified');
    expect(paginated.length).toBe(0);

    verificationMemory.clearSession('session-y');
    verificationMemory.clearSession('session-inexistante');
    await (verificationMemory as unknown as { persistToStorage: () => Promise<void> }).persistToStorage();
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

    const withoutEngine = await verificationMemory.searchSimilarVerifications('Texte original détaillé', 'session-text');
    expect(withoutEngine).toEqual([]);

    const paged = verificationMemory.getSessionVerifications('session-text', 0, 1);
    expect(paged.length).toBe(1);

    await (verificationMemory as unknown as { persistToStorage: () => Promise<void> }).persistToStorage();

    verificationMemory.clearSession('session-text');
    expect(verificationMemory.getSessionVerifications('session-text').length).toBe(0);
  });

  test('VerificationMemory statistics and cleanup cover expiration workflow', async () => {
    VerificationMemory.resetInstance();
    const verificationsPath = path.join(tempDir, 'verifications.json');
    await fsp.rm(verificationsPath, { force: true });

    const verificationMemory = VerificationMemory.getInstance();
    verificationMemory.stopCleanupTasks();
    verificationMemory.setSimilarityEngine(new SimilarityEngine());

    await verificationMemory.addVerification(
      'Analyse des données',
      'verified',
      0.9,
      ['https://data.example'],
      'session-z',
      100
    );
    await verificationMemory.addVerification(
      'Résultats partiels',
      'partially_verified',
      0.6,
      ['https://partial.example'],
      'session-z',
      100
    );
    await verificationMemory.addVerification(
      'Entrée expirante',
      'unverified',
      0.3,
      [],
      'session-z',
      1
    );

    await (verificationMemory as unknown as { persistToStorage: () => Promise<void> }).persistToStorage();

    await sleep(5);
    const beforeCleanup = verificationMemory.getSessionVerifications('session-z').length;
    (verificationMemory as unknown as { cleanExpiredEntries: () => void }).cleanExpiredEntries();
    const afterCleanup = verificationMemory.getSessionVerifications('session-z').length;
    expect(beforeCleanup).toBeGreaterThan(afterCleanup);

    const stats = verificationMemory.getStats();
    expect(stats.totalEntries).toBeGreaterThanOrEqual(2);
    expect(stats.entriesByStatus['partially_verified']).toBeGreaterThanOrEqual(1);

    const similar = await verificationMemory.searchSimilarVerifications('Analyse des données', 'session-z');
    expect(similar.length).toBeGreaterThanOrEqual(1);

    const duplicate = await verificationMemory.addVerification(
      'Analyse des données',
      'contradicted',
      0.2,
      [],
      'session-z',
      50
    );
    expect(duplicate).toBeDefined();

    const updated = verificationMemory.getSessionVerifications('session-z');
    expect(updated.some(entry => entry.status === 'contradicted')).toBe(true);

    verificationMemory.clearAll();
    expect(verificationMemory.getStats().totalEntries).toBe(0);
  });
});
