// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tiny helpers for per-entity time series assembled from row-oriented CSVs.
import type { CalDate } from '../../../src/shared/dates.ts';

export interface OHLCV {
  d: CalDate[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
}

export function emptyOHLCV(): OHLCV {
  return { d: [], o: [], h: [], l: [], c: [], v: [] };
}

/** Stable sort of parallel arrays by date (pandas lexsort on [entity, date] is stable). */
export function sortByDate<T extends { d: CalDate[] }>(s: T): T {
  const idx = s.d.map((_, i) => i).sort((a, b) => (s.d[a]! < s.d[b]! ? -1 : s.d[a]! > s.d[b]! ? 1 : a - b));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s)) out[k] = Array.isArray(v) && v.length === s.d.length ? idx.map((i) => (v as unknown[])[i]) : v;
  return out as T;
}

/** Keep elements where mask[i] is false. */
export function dropMask<T>(arr: readonly T[], mask: readonly boolean[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < arr.length; i++) if (!mask[i]) out.push(arr[i]!);
  return out;
}

export function pick<T>(arr: readonly T[], keep: readonly boolean[]): T[] {
  const out: T[] = [];
  for (let i = 0; i < arr.length; i++) if (keep[i]) out.push(arr[i]!);
  return out;
}

/** LTTB-free simple downsample: keep every k-th point + the last (for small UI previews such as sparklines). */
export function decimate<T>(arr: readonly T[], max: number): T[] {
  if (arr.length <= max) return [...arr];
  const step = arr.length / max;
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(arr[Math.floor(i * step)]!);
  out[out.length - 1] = arr[arr.length - 1]!;
  return out;
}

/**
 * Columnar table with dictionary encoding for repetitive string columns (§7.3):
 * { columns: [...], dict: { col: [values] }, rows: [[...]] } — a dict-encoded cell holds the index into dict[col].
 */
export interface ColumnarTable {
  columns: string[];
  dict: Record<string, (string | null)[]>;
  rows: unknown[][];
}

export function columnar(rows: Record<string, unknown>[], columns: string[], dictCols: string[] = []): ColumnarTable {
  const dict: Record<string, (string | null)[]> = {};
  const maps: Record<string, Map<string | null, number>> = {};
  for (const c of dictCols) {
    dict[c] = [];
    maps[c] = new Map();
  }
  const out = rows.map((r) =>
    columns.map((c) => {
      const v = r[c] ?? null;
      const m = maps[c];
      if (!m) return v;
      const key = v === null ? null : String(v);
      let k = m.get(key);
      if (k === undefined) {
        k = dict[c]!.length;
        dict[c]!.push(key);
        m.set(key, k);
      }
      return k;
    }),
  );
  return { columns, dict, rows: out };
}

/** Infer pandas-like numeric columns (all non-NA values parse as numbers). */
export function numericColumns(rows: Record<string, string>[], cols: string[], isNA: (v: string | undefined) => boolean): Set<string> {
  const out = new Set<string>();
  for (const c of cols) {
    let ok = true;
    let any = false;
    for (const r of rows) {
      const v = r[c];
      if (isNA(v)) continue;
      any = true;
      if (Number.isNaN(Number(v))) {
        ok = false;
        break;
      }
    }
    if (ok && any) out.add(c);
  }
  return out;
}

/** Canonical row key with pandas value semantics (numeric columns compared as numbers, NA == NA). */
export function rowKey(r: Record<string, string>, cols: string[], numeric: Set<string>, isNA: (v: string | undefined) => boolean): string {
  return cols.map((c) => (isNA(r[c]) ? '\u0000' : numeric.has(c) ? String(Number(r[c])) : r[c])).join('\u0001');
}

/**
 * Compact price-series file (§7.3): close (and adj close / volume) for the full history; open/high/low only for the
 * trailing 2 years (candlesticks are only drawn for periods ≤ 2 years, §8.8). `ohlc_from` = index into `d` where o/h/l start.
 * High/low are sanitised for display: high = max(o,h,l,c), low = min(o,h,l,c) (§4.1).
 */
export function seriesDoc(
  id: string,
  d: string[],
  s: { o: number[]; h: number[]; l: number[]; c: number[]; ac?: number[]; v?: number[]; div?: number[]; split?: number[] },
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  const n = d.length;
  const L = d[n - 1]!;
  const [y, m, dd] = L.split('-').map(Number) as [number, number, number];
  const cutoff = `${y - 2}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  let from = d.findIndex((x) => x >= cutoff);
  if (from < 0) from = n;
  const o: (number | null)[] = [];
  const h: (number | null)[] = [];
  const l: (number | null)[] = [];
  for (let i = from; i < n; i++) {
    const c = s.c[i]!;
    const oo = Number.isNaN(s.o[i]!) ? c : s.o[i]!;
    const hh = Number.isNaN(s.h[i]!) ? Math.max(oo, c) : s.h[i]!;
    const ll = Number.isNaN(s.l[i]!) ? Math.min(oo, c) : s.l[i]!;
    o.push(Number.isNaN(s.o[i]!) ? null : s.o[i]!);
    h.push(Math.max(oo, hh, ll, c));
    l.push(Math.min(oo, hh, ll, c));
  }
  const fields = ['d', 'c', ...(s.ac ? ['ac'] : []), ...(s.v ? ['v'] : []), ...(s.div ? ['div', 'split'] : []), 'o', 'h', 'l'];
  const out: Record<string, unknown> = { id, as_of: L, fields, ohlc_from: from, d, c: s.c };
  if (s.ac) out.ac = s.ac;
  if (s.v) out.v = s.v.map((x) => (x > 0 ? x : null));
  if (s.div) {
    // sparse: only non-zero dividend / split events
    out.div = s.div.map((x, i) => (x > 0 ? [i, x] : null)).filter(Boolean);
    out.split = (s.split ?? []).map((x, i) => (x > 0 ? [i, x] : null)).filter(Boolean);
  }
  out.o = o;
  out.h = h;
  out.l = l;
  return { ...out, ...extra };
}
