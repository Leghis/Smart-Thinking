#!/usr/bin/env node
/** Public stdio bridge. Only the private remote server can access Jev and its policies. */
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { RemoteConnection } from './connection.mjs';
import { MAX_REQUEST_BYTES, own, validId, validateRequest } from './protocol.mjs';

export function startBridge({ connection, input = process.stdin, output = process.stdout, diagnostics = process.stderr, maxInFlight = 8, maxNotifications = 8 } = {}) {
  if (!connection || !Number.isSafeInteger(maxInFlight) || maxInFlight < 1 || maxInFlight > 64 || !Number.isSafeInteger(maxNotifications) || maxNotifications < 1 || maxNotifications > 64) throw new Error('Invalid bridge configuration.');
  const active = new Map(), pending = new Set(), notices = new Set();
  let buffer = Buffer.alloc(0), ended = false, stopped = false, blocked = false;
  let initialized = false, initializeStarted = false, initializeTask;
  let resolveDone;
  const done = new Promise(resolve => { resolveDone = resolve; });
  const finish = () => { if ((ended || stopped) && pending.size === 0 && buffer.length === 0 && !blocked) resolveDone(); };
  const emit = value => {
    if (output.destroyed || stopped) return;
    if (!output.write(JSON.stringify(value) + '\n')) { blocked = true; input.pause(); }
  };
  const error = (id, code, message) => emit({ jsonrpc: '2.0', id, error: { code, message } });
  const track = task => { pending.add(task); void task.catch(() => { diagnostics.write('MCP bridge operation failed; details suppressed.\n'); }).finally(() => { pending.delete(task); finish(); }); };
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
      if (notices.size >= maxNotifications) { diagnostics.write('MCP notification concurrency limit reached.\n'); return; }
      const outgoing = structuredClone(message);
      if (message.method === 'notifications/cancelled') {
        const id = message.params?.requestId;
        if (!validId(id)) return;
        const request = active.get(JSON.stringify(id));
        if (!request) return; // Never forward a caller-supplied remote request ID.
        outgoing.params.requestId = request.remoteId;
        request.controller.abort();
      }
      const controller = new AbortController(); notices.add(controller);
      track((async () => {
        try {
          if (initializeTask) await initializeTask;
          if (!initialized || stopped) return;
          await connection.send(outgoing, controller.signal);
        } catch { diagnostics.write('MCP notification was not acknowledged.\n'); }
        finally { notices.delete(controller); }
      })());
      return;
    }
    const key = JSON.stringify(message.id);
    if (active.has(key) || active.size >= maxInFlight) { error(message.id, -32000, 'Duplicate request ID or local concurrency limit.'); return; }
    if (message.method === 'initialize' && initializeStarted) { error(message.id, -32600, 'Initialization already started.'); return; }
    if (message.method !== 'initialize' && !initializeStarted) { error(message.id, -32000, 'Initialize the MCP connection first.'); return; }
    const controller = new AbortController(), remoteId = randomUUID();
    active.set(key, { controller, remoteId });
    if (message.method === 'initialize') initializeStarted = true;
    const task = (async () => {
      try {
        if (message.method !== 'initialize') { await initializeTask; if (!initialized) throw new Error('Initialization failed.'); }
        controller.signal.throwIfAborted();
        const response = await connection.send({ ...message, id: remoteId }, controller.signal);
        if (message.method === 'initialize') initialized = !!response?.result && !own(response, 'error');
        if (!response) throw new Error('Missing remote response.');
        emit({ ...response, id: message.id });
      } catch { error(message.id, -32000, 'Remote call failed, was cancelled or timed out. Check the operation receipt before retrying a mutation.'); }
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

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--help')) {
    process.stdout.write('Usage: node bridge.mjs [--allow-loopback]\nSet SMART_THINKING_MCP_URL and SMART_THINKING_MCP_TOKEN_FILE. Loopback is for local tests only.\n');
  } else {
    try {
      if (process.argv.slice(2).some(arg => arg !== '--allow-loopback')) throw new Error();
      const bridge = startBridge({ connection: new RemoteConnection({ allowLoopbackTest: process.argv.includes('--allow-loopback') }) });
      const stop = () => { bridge.stop(); process.stdin.destroy(); };
      process.once('SIGINT', stop); process.once('SIGTERM', stop);
      await bridge.done;
      process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop);
      process.stdin.destroy();
    } catch { process.stderr.write('Remote MCP configuration failed. Check URL and credential FILE paths.\n'); process.exitCode = 1; }
  }
}
