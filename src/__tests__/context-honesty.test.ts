/**
 * Guards for the v13.1 corrections: context budget, honest verification
 * semantics and tool-name hygiene.
 */
import { promises as fsp } from 'fs';
import os from 'os';
import path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { TOOL_NAMES } from '../constants';
import {
  createEnvironment,
  resetSmartThinkingEnvironment,
  type SmartThinkingEnvironment,
} from '../server/environment';
import { createSmartThinkingServer } from '../server/smart-thinking-server';
import { SMART_THINKING_INSTRUCTIONS } from '../server/server-metadata';

const originalFetch = global.fetch;

interface StructuredResult {
  structuredContent?: Record<string, unknown>;
  content: Array<{ type: string; text?: string }>;
  isError?: boolean;
}

function payloadOf(result: StructuredResult): Record<string, unknown> {
  if (result.structuredContent) {
    return result.structuredContent;
  }
  const textBlock = result.content.find(block => block.type === 'text');
  return JSON.parse(textBlock?.text ?? '{}') as Record<string, unknown>;
}

describe('context budget and honesty guards', () => {
  let tempDir: string;
  let env: SmartThinkingEnvironment;
  let clients: Client[];
  let servers: McpServer[];

  beforeEach(async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'smart-thinking-context-'));
    global.fetch = jest.fn() as unknown as typeof fetch;
    env = createEnvironment({
      dataDir: tempDir,
      persistenceDisabled: true,
      search: { provider: 'off', tavilyApiKey: undefined },
    });
    clients = [];
    servers = [];
  });

  afterEach(async () => {
    for (const client of clients) {
      await client.close().catch(() => undefined);
    }
    for (const server of servers) {
      await server.close().catch(() => undefined);
    }
    resetSmartThinkingEnvironment();
    global.fetch = originalFetch;
    await fsp.rm(tempDir, { recursive: true, force: true });
  });

  async function connect(): Promise<Client> {
    const { server } = createSmartThinkingServer(env);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'smart-thinking-context-tests', version: '1.0.0' });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    servers.push(server);
    clients.push(client);
    return client;
  }

  test('keeps the server instructions small (they are duplicated per tool)', () => {
    expect(SMART_THINKING_INSTRUCTIONS.length).toBeLessThan(1200);
    expect(SMART_THINKING_INSTRUCTIONS).toContain('claim');
    expect(SMART_THINKING_INSTRUCTIONS).toContain('audit');
  });

  test('registers exactly the tools advertised in TOOL_NAMES', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    expect(tools.map(tool => tool.name).sort()).toEqual([...TOOL_NAMES].sort());
  });

  test('never suggests a tool that does not exist', async () => {
    const client = await connect();
    const result = (await client.callTool({
      name: 'smartthinking',
      arguments: {
        thought: 'Voir https://example.com et vérifier les chiffres de 2024 (21 %).',
        sessionId: 'honesty-suggestions',
      },
    })) as unknown as StructuredResult;

    const payload = payloadOf(result);
    const serialized = JSON.stringify(payload);
    for (const dead of ['perplexity_search_web', 'tavily-search', 'tavily-extract', 'executePython', 'executeJavaScript', 'calculator', 'source_check']) {
      expect(serialized).not.toContain(dead);
    }
    const suggested = (payload.suggestedTools ?? []) as Array<{ name: string }>;
    for (const suggestion of suggested) {
      expect(TOOL_NAMES as readonly string[]).toContain(suggestion.name);
    }
  });

  test('returns a compact payload by default and the full envelope on demand', async () => {
    const client = await connect();

    const compact = payloadOf(
      (await client.callTool({
        name: 'smartthinking',
        arguments: { thought: 'Analyse compacte.', sessionId: 'honesty-compact' },
      })) as unknown as StructuredResult,
    );
    expect(compact.reasoningTimeline).toBeUndefined();
    expect(compact.reliabilityScore).toBeUndefined();
    expect(compact.metricsBasis).toBeDefined();
    expect((compact.metricsBasis as { heuristic?: boolean }).heuristic).toBe(true);

    const full = payloadOf(
      (await client.callTool({
        name: 'smartthinking',
        arguments: {
          thought: 'Analyse complète.',
          sessionId: 'honesty-full',
          responseDetail: 'full',
        },
      })) as unknown as StructuredResult,
    );
    expect(Array.isArray(full.reasoningTimeline)).toBe(true);
    expect(typeof full.reliabilityScore).toBe('number');
  });

  test('verifies an exact computation as verified/1.0 without touching the web', async () => {
    const client = await connect();

    const result = payloadOf(
      (await client.callTool({
        name: 'verify',
        arguments: { claim: '(1234*5678)+91011 = 7097663', sessionId: 'honesty-verify' },
      })) as unknown as StructuredResult,
    );

    expect(result.status).toBe('verified');
    expect(result.confidence).toBe(1);
    expect(String(result.certaintySummary)).toContain('contrôle exact');
    expect(String(result.certaintySummary)).not.toContain('sources fiables');
    expect((result.verificationBasis as { kind?: string }).kind).toBe('deterministic');
    expect(result.evidence as unknown[]).toHaveLength(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('only returns search queries for a research plan', async () => {
    const client = await connect();

    const evaluation = payloadOf(
      (await client.callTool({
        name: 'plan',
        arguments: {
          goal: 'Évaluer la fiabilité du serveur MCP sur une tâche arithmétique et une tâche de recherche documentaire',
          sessionId: 'honesty-plan-generic',
        },
      })) as unknown as StructuredResult,
    );
    expect(evaluation.searchQueries).toEqual([]);
    expect((evaluation.plan as { template?: string }).template).toBe('generic');

    const research = payloadOf(
      (await client.callTool({
        name: 'plan',
        arguments: {
          goal: "Rechercher les sources récentes sur l'actualité climatique",
          sessionId: 'honesty-plan-research',
        },
      })) as unknown as StructuredResult,
    );
    expect((research.plan as { template?: string }).template).toBe('research');
    expect((research.searchQueries as string[]).length).toBeGreaterThan(0);
  });

  test('exposes the per-session web credit budget in session status', async () => {
    const client = await connect();
    const payload = payloadOf(
      (await client.callTool({
        name: 'session',
        arguments: { action: 'status', sessionId: 'honesty-budget' },
      })) as unknown as StructuredResult,
    );

    const budget = payload.webBudget as { creditsUsed: number; creditsLimit: number };
    expect(budget.creditsUsed).toBe(0);
    expect(budget.creditsLimit).toBe(env.runtime.search.webCreditBudget);
  });

  test('charges exactly one credit per Tavily search and reports it consistently', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ results: [{ title: 'T', url: 'https://example.org/1', content: 'c', score: 0.5 }] }),
      text: async () => '{}',
    })) as unknown as typeof fetch;

    env = createEnvironment({
      dataDir: tempDir,
      persistenceDisabled: true,
      search: { provider: 'tavily', tavilyApiKey: 'tvly-test' },
    });
    const client = await connect();

    const first = payloadOf(
      (await client.callTool({
        name: 'web_search',
        arguments: { query: 'premier', maxResults: 1, provider: 'tavily', sessionId: 'honesty-charge' },
      })) as unknown as StructuredResult,
    );
    const afterFirst = env.webCredits.used('honesty-charge');

    const second = payloadOf(
      (await client.callTool({
        name: 'web_search',
        arguments: { query: 'second', maxResults: 1, provider: 'tavily', sessionId: 'honesty-charge' },
      })) as unknown as StructuredResult,
    );
    const afterSecond = env.webCredits.used('honesty-charge');

    expect(afterFirst).toBe(1);
    expect(afterSecond).toBe(2);
    expect((first.webCredits as { creditsUsed: number }).creditsUsed).toBe(1);
    expect((second.webCredits as { creditsUsed: number }).creditsUsed).toBe(2);
  });

  test('keeps the certificate ledger across a server restart', async () => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'smart-thinking-claims-'));
    const first = createEnvironment({ dataDir: dir, persistenceDisabled: false });
    const firstServer = createSmartThinkingServer(first);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'claims-a', version: '1' });
    await firstServer.server.connect(serverTransport);
    await client.connect(clientTransport);

    const claimed = payloadOf(
      (await client.callTool({
        name: 'claim',
        arguments: {
          statement: '1729 est le plus petit nombre somme de deux cubes de deux façons',
          value: '1729',
          method: 'énumération exhaustive',
          evidence: '9^3+10^3 = 1729 = 1^3+12^3',
          sessionId: 'claims-restart',
        },
      })) as unknown as StructuredResult,
    );
    expect((claimed.claim as { value?: string }).value).toBe('1729');
    await client.close();
    await firstServer.server.close();
    await first.sessionStore.flush();

    // "Restart": a brand new environment on the same data directory.
    const second = createEnvironment({ dataDir: dir, persistenceDisabled: false });
    const secondServer = createSmartThinkingServer(second);
    const [ct2, st2] = InMemoryTransport.createLinkedPair();
    const client2 = new Client({ name: 'claims-b', version: '1' });
    await secondServer.server.connect(st2);
    await client2.connect(ct2);

    const audit = payloadOf(
      (await client2.callTool({
        name: 'audit',
        arguments: { sessionId: 'claims-restart' },
      })) as unknown as StructuredResult,
    );
    expect(audit.total).toBe(1);
    expect(audit.supported).toBe(1);

    const status = payloadOf(
      (await client2.callTool({
        name: 'session',
        arguments: { action: 'status', sessionId: 'claims-restart' },
      })) as unknown as StructuredResult,
    );
    expect(status.claims).toBe(1);
    expect(status.claimsWithoutCertificate).toBe(0);

    await client2.close();
    await secondServer.server.close();
    await second.sessionStore.flush();
    await fsp.rm(dir, { recursive: true, force: true });
  });

  test('purges neutral web evidence inherited from older versions', async () => {
    const dir = await fsp.mkdtemp(path.join(os.tmpdir(), 'smart-thinking-purge-'));
    const sessionsDir = path.join(dir, 'sessions');
    await fsp.mkdir(sessionsDir, { recursive: true });
    await fsp.writeFile(
      path.join(sessionsDir, 'session_state_purge-session.json'),
      JSON.stringify({
        sessionId: 'purge-session',
        hypotheses: [],
        evidence: [
          {
            id: 'web-noise',
            quote: 'Sesame Street counting segments.',
            sourceType: 'web',
            source: 'https://en.wikipedia.org/wiki/Pinball_Number_Count',
            stance: 'neutral',
            confidence: 0.4,
            retrievedAt: '2026-09-15T04:41:59.120Z',
          },
          {
            id: 'web-kept',
            quote: 'La tour Eiffel mesure 330 mètres.',
            sourceType: 'web',
            source: 'https://mairie-paris.fr/eiffel',
            stance: 'supports',
            confidence: 0.6,
            retrievedAt: '2026-09-15T04:41:59.120Z',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
      'utf8',
    );

    const purgeEnv = createEnvironment({ dataDir: dir, persistenceDisabled: false });
    const { server } = createSmartThinkingServer(purgeEnv);
    const [ct, st] = InMemoryTransport.createLinkedPair();
    const purgeClient = new Client({ name: 'purge', version: '1' });
    await server.connect(st);
    await purgeClient.connect(ct);

    const status = payloadOf(
      (await purgeClient.callTool({
        name: 'session',
        arguments: { action: 'status', sessionId: 'purge-session' },
      })) as unknown as StructuredResult,
    );

    expect(status.evidence).toBe(1);
    expect((status.evidencePurged as { count?: number })?.count).toBe(1);

    await purgeClient.close();
    await server.close();
    await purgeEnv.sessionStore.flush();
    await fsp.rm(dir, { recursive: true, force: true });
  });

  test('never claims an exhausted budget when the call is simply too expensive', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ results: [] }),
      text: async () => '{}',
    })) as unknown as typeof fetch;

    env = createEnvironment({
      dataDir: tempDir,
      persistenceDisabled: true,
      search: { provider: 'tavily', tavilyApiKey: 'tvly-test' },
    });
    const client = await connect();

    const result = payloadOf(
      (await client.callTool({
        name: 'research',
        arguments: { question: 'Question coûteuse', sessionId: 'research-budget', provider: 'tavily' },
      })) as unknown as StructuredResult,
    );

    expect(result.degraded).toBe(true);
    expect(result.reason).toBe('budget_insufficient');
    expect(String(result.detail)).toContain('50');
    expect(String(result.instruction)).not.toContain('épuisé');
    expect(result.creditsUsed).toBe(0);
  });
});
