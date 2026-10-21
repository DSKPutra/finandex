// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Numeric primitives with numpy/pandas semantics (mirror of kit/reference). Pure functions, no side effects.

/** NaN / ±Infinity / undefined → null (JSON-safe number), like `fnum` in the reference. */
export function fnum(x: number | null | undefined): number | null {
  if (x === null || x === undefined) return null;
  return Number.isFinite(x) ? x : null;
}

/** Keep at most 10 significant digits (drops float artefacts; §4.0). */
export function sig10(x: number): number {
  if (!Number.isFinite(x) || x === 0) return x;
  return Number(x.toPrecision(10));
}

/** numpy.rint: round half to even. */
export function rint(x: number): number {
  const r = Math.round(x);
  if (Math.abs(x - Math.trunc(x)) === 0.5) return 2 * Math.round(x / 2);
  return r;
}

/** numpy/pandas `.round(n)` (half-to-even at the scaled value). */
export function roundN(x: number, n: number): number {
  const f = 10 ** n;
  return rint(x * f) / f;
}

export function sum(xs: ArrayLike<number>): number {
  // Neumaier compensated summation: as accurate as numpy's pairwise sum (well within 1e-9 relative).
  let s = 0;
  let c = 0;
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i]!;
    const t = s + x;
    if (Math.abs(s) >= Math.abs(x)) c += s - t + x;
    else c += x - t + s;
    s = t;
  }
  return s + c;
}

export function mean(xs: ArrayLike<number>): number {
  return xs.length ? sum(xs) / xs.length : NaN;
}

/** Sample variance (ddof=1), two-pass like numpy. */
export function variance(xs: ArrayLike<number>, ddof = 1): number {
  const n = xs.length;
  if (n - ddof <= 0) return NaN;
  const m = mean(xs);
  const d = new Float64Array(n);
  for (let i = 0; i < n; i++) d[i] = (xs[i]! - m) ** 2;
  return sum(d) / (n - ddof);
}

export function std(xs: ArrayLike<number>, ddof = 1): number {
  return Math.sqrt(variance(xs, ddof));
}

export function covariance(a: ArrayLike<number>, b: ArrayLike<number>, ddof = 1): number {
  const n = a.length;
  if (n !== b.length) throw new Error('covariance: length mismatch');
  if (n - ddof <= 0) return NaN;
  const ma = mean(a);
  const mb = mean(b);
  const d = new Float64Array(n);
  for (let i = 0; i < n; i++) d[i] = (a[i]! - ma) * (b[i]! - mb);
  return sum(d) / (n - ddof);
}

/** Pearson correlation like np.corrcoef (clipped to [-1, 1]). */
export function correlation(a: ArrayLike<number>, b: ArrayLike<number>): number {
  const c = covariance(a, b, 1) / Math.sqrt(variance(a, 1) * variance(b, 1));
  if (Number.isNaN(c)) return NaN;
  return Math.max(-1, Math.min(1, c));
}

/** Values without NaN (pandas dropna). */
export function dropNaN(xs: ArrayLike<number>): number[] {
  const out: number[] = [];
  for (let i = 0; i < xs.length; i++) if (!Number.isNaN(xs[i]!)) out.push(xs[i]!);
  return out;
}

/** pandas Series.quantile (linear interpolation), NaN skipped; NaN when empty. */
export function quantile(xs: ArrayLike<number>, q: number): number {
  const v = dropNaN(xs).sort((x, y) => x - y);
  const n = v.length;
  if (!n) return NaN;
  const pos = (n - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const frac = pos - lo;
  return frac === 0 ? v[lo]! : v[lo]! + (v[hi]! - v[lo]!) * frac;
}

export function median(xs: ArrayLike<number>): number {
  return quantile(xs, 0.5);
}

/** `med()` of the reference: median of non-null values, or null when none. */
export function med(xs: ArrayLike<number>): number | null {
  return fnum(median(xs));
}

export function argmax(xs: ArrayLike<number>, from = 0, to = xs.length): number {
  let best = from;
  for (let i = from + 1; i < to; i++) if (xs[i]! > xs[best]!) best = i;
  return best;
}

export function argmin(xs: ArrayLike<number>, from = 0, to = xs.length): number {
  let best = from;
  for (let i = from + 1; i < to; i++) if (xs[i]! < xs[best]!) best = i;
  return best;
}

/** Mean of non-NaN values (np.nanmean); NaN when all NaN. */
export function nanmean(xs: ArrayLike<number>): number {
  return mean(dropNaN(xs));
}

/** pandas value_counts(): counts sorted by count desc; ties keep first-appearance order. */
export function valueCounts<T extends string | number | boolean>(xs: Iterable<T | null | undefined>): [T, number][] {
  const m = new Map<T, number>();
  for (const x of xs) if (x !== null && x !== undefined && !(typeof x === 'number' && Number.isNaN(x))) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

/** n largest by key, ties → first occurrence first (pandas nlargest keep='first'). */
export function nlargest<T>(rows: readonly T[], n: number, key: (r: T) => number): T[] {
  return rows
    .map((r, i) => ({ r, i, k: key(r) }))
    .filter((x) => !Number.isNaN(x.k))
    .sort((a, b) => b.k - a.k || a.i - b.i)
    .slice(0, n)
    .map((x) => x.r);
}

export function nsmallest<T>(rows: readonly T[], n: number, key: (r: T) => number): T[] {
  return rows
    .map((r, i) => ({ r, i, k: key(r) }))
    .filter((x) => !Number.isNaN(x.k))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .slice(0, n)
    .map((x) => x.r);
}

/** Group rows by key preserving first-appearance order of keys. */
export function groupBy<T, K>(rows: Iterable<T>, key: (r: T) => K): Map<K, T[]> {
  const m = new Map<K, T[]>();
  for (const r of rows) {
    const k = key(r);
    const g = m.get(k);
    if (g) g.push(r);
    else m.set(k, [r]);
  }
  return m;
}

/** pandas groupby default: keys sorted ascending. */
export function sortedKeys<K extends string | number>(m: Map<K, unknown>): K[] {
  return [...m.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
