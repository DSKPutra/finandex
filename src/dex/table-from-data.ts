// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tools without `ui` (search/list tools) return arrays in their model copy; show the first array as a table.
import type { ValueFormat } from '../shared/chart-spec.ts';

export type ColumnFormat = ValueFormat;
const ARRAY_KEYS = ['results', 'rows', 'records', 'sources', 'findings', 'funds', 'items', 'matches', 'splits'];

export function tableFromData(
  data: Record<string, unknown>,
): { columns: { key: string; label: string; format: ValueFormat }[]; rows: Record<string, unknown>[] } | null {
  const key =
    ARRAY_KEYS.find((k) => Array.isArray(data[k]) && (data[k] as unknown[]).length) ??
    Object.keys(data).find(
      (k) => Array.isArray(data[k]) && (data[k] as unknown[]).some((x) => x && typeof x === 'object'),
    );
  if (!key) return null;
  const rows = (data[key] as unknown[])
    .filter((x): x is Record<string, unknown> => !!x && typeof x === 'object')
    .slice(0, 500);
  if (!rows.length) return null;
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))]
    .filter((c) => rows.some((r) => r[c] !== null && typeof r[c] !== 'object'))
    .slice(0, 10);
  return {
    columns: cols.map((c) => ({
      key: c,
      label: c,
      format: rows.every((r) => r[c] === null || r[c] === undefined || typeof r[c] === 'number')
        ? 'num'
        : /date/.test(c)
          ? 'date'
          : 'text',
    })),
    rows,
  };
}
