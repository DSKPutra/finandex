// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Helpers for row tables (columnar + dictionary-encoded files of §7.3) used by tabular Dex tools.
import type { ColumnarTableFile } from '../../src/shared/data-contracts.ts';
import { median, quantile, mean } from '../../src/shared/analytics/stats.ts';
import { fold } from '../../src/shared/text.ts';
import type { DataStore } from '../data/store.ts';

export type Row = Record<string, unknown>;
const decoded = new WeakMap<DataStore, Map<string, Promise<Row[]>>>();

/** Load and decode a columnar table once per store. */
export function loadTable(store: DataStore, path: string): Promise<Row[]> {
  let m = decoded.get(store);
  if (!m) decoded.set(store, (m = new Map()));
  let p = m.get(path);
  if (!p) {
    p = store.json<ColumnarTableFile>(path).then((t) =>
      t.rows.map((r) => {
        const o: Row = {};
        t.columns.forEach((c, i) => {
          const v = r[i];
          const d = t.dict[c];
          o[c] = d && typeof v === 'number' ? d[v] : v;
        });
        return o;
      }),
    );
    m.set(path, p);
  }
  return p;
}

export type Stat = 'median' | 'mean' | 'p25' | 'p75' | 'count';

export function stat(values: number[], s: Stat): number | null {
  const v = values.filter((x) => Number.isFinite(x));
  if (s === 'count') return values.length;
  if (!v.length) return null;
  switch (s) {
    case 'median':
      return median(v);
    case 'mean':
      return mean(v);
    case 'p25':
      return quantile(v, 0.25);
    case 'p75':
      return quantile(v, 0.75);
  }
}

export interface Group {
  key: string;
  n: number;
  value: number | null;
}

/** Group rows and compute a statistic of `val` per group (rows with null key skipped). */
export function groupStat(
  rows: Row[],
  key: (r: Row) => string | null | undefined,
  val: (r: Row) => number,
  s: Stat,
): Group[] {
  const g = new Map<string, number[]>();
  for (const r of rows) {
    const k = key(r);
    if (k === null || k === undefined || k === '') continue;
    if (!g.has(k)) g.set(k, []);
    g.get(k)!.push(val(r));
  }
  return [...g.entries()].map(([k, vs]) => ({
    key: k,
    n: s === 'count' ? vs.length : vs.filter((x) => Number.isFinite(x)).length,
    value: stat(vs, s),
  }));
}

/** Groups with a value, largest first (ties by key A→Z). */
export function sortGroups(gs: Group[]): Group[] {
  return gs.filter((g) => g.value !== null).sort((a, b) => b.value! - a.value! || (a.key < b.key ? -1 : 1));
}

/** Equal-width histogram (outliers beyond p1/p99 clipped into the edge bins). */
export function histogram(values: number[], bins = 20): { x0: number; x1: number; count: number }[] {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return [];
  const lo = quantile(v, 0.01);
  const hi = quantile(v, 0.99);
  if (hi <= lo) return [{ x0: lo, x1: hi, count: v.length }];
  const w = (hi - lo) / bins;
  const out = Array.from({ length: bins }, (_, i) => ({ x0: lo + i * w, x1: lo + (i + 1) * w, count: 0 }));
  for (const x of v) out[Math.min(bins - 1, Math.max(0, Math.floor((x - lo) / w)))]!.count++;
  return out;
}

/** Case/accent-insensitive equality or substring test (filters). */
export function matches(v: unknown, q: string | undefined | null, mode: 'eq' | 'includes' = 'eq'): boolean {
  if (q === undefined || q === null || q === '') return true;
  if (v === null || v === undefined) return false;
  const a = fold(String(v));
  const b = fold(q);
  return mode === 'eq' ? a === b : a.includes(b);
}

/** Simple token search over several text fields, scored by matched tokens. */
export function textSearch<T extends Row>(rows: T[], query: string, fields: (keyof T)[], limit: number): T[] {
  const toks = fold(query)
    .split(/[^a-z0-9]+/)
    .filter((x) => x.length > 1);
  if (!toks.length) return rows.slice(0, limit);
  const scored: { r: T; s: number }[] = [];
  for (const r of rows) {
    const hay = fold(fields.map((f) => String(r[f] ?? '')).join(' '));
    let s = 0;
    for (const t of toks) if (hay.includes(t)) s++;
    if (s) scored.push({ r, s });
  }
  return scored
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.r);
}

export const MIN_N = 30;
