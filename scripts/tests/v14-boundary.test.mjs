import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectPublicFile } from '../v14-check-public.mjs';
test('private engine paths and complete confidential archives are rejected', () => {
  for (const name of ['src/intelligence/decisions.ts', 'v14/src/cloud/main.ts', 'src/intelligence/questions.ts', 'private-server/README.md', 'Smart-Thinking_V14_Jev_GCP_Complet.zip']) assert.ok(inspectPublicFile(name, '').length, name);
});
test('credential values are detected but never returned as findings', () => {
  const key = 'apikey_' + 'a'.repeat(32) + '_' + 'b'.repeat(64);
  const result = inspectPublicFile('clients/remote-mcp/local.json', key); assert.deepEqual(result, ['credential-pattern']); assert.equal(JSON.stringify(result).includes(key), false);
});
test('ordinary examples and runtime-generated test credentials are allowed', () => {
  assert.deepEqual(inspectPublicFile('clients/remote-mcp/tests/example.mjs', "'st14_' + 'a'.repeat(64)"), []);
  assert.deepEqual(inspectPublicFile('config/.env.example', 'TOKEN_FILE=/PRIVATE/PATH'), []);
});
test('provider policy code does not belong in public client runtime modules', () => { assert.ok(inspectPublicFile('clients/remote-mcp/private.mjs', 'const endpoint = "https://api.typesafe.ai";').length); });
test('Terraform state and real environment files cannot be committed', () => { for (const name of ['.env', 'infra/prod.tfvars', 'infra/terraform.tfstate.backup']) assert.ok(inspectPublicFile(name, '').length); });
