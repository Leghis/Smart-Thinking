// V16 — profil `code` (superviseur logiciel) et empreinte du catalogue.
// V16-01 : le profil de code expose Jev et ses dépendances de dossier.
// Le test de régression fourni par le kit de référence est ici étendu : la façade
// code_* du superviseur doit être visible AVEC les outils exacts, et la fermeture
// de dépendances est vérifiée comme pour les autres profils.
import test from 'node:test';
import assert from 'node:assert/strict';
import { selectTools, TOOL_PROFILES, catalogueFingerprint, verifyCatalogue, API_PROFILE, VERSION } from '../protocol.mjs';

const JEVIAN = ['analyze', 'plan', 'critique', 'next_step'];
const DOSSIER_DEPENDENCIES = ['run_create', 'run_get', 'artifact_import', 'artifact_get', 'budget_status', 'operation_get'];
const EXACT = ['calculate', 'calculate_batch', 'finite_compute', 'solve_logic', 'solve_math', 'check'];
const FACADE = ['code_bind', 'code_context', 'code_review', 'code_check_start', 'code_job_get', 'code_job_cancel', 'code_checkpoint', 'code_gate'];

test('code profile exposes Jev judgment tools and their dossier dependencies', () => {
  for (const name of [...JEVIAN, ...DOSSIER_DEPENDENCIES])
    assert.ok(TOOL_PROFILES.code.includes(name), `missing ${name}`);
});
test('code profile exposes the V16 supervision facade', () => {
  for (const name of FACADE)
    assert.ok(TOOL_PROFILES.code.includes(name), `missing ${name}`);
});
test('code profile keeps every exact capability from the previous profile', () => {
  for (const name of EXACT)
    assert.ok(TOOL_PROFILES.code.includes(name), `missing exact tool ${name}`);
});
test('code profile never advertises absent server capabilities', () => {
  assert.deepEqual(selectTools([{ name: 'calculate' }], 'code').map(x => x.name), ['calculate']);
  assert.deepEqual(selectTools([{ name: 'code_gate' }], 'code').map(x => x.name), ['code_gate']);
});
test('code profile is closed over the dossier tools it exposes', () => {
  const tools = TOOL_PROFILES.code;
  assert.ok(tools.includes('verify') && (tools.includes('claim') || tools.includes('check')));
  assert.ok(tools.includes('run_finalize') && tools.includes('audit') && tools.includes('requirement_add'));
});
test('wire identity is the V16 profile', () => {
  assert.equal(API_PROFILE, 'smart-thinking-mcp/16.0');
  assert.equal(VERSION, '16.0.0');
});

// L'empreinte du catalogue est la même des deux côtés : vecteur de test partagé avec
// le moteur (tests/v16-catalogue.test.mjs). Le client refuse un catalogue incomplet.
test('catalogue fingerprint matches the shared test vector', () => {
  const tools = ['gamma', 'alpha', 'beta'].map(name => ({ name }));
  assert.equal(catalogueFingerprint(tools), 'a3e185260009ab5be7bb16f3bed296075f27322fb87d99209710a28ef3e8d99e');
});
test('verifyCatalogue accepts the announced catalogue and refuses any drift', () => {
  const tools = [{ name: 'capabilities' }, { name: 'calculate' }];
  const announced = { count: 2, fingerprint: catalogueFingerprint(tools) };
  assert.deepEqual(verifyCatalogue(announced, tools), announced);
  assert.throws(() => verifyCatalogue({ ...announced, count: 3 }, tools), /announced 3/);
  assert.throws(() => verifyCatalogue({ ...announced, fingerprint: 'f'.repeat(64) }, tools), /fingerprint mismatch/);
  assert.throws(() => verifyCatalogue({ count: 2 }, tools), /did not publish/);
  assert.throws(() => catalogueFingerprint([{ name: 'a' }, { name: 'a' }]), /Duplicate/);
});
