import { randomUUID } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { VERSION, PROTOCOLS, MAX_REQUEST_BYTES, MAX_RESPONSE_BYTES, own, validateRequest, validateResponse, selectTools } from './protocol.mjs';
const exec = promisify(execFile);
const ERROR_CODES = new Set(['VALIDATION', 'NOT_FOUND', 'FORBIDDEN', 'CONFLICT', 'BUDGET_EXHAUSTED', 'UNAVAILABLE', 'CANCELLED', 'LIMIT_EXCEEDED', 'PROVIDER_ERROR', 'INTEGRITY_ERROR', 'STATE_ERROR', 'INTERNAL_ERROR']);
/** Actionable summary from an allowed shape only: allowlisted code, bounded strings. Anything else stays suppressed. */
function toolErrorSummary(result) {
  try {
    const text = result.content?.find(item => item.type === 'text')?.text;
    if (typeof text !== 'string' || text.length > 1200) return undefined;
    const error = JSON.parse(text)?.error;
    if (!error || typeof error !== 'object' || typeof error.code !== 'string' || !ERROR_CODES.has(error.code) || typeof error.message !== 'string' || error.message.length < 1 || error.message.length > 400) return undefined;
    const hint = typeof error.hint === 'string' && error.hint.length > 0 && error.hint.length <= 300 ? ' Hint: ' + error.hint : '';
    return 'MCP tool error ' + error.code + ': ' + error.message + hint;
  } catch { return undefined; }
}
function tokenFromFile(file, iam = false) {
  try {
    const stat = statSync(file);
    if (!stat.isFile() || stat.size > 16384) throw new Error();
    const value = readFileSync(file, 'utf8').trim();
    const pattern = iam ? /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/ : /^[A-Za-z0-9._~-]{32,8192}$/;
    if (!pattern.test(value) || value.length > 16000) throw new Error();
    return value;
  } catch { throw new Error(iam ? 'Cannot read a valid IAM identity-token file.' : 'Cannot read a valid MCP access-token file.'); }
}
/** Specialized client for the V14 stateless JSON profile, not a universal SSE client. */
export class RemoteConnection {
  constructor(options = {}) {
    try { this.url = new URL(options.url ?? process.env.SMART_THINKING_MCP_URL ?? ''); }
    catch { throw new Error('Configure an HTTPS MCP endpoint.'); }
    const loopback = this.url.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(this.url.hostname) && options.allowLoopbackTest === true;
    if (this.url.protocol !== 'https:' && !loopback || this.url.username || this.url.password || this.url.hash || this.url.search) throw new Error('Use HTTPS without credentials, query or fragment in the endpoint.');
    this.tokenFile = options.tokenFile ?? process.env.SMART_THINKING_MCP_TOKEN_FILE;
    this.idTokenFile = options.idTokenFile ?? process.env.SMART_THINKING_ID_TOKEN_FILE;
    this.impersonate = options.impersonate ?? process.env.SMART_THINKING_IAM_SERVICE_ACCOUNT;
    this.audience = options.audience ?? process.env.SMART_THINKING_IAM_AUDIENCE;
    if (!this.tokenFile) throw new Error('SMART_THINKING_MCP_TOKEN_FILE is required.');
    if (this.idTokenFile && this.impersonate) throw new Error('Choose one IAM credential source.');
    if (this.impersonate && (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]@[a-z][a-z0-9-]+\.iam\.gserviceaccount\.com$/.test(this.impersonate) || !/^https:\/\/[a-z0-9][a-z0-9.-]*\.run\.app$/.test(this.audience ?? ''))) throw new Error('Configure a dedicated IAM client account and receiving-service audience.');
    this.timeoutMs = options.timeoutMs ?? 115000;
    this.maxResponseBytes = options.maxResponseBytes ?? MAX_RESPONSE_BYTES;
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1 || this.timeoutMs > 120000 || !Number.isSafeInteger(this.maxResponseBytes) || this.maxResponseBytes < 32 || this.maxResponseBytes > MAX_RESPONSE_BYTES) throw new Error('Invalid client resource limits.');
    this.protocol = PROTOCOLS.at(-1);
    this.fetcher = options.fetcher ?? fetch;
  }
  async headers(signal) {
    signal?.throwIfAborted();
    const headers = { authorization: 'Bearer ' + tokenFromFile(this.tokenFile), accept: 'application/json, text/event-stream', 'content-type': 'application/json', 'mcp-protocol-version': this.protocol };
    let token = this.idTokenFile ? tokenFromFile(this.idTokenFile, true) : undefined;
    if (!token && this.impersonate) {
      if (!this.iamCache || Date.now() >= this.iamCache.until) {
        try {
          const { stdout } = await exec('gcloud', ['auth', 'print-identity-token', '--impersonate-service-account=' + this.impersonate, '--audiences=' + this.audience, '--quiet'], { timeout: 15000, maxBuffer: 16000, signal });
          this.iamCache = { token: stdout.trim(), until: Date.now() + 300000 };
        } catch { throw new Error('IAM token acquisition failed; command output suppressed.'); }
      }
      token = this.iamCache.token;
    }
    if (token) {
      if (token.length > 16000 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw new Error('Invalid IAM identity token.');
      headers['X-Serverless-Authorization'] = 'Bearer ' + token;
    }
    signal?.throwIfAborted();
    return headers;
    }
    async tools(profile = 'full', signal) {
        // Discovery filters context only; server-side authentication and authorization never change.
        selectTools([], profile);
        const response = await this.send({ jsonrpc: '2.0', id: randomUUID(), method: 'tools/list', params: {} }, signal);
        if (response.error)
            throw new Error('Tool discovery rejected.');
        return selectTools(response.result.tools, profile);
  }
  async send(message, signal) {
    const isRequest = validateRequest(message), body = JSON.stringify(message);
    if (Buffer.byteLength(body) > MAX_REQUEST_BYTES) throw new Error('MCP request exceeds 256 KB.');
    const deadline = AbortSignal.timeout(this.timeoutMs);
    const cancel = signal ? AbortSignal.any([signal, deadline]) : deadline;
    const headers = await this.headers(cancel);
    let response;
    try { response = await this.fetcher(this.url.toString(), { method: 'POST', headers, body, redirect: 'error', signal: cancel }); }
    catch { throw new Error(cancel.aborted ? 'MCP request cancelled or timed out; outcome may be unknown.' : 'MCP transport failed; no automatic retry.'); }
    const discard = async () => { await response.body?.cancel().catch(() => {}); };
    if (!response.ok) { await discard(); throw new Error(`MCP HTTP ${response.status}; body suppressed. Check the operation receipt before retrying.`); }
    if (response.headers.has('mcp-session-id')) { await discard(); throw new Error('A stateful session was returned; this client requires the V14 stateless profile.'); }
    if (!isRequest) { await discard(); if (![202, 204].includes(response.status)) throw new Error('Invalid MCP notification acknowledgement.'); return undefined; }
    if ([202, 204].includes(response.status)) { await discard(); throw new Error('Missing MCP response for a request with an ID.'); }
    if ((response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase() !== 'application/json') { await discard(); throw new Error('Expected the V14 JSON transport, not SSE or another content type.'); }
    if (Number(response.headers.get('content-length')) > this.maxResponseBytes) { await discard(); throw new Error('MCP response exceeds the byte limit.'); }
    if (!response.body) throw new Error('Empty MCP response.');
    const reader = response.body.getReader(), chunks = [];
    const onAbort = () => { void reader.cancel().catch(() => {}); };
    cancel.addEventListener('abort', onAbort, { once: true });
    let size = 0, value;
    try {
      for (;;) {
        cancel.throwIfAborted();
        const { done, value: chunk } = await reader.read();
        cancel.throwIfAborted();
        if (done) break;
        size += chunk.byteLength;
        if (size > this.maxResponseBytes) throw new Error('MCP response exceeds the byte limit.');
        chunks.push(chunk);
      }
      try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks))); }
      catch { throw new Error('Invalid MCP JSON response; body suppressed.'); }
    } finally { cancel.removeEventListener('abort', onAbort); await reader.cancel().catch(() => {}); }
    validateResponse(message, value);
    if (message.method === 'initialize' && value.result) this.protocol = value.result.protocolVersion;
    return value;
  }
  async initialize(signal) {
    const answer = await this.send({ jsonrpc: '2.0', id: randomUUID(), method: 'initialize', params: { protocolVersion: this.protocol, capabilities: {}, clientInfo: { name: 'smart-thinking-remote-client', version: VERSION } } }, signal);
    if (answer.error) throw new Error('Remote MCP initialization rejected.');
    await this.send({ jsonrpc: '2.0', method: 'notifications/initialized' }, signal);
    return answer.result;
  }
  async call(name, args = {}, signal) {
    const answer = await this.send({ jsonrpc: '2.0', id: randomUUID(), method: 'tools/call', params: { name, arguments: args } }, signal);
    if (answer.error) throw new Error('Remote JSON-RPC error ' + answer.error.code + '; details suppressed.');
    if (answer.result.isError) throw new Error(toolErrorSummary(answer.result) ?? 'Remote tool rejected the operation; inspect its receipt before retrying.');
    const result = answer.result;
    if (own(result, 'structuredContent')) return result.structuredContent;
    const text = result.content?.find(item => item.type === 'text')?.text;
    try { return typeof text === 'string' ? JSON.parse(text) : result; }
    catch { return result; }
  }
}
