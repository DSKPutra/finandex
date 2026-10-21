// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tool framework (§8.4–8.5). Tools are deterministic, read-only functions over the DataStore; they return data for the
// model, `ui` artifacts (charts chosen by the tool, not the LLM) and a `method` record for the justification panel.
import { z } from 'zod';
import type { DexEntry, Label } from '../../src/config/dex-registry.ts';
import type { Artifact, ChartSpec, Method } from '../../src/shared/chart-spec.ts';
import { FORMULAS, type FormulaId } from '../../src/shared/analytics/formulas.ts';
import type { Locale } from '../../src/shared/format.ts';
import type { DataStore } from '../data/store.ts';

export interface ManifestDex {
  status: 'live' | 'partial' | 'pending-data';
  as_of: string | null;
  missing_inputs: number[];
}
export interface ToolContext {
  dex: DexEntry;
  store: DataStore;
  locale: Locale;
  manifest: { dex: Record<string, ManifestDex>; build_id?: string } | null;
}

export interface Citation {
  dex: string;
  dataset: string;
  as_of: string | null;
  ref?: { doc_id: string; pasal?: string | null; page?: number | null };
}

export interface ToolOutput {
  /** compact JSON for the model (≤ 20 KB after serialisation) */
  data: Record<string, unknown>;
  ui?: Artifact[];
  method?: Method;
  citations?: Citation[];
}

export interface Tool<I = Record<string, unknown>> {
  name: string;
  /** when to use / when not to use (shown to the model) */
  description: string;
  input: z.ZodType<I>;
  /** friendly status label ("Menghitung return…") */
  label: Label;
  /** produces numbers → MUST return `ui` and `method` (checked by tests/tools) */
  numeric: boolean;
  run(ctx: ToolContext, input: I): Promise<ToolOutput>;
}

/** An error whose message is shown to the model as an instructive `is_error` tool_result. */
export class ToolError extends Error {}

/** Define a tool with inference of the input type. */
export function defineTool<S extends z.ZodType>(t: Omit<Tool<z.infer<S>>, 'input'> & { input: S }): Tool<z.infer<S>> {
  return t as Tool<z.infer<S>>;
}

/** JSON Schema for the Anthropic tool definition (`strict: true` requires additionalProperties: false). */
export function toInputSchema(schema: z.ZodType): Record<string, unknown> {
  const js = z.toJSONSchema(schema, { target: 'draft-2020-12', unrepresentable: 'any' }) as Record<string, unknown>;
  delete js.$schema;
  return js;
}

export const t = (id: string, en: string): Label => ({ id, en });
export const L = (ctx: ToolContext, label: Label) => label[ctx.locale];

export function asOf(ctx: ToolContext): string | null {
  return ctx.manifest?.dex[ctx.dex.id]?.as_of ?? ctx.dex.asOf ?? null;
}

let seq = 0;
export function artifact(
  ctx: ToolContext,
  a: {
    title: string;
    summary: string;
    spec: ChartSpec;
    dataset: string;
    asOf?: string | null;
    tab?: string;
    entity?: string | null;
  },
): Artifact {
  seq = (seq + 1) % 1_000_000;
  return {
    id: `a${Date.now().toString(36)}${seq.toString(36)}`,
    kind: a.spec.type,
    title: a.title,
    summary: a.summary,
    spec: a.spec,
    source: { dex: ctx.dex.id, dataset: a.dataset, as_of: a.asOf ?? asOf(ctx) },
    open_tab: a.tab ? { tab: a.tab, entity: a.entity ?? null } : null,
  };
}

export function method(
  ctx: ToolContext,
  m: {
    tool: string;
    formulas: FormulaId[];
    extraSteps?: { id: string; en: string }[];
    inputs: Record<string, unknown>;
    rows: number;
    period?: { start: string | null; end: string | null } | null;
    dataset: string;
    asOf?: string | null;
    flags?: string[];
  },
): Method {
  return {
    tool: m.tool,
    formula_ids: m.formulas,
    steps: [...m.formulas.map((f) => ({ id: FORMULAS[f].id, en: FORMULAS[f].en })), ...(m.extraSteps ?? [])],
    inputs: m.inputs,
    rows_used: m.rows,
    period: m.period ?? null,
    dataset: m.dataset,
    as_of: m.asOf ?? asOf(ctx),
    flags: m.flags ?? [],
  };
}

/** Largest-Triangle-Three-Buckets downsampling of (x, y) for charts (> 2,000 points). */
export function lttb(
  x: string[],
  ys: (number | null)[][],
  threshold: number,
): { x: string[]; ys: (number | null)[][] } {
  const n = x.length;
  if (n <= threshold || threshold < 3) return { x, ys };
  const y0 = ys[0]!;
  const keep: number[] = [0];
  const every = (n - 2) / (threshold - 2);
  let a = 0;
  for (let i = 0; i < threshold - 2; i++) {
    const start = Math.floor((i + 1) * every) + 1;
    const end = Math.min(Math.floor((i + 2) * every) + 1, n);
    let avgX = 0;
    let avgY = 0;
    let cnt = 0;
    for (let j = start; j < end; j++) {
      const v = y0[j];
      if (v === null || v === undefined) continue;
      avgX += j;
      avgY += v;
      cnt++;
    }
    if (cnt) {
      avgX /= cnt;
      avgY /= cnt;
    }
    const rs = Math.floor(i * every) + 1;
    const re = Math.floor((i + 1) * every) + 1;
    let best = rs;
    let bestArea = -1;
    const ay = y0[a] ?? 0;
    for (let j = rs; j < re; j++) {
      const v = y0[j] ?? ay;
      const area = Math.abs((a - avgX) * (v - ay) - (a - j) * (avgY - ay));
      if (area > bestArea) {
        bestArea = area;
        best = j;
      }
    }
    keep.push(best);
    a = best;
  }
  keep.push(n - 1);
  return { x: keep.map((i) => x[i]!), ys: ys.map((y) => keep.map((i) => y[i] ?? null)) };
}

/** Round for model consumption (keeps 6 significant digits; the UI shows full precision). */
export function r6(x: number | null | undefined): number | null {
  if (x === null || x === undefined || !Number.isFinite(x)) return null;
  return Number(x.toPrecision(6));
}

/** Serialise a tool result for the model, enforcing the ≤ 20 KB budget by trimming large arrays. */
export function modelCopy(data: Record<string, unknown>, limit = 20_000): string {
  let txt = JSON.stringify(data);
  if (txt.length <= limit) return txt;
  const trimmed: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data))
    trimmed[k] = Array.isArray(v) && v.length > 30 ? [...v.slice(0, 30), `… ${v.length - 30} more`] : v;
  txt = JSON.stringify({ ...trimmed, _truncated: true });
  return txt.length <= limit ? txt : txt.slice(0, limit - 20) + '"…truncated"}';
}
