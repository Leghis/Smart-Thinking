import { promises as fsp } from 'fs';
import os from 'os';
import path from 'path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import {
  createEnvironment,
  resetSmartThinkingEnvironment,
  type SmartThinkingEnvironment,
} from '../server/environment';
import {
  createSmartThinkingServer,
  type SmartThinkingServerOptions,
} from '../server/smart-thinking-server';

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

describe('Smart-Thinking MCP server (in-memory E2E)', () => {
  let tempDir: string;
  let env: SmartThinkingEnvironment;
  let clients: Client[];
  let servers: McpServer[];

  beforeEach(async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'smart-thinking-server-'));
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

  async function connect(options?: SmartThinkingServerOptions): Promise<Client> {
    const { server } = createSmartThinkingServer(env, options);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'smart-thinking-tests', version: '1.0.0' });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    servers.push(server);
    clients.push(client);
    return client;
  }

  test('exposes exactly twenty tools in full mode', async () => {
    const client = await connect();

    const { tools } = await client.listTools();
    expect(tools.map(tool => tool.name).sort()).toEqual([
      'audit',
      'calculate',
      'cas',
      'claim',
      'compute',
      'critique',
      'fetch',
      'math_knowledge',
      'plan',
      'protocol',
      'research',
      'search',
      'session',
      'smartthinking',
      'solve_logic',
      'solve_math',
      'verify',
      'web_agent',
      'web_crawl',
      'web_search',
    ]);
  });

  test('web_crawl asks the client to act when Tavily is not configured', async () => {
    const client = await connect();
    const fetchSpy = jest.spyOn(global, 'fetch');

    const result = payloadOf(
      (await client.callTool({
        name: 'web_crawl',
        arguments: { url: 'https://example.com/docs', mode: 'map' },
      })) as unknown as StructuredResult,
    );

    expect(result.provider).toBe('native');
    expect(result.requiresClientAction).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  test('calculate evaluates expressions deterministically', async () => {
    const client = await connect();

    const direct = payloadOf(
      (await client.callTool({ name: 'calculate', arguments: { expression: '(120*0.45)' } })) as unknown as StructuredResult,
    );
    expect(direct.value).toBeCloseTo(54, 10);

    const checked = payloadOf(
      (await client.callTool({ name: 'calculate', arguments: { expression: '12*4+6 = 54' } })) as unknown as StructuredResult,
    );
    expect(checked.matchesClaim).toBe(true);
    expect(checked.verdict).toBe('confirmed');

    const wrong = payloadOf(
      (await client.callTool({ name: 'calculate', arguments: { expression: '95/5 = 18' } })) as unknown as StructuredResult,
    );
    expect(wrong.matchesClaim).toBe(false);
    expect(wrong.verdict).toBe('contradicted');
  });

  test('runs the plan -> smartthinking -> session flow over the wire', async () => {
    const client = await connect();
    const sessionId = 'e2e-session';

    const planResult = (await client.callTool({
      name: 'plan',
      arguments: { goal: 'Calculer le coût total du projet', sessionId },
    })) as unknown as StructuredResult;
    expect(planResult.isError).not.toBe(true);
    const planPayload = payloadOf(planResult);
    const plan = planPayload.plan as { steps: unknown[] } | undefined;
    expect(plan?.steps.length).toBeGreaterThanOrEqual(2);

    const thoughtResult = (await client.callTool({
      name: 'smartthinking',
      arguments: {
        thought: "La méthode itérative améliore la qualité de l'analyse.",
        sessionId,
      },
    })) as unknown as StructuredResult;
    expect(thoughtResult.isError).not.toBe(true);
    const thoughtPayload = payloadOf(thoughtResult);
    expect(thoughtPayload.sessionId).toBe(sessionId);
    expect(thoughtPayload.thoughtId).toEqual(expect.any(String));
    const metrics = thoughtPayload.qualityMetrics as { confidence: number; relevance: number; quality: number };
    expect(metrics.confidence).toBeGreaterThanOrEqual(0);
    expect(metrics.confidence).toBeLessThanOrEqual(1);

    const sessionResult = (await client.callTool({
      name: 'session',
      arguments: { action: 'status', sessionId },
    })) as unknown as StructuredResult;
    expect(sessionResult.isError).not.toBe(true);
    const sessionPayload = payloadOf(sessionResult);
    expect(sessionPayload.thoughts).toBeGreaterThanOrEqual(1);
    expect(sessionPayload.planSteps).toBeGreaterThanOrEqual(2);
  });

  test('answers web_search with provider none when search is off and never hits the network', async () => {
    const client = await connect();

    const result = (await client.callTool({
      name: 'web_search',
      arguments: { query: 'actualité', provider: 'off', sessionId: 'e2e-session' },
    })) as unknown as StructuredResult;
    expect(result.isError).not.toBe(true);
    const payload = payloadOf(result);
    expect(payload.provider).toBe('none');
    expect(payload.results).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('exposes only search and fetch in connector mode', async () => {
    const client = await connect({ includeSmartThinkingTool: false, includeWebTools: false });

    const { tools } = await client.listTools();
    expect(tools.map(tool => tool.name).sort()).toEqual(['fetch', 'search']);
  });
});
