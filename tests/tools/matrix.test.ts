// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tool matrix: every registered tool is exercised; outputs honour the §8.8 contract; error paths are ToolErrors.
import { describe, expect, it } from 'vitest';
import { DEX_BY_ID, DEX_REGISTRY, type DexId } from '../../src/config/dex-registry.ts';
import { ArtifactSchema, MethodSchema } from '../../src/shared/chart-spec.ts';
import { DEX_TOOLS, findTool } from '../../server/dex/index.ts';
import { modelCopy, ToolError, type ToolContext } from '../../server/tools/types.ts';
import { fileStore } from '../../scripts/eval/fs-store.ts';
import { matrix as markets } from './matrix/markets.ts';
import { matrix as idmarkets } from './matrix/idmarkets.ts';
import { matrix as people } from './matrix/people.ts';
import { matrix as misc } from './matrix/misc.ts';
import { stockStore } from './matrix/stock-fixture.ts';

const MATRIX = { ...markets, ...idmarkets, ...people, ...misc };
const store = fileStore();
const manifest = await store.json<ToolContext['manifest']>('manifest.json');
const STOCK: DexId[] = ['nasdaqdex', 'snp500dex'];

describe('tool matrix', () => {
  for (const dex of DEX_REGISTRY) {
    const calls = MATRIX[dex.id] ?? [];
    it(`${dex.id}: every tool is covered`, () => {
      const covered = new Set(calls.map((c) => c.tool));
      expect(DEX_TOOLS[dex.id].map((t) => t.name).filter((n) => !covered.has(n))).toEqual([]);
    });
    for (const [locale, s] of [
      ['id', store],
      ['en', store],
    ] as const) {
      it(`${dex.id} (${locale})`, async () => {
        const st = STOCK.includes(dex.id) ? await stockStore() : s;
        const ctx: ToolContext = { dex: DEX_BY_ID[dex.id], store: st, locale, manifest };
        for (const c of calls) {
          const tool = findTool(dex.id, c.tool);
          expect(tool, `${dex.id}.${c.tool}`).toBeDefined();
          const input = tool!.input.parse(c.input);
          if (c.error) {
            await expect(
              tool!.run(ctx, input as never),
              `${c.tool} ${JSON.stringify(c.input)} should fail`,
            ).rejects.toBeInstanceOf(ToolError);
            continue;
          }
          const out = await tool!.run(ctx, input as never).catch((e: unknown) => {
            throw new Error(
              `${dex.id}.${c.tool}(${JSON.stringify(c.input)}): ${e instanceof Error ? e.message : String(e)}`,
            );
          });
          if (tool!.numeric) {
            expect(out.ui?.length ?? 0, `${c.tool} ui`).toBeGreaterThan(0);
            expect(out.method, `${c.tool} method`).toBeDefined();
          }
          for (const a of out.ui ?? []) {
            const r = ArtifactSchema.safeParse(a);
            expect(r.success, `${c.tool} artifact: ${r.success ? '' : JSON.stringify(r.error.issues[0])}`).toBe(true);
          }
          if (out.method) expect(MethodSchema.safeParse(out.method).success, `${c.tool} method valid`).toBe(true);
          const txt = modelCopy(out.data);
          expect(txt.length).toBeLessThanOrEqual(20_000);
          c.check?.(JSON.parse(txt));
        }
      });
    }
  }
});
