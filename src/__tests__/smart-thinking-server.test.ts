import { createSmartThinkingServer } from '../server/smart-thinking-server';

describe('Smart-Thinking MCP server tools', () => {
  it('exposes search and fetch tools with expected behaviour', async () => {
    const { server, env } = createSmartThinkingServer();
    const tools = (server as any)._registeredTools as Record<string, any>;

    expect(tools).toHaveProperty('search');
    expect(tools).toHaveProperty('fetch');

    const memoryId = env.memoryManager.addMemory('Analyse multi-dimensionnelle des systèmes complexes', ['analysis'], 'session-test');

    const searchResult = await tools.search.callback({ query: 'analyse', limit: 3, sessionId: 'session-test' });
    const searchStructured = searchResult.structuredContent as any;

    expect(Array.isArray(searchStructured?.results)).toBe(true);
    expect(searchStructured.results[0]?.id).toBe(memoryId);

    const fetchResult = await tools.fetch.callback({ id: memoryId, sessionId: 'session-test' });
    const fetchStructured = fetchResult.structuredContent as any;

    expect(fetchStructured?.id).toBe(memoryId);
    expect(fetchStructured?.text).toContain('Analyse multi-dimensionnelle');
  });

  it('returns an error payload when fetch misses', async () => {
    const { server } = createSmartThinkingServer();
    const tools = (server as any)._registeredTools as Record<string, any>;

    const result = await tools.fetch.callback({ id: 'missing' });
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
});
