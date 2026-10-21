// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Golden test (§18.3): every value in kit/golden/** is reproduced by the TypeScript ETL/analytics.
// Modules whose inputs are not available are reported as skipped (pending-data) — never silently passed.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { MODULES } from '../../scripts/data/modules.ts';
import { compareGolden, GOLDEN_ADAPTERS, TIE_TOLERANT } from '../../scripts/data/lib/compare.ts';
import { cleanFull } from '../../scripts/data/lib/io.ts';
import { missing, type BuildContext, type ModuleResult } from '../../scripts/data/lib/module.ts';

const ROOT = process.cwd();
const GOLDEN = join(ROOT, 'kit/golden');
const produced = new Map<string, unknown>();
const pending: string[] = [];
const partial: string[] = [];

beforeAll(async () => {
  const ctx: BuildContext = { shared: new Map(), log: () => {} };
  for (const mod of MODULES) {
    if (missing(mod.requires()).length) {
      pending.push(mod.name);
      continue;
    }
    const res: ModuleResult = await mod.build(ctx);
    for (const [rel, obj] of Object.entries(res.golden)) produced.set(rel, JSON.parse(JSON.stringify(cleanFull(obj))));
  }
}, 900_000);

const goldenFiles: string[] = [];
for (const dir of readdirSync(GOLDEN)) {
  const p = join(GOLDEN, dir);
  if (dir.endsWith('.json')) continue; // chatbot_eval.json is checked by eval-chat
  for (const f of readdirSync(p)) goldenFiles.push(`${dir}/${f}`);
}

describe('golden fixtures', () => {
  it.each(goldenFiles)('%s', (rel) => {
    const actual = produced.get(rel);
    if (actual === undefined) {
      // only allowed when the module's inputs are missing
      const owner = rel.split('/')[0]!;
      const map: Record<string, string> = { nasdaq: 'nasdaq', sp500: 'sp500' };
      expect(pending, `${rel} not produced although its inputs exist`).toContain(map[owner] ?? owner);
      return;
    }
    let golden = JSON.parse(readFileSync(join(GOLDEN, rel), 'utf8')) as unknown;
    const ad = GOLDEN_ADAPTERS[rel]?.(golden, actual);
    if (ad) {
      golden = ad.golden;
      if (ad.skipped.length) partial.push(`${rel}: ${ad.skipped.join('; ')}`);
    }
    const errs = compareGolden(actual, golden, '', [], 50, TIE_TOLERANT[rel] ?? {});
    expect(errs).toEqual([]);
  });

  it('reports coverage', () => {
    const total = goldenFiles.length;
    const ok = goldenFiles.filter((f) => produced.has(f)).length;
    console.log(`golden: ${ok}/${total} files compared · pending-data modules: ${pending.join(', ') || 'none'}`);
    for (const p of partial) console.log(`golden partial: ${p}`);
    expect(existsSync(GOLDEN)).toBe(true);
  });
});
