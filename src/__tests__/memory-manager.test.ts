import { promises as fsp } from 'fs';
import os from 'os';
import path from 'path';

import { MemoryManager } from '../memory-manager';

describe('MemoryManager extended behaviours', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'smart-thinking-memory-'));
  });

  afterEach(async () => {
    await fsp.rm(tempDir, { recursive: true, force: true });
  });

  test('ranks memories with the keyword fallback and filters by tag', async () => {
    const manager = new MemoryManager(undefined, { dataDir: tempDir });
    const first = manager.addMemory('Graphe pondéré pour analyse locale', ['graphe', 'analyse'], 'session-tags');
    const second = manager.addMemory('Graphe pondéré pour structure locale', ['graphe'], 'session-tags');
    manager.addMemory('Sujet totalement différent', ['autre'], 'session-tags');

    const matches = await manager.getRelevantMemories('graphe pondéré', 5, 'session-tags');
    expect(matches).toHaveLength(2);
    expect(matches.map(memory => memory.id)).toEqual(expect.arrayContaining([first, second]));
    expect(matches.every(memory => (memory.relevanceScore ?? 0) > 0)).toBe(true);

    expect(await manager.getRelevantMemories('', 5, 'session-tags')).toEqual([]);
    expect(await manager.getRelevantMemories('graphe pondéré')).not.toHaveLength(0);
    expect(await manager.getRelevantMemories('graphe pondéré', 0)).toEqual([]);
    expect(manager.getRecentMemories()).toEqual([]);

    const tagged = manager.getMemoriesByTag('graphe', 10, 'session-tags');
    expect(tagged.map(memory => memory.id)).toEqual(expect.arrayContaining([first, second]));
    expect(manager.getMemoriesByTag('inconnu', 10, 'session-tags')).toEqual([]);
    expect(manager.getMemoriesByTag('graphe')).toEqual([]);
  });

  test('loads record payloads, skips invalid entries and tolerates corrupt knowledge', async () => {
    const memoriesDir = path.join(tempDir, 'memories');
    await fsp.mkdir(memoriesDir, { recursive: true });

    await fsp.writeFile(
      path.join(memoriesDir, 'session-legacy.json'),
      JSON.stringify({
        memories: [
          {
            id: 'legacy-valid',
            content: 'Contenu valide',
            tags: ['héritage'],
            timestamp: '2024-01-01T00:00:00.000Z',
          },
          { id: 'legacy-broken' },
        ],
      }),
      'utf8',
    );
    await fsp.writeFile(path.join(memoriesDir, '42.json'), '42', 'utf8');
    await fsp.writeFile(path.join(memoriesDir, 'bad session.json'), '[]', 'utf8');
    await fsp.writeFile(path.join(memoriesDir, 'notes.txt'), 'ignore me', 'utf8');
    await fsp.writeFile(path.join(tempDir, 'knowledge.json'), '{ invalid json', 'utf8');

    const manager = new MemoryManager(undefined, { dataDir: tempDir });
    await manager.flush();

    const loaded = manager.getMemory('legacy-valid');
    expect(loaded?.metadata).toEqual({ sessionId: 'default' });
    expect(loaded?.tags).toEqual(['héritage']);
    expect(manager.getMemory('legacy-broken')).toBeUndefined();
    expect(manager.getRecentMemories(10, 'default')).toHaveLength(1);
    expect(manager.getKnowledge('anything')).toBeUndefined();
  });

  test('deletes legacy knowledge keys, cleans non-json files and survives graph read errors', async () => {
    const manager = new MemoryManager(undefined, { dataDir: tempDir });
    manager.setKnowledge('safe-entry', { keep: true });
    manager.setKnowledge('openai-config', { secret: true });
    expect(manager.getKnowledge('safe-entry')).toEqual({ keep: true });
    expect(manager.getKnowledge('openai-config')).toBeUndefined();

    manager.addMemory('mémoire temporaire', ['temp'], 'session-clean');
    await manager.flush();

    await fsp.mkdir(path.join(tempDir, 'graph_state_broken.json'), { recursive: true });
    expect(await manager.loadGraphState('broken')).toBeNull();

    await fsp.writeFile(path.join(tempDir, 'notes.txt'), 'x', 'utf8');
    await fsp.writeFile(path.join(tempDir, 'graph_state_clean.json'), '{}', 'utf8');
    await fsp.writeFile(path.join(tempDir, 'memories', 'notes.txt'), 'x', 'utf8');

    await manager.clear();

    expect(manager.getRecentMemories(5, 'session-clean')).toEqual([]);
    expect(manager.getMemory('missing')).toBeUndefined();
  });
});
