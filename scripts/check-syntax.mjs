import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
async function files(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.local', 'reports'].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Source symlinks are not allowed.');
    if (entry.isDirectory()) result.push(...await files(file));
    else if (entry.name.endsWith('.mjs')) result.push(file);
  }
  return result;
}
const sources = await files(root);
for (const file of sources) {
  const child = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  if (child.status !== 0) process.exit(child.status ?? 1);
}
console.log(`Syntax checked ${sources.length} JavaScript modules; no server code compiled.`);
