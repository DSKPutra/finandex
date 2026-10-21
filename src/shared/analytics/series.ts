// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Time-series metrics — TypeScript port of kit/reference/finandex_reference.py (identical semantics).
// Inputs: sorted calendar dates + finite prices of the same length.

import { addYears, anchorDate, daysBetween, idxOnOrBefore, PERIODS, year, type CalDate } from '../dates.ts';
import { argmax, argmin, correlation, covariance, fnum, mean, std, variance } from './stats.ts';

export const MIN_RET_VOL = 60;
export const MIN_RET_BETA = 120;
export const SPIKE_UP = 1.0;
export const SPIKE_DN = -0.5;
export const SPIKE_RT: readonly [number, number] = [0.67, 1.5];
export const EXTREME_UP = 1.0;
export const EXTREME_DN = -0.5;
export const LOW_PRECISION_REL_TICK = 0.005;

export type Num = number | null;
export type Metrics = Record<string, unknown>;

export interface Series {
  d: CalDate[];
  p: number[];
}

/** Period returns & CAGR (§4.0). */
export function periodMetrics(dates: readonly CalDate[], px: readonly number[]): Record<string, Num> {
  const out: Record<string, Num> = {};
  const n = px.length;
  if (n === 0) {
    for (const p of PERIODS) out[`ret_${p}`] = null;
    return out;
  }
  const L = dates[n - 1]!;
  const last = px[n - 1]!;
  for (const p of PERIODS) {
    if (p === '1D') {
      out.ret_1D = n >= 2 ? fnum(last / px[n - 2]! - 1) : null;
      continue;
    }
    if (p === 'MAX') {
      out.ret_MAX = n >= 2 ? fnum(last / px[0]! - 1) : null;
      const days = daysBetween(dates[0]!, L);
      out.cagr_MAX = days >= 365 && px[0]! > 0 && last > 0 ? fnum((last / px[0]!) ** (365.25 / days) - 1) : null;
      continue;
    }
    const a = anchorDate(L, p);
    const hasCagr = p === '1Y' || p === '3Y' || p === '5Y' || p === '10Y';
    if (a < dates[0]!) {
      out[`ret_${p}`] = null;
      if (hasCagr) out[`cagr_${p}`] = null;
      continue;
    }
    const i = idxOnOrBefore(dates, a);
    out[`ret_${p}`] = fnum(last / px[i]! - 1);
    if (hasCagr) {
      const days = daysBetween(dates[i]!, L);
      out[`cagr_${p}`] = px[i]! > 0 && last > 0 && days > 0 ? fnum((last / px[i]!) ** (365.25 / days) - 1) : null;
    }
  }
  return out;
}

/** Simple daily returns r[i] = p[i+1]/p[i] - 1, dated at dates[i+1]. */
export function dailyReturns(px: readonly number[]): number[] {
  const r: number[] = new Array(Math.max(0, px.length - 1));
  for (let i = 1; i < px.length; i++) r[i - 1] = px[i]! / px[i - 1]! - 1;
  return r;
}

/** Annualised volatility over the trailing year (§4.0): sample std of returns dated > L-1Y × √ppy; ≥ 60 returns. */
export function vol1Y(dates: readonly CalDate[], px: readonly number[], ppy: number): Num {
  if (px.length < 2) return null;
  const a = anchorDate(dates[dates.length - 1]!, '1Y');
  const w: number[] = [];
  for (let i = 1; i < px.length; i++) if (dates[i]! > a) w.push(px[i]! / px[i - 1]! - 1);
  if (w.length < MIN_RET_VOL) return null;
  return fnum(std(w, 1) * Math.sqrt(ppy));
}

export interface Drawdown {
  mdd: Num;
  mdd_peak_date: CalDate | null;
  mdd_trough_date: CalDate | null;
  mdd_recovery_date: CalDate | null;
}

export function maxDrawdown(dates: readonly CalDate[], px: readonly number[]): Drawdown {
  const none: Drawdown = { mdd: null, mdd_peak_date: null, mdd_trough_date: null, mdd_recovery_date: null };
  if (px.length < 2) return none;
  let peak = -Infinity;
  let t = 0;
  let worst = Infinity;
  for (let i = 0; i < px.length; i++) {
    if (px[i]! > peak) peak = px[i]!;
    const dd = px[i]! / peak - 1;
    if (dd < worst) {
      worst = dd;
      t = i;
    }
  }
  if (worst >= 0) return { mdd: 0, mdd_peak_date: null, mdd_trough_date: null, mdd_recovery_date: null };
  const p = argmax(px, 0, t + 1);
  let rec = -1;
  for (let j = t; j < px.length; j++)
    if (px[j]! >= px[p]!) {
      rec = j;
      break;
    }
  return {
    mdd: fnum(worst),
    mdd_peak_date: dates[p]!,
    mdd_trough_date: dates[t]!,
    mdd_recovery_date: rec >= 0 ? dates[rec]! : null,
  };
}

/** Top-N non-overlapping drawdown episodes (peak → trough → recovery), deepest first. */
export function drawdownEpisodes(dates: readonly CalDate[], px: readonly number[], topN = 5): Drawdown[] {
  const eps: Drawdown[] = [];
  let i = 0;
  const n = px.length;
  while (i < n) {
    // find a peak followed by a decline
    let pk = i;
    while (pk + 1 < n && px[pk + 1]! >= px[pk]!) pk++;
    if (pk + 1 >= n) break;
    let tr = pk;
    let j = pk + 1;
    while (j < n && px[j]! < px[pk]!) {
      if (px[j]! < px[tr]!) tr = j;
      j++;
    }
    eps.push({
      mdd: fnum(px[tr]! / px[pk]! - 1),
      mdd_peak_date: dates[pk]!,
      mdd_trough_date: dates[tr]!,
      mdd_recovery_date: j < n ? dates[j]! : null,
    });
    i = j < n ? j : n;
  }
  return eps.sort((a, b) => (a.mdd ?? 0) - (b.mdd ?? 0)).slice(0, topN);
}

/** 52-week (trailing 1Y) close high/low with dates. */
export function windowHiLo(
  dates: readonly CalDate[],
  px: readonly number[],
): [Num, CalDate | null, Num, CalDate | null] {
  const a = anchorDate(dates[dates.length - 1]!, '1Y');
  let s = -1;
  for (let i = 0; i < dates.length; i++)
    if (dates[i]! > a) {
      s = i;
      break;
    }
  if (s < 0) return [null, null, null, null];
  const ih = argmax(px, s);
  const il = argmin(px, s);
  return [fnum(px[ih]), dates[ih]!, fnum(px[il]), dates[il]!];
}

export interface YearReturn {
  ret: Num;
  partial: boolean;
}

/** Calendar-year returns; the first year is relative to the first close and flagged partial, as is the last year. */
export function calendarYearReturns(dates: readonly CalDate[], px: readonly number[]): Record<string, YearReturn> {
  const out: Record<string, YearReturn> = {};
  if (!px.length) return out;
  const lastYear = year(dates[dates.length - 1]!);
  let prev: number | null = null;
  let i = 0;
  while (i < px.length) {
    const y = year(dates[i]!);
    let j = i;
    while (j + 1 < px.length && year(dates[j + 1]!) === y) j++;
    const v = px[j]!;
    out[String(y)] =
      prev === null
        ? { ret: fnum(v / px[0]! - 1), partial: true }
        : { ret: fnum(v / prev - 1), partial: y === lastYear };
    prev = v;
    i = j + 1;
  }
  return out;
}

/** Inner-join prices on identical dates FIRST, then compute returns (§4.0) over (min(L1,L2) − N years, min(L1,L2)]. */
export function alignedReturns(a: Series, b: Series, years: number): [number[], number[]] {
  const L = a.d[a.d.length - 1]! < b.d[b.d.length - 1]! ? a.d[a.d.length - 1]! : b.d[b.d.length - 1]!;
  const lo = addYears(L, -years);
  const pa: number[] = [];
  const pb: number[] = [];
  let i = 0;
  let j = 0;
  while (i < a.d.length && j < b.d.length) {
    const da = a.d[i]!;
    const db = b.d[j]!;
    if (da === db) {
      if (da > lo && da <= L) {
        pa.push(a.p[i]!);
        pb.push(b.p[j]!);
      }
      i++;
      j++;
    } else if (da < db) i++;
    else j++;
  }
  return [dailyReturns(pa), dailyReturns(pb)];
}

export function corr(a: Series, b: Series, years = 3): Num {
  const [x, y] = alignedReturns(a, b, years);
  if (x.length < MIN_RET_VOL) return null;
  return fnum(correlation(x, y));
}

export function beta(s: Series, m: Series, years = 3): Num {
  const [x, y] = alignedReturns(s, m, years);
  if (x.length < MIN_RET_BETA) return null;
  return fnum(covariance(x, y, 1) / variance(y, 1));
}

export function sma(px: readonly number[], n: number): Num {
  return px.length >= n ? fnum(mean(px.slice(px.length - n))) : null;
}

/** RSI(14), Wilder smoothing. */
export function rsi14(px: readonly number[], n = 14): Num {
  if (px.length < n + 1) return null;
  let ag = 0;
  let al = 0;
  for (let i = 1; i <= n; i++) {
    const d = px[i]! - px[i - 1]!;
    if (d > 0) ag += d;
    else if (d < 0) al -= d;
  }
  ag /= n;
  al /= n;
  for (let i = n + 1; i < px.length; i++) {
    const d = px[i]! - px[i - 1]!;
    ag = (ag * (n - 1) + (d > 0 ? d : 0)) / n;
    al = (al * (n - 1) + (d < 0 ? -d : 0)) / n;
  }
  if (al === 0) return 100;
  return fnum(100 - 100 / (1 + ag / al));
}

function windowMean(px: readonly number[], end: number, n: number): number {
  if (end + 1 < n) return NaN;
  return mean(px.slice(end + 1 - n, end + 1));
}

/** Most recent SMA50/SMA200 cross within the last `lookback` rows. */
export function lastCross(
  px: readonly number[],
  dates: readonly CalDate[],
  lookback = 60,
): { type: 'golden_cross' | 'death_cross'; date: CalDate } | null {
  if (px.length < 200 + lookback) return null;
  const sign = (i: number) => Math.sign(windowMean(px, i, 50) - windowMean(px, i, 200));
  for (let i = px.length - 1; i > px.length - lookback - 1; i--) {
    const cur = sign(i);
    const prev = sign(i - 1);
    if (!Number.isNaN(prev) && cur !== prev && cur !== 0)
      return { type: cur > 0 ? 'golden_cross' : 'death_cross', date: dates[i]! };
  }
  return null;
}

/** asset_core_metrics() of the reference. */
export function assetCoreMetrics(dates: readonly CalDate[], px: readonly number[], ppy: number): Metrics {
  const m: Metrics = {
    rows: px.length,
    first_date: dates[0]!,
    last_date: dates[dates.length - 1]!,
    first_close: fnum(px[0]),
    last_close: fnum(px[px.length - 1]),
  };
  Object.assign(m, periodMetrics(dates, px));
  m.vol_1Y = vol1Y(dates, px, ppy);
  Object.assign(m, maxDrawdown(dates, px));
  const [h, hd, l, ld] = windowHiLo(dates, px);
  Object.assign(m, { hi_52w_close: h, hi_52w_date: hd, lo_52w_close: l, lo_52w_date: ld });
  Object.assign(m, athMetrics(dates, px));
  return m;
}

export function athMetrics(
  dates: readonly CalDate[],
  px: readonly number[],
): { ath_close: Num; ath_date: CalDate; pct_from_ath: Num } {
  const ia = argmax(px);
  return { ath_close: fnum(px[ia]), ath_date: dates[ia]!, pct_from_ath: fnum(px[px.length - 1]! / px[ia]! - 1) };
}

/** spike_mask(): one-day round-trip spike (§4.2). Returns a boolean mask over px. */
export function spikeMask(
  px: readonly number[],
  up = SPIKE_UP,
  dn = SPIKE_DN,
  rt: readonly [number, number] = SPIKE_RT,
): boolean[] {
  const n = px.length;
  const m: boolean[] = new Array(n).fill(false);
  for (let i = 1; i + 1 < n; i++) {
    const r = px[i]! / px[i - 1]! - 1;
    const rn = px[i + 1]! / px[i]! - 1;
    const q = px[i + 1]! / px[i - 1]!;
    m[i] = ((r > up && rn < dn) || (r < dn && rn > up)) && q >= rt[0] && q <= rt[1];
  }
  return m;
}

export const FX_SPIKE_ABS = 0.05;
export const FX_SPIKE_RT: readonly [number, number] = [0.98, 1.02];
export const FX_MEDIAN_WINDOW = 11;
export const FX_MEDIAN_DEV = 0.1;

function fxSpikeMask(px: readonly number[]): boolean[] {
  const n = px.length;
  const m: boolean[] = new Array(n).fill(false);
  for (let i = 1; i + 1 < n; i++) {
    const r = px[i]! / px[i - 1]! - 1;
    const rn = px[i + 1]! / px[i]! - 1;
    const q = px[i + 1]! / px[i - 1]!;
    m[i] =
      Math.abs(r) >= FX_SPIKE_ABS &&
      Math.abs(rn) >= FX_SPIKE_ABS &&
      Math.sign(r) !== Math.sign(rn) &&
      q >= FX_SPIKE_RT[0] &&
      q <= FX_SPIKE_RT[1];
  }
  return m;
}

/** Centred rolling median of 11 rows (min 5 observations), pandas `rolling(center=True)` alignment. */
function fxMedianMask(px: readonly number[]): boolean[] {
  const n = px.length;
  const half = Math.floor(FX_MEDIAN_WINDOW / 2);
  const m: boolean[] = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(n - 1, i + half);
    if (hi - lo + 1 < 5) continue;
    const w = px.slice(lo, hi + 1).sort((a, b) => a - b);
    const k = w.length;
    const med = k % 2 ? w[(k - 1) / 2]! : (w[k / 2 - 1]! + w[k / 2]!) / 2;
    m[i] = Math.abs(px[i]! / med - 1) >= FX_MEDIAN_DEV;
  }
  return m;
}

/** FX bad-print removal, iterated until stable (max 5 passes) (§4.6). */
export function fxClean(
  dates: readonly CalDate[],
  px: readonly number[],
): { d: CalDate[]; p: number[]; removed: CalDate[] } {
  let d = [...dates];
  let p = [...px];
  const removed: CalDate[] = [];
  for (let it = 0; it < 5; it++) {
    const a = fxSpikeMask(p);
    const b = fxMedianMask(p);
    const mask = a.map((x, i) => x || b[i]!);
    if (!mask.some(Boolean)) break;
    const nd: CalDate[] = [];
    const np: number[] = [];
    for (let i = 0; i < d.length; i++) {
      if (mask[i]) removed.push(d[i]!);
      else {
        nd.push(d[i]!);
        np.push(p[i]!);
      }
    }
    d = nd;
    p = np;
  }
  return { d, p, removed: removed.sort() };
}

/** Extreme daily moves (r ≥ +100% or ≤ −50%), dated at the later bar. */
export function extremeMoves(dates: readonly CalDate[], px: readonly number[]): { date: CalDate; ret: Num }[] {
  const out: { date: CalDate; ret: Num }[] = [];
  for (let i = 1; i < px.length; i++) {
    const r = px[i]! / px[i - 1]! - 1;
    if (r >= EXTREME_UP || r <= EXTREME_DN) out.push({ date: dates[i]!, ret: fnum(r) });
  }
  return out;
}

/** Largest daily moves (for the extreme_moves tool). */
export function largestMoves(
  dates: readonly CalDate[],
  px: readonly number[],
  direction: 'up' | 'down' | 'both',
  topN: number,
): { date: CalDate; ret: number; prev_close: number; close: number }[] {
  const rows: { date: CalDate; ret: number; prev_close: number; close: number }[] = [];
  for (let i = 1; i < px.length; i++) {
    const r = px[i]! / px[i - 1]! - 1;
    if (!Number.isFinite(r)) continue;
    if (direction === 'up' && r <= 0) continue;
    if (direction === 'down' && r >= 0) continue;
    rows.push({ date: dates[i]!, ret: r, prev_close: px[i - 1]!, close: px[i]! });
  }
  const key = (x: { ret: number }) => (direction === 'down' ? x.ret : direction === 'up' ? -x.ret : -Math.abs(x.ret));
  return rows.sort((a, b) => key(a) - key(b) || (a.date < b.date ? -1 : 1)).slice(0, topN);
}
