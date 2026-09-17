#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { RemoteConnection } from './connection.mjs';
import { VERSION, MAX_REQUEST_BYTES, own, validId, validateRequest, selectTools } from './protocol.mjs';

/** Bounded stdio adapter with explicit initialize -> initialized -> tools ordering. */
export function startBridge({ connection, input = process.stdin, output = process.stdout, diagnostics = process.stderr, maxInFlight = 8, maxNotifications = 8, toolProfile = 'full' } = {}) {
  if (!connection || !Number.isSafeInteger(maxInFlight) || maxInFlight < 1 || maxInFlight > 64 || !Number.isSafeInteger(maxNotifications) || maxNotifications < 1 || maxNotifications > 64) throw new Error('Invalid bridge configuration.');
  selectTools([], toolProfile); // invalid profiles fail at construction, before any I/O
  const active = new Map(), pending = new Set(), notices = new Set();
  let buffer = Buffer.alloc(0), ended = false, stopped = false, blocked = false;
  let initialized = false, initializeStarted = false, initializeTask, readyTask;
  let resolveDone;
  const done = new Promise(resolve => { resolveDone = resolve; });
  const finish = () => { if ((ended || stopped) && pending.size === 0 && buffer.length === 0 && !blocked) resolveDone(); };
  const emit = value => {
    if (output.destroyed || stopped) return;
    if (!output.write(JSON.stringify(value) + '\n')) { blocked = true; input.pause(); }
  };
  const error = (id, code, message) => emit({ jsonrpc: '2.0', id, error: { code, message } });
  const track = task => {
    pending.add(task);
    void task.catch(() => diagnostics.write('MCP bridge operation failed; details suppressed.\n')).finally(() => { pending.delete(task); finish(); });
  };
  function stop() {
    if (stopped) return;
    stopped = true; ended = true; buffer = Buffer.alloc(0); blocked = false;
    input.pause();
    for (const request of active.values()) request.controller.abort();
    for (const controller of notices) controller.abort();
    finish();
  }
  function dispatch(line) {
    if (!line.toString('utf8').trim()) return;
    let message;
    try { message = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(line)); }
    catch { error(null, -32700, 'Malformed JSON input.'); return; }
    let hasId;
    try { hasId = validateRequest(message); }
    catch { error(null, -32600, 'Invalid MCP request.'); return; }
    if (!hasId) {
      const outgoing = structuredClone(message);
      if (message.method === 'notifications/cancelled') {
        const id = message.params?.requestId;
        if (!validId(id)) return;
        const request = active.get(JSON.stringify(id));
        if (!request || request.method === 'initialize') return;
        outgoing.params.requestId = request.remoteId;
        request.controller.abort(); // Local cancellation is never denied by the notification quota.
      }
      if (notices.size >= maxNotifications) { diagnostics.write('MCP notification concurrency limit reached.\n'); return; }
      if (message.method === 'notifications/initialized' && (!initializeStarted || readyTask)) return;
      const controller = new AbortController(); notices.add(controller);
      const task = (async () => {
        try {
          if (initializeTask) await initializeTask;
          if (!initialized || stopped) return false;
          await connection.send(outgoing, controller.signal);
          return true;
        } catch { diagnostics.write('MCP notification was not acknowledged.\n'); return false; }
        finally { notices.delete(controller); }
      })();
      if (message.method === 'notifications/initialized') readyTask = task;
      track(task);
      return;
    }
    const key = JSON.stringify(message.id);
    if (active.has(key) || active.size >= maxInFlight) { error(message.id, -32000, 'Duplicate request ID or local concurrency limit.'); return; }
    if (message.method === 'initialize' && initializeStarted) { error(message.id, -32600, 'Initialization already started.'); return; }
    if (message.method !== 'initialize' && !readyTask) { error(message.id, -32000, 'Initialize and send notifications/initialized first.'); return; }
    const controller = new AbortController(), remoteId = randomUUID();
    active.set(key, { controller, remoteId, method: message.method });
    if (message.method === 'initialize') initializeStarted = true;
    const task = (async () => {
      try {
        if (message.method !== 'initialize' && !await readyTask) throw new Error('Initialization was not acknowledged.');
        controller.signal.throwIfAborted();
        const response = await connection.send({ ...message, id: remoteId }, controller.signal);
        if (message.method === 'tools/list' && response?.result?.tools)
          response.result = { ...response.result, tools: selectTools(response.result.tools, toolProfile) };
        if (message.method === 'initialize') initialized = !!response?.result && !own(response, 'error');
        if (!response) throw new Error('Missing remote response.');
        emit({ ...response, id: message.id });
      } catch { error(message.id, -32000, 'Remote call failed, was cancelled or timed out. Inspect the operation receipt before retrying a mutation.'); }
      finally { active.delete(key); }
    })();
    if (message.method === 'initialize') initializeTask = task;
    track(task);
  }
  function consume() {
    while (!blocked && !stopped) {
      const index = buffer.indexOf(10);
      if (index < 0) break;
      if (index > MAX_REQUEST_BYTES) { diagnostics.write('MCP line exceeds 256 KB.\n'); stop(); return; }
      const line = buffer.subarray(0, index); buffer = buffer.subarray(index + 1);
      dispatch(line);
    }
    if (buffer.length > MAX_REQUEST_BYTES) { diagnostics.write('MCP input buffer exceeds 256 KB.\n'); stop(); return; }
    if (ended && !blocked && !stopped && buffer.length) { const tail = buffer; buffer = Buffer.alloc(0); dispatch(tail); }
    finish();
  }
  const onData = chunk => { if (!stopped) { buffer = Buffer.concat([buffer, Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)]); consume(); } };
  const onEnd = () => { ended = true; consume(); };
  const onDrain = () => { blocked = false; consume(); if (!ended && !stopped && !blocked) input.resume(); };
  input.on('data', onData); input.once('end', onEnd); input.once('error', stop);
  output.on('drain', onDrain); output.once('error', stop);
  void done.then(() => { input.removeListener('data', onData); input.removeListener('end', onEnd); input.removeListener('error', stop); output.removeListener('drain', onDrain); output.removeListener('error', stop); });
  return { done, stop };
}

export async function runCli(args = process.argv.slice(2)) {
  try {
    if (args.some(arg => !['--help', '--version', '--allow-loopback'].includes(arg))) throw new Error();
    if (args.includes('--help')) {
      process.stdout.write('Smart-Thinking V14 remote MCP client\nNo token required: the public hosted endpoint accepts anonymous requests.\nOptional: SMART_THINKING_MCP_URL overrides the endpoint; SMART_THINKING_MCP_TOKEN_FILE raises your per-identity quota.\nOptional: --allow-loopback for local tests only. --version prints the client version.\nSMART_THINKING_TOOL_PROFILE=full|math|research|code|audit limits discovery context (full by default).\nNo local V13 server is started and no API key belongs in this client.\n');
      return;
    }
    if (args.includes('--version')) { process.stdout.write(VERSION + '\n'); return; }
    const bridge = startBridge({ toolProfile: process.env.SMART_THINKING_TOOL_PROFILE ?? 'full', connection: new RemoteConnection({ allowLoopbackTest: args.includes('--allow-loopback') }) });
    const stop = () => { bridge.stop(); process.stdin.destroy(); };
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
    await bridge.done;
    process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
    process.stdin.destroy();
  } catch {
    process.stderr.write('Remote MCP startup failed. The default public endpoint needs no token; use SMART_THINKING_MCP_URL or SMART_THINKING_MCP_TOKEN_FILE to override, or --help. V13 local-server options are no longer accepted.\n');
    process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await runCli();
