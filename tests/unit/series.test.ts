// © 2026 Dea Saka Kurnia Putra. All rights reserved.
import { describe, expect, it } from 'vitest';
import * as A from '../../src/shared/analytics/series.ts';
import { addDays, anchorDate, idxOnOrBefore } from '../../src/shared/dates.ts';

function days(start: string, n: number, step = 1): string[] {
  return Array.from({ length: n }, (_, i) => addDays(start, i * step));
}

describe('series metrics', () => {
  it('period returns, CAGR & insufficient history', () => {
    const d = days('2020-01-01', 800);
    const p = d.map((_, i) => 100 * 1.001 ** i);
    const m = A.periodMetrics(d, p);
    expect(m.ret_1D).toBeCloseTo(0.001, 12);
    const i1 = idxOnOrBefore(d, anchorDate(d.at(-1)!, '1Y'));
    expect(m.ret_1Y).toBeCloseTo(p.at(-1)! / p[i1]! - 1, 12);
    expect(m.ret_5Y).toBeNull();
    expect(m.cagr_5Y).toBeNull();
    expect(m.cagr_MAX).not.toBeNull();
    expect(A.periodMetrics([], [])).toMatchObject({ ret_1D: null, ret_MAX: null });
    const one = A.periodMetrics(['2020-01-01'], [1]);
    expect(one.ret_1D).toBeNull();
    expect(one.ret_MAX).toBeNull();
    expect(one.cagr_MAX).toBeNull();
  });
  it('CAGR is null for non-positive prices', () => {
    const d = days('2020-01-01', 500);
    const p = d.map((_, i) => (i === 0 ? -5 : 10));
    expect(A.periodMetrics(d, p).cagr_MAX).toBeNull();
  });
  it('vol needs ≥ 60 returns in the trailing year', () => {
    const d = days('2020-01-01', 50);
    expect(
      A.vol1Y(
        d,
        d.map((_, i) => 100 + (i % 2)),
        252,
      ),
    ).toBeNull();
    expect(A.vol1Y(['2020-01-01'], [1], 252)).toBeNull();
    const d2 = days('2020-01-01', 200);
    const v = A.vol1Y(
      d2,
      d2.map((_, i) => 100 + (i % 2)),
      365,
    );
    expect(v).toBeGreaterThan(0);
  });
  it('max drawdown with recovery / no recovery / negative prices (WTI)', () => {
    const d = days('2020-01-01', 6);
    expect(A.maxDrawdown(d, [10, 12, 6, 9, 12, 13])).toEqual({
      mdd: -0.5,
      mdd_peak_date: d[1],
      mdd_trough_date: d[2],
      mdd_recovery_date: d[4],
    });
    expect(A.maxDrawdown(d, [10, 12, 6, 9, 10, 11]).mdd_recovery_date).toBeNull();
    expect(A.maxDrawdown(d, [1, 2, 3, 4, 5, 6]).mdd).toBe(0);
    expect(A.maxDrawdown(['2020-01-01'], [1]).mdd).toBeNull();
    const wti = A.maxDrawdown(d, [20, 30, -7.77, 10, 15, 18]);
    expect(wti.mdd!).toBeLessThan(-1);
  });
  it('drawdown episodes are non-overlapping and sorted', () => {
    const d = days('2020-01-01', 9);
    const eps = A.drawdownEpisodes(d, [10, 8, 11, 5, 12, 11, 12.5, 12, 13], 5);
    expect(eps[0]!.mdd).toBeCloseTo(5 / 11 - 1, 12);
    expect(eps.length).toBe(4);
    expect(A.drawdownEpisodes(d.slice(0, 3), [1, 2, 3])).toEqual([]);
  });
  it('52W window, ATH, calendar years (partial flags)', () => {
    const d = ['2019-06-01', '2019-12-31', '2020-06-30', '2020-12-31', '2021-03-01'];
    const p = [100, 110, 90, 120, 130];
    const cal = A.calendarYearReturns(d, p);
    expect(cal['2019']!.ret).toBeCloseTo(0.1, 12);
    expect(cal['2019']!.partial).toBe(true);
    expect(cal['2020']!.ret).toBeCloseTo(120 / 110 - 1, 12);
    expect(cal['2020']!.partial).toBe(false);
    expect(cal['2021']!.partial).toBe(true);
    expect(A.calendarYearReturns([], [])).toEqual({});
    const [h, hd, l, ld] = A.windowHiLo(d, p);
    expect([h, hd, l, ld]).toEqual([130, '2021-03-01', 90, '2020-06-30']);
    expect(A.athMetrics(d, p)).toEqual({ ath_close: 130, ath_date: '2021-03-01', pct_from_ath: 0 });
  });
  it('aligns on common dates BEFORE computing returns (crypto 7d vs stock 5d)', () => {
    const crypto = { d: days('2020-01-01', 1200), p: [] as number[] };
    crypto.p = crypto.d.map((_, i) => 100 + Math.sin(i / 3) * 10);
    const stock = { d: crypto.d.filter((_, i) => i % 7 < 5), p: [] as number[] };
    stock.p = stock.d.map((dd) => crypto.p[crypto.d.indexOf(dd)]! * 2);
    const [a, b] = A.alignedReturns(crypto, stock, 3);
    expect(a.length).toBe(b.length);
    expect(A.corr(crypto, stock, 3)).toBeCloseTo(1, 10);
    expect(A.beta(crypto, stock, 3)).toBeCloseTo(1, 10);
    expect(
      A.corr({ d: ['2020-01-01', '2020-01-02'], p: [1, 2] }, { d: ['2020-01-01', '2020-01-02'], p: [1, 2] }),
    ).toBeNull();
    expect(
      A.beta({ d: ['2020-01-01', '2020-01-02'], p: [1, 2] }, { d: ['2020-01-01', '2020-01-02'], p: [1, 2] }),
    ).toBeNull();
  });
  it('SMA, RSI (Wilder) and cross detection', () => {
    expect(A.sma([1, 2, 3], 5)).toBeNull();
    expect(A.sma([1, 2, 3, 4], 2)).toBe(3.5);
    expect(A.rsi14([1, 2, 3])).toBeNull();
    expect(A.rsi14(Array.from({ length: 30 }, (_, i) => i))).toBe(100);
    const r = A.rsi14(Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i)));
    expect(r!).toBeGreaterThan(0);
    expect(r!).toBeLessThan(100);
    const n = 300;
    const d = days('2020-01-01', n);
    const down = Array.from({ length: n }, (_, i) => (i < 270 ? 300 - i : 30 + (i - 270) * 20));
    expect(A.lastCross(down, d)?.type).toBe('golden_cross');
    const up = Array.from({ length: n }, (_, i) => (i < 270 ? 100 + i : 370 - (i - 270) * 20));
    expect(A.lastCross(up, d)?.type).toBe('death_cross');
    expect(A.lastCross([1, 2, 3], d)).toBeNull();
    expect(
      A.lastCross(
        Array.from({ length: n }, (_, i) => i),
        d,
      ),
    ).toBeNull();
  });
  it('spike rule, FX bad prints & extreme moves', () => {
    expect(A.spikeMask([10, 25, 10.5, 11])).toEqual([false, true, false, false]);
    expect(A.spikeMask([10, 4, 10.2, 11])).toEqual([false, true, false, false]);
    expect(A.spikeMask([10, 25, 30, 31])).toEqual([false, false, false, false]);
    const d = days('2013-01-01', 40);
    const p = d.map(() => 10000);
    p[20] = 888.11; // broken print
    const r = A.fxClean(d, p);
    expect(r.removed).toEqual([d[20]]);
    expect(r.p.length).toBe(39);
    const p2 = d.map(() => 10000);
    p2[10] = 10600; // round-trip spike +6% / -5.7%
    expect(A.fxClean(d, p2).removed).toEqual([d[10]]);
    expect(
      A.fxClean(
        d,
        d.map(() => 1),
      ).removed,
    ).toEqual([]);
    expect(A.extremeMoves(['a', 'b', 'c'], [1, 2.5, 1])).toEqual([
      { date: 'b', ret: 1.5 },
      { date: 'c', ret: -0.6 },
    ]);
    const lm = A.largestMoves(['a', 'b', 'c', 'd'], [1, 1.2, 0.9, 0.95], 'both', 2);
    expect(lm.map((x) => x.date)).toEqual(['c', 'b']);
    expect(A.largestMoves(['a', 'b', 'c'], [1, 1.2, 0.9], 'up', 5).map((x) => x.date)).toEqual(['b']);
    expect(A.largestMoves(['a', 'b', 'c'], [1, 1.2, 0.9], 'down', 5).map((x) => x.date)).toEqual(['c']);
    expect(A.largestMoves(['a', 'b'], [0, 1], 'both', 5)).toEqual([]);
    expect(A.dailyReturns([2])).toEqual([]);
  });
  it('asset core metrics end-to-end', () => {
    const d = days('2015-01-01', 3000);
    const p = d.map((_, i) => 50 + i * 0.01 + Math.cos(i / 10));
    const m = A.assetCoreMetrics(d, p, 252);
    expect(m.rows).toBe(3000);
    expect(m.first_date).toBe(d[0]);
    expect(m.ret_5Y).not.toBeNull();
    expect(m.vol_1Y).not.toBeNull();
  });
});
