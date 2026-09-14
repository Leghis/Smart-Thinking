import { promises as fsp } from 'fs';
import os from 'os';
import path from 'path';

import { createHypothesis } from '../hypotheses';
import { SessionStore } from '../session-store';
import { ValidationError } from '../errors';
import type { EvidenceItem, Plan } from '../types';

function buildPlan(): Plan {
  return {
    id: 'plan-test',
    goal: 'Calculer le coût total du projet',
    constraints: ['budget fixe'],
    steps: [
      {
        id: 'step-1',
        index: 1,
        description: 'Identifier les grandeurs connues.',
        successCriteria: 'Toutes les données sont listées.',
        status: 'pending',
        dependsOn: [],
      },
    ],
    depth: 'balanced',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

function buildEvidence(): EvidenceItem {
  return {
    id: 'ev-1',
    claim: 'La méthode A réduit le coût',
    quote: 'Selon notre benchmark interne',
    sourceType: 'web',
    source: 'https://example.com/benchmark',
    stance: 'supports',
    confidence: 0.8,
    retrievedAt: '2026-01-01T00:00:00.000Z',
  };
}

function sessionFile(dataDir: string, sessionId: string): string {
  return path.join(dataDir, 'sessions', `session_state_${sessionId}.json`);
}

describe('SessionStore', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'smart-thinking-session-store-'));
    await fsp.mkdir(path.join(tempDir, 'sessions'), { recursive: true });
  });

  afterEach(async () => {
    await fsp.rm(tempDir, { recursive: true, force: true });
  });

  test('rejects unsafe session ids', async () => {
    const store = new SessionStore({ dataDir: tempDir, persistenceDisabled: true });

    await expect(store.get('../evil')).rejects.toThrow(ValidationError);
    await expect(store.setPlan('..', buildPlan())).rejects.toThrow(ValidationError);
    await expect(store.clear('a/b')).rejects.toThrow(ValidationError);
    expect(() => store.getSearchConfig('a\\b')).toThrow(ValidationError);
  });

  test('persists and reloads plans, hypotheses and evidence across instances', async () => {
    const store = new SessionStore({ dataDir: tempDir });
    const plan = buildPlan();
    const hypothesis = createHypothesis({ statement: 'La méthode A est plus rapide', confidence: 0.4 });

    await store.setPlan('session-a', plan);
    await store.setHypotheses('session-a', [hypothesis]);
    await store.addEvidence('session-a', [buildEvidence()]);
    await store.flush();

    const reloadedStore = new SessionStore({ dataDir: tempDir });
    const state = await reloadedStore.get('session-a');

    expect(state.plan?.id).toBe(plan.id);
    expect(state.plan?.goal).toBe(plan.goal);
    expect(state.hypotheses).toHaveLength(1);
    expect(state.hypotheses[0].statement).toBe('La méthode A est plus rapide');
    expect(state.evidence.map(item => item.id)).toEqual(['ev-1']);
    expect(reloadedStore.list().map(item => item.sessionId)).toContain('session-a');
  });

  test('keeps the Tavily key in memory only and never writes it to disk', async () => {
    const store = new SessionStore({ dataDir: tempDir });

    await store.setSearchConfig('secret-session', {
      provider: 'tavily',
      tavilyApiKey: 'tvly-super-secret-value',
      searchDepth: 'advanced',
    });
    await store.flush();

    const raw = await fsp.readFile(sessionFile(tempDir, 'secret-session'), 'utf8');
    expect(raw).not.toContain('tvly-super-secret-value');

    const persisted = JSON.parse(raw) as { searchConfig?: { provider?: string; hasApiKey?: boolean } };
    expect(persisted.searchConfig?.provider).toBe('tavily');
    expect(persisted.searchConfig?.hasApiKey).toBe(true);

    expect(store.getSearchConfig('secret-session')?.tavilyApiKey).toBe('tvly-super-secret-value');
  });

  test('clear removes the persisted session file and in-memory state', async () => {
    const store = new SessionStore({ dataDir: tempDir });

    await store.setPlan('clear-me', buildPlan());
    await store.addEvidence('clear-me', [buildEvidence()]);
    await store.flush();
    expect(await fsp.stat(sessionFile(tempDir, 'clear-me')).then(() => true)).toBe(true);

    await store.clear('clear-me');

    expect(await fsp.stat(sessionFile(tempDir, 'clear-me')).then(() => true).catch(() => false)).toBe(false);
    const fresh = await store.get('clear-me');
    expect(fresh.plan).toBeUndefined();
    expect(fresh.evidence).toEqual([]);
    expect(store.getSearchConfig('clear-me')).toBeUndefined();
  });

  test('does not write anything when persistence is disabled', async () => {
    const store = new SessionStore({ dataDir: tempDir, persistenceDisabled: true });

    await store.setPlan('memory-only', buildPlan());
    await store.flush();

    expect(await fsp.stat(sessionFile(tempDir, 'memory-only')).then(() => true).catch(() => false)).toBe(false);
    const state = await store.get('memory-only');
    expect(state.plan?.id).toBe('plan-test');
  });
});
