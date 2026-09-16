#!/usr/bin/env node
import { RemoteConnection } from './connection.mjs';
import { randomUUID } from 'node:crypto';
const args = process.argv.slice(2);
if (!args.includes('--allow-network') || args.some(x => !['--allow-network', '--allow-loopback'].includes(x))) {
  process.stderr.write('Usage: node doctor.mjs --allow-network [--allow-loopback]\nPerforms authenticated initialize/capabilities/tools-list only; no Jev task or deployment.\n');
  process.exitCode = 2;
} else {
  try {
    const connection = new RemoteConnection({ allowLoopbackTest: args.includes('--allow-loopback') });
    const init = await connection.initialize();
    const capabilities = await connection.call('capabilities');
    const response = await connection.send({ jsonrpc: '2.0', id: randomUUID(), method: 'tools/list', params: {} });
    const names = response.result?.tools?.map(tool => tool.name) ?? [];
    const required = ['run_create', 'claim', 'verify', 'audit', 'run_finalize', 'analyze', 'reason'];
    if (response.error || !required.every(name => names.includes(name)) || capabilities?.semanticDefault !== 'typesafe/jev' || capabilities.configured !== true) throw new Error();
    process.stdout.write(JSON.stringify({ ok: true, protocol: init.protocolVersion, serverVersion: init.serverInfo.version, toolCount: names.length, semanticDefault: capabilities.semanticDefault, note: 'Connectivity only: Jev inference, tenant isolation, GCP security and quality remain separate tests.' }, null, 2) + '\n');
  } catch { process.stderr.write('Remote doctor failed. Check credentials, IAM, endpoint and server capabilities; secret values and responses suppressed.\n'); process.exitCode = 1; }
}
