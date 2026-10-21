// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// `npm run data:extract` (§3.4): extract every input zip into data/extracted/<zip name without .zip>/ (never a shared folder:
// #26 and #27 both contain history.csv). Third-party tool configs (.claude/) are not extracted (§0.3).
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { extractZip } from './lib/zip.ts';

const ROOT = process.cwd();
const INPUTS = join(ROOT, 'data/inputs');
const OUT = join(ROOT, 'data/extracted');
const force = process.argv.includes('--force');
const skip = (name: string) => /(^|\/)\.claude\//.test(name);

if (!existsSync(INPUTS)) {
  console.log('data:extract — data/inputs/ not found (run data:fetch first)');
  process.exit(0);
}
let total = 0;
for (const f of readdirSync(INPUTS).filter((n) => n.endsWith('.zip')).sort()) {
  const dest = join(OUT, f.slice(0, -4));
  if (existsSync(dest) && !force) continue;
  const n = await extractZip(join(INPUTS, f), dest, skip);
  total += n;
  console.log(`  ${f} → data/extracted/${f.slice(0, -4)}/ (${n} files)`);
}
console.log(`data:extract — ${total} files extracted`);
