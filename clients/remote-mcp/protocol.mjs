/** Public wire contract only. The server owns semantic policy and proof evaluation. */
export const VERSION = '14.0.0';
export const API_PROFILE = 'smart-thinking-mcp/14.0';
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
