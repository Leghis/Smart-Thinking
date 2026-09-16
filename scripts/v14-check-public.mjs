import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const ignored = new Set(['.git', 'node_modules', '.local', 'reports', 'coverage']);
export async function scanPublic(root) {
  const errors = [];
  async function visit(dir) {
    for (const e of await readdir(dir, { withFileTypes: true })) {
      if (ignored.has(e.name)) continue;
      const file = path.join(dir, e.name), rel = path.relative(root, file).replaceAll(path.sep, '/');
      if (e.isSymbolicLink()) { errors.push(rel + ': symlink'); continue; }
      if (/^(src|workers|infra|private|tooling|dist|build|proofs)($|\/)/.test(rel) || /(^|\/)(\.env(?:\..*)?|.*\.tfstate.*|.*\.(?:tfvars|pem|key|zip|tgz|sqlite|db))$/.test(rel)) { errors.push(rel + ': server, credential or generated material'); continue; }
      if (e.isDirectory()) { await visit(file); continue; }
      const bytes = await readFile(file);
      if (bytes.length > 512000 || bytes.includes(0)) { errors.push(rel + ': oversized/binary public file'); continue; }
      const text = bytes.toString('utf8');
      if (/apikey_[a-f0-9]{20,}_[a-f0-9]{20,}/i.test(text) || /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(text) || /"private_key"\s*:\s*"[^"\s]{20,}/.test(text)) errors.push(rel + ': possible secret');
      if (!rel.startsWith('scripts/') && /api\.typesafe\.ai\/v1\/systemone|class\s+(?:CloudEngine|SemanticDecisions|JevClient)\b/.test(text)) errors.push(rel + ': private implementation');
    }
  }
  await visit(root);
  return errors;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const errors = await scanPublic(fileURLToPath(new URL('../', import.meta.url)));
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log('Public source boundary passed. This scanner is defense in depth, not a secret-scanning guarantee.');
}
