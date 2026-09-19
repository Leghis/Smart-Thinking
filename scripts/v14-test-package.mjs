import { mkdtemp, readFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const root = fileURLToPath(new URL('../', import.meta.url));
const temp = await mkdtemp(path.join(tmpdir(), 'st14-public-pack-'));
function cmd(exe, args, cwd) {
  const result = spawnSync(exe, args, { cwd, encoding: 'utf8', timeout: 45000, env: { ...process.env, npm_config_offline: 'true', npm_config_audit: 'false', npm_config_fund: 'false', npm_config_cache: path.join(temp, 'cache') } });
  if (result.status !== 0) throw new Error(`Packaging command failed: ${exe}; ${result.stderr}`);
  return result.stdout;
}
try {
  const packed = JSON.parse(cmd('npm', ['pack', '--ignore-scripts', '--json', '--pack-destination', temp], root))[0];
  const expected = ['LICENSE', 'README.md', 'bin/smart-thinking.mjs', 'clients/remote-mcp/bridge.mjs', 'clients/remote-mcp/connection.mjs', 'clients/remote-mcp/doctor.mjs', 'clients/remote-mcp/protocol.mjs', 'contracts/v14.json', 'contracts/v16.json', 'package.json'].sort();
  assert.deepEqual(packed.files.map(f => f.path).sort(), expected);
  const consumer = path.join(temp, 'consumer'); await mkdir(consumer);
  cmd('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', path.join(temp, packed.filename)], consumer);
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const bin = path.join(consumer, 'node_modules/smart-thinking-mcp/bin/smart-thinking.mjs');
  assert.equal(cmd(process.execPath, [bin, '--version'], consumer).trim(), pkg.version);
  assert.match(cmd(process.execPath, ['--input-type=module', '-e', 'import {RemoteConnection} from "smart-thinking-mcp"; console.log(typeof RemoteConnection)'], consumer), /function/);
  console.log(`Offline consumer package passed: ${expected.length} public files, ${pkg.version}. No publish or network.`);
} finally { await rm(temp, { recursive: true, force: true }); }
