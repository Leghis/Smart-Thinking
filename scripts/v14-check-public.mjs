#!/usr/bin/env node
/** Defense in depth for the public repository; not a replacement for a full security review. */
import { spawnSync } from 'node:child_process';
import { readFileSync, lstatSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
const privatePath = /(?:^|\/)(?:\.private|private-server|server-private|backend-private|\.local-secrets)(?:\/|$)|(?:^|\/)src\/(?:cloud|intelligence)\/|(?:^|\/)questions\.ts$|(?:^|\/)Smart-Thinking_V14.*\.(?:zip|pdf)$/i;
const secretPatterns = [
  /apikey_[A-Za-z0-9]{24,}_[A-Za-z0-9]{24,}/,
  /st14_[a-f0-9]{64}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /"type"\s*:\s*"service_account"[\s\S]{0,2000}"private_key"\s*:/,
];
export function inspectPublicFile(name, content) {
  const reasons = [];
  if (privatePath.test(name)) reasons.push('private-server-material');
  if (/\.(?:tfstate|tfvars)(?:\.|$)|(?:^|\/)\.env(?:\.|$)/i.test(name) && !name.endsWith('.example')) reasons.push('environment-or-state-file');
  if (content && !content.includes('\u0000')) {
    if (secretPatterns.some(pattern => pattern.test(content))) reasons.push('credential-pattern');
    if (/^clients\/remote-mcp\/[^/]+\.mjs$/.test(name) && /api\.typesafe\.ai|TYPESAFE_API_KEY|routeQuestions|passageQuestions/.test(content)) reasons.push('provider-or-policy-code-in-client');
  }
  return reasons;
}
export function scanTracked(root) {
  const git = spawnSync('git', ['-C', root, 'ls-files', '-z'], { encoding: 'utf8', maxBuffer: 16000000 });
  if (git.status !== 0) throw new Error('Run the boundary check inside the public Git worktree.');
  const files = git.stdout.split('\0').filter(Boolean), findings = [], skipped = [];
  for (const name of files) {
    const file = path.join(root, name); let stat;
    try { stat = lstatSync(file); } catch { findings.push({ path: name, reasons: ['tracked-file-missing'] }); continue; }
    if (stat.isSymbolicLink()) { if (name.startsWith('clients/remote-mcp/')) findings.push({ path: name, reasons: ['client-symlink-not-allowed'] }); continue; }
    let content = '';
    if (stat.size <= 2000000 && !/\.(?:png|jpe?g|webp|gif|woff2?|ttf|ico)$/i.test(name)) content = readFileSync(file, 'utf8');
    else skipped.push(name);
    const reasons = inspectPublicFile(name, content);
    if (reasons.length) findings.push({ path: name, reasons });
  }
  return { ok: findings.length === 0, trackedFiles: files.length, findings, contentScanSkipped: skipped, note: 'Heuristic credential detection only; values are never printed. No remote visibility or historical-secret audit is implied.' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { const report = scanTracked(fileURLToPath(new URL('..', import.meta.url))); process.stdout.write(JSON.stringify(report, null, 2) + '\n'); if (!report.ok) process.exitCode = 1; }
  catch { process.stderr.write('Public-boundary validation could not run.\n'); process.exitCode = 1; }
}
