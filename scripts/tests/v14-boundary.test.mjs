import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { scanPublic } from '../v14-check-public.mjs';
async function fixture(t, file, content = '') { const root = await mkdtemp(path.join(tmpdir(), 'st-boundary-')); t.after(() => rm(root, { recursive: true, force: true })); await mkdir(path.dirname(path.join(root, file)), { recursive: true }); await writeFile(path.join(root, file), content); return root; }
for (const file of ['src/cloud/main.ts', 'workers/worker.py', 'infra/gcp/main.tf', '.env', 'secrets/prod.tfvars', 'delivery.zip', 'server.sqlite']) test('boundary rejects ' + file, async t => { assert.ok((await scanPublic(await fixture(t, file))).length); });
test('boundary rejects synthetic credential and private key data', async t => { const secret = ['api', 'key_', 'a'.repeat(24), '_', 'b'.repeat(32)].join(''); assert.ok((await scanPublic(await fixture(t, 'leak.txt', secret))).length); });
test('boundary rejects private implementation', async t => { assert.ok((await scanPublic(await fixture(t, 'client.mjs', 'class ' + 'JevClient {}'))).length); });
test('boundary rejects symlinks', async t => { const root = await fixture(t, 'README.md', 'public'); await symlink('README.md', path.join(root, 'link')); assert.ok((await scanPublic(root)).length); });
test('boundary accepts ordinary client and documentation', async t => { assert.deepEqual(await scanPublic(await fixture(t, 'README.md', 'Keep provider credentials on the server.')), []); });
