// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Run every tool call scripted in the mock-eval scenarios directly and check the output contract (§8.8):
// numeric tools return zod-valid `ui` and `method`; outputs fit the 20 KB model budget; no forbidden fields leak.
import { describe, expect, it } from 'vitest';
import { DEX_BY_ID, isDexId } from '../../src/config/dex-registry.ts';
import { ArtifactSchema, MethodSchema } from '../../src/shared/chart-spec.ts';
import { FORBIDDEN_SOCIAL_KEYS } from '../../src/shared/data-contracts.ts';
import { findTool } from '../../server/dex/index.ts';
import { modelCopy, ToolError, type ToolContext } from '../../server/tools/types.ts';
import { fileStore } from '../../scripts/eval/fs-store.ts';
import { SCENARIOS } from '../../scripts/eval/scenarios/index.ts';

const store = fileStore();
const manifest = await store.json<ToolContext['manifest']>('manifest.json');

describe('scenario tool calls', () => {
  for (const [id, sc] of Object.entries(SCENARIOS)) {
    const dex = id.replace(/-\d+$/, '');
    if (!isDexId(dex)) continue;
    const calls = sc.steps.flatMap((s) => (typeof s === 'function' ? [] : s));
    if (!calls.length) continue;
    it(`${id}`, async () => {
      for (const c of calls) {
        const tool = findTool(dex, c.tool);
        expect(tool, `${c.tool} registered for ${dex}`).toBeDefined();
        const input = tool!.input.parse(c.input);
        const ctx: ToolContext = { dex: DEX_BY_ID[dex], store, locale: 'id', manifest };
        try {
          const out = await tool!.run(ctx, input as never);
          if (tool!.numeric) {
            expect(out.ui?.length, `${c.tool} ui`).toBeGreaterThan(0);
            expect(out.method, `${c.tool} method`).toBeDefined();
          }
          for (const a of out.ui ?? [])
            expect(ArtifactSchema.safeParse(a).success, `${c.tool} artifact valid`).toBe(true);
          if (out.method) expect(MethodSchema.safeParse(out.method).success, `${c.tool} method valid`).toBe(true);
          const txt = modelCopy(out.data);
          expect(txt.length).toBeLessThanOrEqual(20_000);
          for (const k of FORBIDDEN_SOCIAL_KEYS) expect(txt).not.toContain(`"${k}":`);
          expect(txt).not.toMatch(/cot_rationale|evidence_span/);
        } catch (e) {
          // pending-data Dex answer with an instructive error
          expect(e).toBeInstanceOf(ToolError);
          expect(sc.pendingData, `${id}: only pending-data scenarios may error`).toBeTruthy();
        }
      }
    });
  }
});
