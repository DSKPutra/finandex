// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tool registry contract (§8.4–8.5): every Dex exposes valid strict tool definitions.
import { describe, expect, it } from 'vitest';
import { DEX_REGISTRY } from '../../src/config/dex-registry.ts';
import { DEX_TOOLS } from '../../server/dex/index.ts';
import { toolDefs } from '../../server/chat/orchestrator.ts';

function walk(schema: unknown, path: string, out: string[]): void {
  if (!schema || typeof schema !== 'object') return;
  const s = schema as Record<string, unknown>;
  if (s.type === 'object' && s.additionalProperties !== false) out.push(`${path}: additionalProperties must be false`);
  for (const k of ['properties', '$defs', 'definitions'])
    if (s[k] && typeof s[k] === 'object')
      for (const [n, v] of Object.entries(s[k] as object)) walk(v, `${path}.${n}`, out);
  for (const k of ['items', 'anyOf', 'oneOf', 'allOf']) {
    const v = s[k];
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}.${k}[${i}]`, out));
    else if (v) walk(v, `${path}.${k}`, out);
  }
}

describe('tool registry', () => {
  it('has tools for all 27 Dex', () => {
    expect(Object.keys(DEX_TOOLS).sort()).toEqual(DEX_REGISTRY.map((d) => d.id).sort());
  });
  for (const dex of DEX_REGISTRY) {
    it(`${dex.id}: unique names, descriptions, labels and strict schemas`, () => {
      const tools = DEX_TOOLS[dex.id];
      const names = tools.map((t) => t.name);
      expect(new Set(names).size).toBe(names.length);
      for (const n of ['dataset_info', 'app_info', 'open_dex', 'data_quality']) expect(names).toContain(n);
      for (const t of tools) {
        expect(t.name).toMatch(/^[a-z][a-z0-9_]{1,63}$/);
        expect(t.description.length).toBeGreaterThan(20);
        expect(t.label.id && t.label.en).toBeTruthy();
      }
      const defs = toolDefs(tools);
      for (const d of defs) {
        expect(d.strict).toBe(true);
        expect(d.input_schema.type).toBe('object');
        const problems: string[] = [];
        walk(d.input_schema, d.name, problems);
        expect(problems).toEqual([]);
        expect(JSON.stringify(d.input_schema)).not.toMatch(/"\$schema"/);
      }
      // prompt caching breakpoint on the last tool only
      expect(defs.filter((d) => d.cache_control).length).toBe(1);
      expect(defs.at(-1)!.cache_control).toEqual({ type: 'ephemeral' });
    });
  }
});
