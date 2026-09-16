#!/usr/bin/env node
/** Build and install ONLY the public client into an empty, offline consumer. Does not publish. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { tmpdir } from 'node:os';
const root = fileURLToPath(new URL('..', import.meta.url));
const client = path.join(root, 'clients/remote-mcp');
const temp = mkdtempSync(path.join(tmpdir(), 'st14-public-pack-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', timeout: 60000, shell: process.platform === 'win32' && command.endsWith('.cmd') });
  if (result.status !== 0) throw new Error('Public client package validation failed.');
  return result.stdout;
}
try {
  const info = JSON.parse(run(npm, ['pack', '--json', '--ignore-scripts', '--pack-destination', temp], client))[0];
  const expected = ['LICENSE', 'README.md', 'bridge.mjs', 'connection.mjs', 'doctor.mjs', 'package.json', 'protocol.mjs'].sort();
  if (JSON.stringify(info.files.map(f => f.path).sort()) !== JSON.stringify(expected)) throw new Error('Unexpected file in public package.');
  const consumer = path.join(temp, 'consumer'); mkdirSync(consumer);
  writeFileSync(path.join(consumer, 'package.json'), '{"name":"public-client-fixture","version":"1.0.0","private":true}');
  run(npm, ['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', path.join(temp, info.filename)], consumer);
  const installed = path.join(consumer, 'node_modules/smart-thinking-remote-client');
  const version = JSON.parse(readFileSync(path.join(installed, 'package.json'), 'utf8')).version;
  if (version !== JSON.parse(readFileSync(path.join(client, 'package.json'), 'utf8')).version) throw new Error('Installed client version mismatch.');
  const help = run(process.execPath, [path.join(installed, 'bridge.mjs'), '--help'], consumer);
  if (!help.startsWith('Usage:')) throw new Error('Installed bridge did not start.');
  process.stdout.write(JSON.stringify({ passed: true, version, files: expected, packageBytes: info.size, offlineInstall: true, networkCalls: 0, publication: false }, null, 2) + '\n');
} finally { rmSync(temp, { recursive: true, force: true }); }
