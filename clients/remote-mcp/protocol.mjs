export const VERSION = '15.0.1';
export const API_PROFILE = 'smart-thinking-mcp/15.0';
export const PROTOCOLS = Object.freeze(['2025-03-26', '2025-06-18', '2025-11-25']);
export const MAX_REQUEST_BYTES = 256000;
export const MAX_RESPONSE_BYTES = 1600000;
export const own = (value, key) => Object.hasOwn(value, key);
export const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
export const validId = id => typeof id === 'string' && id.length <= 200 || typeof id === 'number' && Number.isSafeInteger(id);
export function validateRequest(message) {
  if (!object(message) || message.jsonrpc !== '2.0' || typeof message.method !== 'string' || !message.method.length || message.method.length > 100 || own(message, 'id') && !validId(message.id) || own(message, 'params') && !object(message.params)) {
    throw new Error('Invalid MCP request envelope.');
  }
  return own(message, 'id');
}
export function validateResponse(message, response) {
  if (!object(response) || response.jsonrpc !== '2.0' || !own(response, 'id') || response.id !== message.id || own(response, 'result') === own(response, 'error')) throw new Error('Invalid or mismatched MCP response envelope.');
  if (own(response, 'error') && (!object(response.error) || !Number.isInteger(response.error.code) || typeof response.error.message !== 'string')) throw new Error('Invalid MCP error envelope.');
  if (own(response, 'result') && !object(response.result)) throw new Error('Invalid MCP result envelope.');
  if (message.method === 'initialize' && own(response, 'result') && (!PROTOCOLS.includes(response.result.protocolVersion) || !object(response.result.capabilities) || !object(response.result.serverInfo) || typeof response.result.serverInfo.name !== 'string' || typeof response.result.serverInfo.version !== 'string')) throw new Error('Unsupported MCP initialization response.');
  return response;
}

/** Explicit user-selected discovery profiles, not an authorization or semantic classifier. */
export const TOOL_PROFILES = Object.freeze({
    math: Object.freeze(['capabilities', 'calculate', 'calculate_batch', 'finite_compute', 'solve_math', 'solve_logic', 'cas', 'check', 'artifact_get']),
    research: Object.freeze(['capabilities', 'web_search', 'fetch', 'research', 'check', 'claim', 'verify', 'run_create', 'run_get', 'run_export', 'artifact_get', 'artifact_import', 'budget_status', 'operation_get']),
    code: Object.freeze(['capabilities', 'calculate', 'calculate_batch', 'finite_compute', 'solve_logic', 'solve_math', 'check']),
    audit: Object.freeze(['capabilities', 'run_create', 'run_get', 'run_list', 'run_export', 'claim', 'claim_revise', 'requirement_add', 'artifact_get', 'artifact_import', 'check', 'verify', 'audit', 'run_finalize', 'run_cancel', 'events', 'budget_status', 'operation_get']),
});
export function selectTools(tools, profile = 'full') {
    if (profile !== 'full' && !Object.hasOwn(TOOL_PROFILES, profile))
        throw new Error('Unknown tool profile: use full, math, research, code or audit.');
    if (!Array.isArray(tools) || tools.length > 256 || tools.some(t => !t || typeof t.name !== 'string'))
        throw new Error('Invalid tool catalogue.');
    return profile === 'full' ? tools : tools.filter(t => TOOL_PROFILES[profile].includes(t.name));
}