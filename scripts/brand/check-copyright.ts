// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Gate §11 / §18.12: copyright strings present in all mandatory places + header in every source file.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { COPYRIGHT_EN, COPYRIGHT_ID, CREDIT_ID, CREDIT_EN, PERSONAL_TAGLINE } from '../../src/config/brand.ts';

const ROOT = process.cwd();
const HEADER_TS = '// © 2026 Dea Saka Kurnia Putra. All rights reserved.';
const HEADER_PY = '# © 2026 Dea Saka Kurnia Putra. All rights reserved.';
const HEADER_CSS = '/* © 2026 Dea Saka Kurnia Putra. All rights reserved. */';
const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'coverage',
  'kit',
  'data',
  'android',
  'ios',
  '.git',
  'public',
  'playwright-report',
  'test-results',
]);
const errors: string[] = [];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

for (const f of walk(ROOT)) {
  const ext = extname(f);
  const rel = relative(ROOT, f);
  if (!['.ts', '.tsx', '.mts', '.py', '.css'].includes(ext)) continue;
  if (rel.endsWith('.d.ts')) continue;
  const head = readFileSync(f, 'utf8').split('\n').slice(0, 3).join('\n');
  const want = ext === '.py' ? HEADER_PY : ext === '.css' ? HEADER_CSS : HEADER_TS;
  if (!head.includes(want)) errors.push(`missing source header: ${rel}`);
}

function mustContain(file: string, needles: string[]) {
  const p = join(ROOT, file);
  if (!existsSync(p)) return errors.push(`missing file: ${file}`);
  const txt = readFileSync(p, 'utf8');
  for (const n of needles) if (!txt.includes(n)) errors.push(`${file}: missing "${n}"`);
}

mustContain('LICENSE', [
  'Copyright © 2026 Dea Saka Kurnia Putra. All rights reserved.',
  'without prior written permission',
]);
mustContain('index.html', [
  '<meta name="author" content="Dea Saka Kurnia Putra"',
  '<meta name="copyright" content="© 2026 Dea Saka Kurnia Putra"',
]);
mustContain('README.md', [COPYRIGHT_EN]);
const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as Record<string, unknown>;
if (pkg.author !== 'Dea Saka Kurnia Putra') errors.push('package.json: author');
if (pkg.license !== 'UNLICENSED') errors.push('package.json: license must be UNLICENSED');
if (pkg.private !== true) errors.push('package.json: private must be true');
// Splash, footer, About use the brand constants; make sure the components reference them.
mustContain('src/app/Splash.tsx', ['dskp-mark-on-dark', 'by Dea Saka Kurnia Putra']);
mustContain('src/components/Footer.tsx', ['copyrightLine']);
mustContain('src/pages/About.tsx', ['CREDIT_', 'PERSONAL_TAGLINE', 'dskp-wordmark-on-dark', 'dskp-wordmark-on-light']);
mustContain('src/config/brand.ts', [COPYRIGHT_EN, COPYRIGHT_ID, CREDIT_ID, CREDIT_EN, PERSONAL_TAGLINE]);

if (errors.length) {
  console.error(`check:copyright FAILED (${errors.length})\n` + errors.map((e) => ' - ' + e).join('\n'));
  process.exit(1);
}
console.log('check:copyright OK');
