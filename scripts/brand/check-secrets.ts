// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Secret scan (§13.1): tracked files + the client bundle (dist/) must not contain key patterns. CI additionally runs
// gitleaks; this gate also runs locally without extra binaries.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../..');
const PATTERNS: [string, RegExp][] = [
  ['Anthropic key', /sk-ant-[A-Za-z0-9_-]{20,}/],
  ['GitHub token', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}/],
  ['GitHub fine-grained token', /github_pat_[A-Za-z0-9_]{40,}/],
  ['AWS key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Private key', /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/],
  ['Slack token', /xox[baprs]-[A-Za-z0-9-]{20,}/],
  ['Vercel/Netlify token assignment', /(VERCEL_TOKEN|NETLIFY_AUTH_TOKEN)\s*[=:]\s*['"][A-Za-z0-9_-]{20,}/],
];
const SKIP = /\.(png|jpg|jpeg|pdf|f32|zip|woff2?|ico|jar|keystore)$/i;

const files = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
  .split('\n')
  .filter(Boolean)
  .map((f) => join(ROOT, f));
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) =>
    statSync(join(d, f)).isDirectory() ? (f === 'data' ? [] : walk(join(d, f))) : [join(d, f)],
  );
if (existsSync(join(ROOT, 'dist'))) files.push(...walk(join(ROOT, 'dist')));

const hits: string[] = [];
for (const f of files) {
  if (SKIP.test(f) || !existsSync(f) || statSync(f).size > 20e6) continue;
  const txt = readFileSync(f, 'utf8');
  for (const [name, re] of PATTERNS) if (re.test(txt)) hits.push(`${f.slice(ROOT.length + 1)}: ${name}`);
}
if (hits.length) {
  console.error(`check:secrets FAILED:\n  ${hits.join('\n  ')}`);
  process.exit(1);
}
console.log(`check:secrets OK (${files.length} files scanned)`);
