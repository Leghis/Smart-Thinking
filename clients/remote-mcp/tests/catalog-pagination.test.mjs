// T01 (dossier équipe 15.0.1) — découverte du catalogue : pagination complète,
// refus net de tout catalogue partiel (doublons, boucles, pages/curseurs mal formés).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { RemoteConnection } from '../connection.mjs';

const ok = (id, value) => new Response(JSON.stringify({ jsonrpc: '2.0', id, result: value }), { headers: { 'content-type': 'application/json' } });
const err = (id) => new Response(JSON.stringify({ jsonrpc: '2.0', id, error: { code: -32000, message: 'rejected' } }), { headers: { 'content-type': 'application/json' } });

async function setup(t, pageFor) {
  const dir = await mkdtemp(path.join(tmpdir(), 'st-catalog-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const tokenFile = path.join(dir, 'token');
  await writeFile(tokenFile, 's'.repeat(64));
  const calls = [];
  const connection = new RemoteConnection({
    url: 'https://service.example.org/mcp',
    tokenFile,
    fetcher: async (url, options) => {
      const body = JSON.parse(options.body);
      calls.push(body);
      const answer = pageFor(body.params?.cursor);
      return answer.error ? err(body.id) : ok(body.id, answer);
    },
  });
  return { connection, calls };
}

test('T01: discovery follows nextCursor across pages and returns the full union', async t => {
  const e = await setup(t, cursor => cursor === undefined
    ? { tools: [{ name: 'calculate' }, { name: 'run_get' }], nextCursor: 'page-2' }
    : { tools: [{ name: 'run_export' }] });
  const tools = await e.connection.tools('full');
  assert.deepEqual(tools.map(x => x.name), ['calculate', 'run_get', 'run_export']);
  assert.equal(e.calls.length, 2);
  assert.equal(e.calls[0].params.cursor, undefined);
  assert.equal(e.calls[1].params.cursor, 'page-2');
});

test('T01: profile filtering applies to the union of all pages', async t => {
  const e = await setup(t, cursor => cursor === undefined
    ? { tools: [{ name: 'calculate' }, { name: 'run_get' }], nextCursor: 'page-2' }
    : { tools: [{ name: 'run_export' }] });
  const tools = await e.connection.tools('audit');
  assert.ok(tools.some(x => x.name === 'run_export'));
  assert.ok(!tools.some(x => x.name === 'calculate'));
});

test('T01: duplicate tools across pages refuse the whole catalogue', async t => {
  const e = await setup(t, cursor => cursor === undefined
    ? { tools: [{ name: 'calculate' }], nextCursor: 'p2' }
    : { tools: [{ name: 'calculate' }] });
  await assert.rejects(e.connection.tools('full'), /duplicate tool/);
});

test('T01: a repeated cursor is refused (loop guard)', async t => {
  let n = 0;
  const e = await setup(t, () => ({ tools: [{ name: 'tool-' + (n += 1) }], nextCursor: 'same' }));
  await assert.rejects(e.connection.tools('full'), /repeated cursor/);
});

test('T01: malformed pages refuse the whole catalogue', async t => {
  const noTools = await setup(t, cursor => cursor === undefined ? { tools: [{ name: 'calculate' }], nextCursor: 'p2' } : { notTools: true });
  await assert.rejects(noTools.connection.tools('full'), /malformed catalogue page/);
  const badTool = await setup(t, () => ({ tools: [{ name: '' }] }));
  await assert.rejects(badTool.connection.tools('full'), /malformed catalogue page/);
});

test('T01: malformed cursors refuse the whole catalogue', async t => {
  const e = await setup(t, () => ({ tools: [{ name: 'calculate' }], nextCursor: 42 }));
  await assert.rejects(e.connection.tools('full'), /malformed cursor/);
  const oversized = await setup(t, () => ({ tools: [{ name: 'calculate' }], nextCursor: 'x'.repeat(4097) }));
  await assert.rejects(oversized.connection.tools('full'), /malformed cursor/);
});

test('T01: an error or timeout on a later page refuses the whole catalogue', async t => {
  const e = await setup(t, cursor => cursor === undefined ? { tools: [{ name: 'calculate' }], nextCursor: 'p2' } : { error: true });
  await assert.rejects(e.connection.tools('full'), /Tool discovery rejected/);
});

test('T01: a single-page catalogue without nextCursor keeps working', async t => {
  const e = await setup(t, () => ({ tools: [{ name: 'calculate' }, { name: 'run_export' }] }));
  const tools = await e.connection.tools('full');
  assert.deepEqual(tools.map(x => x.name), ['calculate', 'run_export']);
  assert.equal(e.calls.length, 1);
});
