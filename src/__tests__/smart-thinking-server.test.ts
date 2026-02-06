import { createSmartThinkingServer } from '../server/smart-thinking-server';

function registryKeys(registry: unknown): string[] {
  if (registry instanceof Map) {
    return Array.from(registry.keys()).map(String);
  }
  if (registry && typeof registry === 'object') {
    return Object.keys(registry as Record<string, unknown>);
  }
  return [];
}

function resolveToolHandler(tool: Record<string, any>): ((args: Record<string, any>) => Promise<any>) {
  const handler = tool.callback ?? tool.handler;
  if (typeof handler !== 'function') {
    throw new Error('Tool handler not found');
  }
  return handler;
}

describe('Smart-Thinking MCP server tools', () => {
  it('exposes search and fetch tools with expected behaviour', async () => {
    const { server, env } = createSmartThinkingServer();
    const tools = (server as any)._registeredTools as Record<string, any>;

    expect(tools).toHaveProperty('search');
    expect(tools).toHaveProperty('fetch');

    const memoryId = env.memoryManager.addMemory('Analyse multi-dimensionnelle des systèmes complexes', ['analysis'], 'session-test');

    const searchResult = await resolveToolHandler(tools.search)({ query: 'analyse', limit: 3, sessionId: 'session-test' });
    const searchStructured = searchResult.structuredContent as any;

    expect(Array.isArray(searchStructured?.results)).toBe(true);
    expect(searchStructured.results[0]?.id).toBe(memoryId);

    const fetchResult = await resolveToolHandler(tools.fetch)({ id: memoryId, sessionId: 'session-test' });
    const fetchStructured = fetchResult.structuredContent as any;

    expect(fetchStructured?.id).toBe(memoryId);
    expect(fetchStructured?.text).toContain('Analyse multi-dimensionnelle');
  });

  it('returns an error payload when fetch misses', async () => {
    const { server } = createSmartThinkingServer();
    const tools = (server as any)._registeredTools as Record<string, any>;

    const result = await resolveToolHandler(tools.fetch)({ id: 'missing' });
    expect(result.isError).toBe(true);
    expect(result.content?.[0]?.type).toBe('text');
  });

  it('can expose a minimal toolset for connector compatibility', () => {
    const { server } = createSmartThinkingServer(undefined, { includeSmartThinkingTool: false });
    const tools = (server as any)._registeredTools as Record<string, any>;

    expect(tools).not.toHaveProperty('smartthinking');
    expect(tools).toHaveProperty('search');
    expect(tools).toHaveProperty('fetch');
  });

  it('registers prompts/resources and rich tool metadata', () => {
    const { server } = createSmartThinkingServer();
    const internalServer = (server as any).server as Record<string, any>;
    const tools = (server as any)._registeredTools as Record<string, any>;

    const promptNames = registryKeys((server as any)._registeredPrompts);
    const resourceNames = registryKeys((server as any)._registeredResources);
    const resourceTemplateNames = registryKeys((server as any)._registeredResourceTemplates);

    expect(promptNames).toEqual(expect.arrayContaining([
      'smartthinking-reasoning-plan',
      'smartthinking-verify-claim',
    ]));

    expect(resourceNames).toEqual(expect.arrayContaining([
      'smart-thinking://docs/about',
      'smart-thinking://runtime/status',
    ]));

    expect(resourceTemplateNames).toEqual(expect.arrayContaining([
      'smartthinking-session-recent',
      'smartthinking-memory-by-id',
    ]));

    expect(tools.search.description).toContain('Use this when');
    expect(tools.fetch.description).toContain('Use this when');
    expect(tools.search.annotations?.readOnlyHint).toBe(true);
    expect(tools.fetch.annotations?.idempotentHint).toBe(true);

    expect(internalServer._capabilities).toMatchObject({
      tools: { listChanged: true },
      prompts: { listChanged: true },
      resources: { listChanged: true, subscribe: false },
      completions: {},
      logging: {},
    });
  });
});
