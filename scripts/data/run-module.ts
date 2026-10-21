// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Dev helper: build one or more ETL modules and diff their golden output against kit/golden.
//   npx tsx scripts/data/run-module.ts global commerce
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MODULES } from './modules.ts';
import { compareGolden, GOLDEN_ADAPTERS, TIE_TOLERANT } from './lib/compare.ts';
import { cleanFull, ROOT } from './lib/io.ts';
import { missing, type BuildContext } from './lib/module.ts';

const want = process.argv.slice(2);
const ctx: BuildContext = { shared: new Map(), log: (m) => console.log(m) };
let total = 0;
for (const mod of MODULES) {
  const t0 = Date.now();
  if (missing(mod.requires()).length) {
    console.log(`== ${mod.name} pending-data (missing inputs #${mod.inputs.join(', #')})`);
    continue;
  }
  if (want.length && !want.includes(mod.name) && !['global', 'idfin', 'rupiah'].includes(mod.name)) continue;
  const res = await mod.build(ctx).catch((e: unknown) => {
    throw new Error(`${mod.name}: ${(e as Error).stack}`);
  });
  if (want.length && !want.includes(mod.name)) continue;
  console.log(`== ${mod.name} ${res.status} as_of=${res.asOf} (${Date.now() - t0} ms, ${Object.keys(res.files).length} files)`);
  for (const [rel, obj] of Object.entries(res.golden)) {
    const g = join(ROOT, 'kit/golden', rel);
    if (!existsSync(g)) {
      console.log(`  ?? ${rel} (no golden)`);
      continue;
    }
    const actual = JSON.parse(JSON.stringify(cleanFull(obj)));
    let golden = JSON.parse(readFileSync(g, 'utf8'));
    const ad = GOLDEN_ADAPTERS[rel]?.(golden, actual);
    if (ad) {
      golden = ad.golden;
      if (ad.skipped.length) console.log(`  (partial: skipped ${ad.skipped.join('; ')})`);
    }
    const errs = compareGolden(actual, golden, '', [], 50, TIE_TOLERANT[rel] ?? {});
    total += errs.length;
    console.log(`  ${errs.length ? 'DIFF' : 'OK  '} ${rel} ${errs.length || ''}`);
    for (const e of errs.slice(0, 12)) console.log('     ', e);
  }
}
console.log('total diffs', total);
