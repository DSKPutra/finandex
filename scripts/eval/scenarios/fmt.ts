// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Formatting helpers for mock answers (id-ID, same formatters as the UI) and result accessors.
import { fmtDate, fmtNum, fmtPct } from '../../../src/shared/format.ts';
import type { ToolResult } from '../types.ts';

export const pct = (x: unknown) => fmtPct(typeof x === 'number' ? x : NaN, 'id');
/** a value already in percent units (e.g. 2.18 = 2,18%) */
export const pctUnits = (x: unknown) => fmtPct(typeof x === 'number' ? x / 100 : NaN, 'id');
export const num = (x: unknown, digits = 2) => fmtNum(typeof x === 'number' ? x : NaN, 'id', digits);
/** full precision (for large money values compared with a tight rel_tol) */
export const full = (x: unknown) => fmtNum(typeof x === 'number' ? x : NaN, 'id', 6);
export const date = (x: unknown) => (typeof x === 'string' ? fmtDate(x.slice(0, 10), 'id') : '–');

/** data of the first (or n-th) successful call of a tool */
export function res(r: ToolResult[], tool: string, n = 0): any {

  const hits = r.filter((x) => x.tool === tool);
  const h = hits[n];
  if (!h) throw new Error(`scenario: no result for ${tool}#${n}`);
  return h.data;
}
/** error message of a failed call (is_error) or null */
export function err(r: ToolResult[], tool: string): string | null {
  const h = r.find((x) => x.tool === tool);
  return h && !h.ok ? String(h.data?.error ?? '') : null;
}

export const NOT_ADVICE =
  'Ini bukan rekomendasi investasi dan bukan nasihat keuangan; saya hanya dapat menyajikan data historis.';
export const PENDING = (ds: string) =>
  `Data ${ds} belum tersedia di Finandex (file input belum diunggah), jadi saya tidak dapat menjawab dengan angka. Saya tidak akan menjawab dari ingatan.`;
