import { promises as fsp } from 'fs';
import os from 'os';
import path from 'path';

import {
  createEnvironment,
  resetSmartThinkingEnvironment,
  type EnvironmentOptions,
  type SmartThinkingEnvironment,
} from '../server/environment';

const originalFetch = global.fetch;

function createTestEnvironment(dataDir: string, overrides: EnvironmentOptions = {}): SmartThinkingEnvironment {
  return createEnvironment({
    dataDir,
    persistenceDisabled: true,
    ...overrides,
    search: { provider: 'off', tavilyApiKey: undefined, ...overrides.search },
  });
}

describe('ReasoningOrchestrator', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'smart-thinking-orchestrator-'));
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(async () => {
    resetSmartThinkingEnvironment();
    global.fetch = originalFetch;
    await fsp.rm(tempDir, { recursive: true, force: true });
  });

  test('returns bounded metrics, a completed evaluation step and heuristic traces', async () => {
    const env = createTestEnvironment(tempDir);

    const { response } = await env.orchestrator.run({
      thought: "La méthode itérative améliore progressivement la qualité de l'analyse.",
      sessionId: 'orch-traces',
      requestSuggestions: false,
      suggestTools: false,
    });

    expect(response.thoughtId).toEqual(expect.any(String));
    expect(response.sessionId).toBe('orch-traces');
    for (const score of [
      response.qualityMetrics.confidence,
      response.qualityMetrics.relevance,
      response.qualityMetrics.quality,
    ]) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
    expect(response.reliabilityScore).toBeGreaterThanOrEqual(0);
    expect(response.reliabilityScore).toBeLessThanOrEqual(1);

    const timeline = response.reasoningTimeline ?? [];
    const evaluationTimeline = timeline.find(step => step.label === 'Évaluation heuristique');
    expect(evaluationTimeline?.status).toBe('completed');

    const evaluationStep = (response.reasoningTrace ?? []).find(
      step => step.kind === 'evaluation' && step.status === 'completed',
    );
    expect(evaluationStep?.justifications?.length).toBeGreaterThan(0);

    const heuristics = evaluationStep?.justifications?.[0]?.heuristics ?? [];
    expect(heuristics.length).toBeGreaterThan(0);
    expect(heuristics.some(trace => trace.metric === 'confidence')).toBe(true);
    expect(heuristics.some(trace => trace.rationale && trace.rationale.length > 0)).toBe(true);
  });

  test('refuses to verify an incorrect calculation even when verification is requested', async () => {
    const env = createTestEnvironment(tempDir);

    const { response } = await env.orchestrator.run({
      thought: 'Le calcul suivant est erroné: 3 + 3 = 9.',
      sessionId: 'orch-calc',
      containsCalculations: true,
      requestVerification: true,
      suggestTools: false,
    });

    expect(response.verification?.status).toBe('contradicted');
    expect(response.verificationStatus).toBe('contradicted');
    expect(response.isVerified).toBe(false);
  });

  test('persists the requested plan and exposes it through the session store', async () => {
    const env = createTestEnvironment(tempDir);

    const { response } = await env.orchestrator.run({
      thought: 'Étape de planification du projet.',
      sessionId: 'orch-plan',
      plan: {
        goal: 'Calculer le coût total du projet',
        constraints: ['budget fixe'],
        maxSteps: 3,
      },
    });

    expect(response.plan?.goal).toBe('Calculer le coût total du projet');
    expect(response.plan?.constraints).toEqual(['budget fixe']);
    expect(response.plan?.steps).toHaveLength(3);

    const state = await env.sessionStore.get('orch-plan');
    expect(state.plan?.id).toBe(response.plan?.id);
    expect(state.plan?.steps.map(step => step.id)).toEqual(['step-1', 'step-2', 'step-3']);
  });

  test('updates hypotheses with evidence and reflects derived status and confidence', async () => {
    const env = createTestEnvironment(tempDir);

    const first = await env.orchestrator.run({
      thought: 'Hypothèse à tester avec des mesures.',
      sessionId: 'orch-hypotheses',
      hypotheses: [{ statement: 'La méthode A est plus rapide que la méthode B', confidence: 0.5 }],
    });

    const hypothesisId = first.response.hypotheses?.[0]?.id;
    expect(hypothesisId).toBeDefined();
    expect(first.response.hypotheses?.[0]?.status).toBe('open');

    await env.orchestrator.run({
      thought: 'Premier essai favorable.',
      sessionId: 'orch-hypotheses',
      hypothesisUpdate: { id: hypothesisId as string, support: 'benchmark 1' },
    });

    const third = await env.orchestrator.run({
      thought: 'Second essai favorable.',
      sessionId: 'orch-hypotheses',
      hypothesisUpdate: { id: hypothesisId as string, support: 'benchmark 2' },
    });

    const updated = third.response.hypotheses?.find(hypothesis => hypothesis.id === hypothesisId);
    expect(updated?.evidenceFor).toEqual(['benchmark 1', 'benchmark 2']);
    expect(updated?.status).toBe('supported');
    expect(updated?.confidence).toBeGreaterThanOrEqual(0.6);
  });

  test('skips deep verification in fast mode and runs it in deep mode', async () => {
    const env = createTestEnvironment(tempDir);

    const fast = await env.orchestrator.run({
      thought: "Analyse rapide d'une idée simple et bien formulée.",
      sessionId: 'orch-fast',
      depth: 'fast',
    });

    expect(fast.response.verification).toBeUndefined();
    expect(fast.response.verificationStatus).toBe('unverified');
    const skippedStep = (fast.response.reasoningTrace ?? []).find(
      step => step.label === 'Vérification approfondie',
    );
    expect(skippedStep?.status).toBe('skipped');

    const deep = await env.orchestrator.run({
      thought: 'Analyse approfondie de la même idée simple et bien formulée.',
      sessionId: 'orch-deep',
      depth: 'deep',
    });

    expect(deep.response.verification).toBeDefined();
    const completedStep = (deep.response.reasoningTrace ?? []).find(
      step => step.label === 'Vérification approfondie',
    );
    expect(completedStep?.status).toBe('completed');
  });

  test('persists and reloads graph state across environments sharing a data directory', async () => {
    const persistent = createTestEnvironment(tempDir, { persistenceDisabled: false });

    await persistent.orchestrator.run({
      thought: 'Première pensée persistée pour la session partagée.',
      sessionId: 'orch-persist',
    });

    const firstGraph = await persistent.orchestrator.getSessionGraph('orch-persist');
    expect(firstGraph.getAllThoughts('orch-persist')).toHaveLength(1);

    resetSmartThinkingEnvironment();
    const reloaded = createTestEnvironment(tempDir, { persistenceDisabled: false });
    const reloadedGraph = await reloaded.orchestrator.getSessionGraph('orch-persist');
    expect(reloadedGraph.getAllThoughts('orch-persist')).toHaveLength(1);

    await reloaded.orchestrator.run({
      thought: 'Deuxième pensée ajoutée après rechargement.',
      sessionId: 'orch-persist',
    });

    const grownGraph = await reloaded.orchestrator.getSessionGraph('orch-persist');
    expect(grownGraph.getAllThoughts('orch-persist')).toHaveLength(2);
  });
});
