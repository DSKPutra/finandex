// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Small artifact helpers shared by Dex tool modules.
import type { ValueFormat } from '../../src/shared/chart-spec.ts';
import type { FormulaId } from '../../src/shared/analytics/formulas.ts';
import { artifact, method, type ToolContext, type ToolOutput } from '../tools/types.ts';

export function barOutput(
  ctx: ToolContext,
  o: {
    tool: string;
    title: string;
    groups: { key: string; value: number | null; n?: number }[];
    format: ValueFormat;
    dataset: string;
    tab?: string;
    formulas: FormulaId[];
    inputs: Record<string, unknown>;
    rows: number;
    flags?: string[];
    data?: Record<string, unknown>;
    horizontal?: boolean;
    summary?: string;
    asOf?: string | null;
  },
): ToolOutput {
  const gs = o.groups.slice(0, 30);
  return {
    data: {
      ...(o.data ?? {}),
      results: gs.map((g) => ({ key: g.key, value: g.value, ...(g.n !== undefined ? { n: g.n } : {}) })),
      flags: o.flags ?? [],
    },
    ui: [
      artifact(ctx, {
        title: o.title,
        summary:
          o.summary ??
          gs
            .slice(0, 3)
            .map((g) => `${g.key}: ${g.value === null ? '–' : Number(g.value.toPrecision(6))}`)
            .join('; '),
        dataset: o.dataset,
        ...(o.asOf !== undefined ? { asOf: o.asOf } : {}),
        ...(o.tab ? { tab: o.tab } : {}),
        spec: {
          type: 'bar',
          categories: gs.map((g) => g.key),
          series: [{ name: o.title, values: gs.map((g) => g.value) }],
          horizontal: o.horizontal ?? true,
          value_format: o.format,
        },
      }),
    ],
    method: method(ctx, {
      tool: o.tool,
      formulas: o.formulas,
      inputs: o.inputs,
      rows: o.rows,
      dataset: o.dataset,
      flags: o.flags ?? [],
      ...(o.asOf !== undefined ? { asOf: o.asOf } : {}),
    }),
  };
}

export function tableOutput(
  ctx: ToolContext,
  o: {
    tool: string;
    title: string;
    columns: { key: string; label: string; format: ValueFormat }[];
    rows: Record<string, unknown>[];
    dataset: string;
    tab?: string;
    formulas: FormulaId[];
    inputs: Record<string, unknown>;
    rowsUsed: number;
    flags?: string[];
    data?: Record<string, unknown>;
    summary?: string;
    asOf?: string | null;
  },
): ToolOutput {
  return {
    data: { ...(o.data ?? {}), rows: o.rows.slice(0, 50), flags: o.flags ?? [] },
    ui: [
      artifact(ctx, {
        title: o.title,
        summary: o.summary ?? o.title,
        dataset: o.dataset,
        ...(o.asOf !== undefined ? { asOf: o.asOf } : {}),
        ...(o.tab ? { tab: o.tab } : {}),
        spec: { type: 'table', columns: o.columns, rows: o.rows.slice(0, 500) },
      }),
    ],
    method: method(ctx, {
      tool: o.tool,
      formulas: o.formulas,
      inputs: o.inputs,
      rows: o.rowsUsed,
      dataset: o.dataset,
      flags: o.flags ?? [],
      ...(o.asOf !== undefined ? { asOf: o.asOf } : {}),
    }),
  };
}

export function infoCard(
  ctx: ToolContext,
  title: string,
  body: string,
  dataset: string,
  tone: 'info' | 'warning' | 'pending' = 'info',
  items?: string[],
) {
  return artifact(ctx, {
    title,
    summary: body,
    dataset,
    spec: { type: 'card', body, tone, link: null, ...(items ? { items } : {}) },
  });
}
