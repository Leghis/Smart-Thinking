import { promises as fsp } from 'fs';
import os from 'os';
import path from 'path';

import { SearchService } from '../search/search-service';
import { VerificationService } from '../services/verification-service';
import { SimilarityEngine } from '../similarity-engine';
import { VerificationMemory } from '../verification-memory';
import type { ThoughtNode } from '../types';

const originalFetch = global.fetch;

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response;
}

function webResult(id: number, title: string, content: string) {
  return {
    title,
    url: `https://example.com/source-${id}`,
    content,
    score: 0.9,
  };
}

const SUPPORT_CONTENT =
  'Selon les mesures officielles, la tour Eiffel mesure 330 mètres de hauteur.';
const CONTRADICT_CONTENT =
  'La tour Eiffel ne mesure pas 330 mètres, cette affirmation est fausse.';

function makeThought(id: string, content: string): ThoughtNode {
  return {
    id,
    content,
    type: 'regular',
    timestamp: new Date(),
    connections: [],
    metrics: { confidence: 0.5, relevance: 0.5, quality: 0.5 },
    metadata: {},
  };
}

describe('VerificationService', () => {
  let tempDir: string;
  let fetchMock: jest.Mock;
  let memory: VerificationMemory;

  beforeEach(async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'smart-thinking-verification-'));
    VerificationMemory.resetInstance();
    memory = VerificationMemory.getInstance({ dataDir: tempDir, persistenceDisabled: true });
    memory.stopCleanupTasks();
    memory.setSimilarityEngine(new SimilarityEngine());
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(async () => {
    VerificationMemory.resetInstance();
    global.fetch = originalFetch;
    await fsp.rm(tempDir, { recursive: true, force: true });
  });

  function createService(searchService?: SearchService): VerificationService {
    return new VerificationService({
      verificationMemory: memory,
      searchService,
      enableWebVerification: Boolean(searchService),
      offline: true,
    });
  }

  function createWebBackedService(): { service: VerificationService; searchService: SearchService } {
    const searchService = new SearchService({
      envApiKey: 'tavily-test-key',
      defaultProvider: 'tavily',
      timeoutMs: 500,
    });
    return { service: createService(searchService), searchService };
  }

  test('passes the calculation check for a correct math claim', async () => {
    const service = createService();

    const result = await service.verifyClaim({
      claim: 'Le résultat de 2 + 2 = 4 est exact.',
      checkConsistency: false,
      checkWeb: false,
    });

    const calculation = result.checks?.find(check => check.name === 'calculation');
    expect(calculation?.outcome).toBe('passed');
    expect(result.status).toBe('partially_verified');
    expect(result.verifiedCalculations?.[0]?.isCorrect).toBe(true);
  });

  test('fails the calculation check and never marks a wrong claim as verified', async () => {
    const service = createService();

    const result = await service.verifyClaim({
      claim: 'Le calcul 3 + 3 = 9 est faux.',
      checkConsistency: false,
      checkWeb: false,
    });

    const calculation = result.checks?.find(check => check.name === 'calculation');
    expect(calculation?.outcome).toBe('failed');
    expect(result.status).toBe('contradicted');
    expect(result.status).not.toBe('verified');
    expect(result.contradictions?.length).toBeGreaterThan(0);
  });

  test('keeps a categorical claim without evidence unverified', async () => {
    const service = createService();

    const result = await service.verifyClaim({
      claim: 'Les chats sont des mammifères terrestres.',
      checkCalculation: false,
      checkConsistency: false,
      checkWeb: false,
    });

    expect(result.status).toBe('unverified');
    expect(result.status).not.toBe('verified');
  });

  test('flags consistency conflicts with a connected thought containing a negation', async () => {
    const service = createService();

    const result = await service.verifyClaim({
      claim: 'La méthode Alpha réduit le coût total de 30 pour cent.',
      checkCalculation: false,
      checkConsistency: true,
      checkWeb: false,
      connectedThoughts: [
        makeThought('thought-1', 'La méthode Alpha donne un résultat faux pour le coût total.'),
      ],
    });

    expect(result.status).toBe('contradictory');
    expect(result.contradictions?.length).toBeGreaterThan(0);
    expect(result.checks?.find(check => check.name === 'consistency')?.outcome).toBe('failed');
  });

  test('marks a claim verified with two independent supporting web sources', async () => {
    const { service } = createWebBackedService();
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [
          webResult(1, 'La tour Eiffel culmine à 330 mètres', SUPPORT_CONTENT),
          webResult(2, 'Hauteur officielle de la tour Eiffel', SUPPORT_CONTENT),
        ],
      }),
    );

    const result = await service.verifyClaim({
      claim: 'La tour Eiffel mesure 330 mètres de hauteur.',
      checkCalculation: false,
      checkConsistency: false,
      checkWeb: true,
    });

    expect(result.status).toBe('verified');
    expect(result.checks?.find(check => check.name === 'web')?.outcome).toBe('passed');
    expect(result.evidence).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('marks a claim partially verified with a single supporting web source', async () => {
    const { service } = createWebBackedService();
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [webResult(1, 'La tour Eiffel culmine à 330 mètres', SUPPORT_CONTENT)],
      }),
    );

    const result = await service.verifyClaim({
      claim: 'La tour Eiffel mesure 330 mètres de hauteur.',
      checkCalculation: false,
      checkConsistency: false,
      checkWeb: true,
    });

    expect(result.status).toBe('partially_verified');
  });

  test('marks a claim contradicted when the web source opposes it', async () => {
    const { service } = createWebBackedService();
    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [webResult(1, 'La tour Eiffel dément', CONTRADICT_CONTENT)],
      }),
    );

    const result = await service.verifyClaim({
      claim: 'La tour Eiffel mesure 330 mètres de hauteur.',
      checkCalculation: false,
      checkConsistency: false,
      checkWeb: true,
    });

    expect(result.status).toBe('contradicted');
    expect(result.contradictions?.length).toBeGreaterThan(0);
  });

  test('reports the native web method as unavailable without any network call', async () => {
    const { service } = createWebBackedService();

    const result = await service.verifyClaim({
      claim: 'La tour Eiffel mesure 330 mètres de hauteur.',
      checkCalculation: false,
      checkConsistency: false,
      checkWeb: true,
      searchProvider: 'native',
    });

    expect(result.methodsUnavailable).toContain('web-native');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('keeps the verification cache scoped to a single session', async () => {
    const { service } = createWebBackedService();
    const claim = 'La tour Eiffel mesure 330 mètres de hauteur.';

    const first = await service.verifyClaim({
      claim,
      sessionId: 'cache-session-a',
      checkConsistency: false,
      checkWeb: false,
    });
    expect(first.status).toBe('unverified');

    const cached = await service.verifyClaim({
      claim,
      sessionId: 'cache-session-a',
      checkConsistency: false,
      checkWeb: false,
    });
    expect(cached).toBe(first);
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValue(
      jsonResponse({
        results: [
          webResult(1, 'La tour Eiffel culmine à 330 mètres', SUPPORT_CONTENT),
          webResult(2, 'Hauteur officielle de la tour Eiffel', SUPPORT_CONTENT),
        ],
      }),
    );

    const otherSession = await service.verifyClaim({
      claim,
      sessionId: 'cache-session-b',
      checkConsistency: false,
      checkWeb: true,
    });

    expect(otherSession.status).toBe('verified');
    expect(otherSession).not.toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('annotates incorrect calculations with the failure marker', async () => {
    const service = createService();

    const calculations = await service.detectAndVerifyCalculations('Le calcul 3 + 3 = 9 est faux.');
    expect(calculations).toHaveLength(1);
    expect(calculations[0].isCorrect).toBe(false);

    const annotated = service.annotateThoughtWithVerifications('Le calcul 3 + 3 = 9 est faux.', calculations);
    expect(annotated).toContain('[✗');
    expect(annotated).not.toContain('[✓');

    const correct = await service.detectAndVerifyCalculations('2 + 2 = 4');
    expect(service.annotateThoughtWithVerifications('2 + 2 = 4', correct)).toContain('[✓');
  });
});
