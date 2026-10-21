// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// NASDAQDex #2 (§4.2) and SnP500Dex #3 (§4.3). Port of clean_nasdaq / stock_universe / pulse / run_nasdaq / run_sp500
// in kit/reference/finandex_reference.py. Inputs are optional: missing files → status 'pending-data'.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { anchorDate, type CalDate } from '../../../src/shared/dates.ts';
import {
  assetCoreMetrics,
  beta,
  calendarYearReturns,
  corr,
  EXTREME_DN,
  EXTREME_UP,
  lastCross,
  MIN_RET_VOL,
  periodMetrics,
  rsi14,
  sma,
  SPIKE_DN,
  SPIKE_RT,
  SPIKE_UP,
  windowHiLo,
  athMetrics,
  type Series,
} from '../../../src/shared/analytics/series.ts';
import { fnum, mean, nanmean } from '../../../src/shared/analytics/stats.ts';
import { num, readCsv, streamCsv } from '../lib/csv.ts';
import { INPUTS, x } from '../lib/io.ts';
import { seriesDoc } from '../lib/frame.ts';
import type { DexModule, ModuleResult } from '../lib/module.ts';

export const SYSTEMIC_ABS_R = 0.4;
export const SYSTEMIC_MIN_N = 5;
export const SYSTEMIC_MIN_SHARE = 0.02;
export const EW_BASE_DATE = '2000-01-03';

export interface Bars {
  d: CalDate[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  ac?: number[];
  v?: number[];
  div?: number[];
  split?: number[];
}

function sortBars(b: Bars): Bars {
  const idx = b.d.map((_, i) => i).sort((p, q) => (b.d[p]! < b.d[q]! ? -1 : b.d[p]! > b.d[q]! ? 1 : p - q));
  const pickA = (a?: number[]) => (a ? idx.map((i) => a[i]!) : undefined);
  const out: Bars = { d: idx.map((i) => b.d[i]!), o: pickA(b.o)!, h: pickA(b.h)!, l: pickA(b.l)!, c: pickA(b.c)! };
  if (b.ac) out.ac = pickA(b.ac)!;
  if (b.v) out.v = pickA(b.v)!;
  if (b.div) out.div = pickA(b.div)!;
  if (b.split) out.split = pickA(b.split)!;
  return out;
}

function sliceBars(b: Bars, keep: (i: number) => boolean): Bars {
  const idx = b.d.map((_, i) => i).filter(keep);
  const pickA = (a?: number[]) => (a ? idx.map((i) => a[i]!) : undefined);
  const out: Bars = { d: idx.map((i) => b.d[i]!), o: pickA(b.o)!, h: pickA(b.h)!, l: pickA(b.l)!, c: pickA(b.c)! };
  if (b.ac) out.ac = pickA(b.ac)!;
  if (b.v) out.v = pickA(b.v)!;
  if (b.div) out.div = pickA(b.div)!;
  if (b.split) out.split = pickA(b.split)!;
  return out;
}

/** clean_nasdaq(): drop close ≤ 0, open 0 → NaN, remove one-day spikes, detect systemic dates & reliable_from. */
export function cleanNasdaq(byT: Map<string, Bars>) {
  const spikes: { ticker: string; date: CalDate; close: number }[] = [];
  const cleaned = new Map<string, Bars>();
  for (const t of [...byT.keys()].sort()) {
    let b = sortBars(byT.get(t)!);
    b = sliceBars(b, (i) => b.c[i]! > 0);
    b.o = b.o.map((v) => (v <= 0 ? NaN : v));
    const c = b.c;
    const mask = c.map((_, i) => {
      if (i === 0 || i === c.length - 1) return false;
      const r = c[i]! / c[i - 1]! - 1;
      const rn = c[i + 1]! / c[i]! - 1;
      const rt = c[i + 1]! / c[i - 1]!;
      return ((r > SPIKE_UP && rn < SPIKE_DN) || (r < SPIKE_DN && rn > SPIKE_UP)) && rt >= SPIKE_RT[0] && rt <= SPIKE_RT[1];
    });
    mask.forEach((m, i) => m && spikes.push({ ticker: t, date: b.d[i]!, close: c[i]! }));
    cleaned.set(t, sliceBars(b, (i) => !mask[i]));
  }
  // systemic dates: ≥ 5 tickers with |r| > 40% and ≥ 2% of active tickers on that date
  const active = new Map<CalDate, number>();
  const big = new Map<CalDate, number>();
  const rets = new Map<string, number[]>();
  for (const [t, b] of cleaned) {
    const r = b.c.map((v, i) => (i === 0 ? NaN : v / b.c[i - 1]! - 1));
    rets.set(t, r);
    r.forEach((x, i) => {
      if (Number.isNaN(x)) return;
      active.set(b.d[i]!, (active.get(b.d[i]!) ?? 0) + 1);
      if (Math.abs(x) > SYSTEMIC_ABS_R) big.set(b.d[i]!, (big.get(b.d[i]!) ?? 0) + 1);
    });
  }
  const sysd = [...big.entries()]
    .filter(([d, n]) => n >= SYSTEMIC_MIN_N && n / (active.get(d) ?? 1) >= SYSTEMIC_MIN_SHARE)
    .map(([d]) => d)
    .sort();
  const sysSet = new Set(sysd);
  const breaks: { ticker: string; date: CalDate; r: number }[] = [];
  const reliableFrom = new Map<string, CalDate>();
  for (const [t, b] of cleaned) {
    const r = rets.get(t)!;
    b.d.forEach((d, i) => {
      if (sysSet.has(d) && Math.abs(r[i]!) > SYSTEMIC_ABS_R) {
        breaks.push({ ticker: t, date: d, r: r[i]! });
        if (!reliableFrom.has(t) || d > reliableFrom.get(t)!) reliableFrom.set(t, d);
      }
    });
  }
  return { cleaned, spikes, sysd, breaks, reliableFrom };
}

/** stock_universe(): per-ticker metrics on the total-return column, display metrics on the price column. */
export function stockUniverse(byT: Map<string, Bars>, useAdj: boolean, bench: Series, ppy: number) {
  const metrics: Record<string, Record<string, unknown>> = {};
  const cal: Record<string, unknown> = {};
  for (const t of [...byT.keys()].sort()) {
    const b = byT.get(t)!;
    const d = b.d;
    const px = useAdj ? b.ac! : b.c;
    const pr = b.c;
    const m = assetCoreMetrics(d, px, ppy);
    m.last_close = fnum(pr[pr.length - 1]);
    m.first_close = fnum(pr[0]);
    const [h, hd, l, ld] = windowHiLo(d, pr);
    Object.assign(m, { hi_52w_close: h, hi_52w_date: hd, lo_52w_close: l, lo_52w_date: ld });
    Object.assign(m, athMetrics(d, pr));
    m.sma50 = sma(pr, 50);
    m.sma200 = sma(pr, 200);
    m.rsi14 = rsi14(pr);
    m.above_sma200 = m.sma200 !== null && pr[pr.length - 1]! > (m.sma200 as number);
    m.last_cross = lastCross(pr, d);
    m.multiple_MAX = px.length >= 2 ? fnum(px[px.length - 1]! / px[0]!) : null;
    m.beta_3Y = px.length > 1 ? beta({ d, p: px }, bench, 3) : null;
    m.corr_bench_3Y = px.length > 1 ? corr({ d, p: px }, bench, 3) : null;
    if (useAdj) {
      const pm = periodMetrics(d, pr);
      m.price_ret_1Y = pm.ret_1Y ?? null;
      m.price_ret_5Y = pm.ret_5Y ?? null;
    }
    m.ticker = t;
    metrics[t] = m;
    cal[t] = calendarYearReturns(d, px);
  }
  return { metrics, cal };
}

/** pulse(): breadth + equal-weight universe index (survivorship-biased by design). */
export function pulse(byT: Map<string, Bars>, useAdj: boolean, metrics: Record<string, Record<string, unknown>>, baseDate = EW_BASE_DATE) {
  let asOf = '';
  for (const b of byT.values()) if (b.d[b.d.length - 1]! > asOf) asOf = b.d[b.d.length - 1]!;
  let adv = 0;
  let dec = 0;
  let unch = 0;
  let withBar = 0;
  const byDate = new Map<CalDate, number[]>();
  for (const b of byT.values()) {
    const p = useAdj ? b.ac! : b.c;
    for (let i = 0; i < b.d.length; i++) {
      const r = i === 0 ? NaN : p[i]! / p[i - 1]! - 1;
      if (b.d[i] === asOf) {
        withBar++;
        if (r > 0) adv++;
        else if (r < 0) dec++;
        else if (r === 0) unch++;
      }
      if (!Number.isNaN(r) && r < EXTREME_UP && r > EXTREME_DN && b.d[i]! > baseDate) {
        if (!byDate.has(b.d[i]!)) byDate.set(b.d[i]!, []);
        byDate.get(b.d[i]!)!.push(r);
      }
    }
  }
  const ms = Object.values(metrics);
  const elig = ms.filter((m) => m.last_date === asOf && m.sma200 !== null);
  const dates = [...byDate.keys()].sort();
  let lvl = 100;
  const levels: number[] = [];
  for (const d of dates) {
    lvl *= 1 + mean(byDate.get(d)!);
    levels.push(lvl);
  }
  const ye: Record<string, number | null> = {};
  dates.forEach((d, i) => (ye[d.slice(0, 4)] = fnum(levels[i])));
  return {
    as_of: asOf,
    tickers_with_bar_on_as_of: withBar,
    advancers: adv,
    decliners: dec,
    unchanged: unch,
    pct_above_sma200: elig.length ? fnum(elig.filter((m) => m.above_sma200).length / elig.length) : null,
    sma200_eligible: elig.length,
    new_52w_highs: ms.filter((m) => m.last_date === asOf && m.hi_52w_date === asOf).length,
    new_52w_lows: ms.filter((m) => m.last_date === asOf && m.lo_52w_date === asOf).length,
    ew_index: {
      base_date: baseDate,
      base_level: 100.0,
      constituents_on_first_return_date: dates.length ? byDate.get(dates[0]!)!.length : 0,
      constituents_on_as_of: dates.length ? byDate.get(dates.at(-1)!)!.length : 0,
      level_as_of: fnum(levels.at(-1)),
      year_end_levels: ye,
    },
    _ew_series: { d: dates, level: levels },
  };
}

/** Float32 matrix (rows = dates × cols = tickers, NaN = no bar) for free-period ranking on the server (§7.3). */
export function buildMatrix(byT: Map<string, Bars>, useAdj: boolean): { bin: Uint8Array; meta: { dates: CalDate[]; tickers: string[]; shape: [number, number] } } {
  const tickers = [...byT.keys()].sort();
  const all = new Set<CalDate>();
  for (const b of byT.values()) for (const d of b.d) all.add(d);
  const dates = [...all].sort();
  const di = new Map(dates.map((d, i) => [d, i]));
  const f = new Float32Array(dates.length * tickers.length).fill(NaN);
  tickers.forEach((t, j) => {
    const b = byT.get(t)!;
    const p = useAdj ? b.ac! : b.c;
    b.d.forEach((d, i) => (f[di.get(d)! * tickers.length + j] = p[i]!));
  });
  return { bin: new Uint8Array(f.buffer), meta: { dates, tickers, shape: [dates.length, tickers.length] } };
}

export function seriesFile(t: string, b: Bars, quality: unknown) {
  return seriesDoc(t, b.d, { o: b.o, h: b.h, l: b.l, c: b.c, ...(b.ac ? { ac: b.ac } : {}), ...(b.v ? { v: b.v } : {}), ...(b.div ? { div: b.div, split: b.split ?? [] } : {}) }, { quality });
}

// ------------------------------------------------------------------------------------------------ NASDAQDex
export const NASDAQ_DIR = () => x('NASDAQ_daily_stock_prices_OHLC_prices_between_1962-01-02_till_2026-09-18_Dataset');

export const nasdaqModule: DexModule = {
  name: 'nasdaq',
  dex: ['nasdaqdex'],
  inputs: [2],
  requires: () => [NASDAQ_DIR()],
  async build(ctx): Promise<ModuleResult> {
    const bench = ctx.shared.get('global:^IXIC');
    if (!bench) throw new Error('NASDAQDex needs ^IXIC from the global dataset');
    const byT = new Map<string, Bars>();
    for (const f of readdirSync(NASDAQ_DIR()).filter((n) => n.endsWith('.csv')).sort()) {
      for (const r of readCsv(join(NASDAQ_DIR(), f))) {
        const t = r.ticker!;
        if (!byT.has(t)) byT.set(t, { d: [], o: [], h: [], l: [], c: [] });
        const b = byT.get(t)!;
        b.d.push(r.date!.slice(0, 10));
        b.o.push(num(r.open));
        b.h.push(num(r.high));
        b.l.push(num(r.low));
        b.c.push(num(r.close));
      }
    }
    const { cleaned, spikes, sysd, breaks, reliableFrom } = cleanNasdaq(byT);
    const win = new Map<string, Bars>();
    for (const [t, b] of cleaned) {
      const rf = reliableFrom.get(t);
      win.set(t, rf ? sliceBars(b, (i) => b.d[i]! >= rf) : b);
    }
    const benchCut = (() => {
      let asOf = '';
      for (const b of win.values()) if (b.d.at(-1)! > asOf) asOf = b.d.at(-1)!;
      const i = bench.d.findIndex((d) => d > asOf);
      return i < 0 ? bench : { d: bench.d.slice(0, i), p: bench.p.slice(0, i) };
    })();
    const { metrics, cal } = stockUniverse(win, false, benchCut, 252);
    const quality: Record<string, Record<string, unknown>> = {};
    let extTotal = 0;
    const files: Record<string, unknown> = {};
    for (const t of [...cleaned.keys()].sort()) {
      const b = win.get(t)!;
      const ext: { date: CalDate; ret: number | null }[] = [];
      for (let i = 1; i < b.c.length; i++) {
        const r = b.c[i]! / b.c[i - 1]! - 1;
        if (r >= EXTREME_UP || r <= EXTREME_DN) ext.push({ date: b.d[i]!, ret: fnum(r) });
      }
      extTotal += ext.length;
      quality[t] = {
        spikes_removed: spikes.filter((s) => s.ticker === t).map((s) => s.date),
        systemic_breaks: breaks.filter((s) => s.ticker === t).map((s) => s.date),
        reliable_from: reliableFrom.get(t) ?? null,
        extreme_moves: ext,
        rows_raw_after_spike_removal: cleaned.get(t)!.d.length,
        rows_in_analysis_window: b.d.length,
        insufficient_history: b.d.length < MIN_RET_VOL + 1,
      };
      const q = quality[t]!;
      metrics[t]!.quality_flags = (
        [
          ['spike_removed', (q.spikes_removed as unknown[]).length],
          ['systemic_break', (q.systemic_breaks as unknown[]).length],
          ['extreme_move', ext.length],
          ['insufficient_history', q.insufficient_history],
        ] as [string, unknown][]
      )
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k);
      files[`heavy/nasdaq/series/${t}.json`] = seriesFile(t, b, q);
    }
    const pul = pulse(win, false, metrics);
    const { _ew_series, ...pulseGolden } = pul;
    const qualityReport = {
      systemic_dates: sysd,
      rules: { spike_up: SPIKE_UP, spike_dn: SPIKE_DN, spike_roundtrip: SPIKE_RT, systemic_abs_r: SYSTEMIC_ABS_R, systemic_min_n: SYSTEMIC_MIN_N, systemic_min_share: SYSTEMIC_MIN_SHARE, extreme_up: EXTREME_UP, extreme_dn: EXTREME_DN },
      totals: { spikes_removed: spikes.length, systemic_break_rows: breaks.length, tickers_with_reliable_from: reliableFrom.size, extreme_moves: extTotal },
      tickers: quality,
    };
    const mat = buildMatrix(win, false);
    files['core/nasdaq/catalog.json'] = { as_of: pul.as_of, note: 'Prices adjusted by the source (treated as an approximate total-return series). No volume, no dividends.', stocks: Object.values(metrics) };
    files['core/nasdaq/pulse.json'] = { ...pulseGolden, ew_series: _ew_series, survivorship_bias: true, benchmark: '^IXIC (global dataset, cut at the common date)' };
    files['core/nasdaq/quality.json'] = qualityReport;
    files['heavy/nasdaq/matrix/close.meta.json'] = mat.meta;
    return {
      dex: ['nasdaqdex'],
      status: 'built',
      asOf: pul.as_of,
      golden: { 'nasdaq/golden_metrics.json': metrics, 'nasdaq/golden_calendar_returns.json': cal, 'nasdaq/quality_report.json': qualityReport, 'nasdaq/golden_pulse.json': pulseGolden },
      files,
      binaries: { 'heavy/nasdaq/matrix/close.f32': mat.bin },
    };
  },
};

// ------------------------------------------------------------------------------------------------ SnP500Dex
export const SP500_CSV = () => join(INPUTS, 'S_P_500_US_Stock_Market_Data_2026_master_stock_data.csv');
export const SIMULATIONS: [string, CalDate, number][] = [
  ['MSFT', '2010-01-04', 10000.0],
  ['KO', '2000-01-03', 10000.0],
  ['AAPL', '2015-01-02', 10000.0],
];

/** DRIP / no-DRIP investment simulator (§4.3). */
export function simulate(b: Bars, start: CalDate, amount: number) {
  let si = -1;
  for (let i = 0; i < b.d.length; i++) if (b.d[i]! <= start) si = i;
  if (si < 0) return null;
  const ei = b.d.length - 1;
  const drip = (amount * b.ac![ei]!) / b.ac![si]!;
  const shares = amount / b.c[si]!;
  let cash = 0;
  for (let i = si + 1; i <= ei; i++) cash += (b.div![i]! || 0) * shares;
  return {
    start_date: b.d[si]!,
    end_date: b.d[ei]!,
    amount_usd: amount,
    value_with_reinvestment: fnum(drip),
    value_price_only: fnum(shares * b.c[ei]!),
    dividends_cash_no_reinvest: fnum(cash),
    value_without_reinvestment_incl_cash: fnum(shares * b.c[ei]! + cash),
  };
}

/** Dividend, split and volume profile of one S&P 500 series (§4.3). */
export function dividendProfile(b: Bars): Record<string, unknown> {
  const L = b.d[b.d.length - 1]!;
  const a1 = anchorDate(L, '1Y');
  let ttm = 0;
  const annual = new Map<number, number>();
  let lastDiv: { date: CalDate; amount: number | null } | null = null;
  b.d.forEach((d, i) => {
    const dv = b.div![i]!;
    if (dv > 0) {
      if (d > a1) ttm += dv;
      const y = Number(d.slice(0, 4));
      annual.set(y, (annual.get(y) ?? 0) + dv);
      lastDiv = { date: d, amount: fnum(dv) };
    }
  });
  const lastFull = Number(L.slice(0, 4)) - 1;
  const firstYear = Number(b.d[0]!.slice(0, 4));
  const ann = new Map<number, number>();
  for (let y = firstYear; y <= lastFull; y++) ann.set(y, annual.get(y) ?? 0);
  let streak = 0;
  for (let y = lastFull; ann.has(y - 1) && ann.get(y)! > 0 && ann.get(y)! > ann.get(y - 1)!; y--) streak++;
  const dcagr = (n: number) => {
    const a = ann.get(lastFull - n) ?? 0;
    const z = ann.get(lastFull) ?? 0;
    return a > 0 && z > 0 ? fnum((z / a) ** (1 / n) - 1) : null;
  };
  const vol = b.v!.map((v) => (v > 0 ? v : NaN));
  const c = b.c;
  const a3 = anchorDate(L, '3M');
  const last20 = vol.slice(-20);
  const anyFinite = (xs: number[]) => xs.some((v) => Number.isFinite(v));
  const v3 = vol.filter((_, i) => b.d[i]! > a3);
  return {
    ttm_dividends: fnum(ttm),
    ttm_yield: ttm > 0 ? fnum(ttm / c[c.length - 1]!) : 0.0,
    annual_dividends: Object.fromEntries([...ann.entries()].filter(([, v]) => v > 0).map(([k, v]) => [String(k), fnum(v)])),
    last_full_year: lastFull,
    dividend_increase_streak_years: streak,
    dividend_cagr_5Y: dcagr(5),
    dividend_cagr_10Y: dcagr(10),
    last_dividend: lastDiv,
    splits: b.d.map((d, i) => ({ date: d, ratio: b.split![i]! })).filter((s) => s.ratio > 0).map((s) => ({ date: s.date, ratio: fnum(s.ratio) })),
    avg_volume_20d: anyFinite(last20) ? fnum(nanmean(last20)) : null,
    avg_volume_3M: anyFinite(v3) ? fnum(nanmean(v3)) : null,
    avg_dollar_volume_20d: anyFinite(last20) ? fnum(nanmean(c.slice(-20).map((cc, i) => cc * last20[i]!))) : null,
  };
}

export const sp500Module: DexModule = {
  name: 'sp500',
  dex: ['snp500dex'],
  inputs: [3],
  requires: () => [SP500_CSV()],
  async build(ctx): Promise<ModuleResult> {
    const bench = ctx.shared.get('global:^GSPC');
    if (!bench) throw new Error('SnP500Dex needs ^GSPC from the global dataset');
    const byT = new Map<string, Bars>();
    let dropped = 0;
    await streamCsv(SP500_CSV(), (r) => {
      const c = num(r.Close);
      const ac = num(r['Adj Close']);
      if (Number.isNaN(c) || Number.isNaN(ac)) {
        dropped++;
        return;
      }
      const t = r.Ticker!;
      if (!byT.has(t)) byT.set(t, { d: [], o: [], h: [], l: [], c: [], ac: [], v: [], div: [], split: [] });
      const b = byT.get(t)!;
      b.d.push(r.Date!.slice(0, 10));
      b.o.push(num(r.Open));
      b.h.push(num(r.High));
      b.l.push(num(r.Low));
      b.c.push(c);
      b.ac!.push(ac);
      b.v!.push(num(r.Volume));
      b.div!.push(num(r.Dividends));
      b.split!.push(num(r['Stock Splits']));
    });
    for (const [t, b] of byT) byT.set(t, sortBars(b));
    const { metrics, cal } = stockUniverse(byT, true, bench, 252);
    const divs: Record<string, Record<string, unknown>> = {};
    const spq: Record<string, { extreme_moves: { date: CalDate; ret: number | null }[]; insufficient_history: boolean }> = {};
    const files: Record<string, unknown> = {};
    for (const t of [...byT.keys()].sort()) {
      const b = byT.get(t)!;
      divs[t] = dividendProfile(b);
      Object.assign(metrics[t]!, { ttm_yield: divs[t]!.ttm_yield, dividend_increase_streak_years: divs[t]!.dividend_increase_streak_years, avg_dollar_volume_20d: divs[t]!.avg_dollar_volume_20d });
      const ext: { date: CalDate; ret: number | null }[] = [];
      for (let i = 1; i < b.ac!.length; i++) {
        const r = b.ac![i]! / b.ac![i - 1]! - 1;
        if (r >= EXTREME_UP || r <= EXTREME_DN) ext.push({ date: b.d[i]!, ret: fnum(r) });
      }
      spq[t] = { extreme_moves: ext, insufficient_history: b.d.length < MIN_RET_VOL + 1 };
      metrics[t]!.quality_flags = [ext.length ? 'extreme_move' : null, spq[t]!.insufficient_history ? 'insufficient_history' : null].filter(Boolean);
      files[`heavy/sp500/series/${t}.json`] = seriesFile(t, b, spq[t]);
    }
    const pul = pulse(byT, true, metrics);
    const { _ew_series, ...pulseGolden } = pul;
    const sims: Record<string, unknown>[] = [];
    for (const [t, start, amt] of SIMULATIONS) {
      const b = byT.get(t);
      if (!b) continue;
      const s = simulate(b, start, amt);
      if (s) sims.push({ ticker: t, start_request: start, ...s });
    }
    const qualityReport = {
      rows_dropped_null_close: dropped,
      rules: { extreme_up: EXTREME_UP, extreme_dn: EXTREME_DN, returns_basis: 'Adj Close' },
      tickers_insufficient_history: Object.entries(spq)
        .filter(([, q]) => q.insufficient_history)
        .map(([t]) => t),
      tickers: spq,
    };
    const mat = buildMatrix(byT, true);
    files['core/sp500/catalog.json'] = { as_of: pul.as_of, note: 'Returns & risk use Adj Close (total return); display, 52W, ATH, SMA, RSI use Close. Benchmark ^GSPC is a price index (no dividends).', stocks: Object.values(metrics) };
    files['core/sp500/pulse.json'] = { ...pulseGolden, ew_series: _ew_series, survivorship_bias: true };
    files['core/sp500/dividends.json'] = divs;
    files['core/sp500/quality.json'] = qualityReport;
    files['heavy/sp500/matrix/adj.meta.json'] = mat.meta;
    return {
      dex: ['snp500dex'],
      status: 'built',
      asOf: pul.as_of,
      golden: {
        'sp500/golden_metrics.json': metrics,
        'sp500/golden_calendar_returns.json': cal,
        'sp500/golden_dividends_volume.json': divs,
        'sp500/golden_pulse.json': pulseGolden,
        'sp500/quality_report.json': qualityReport,
        'sp500/golden_simulator.json': sims,
      },
      files,
      binaries: { 'heavy/sp500/matrix/adj.f32': mat.bin },
    };
  },
};

export function nasdaqAvailable(): boolean {
  return existsSync(NASDAQ_DIR());
}
