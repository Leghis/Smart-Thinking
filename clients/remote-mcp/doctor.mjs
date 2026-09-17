#!/usr/bin/env node
import { statSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { RemoteConnection, DEFAULT_ENDPOINT } from '../connection.mjs';
import { API_PROFILE, selectTools } from './protocol.mjs';
const args = process.argv.slice(2);
const usage = 'Usage: node doctor.mjs --allow-network [--allow-loopback]\nToken-free connectivity check by default; no Jev inference or deployment.\n';
if (!args.includes('--allow-network') || args.some(x => !['--allow-network', '--allow-loopback'].includes(x))) {
  process.stderr.write(usage);
  process.exitCode = 2;
} else {
  const profile = process.env.SMART_THINKING_TOOL_PROFILE ?? 'full';
  let stage = 'config';
  const fail = (code, message) => { process.stderr.write(`doctor[${stage}]: ${message}\n`); process.exitCode = code; };
  try {
    // 1 — configuration: URL, credential FILE, profile name. Never prints values.
    try {
      const url = new URL(process.env.SMART_THINKING_MCP_URL ?? DEFAULT_ENDPOINT);
      if (url.protocol !== 'https:' ) throw new Error();
      const tokenFile = process.env.SMART_THINKING_MCP_TOKEN_FILE;
      if (tokenFile && !statSync(tokenFile).isFile()) throw new Error();
      selectTools([], profile);
    } catch { fail(2, 'SMART_THINKING_MCP_URL must be https when set (default: the public hosted endpoint); SMART_THINKING_MCP_TOKEN_FILE is optional; SMART_THINKING_TOOL_PROFILE: full, math, research, code, audit.'); throw new Error('stop'); }
    // 2 — transport and authentication.
    stage = 'transport';
    const connection = new RemoteConnection({ allowLoopbackTest: args.includes('--allow-loopback') });
    const init = await connection.initialize();
    // 3 — API profile and capabilities advertised by the server.
    stage = 'api-profile';
    const capabilities = await connection.call('capabilities');
    if (capabilities?.apiProfile !== API_PROFILE || capabilities?.semanticDefault !== 'typesafe/jev' || capabilities.configured !== true) throw new Error();
    // 4 — discovery under the requested profile.
    stage = 'discovery';
    const response = await connection.send({ jsonrpc: '2.0', id: randomUUID(), method: 'tools/list', params: {} });
    const names = response.result?.tools?.map(tool => tool.name) ?? [];
    const visible = selectTools(names.map(name => ({ name })), profile).map(tool => tool.name);
    const required = ['run_create', 'claim', 'verify', 'audit', 'run_finalize', 'analyze', 'reason', 'next_step'];
    if (response.error || !required.every(name => names.includes(name)) || visible.length === 0) throw new Error();
    process.stdout.write(JSON.stringify({ ok: true, protocol: init.protocolVersion, serverVersion: init.serverInfo.version, apiProfile: capabilities.apiProfile, toolCount: names.length, visibleTools: visible.length, profile, semanticDefault: capabilities.semanticDefault, note: 'Connectivity only; quality, IAM/tenant isolation and live provider validation are separate gates.' }, null, 2) + '\n');
  } catch (error) {
    if (String(error?.message) !== 'stop') {
      if (stage === 'transport') fail(2, 'Transport, endpoint, credential or IAM failure; bodies and secrets suppressed.');
      else if (stage === 'api-profile') fail(1, 'Server reachable but its API profile or capabilities do not match this client.');
      else if (stage === 'discovery') fail(1, 'Server reachable but required tools are missing from the catalogue.');
      else fail(1, 'Doctor failed before reaching the server.');
    }
  }
}
