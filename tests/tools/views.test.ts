// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Every Dex feature tab (§9) is defined, and its default tool calls run cleanly against the built data.
import { describe, expect, it } from 'vitest';
import { DEX_BY_ID, DEX_REGISTRY } from '../../src/config/dex-registry.ts';
import { SUGGESTIONS } from '../../src/config/suggestions.ts';
import { ArtifactSchema } from '../../src/shared/chart-spec.ts';
import { viewsFor } from '../../src/dex/views/index.ts';
import { findTool } from '../../server/dex/index.ts';
import { ToolError, type ToolContext } from '../../server/tools/types.ts';
import { fileStore } from '../../scripts/eval/fs-store.ts';

const store = fileStore();
const manifest = await store.json<ToolContext['manifest']>('manifest.json');

describe('dex views', () => {
  for (const dex of DEX_REGISTRY) {
    it(`${dex.id}: every feature tab has a view whose default calls succeed`, async () => {
      const views = await viewsFor(dex.id);
      const featureTabs = dex.tabs.map((t) => t.id).filter((t) => t !== 'chat' && t !== 'data');
      expect(Object.keys(views).sort()).toEqual([...featureTabs].sort());
      for (const [tab, v] of Object.entries(views)) {
        const vals = Object.fromEntries((v.controls ?? []).map((c) => [c.key, c.default]));
        for (const c of v.controls ?? []) if (c.kind === 'select') expect(c.options.some((o) => o.value === c.default), `${tab}.${c.key} default`).toBe(true);
        const calls = v.calls(vals);
        expect(calls.length, `${tab} calls`).toBeGreaterThan(0);
        for (const call of calls) {
          const tool = findTool(dex.id, call.tool);
          expect(tool, `${dex.id}/${tab}: tool ${call.tool}`).toBeDefined();
          const parsed = tool!.input.safeParse(call.input);
          expect(parsed.success, `${dex.id}/${tab}: ${call.tool} input ${JSON.stringify(call.input)} ${parsed.success ? '' : JSON.stringify(parsed.error.issues[0])}`).toBe(true);
          try {
            const out = await tool!.run({ dex: DEX_BY_ID[dex.id], store, locale: 'id', manifest }, parsed.data as never);
            for (const a of out.ui ?? []) expect(ArtifactSchema.safeParse(a).success).toBe(true);
          } catch (e) {
            expect(e, `${dex.id}/${tab}: ${call.tool} ${e instanceof Error ? e.message : ''}`).toBeInstanceOf(ToolError);
            expect(dex.status, `${dex.id}/${tab}: only pending-data Dex may fail (${e instanceof Error ? e.message : ''})`).toBe('pending-data');
          }
        }
      }
    });
    it(`${dex.id}: ≥ 6 suggested questions in id and en`, () => {
      const s = SUGGESTIONS[dex.id];
      expect(s?.id.length ?? 0).toBeGreaterThanOrEqual(6);
      expect(s?.en.length).toBe(s?.id.length);
    });
  }
});
