#!/usr/bin/env node
/** Install the published version, compare its tested archive and run one exact check. */
import assert from 'node:assert/strict';
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const version = JSON.parse(readFileSync('package.json')).version;
const packed = JSON.parse(readFileSync(`.local/npm-pack-${version}.json`))[0];
const registry = JSON.parse(execFileSync('npm', ['view', `smart-thinking-mcp@${version}`, '--json'], {encoding: 'utf8'}));
assert.equal(registry.dist.integrity, packed.integrity);
const temp = mkdtempSync(join(tmpdir(), 'st-registry-'));
try {
  execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', `smart-thinking-mcp@${version}`], {cwd: temp, stdio: 'pipe'});
  const root = join(temp, 'node_modules/smart-thinking-mcp');
  assert.equal(execFileSync(process.execPath, [join(root, 'bin/smart-thinking.mjs'), '--version'], {encoding: 'utf8'}).trim(), version);
  assert.equal(readFileSync(join(root, 'README.md'), 'utf8'), readFileSync('README.md', 'utf8'));
  const {RemoteConnection} = await import(pathToFileURL(join(root, 'clients/remote-mcp/connection.mjs')));
  const client = new RemoteConnection();
  const release = JSON.parse(readFileSync('contracts/release.json'));
  assert.equal((await client.initialize()).serverInfo.version, release.coreVersion);
  assert.equal((await client.tools()).length, release.catalogue.count);
  const caps = await client.call('capabilities', {presentation: 'detailed'});
  const calculation = await client.call('calculate', {expression: '250*10/4', presentation: 'detailed'});
  assert.equal(calculation.value, '625');
  const report = {passed: true, at: new Date().toISOString(), version, integrity: registry.dist.integrity, readmeBytesMatch: true, tools: release.catalogue.count, server: release.coreVersion, build: caps.build, exact: calculation.value};
  writeFileSync(`.local/npm-registry-acceptance-${version}.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} finally {
  rmSync(temp, {recursive: true, force: true});
}
