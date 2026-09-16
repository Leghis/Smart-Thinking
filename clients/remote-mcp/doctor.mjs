#!/usr/bin/env node
import { RemoteConnection } from './connection.mjs';
import { API_PROFILE } from './protocol.mjs';
import { randomUUID } from 'node:crypto';
const args = process.argv.slice(2);
if (!args.includes('--allow-network') || args.some(x => !['--allow-network', '--allow-loopback'].includes(x))) {
  process.stderr.write('Usage: node doctor.mjs --allow-network [--allow-loopback]\nAuthenticated connectivity only; no Jev inference or deployment.\n');
  process.exitCode = 2;
} else {
  try {
    const connection = new RemoteConnection({ allowLoopbackTest: args.includes('--allow-loopback') });
    const init = await connection.initialize();
    const capabilities = await connection.call('capabilities');
    const response = await connection.send({ jsonrpc: '2.0', id: randomUUID(), method: 'tools/list', params: {} });
    const names = response.result?.tools?.map(tool => tool.name) ?? [];
    const required = ['run_create', 'claim', 'verify', 'audit', 'run_finalize', 'analyze', 'reason', 'next_step'];
    if (response.error || !required.every(name => names.includes(name)) || capabilities?.apiProfile !== API_PROFILE || capabilities?.semanticDefault !== 'typesafe/jev' || capabilities.configured !== true) throw new Error();
    process.stdout.write(JSON.stringify({ ok: true, protocol: init.protocolVersion, serverVersion: init.serverInfo.version, apiProfile: capabilities.apiProfile, toolCount: names.length, semanticDefault: capabilities.semanticDefault, note: 'Connectivity only; quality, IAM/tenant isolation and live provider validation are separate gates.' }, null, 2) + '\n');
  } catch { process.stderr.write('Remote doctor failed. Check endpoint, credentials, IAM and API profile; bodies and secrets suppressed.\n'); process.exitCode = 1; }
}
