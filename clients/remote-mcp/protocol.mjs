import { createHash } from 'node:crypto';
export const VERSION = '16.0.1';
export const API_PROFILE = 'smart-thinking-mcp/16.0';
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

/** Explicit user-selected discovery profiles, not an authorization or semantic classifier.
 *  - `code` is the V16 software-supervision profile: it exposes the code_* façade, Jev
 *    judgment tools and every dossier/exact dependency those tools require. Discovery
 *    only filters the model's context; the server still authorizes every call. */
export const TOOL_PROFILES = Object.freeze({
    math: Object.freeze(['capabilities', 'calculate', 'calculate_batch', 'finite_compute', 'solve_math', 'solve_logic', 'cas', 'check', 'artifact_get']),
    research: Object.freeze(['capabilities', 'web_search', 'fetch', 'research', 'check', 'claim', 'verify', 'run_create', 'run_get', 'run_export', 'artifact_get', 'artifact_import', 'budget_status', 'operation_get']),
    code: Object.freeze(['capabilities',
        'calculate', 'calculate_batch', 'finite_compute', 'solve_logic', 'solve_math', 'check',
        'run_create', 'run_get', 'run_export', 'artifact_import', 'artifact_get', 'claim', 'claim_revise', 'requirement_add', 'verify', 'audit', 'run_finalize', 'run_cancel', 'events', 'budget_status', 'operation_get',
        'analyze', 'plan', 'critique', 'next_step',
        'code_bind', 'code_context', 'code_review', 'code_check_start', 'code_job_get', 'code_job_cancel', 'code_checkpoint', 'code_gate']),
    audit: Object.freeze(['capabilities', 'run_create', 'run_get', 'run_list', 'run_export', 'claim', 'claim_revise', 'requirement_add', 'artifact_get', 'artifact_import', 'check', 'verify', 'audit', 'run_finalize', 'run_cancel', 'events', 'budget_status', 'operation_get']),
});
export function selectTools(tools, profile = 'full') {
    if (profile !== 'full' && !Object.hasOwn(TOOL_PROFILES, profile))
        throw new Error('Unknown tool profile: use full, math, research, code or audit.');
    if (!Array.isArray(tools) || tools.length > 256 || tools.some(t => !t || typeof t.name !== 'string'))
        throw new Error('Invalid tool catalogue.');
    return profile === 'full' ? tools : tools.filter(t => TOOL_PROFILES[profile].includes(t.name));
}

/** Canonical catalogue fingerprint (V16): sha256 over the sorted tool names, identical on
 *  server and client. `capabilities.catalog.fingerprint` uses exactly this computation, so a
 *  host can prove that the catalogue it received was the complete one. */
export function catalogueFingerprint(tools) {
    if (!Array.isArray(tools) || tools.some(t => !t || typeof t.name !== 'string'))
        throw new Error('Invalid tool catalogue.');
    const names = tools.map(t => t.name);
    if (new Set(names).size !== names.length)
        throw new Error('Duplicate tool name in catalogue.');
    names.sort();
    return createHash('sha256').update(JSON.stringify(names)).digest('hex');
}
/** Garde-fou BLOQUANT : un catalogue partiel n'est jamais accepté silencieusement —
 *  l'erreur porte un code machine-lisible pour que l'hôte (ou l'opérateur) distingue
 *  un catalogue incomplet d'une panne serveur et rafraîchisse sa découverte. */
function catalogueError(code, message) {
    return Object.assign(new Error(`${code}: ${message}`), { code, catalogueIncomplete: true });
}
export function verifyCatalogue(announced, tools) {
    if (!object(announced) || typeof announced.fingerprint !== 'string' || !Number.isSafeInteger(announced.count))
        throw catalogueError('CATALOGUE_NOT_ANNOUNCED', 'the server did not publish count+fingerprint in capabilities.catalog');
    if (!Array.isArray(tools) || tools.length !== announced.count)
        throw catalogueError('CATALOGUE_INCOMPLETE', `expected ${announced.count}, discovered ${Array.isArray(tools) ? tools.length : 0} — refresh the connector or re-run discovery; never treat a partial catalogue as a server outage`);
    const fingerprint = catalogueFingerprint(tools);
    if (fingerprint !== announced.fingerprint)
        throw catalogueError('CATALOGUE_FINGERPRINT_MISMATCH', 'this catalogue is not the announced one');
    return { count: tools.length, fingerprint };
}
