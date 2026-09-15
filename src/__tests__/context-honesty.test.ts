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

  test('verifies an exact computation as verified/0.95 without touching the web', async () => {
    const client = await connect();

    const result = payloadOf(
      (await client.callTool({
        name: 'verify',
        arguments: { claim: '(1234*5678)+91011 = 7097663', sessionId: 'honesty-verify' },
      })) as unknown as StructuredResult,
    );

    expect(result.status).toBe('verified');
    expect(result.confidence).toBe(0.95);
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
});
