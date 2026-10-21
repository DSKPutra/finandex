// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Dev explorer: run one tool against public/data and print its model copy, artifacts and method.
// Usage: npx tsx scripts/eval/try-tool.ts <dexId> <tool> '<json input>' [--ui]
import { DEX_BY_ID, isDexId } from '../../src/config/dex-registry.ts';
import { findTool, toolsFor } from '../../server/dex/index.ts';
import { modelCopy, ToolError, type ToolContext } from '../../server/tools/types.ts';
import { fileStore } from './fs-store.ts';

const [dex, name, json = '{}'] = process.argv.slice(2);
if (!dex || !isDexId(dex)) throw new Error(`usage: try-tool <dexId> <tool> '<json>'`);
if (!name) {
  console.log(
    toolsFor(dex)
      .map((t) => t.name)
      .join('\n'),
  );
  process.exit(0);
}
const tool = findTool(dex, name);
if (!tool)
  throw new Error(
    `unknown tool ${name}; available: ${toolsFor(dex)
      .map((t) => t.name)
      .join(', ')}`,
  );
const store = fileStore();
const manifest = await store.json<ToolContext['manifest']>('manifest.json');
const input = tool.input.parse(JSON.parse(json));
try {
  const out = await tool.run({ dex: DEX_BY_ID[dex], store, locale: 'id', manifest }, input as never);
  console.log(JSON.stringify(JSON.parse(modelCopy(out.data)), null, 1));
  if (process.argv.includes('--ui'))
    console.log(JSON.stringify({ ui: out.ui, method: out.method, citations: out.citations }, null, 1).slice(0, 6000));
  else
    console.log(
      `-- ui: ${(out.ui ?? []).map((a) => a.kind).join(',') || 'none'} · method: ${out.method ? out.method.formula_ids.join(',') || '(no formulas)' : 'none'}`,
    );
} catch (e) {
  if (e instanceof ToolError) console.log(`is_error: ${e.message}`);
  else throw e;
}
