// © 2026 Dea Saka Kurnia Putra. All rights reserved.
import { describe, expect, it } from 'vitest';
import * as S from '../../src/shared/analytics/stats.ts';

describe('stats (numpy/pandas semantics)', () => {
  it('fnum maps non-finite to null', () => {
    expect(S.fnum(NaN)).toBeNull();
    expect(S.fnum(Infinity)).toBeNull();
    expect(S.fnum(-Infinity)).toBeNull();
    expect(S.fnum(undefined)).toBeNull();
    expect(S.fnum(null)).toBeNull();
    expect(S.fnum(1.5)).toBe(1.5);
  });
  it('sig10 & half-to-even rounding', () => {
    expect(S.sig10(0.1 + 0.2)).toBe(0.3);
    expect(S.sig10(0)).toBe(0);
    expect(S.sig10(NaN)).toBeNaN();
    expect(S.rint(2.5)).toBe(2);
    expect(S.rint(3.5)).toBe(4);
    expect(S.rint(-2.5)).toBe(-2);
    expect(S.rint(2.4)).toBe(2);
    expect(S.roundN(0.1234565, 6)).toBeCloseTo(0.123456, 9);
  });
  it('sum/mean/var/std', () => {
    expect(S.sum([1e16, 1, -1e16])).toBe(1);
    expect(S.mean([])).toBeNaN();
    expect(S.mean([1, 2, 3])).toBe(2);
    expect(S.variance([1])).toBeNaN();
    expect(S.variance([1, 2, 3, 4])).toBeCloseTo(1.6666666667, 9);
    expect(S.std([2, 4, 4, 4, 5, 5, 7, 9], 0)).toBe(2);
    expect(() => S.covariance([1, 2], [1])).toThrow();
    expect(S.covariance([1], [1])).toBeNaN();
  });
  it('correlation is clipped and NaN-safe', () => {
    expect(S.correlation([1, 2, 3], [2, 4, 6])).toBeCloseTo(1, 12);
    expect(S.correlation([1, 2, 3], [3, 2, 1])).toBeCloseTo(-1, 12);
    expect(S.correlation([1, 1, 1], [1, 2, 3])).toBeNaN();
  });
  it('quantile/median like pandas (linear, NaN skipped)', () => {
    expect(S.median([3, 1, 2])).toBe(2);
    expect(S.median([4, 1, 2, 3])).toBe(2.5);
    expect(S.median([NaN, 1, 3])).toBe(2);
    expect(S.median([])).toBeNaN();
    expect(S.med([])).toBeNull();
    expect(S.quantile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.9)).toBeCloseTo(9.1, 12);
    expect(S.nanmean([NaN, 2, 4])).toBe(3);
  });
  it('arg/rank helpers keep first occurrence', () => {
    expect(S.argmax([1, 3, 3, 2])).toBe(1);
    expect(S.argmin([2, 1, 1])).toBe(1);
    const rows = [{ k: 1 }, { k: 3 }, { k: 3 }, { k: NaN }, { k: 2 }];
    expect(S.nlargest(rows, 2, (r) => r.k)).toEqual([rows[1], rows[2]]);
    expect(S.nsmallest(rows, 2, (r) => r.k)).toEqual([rows[0], rows[4]]);
    expect(S.valueCounts(['a', 'b', 'a', null, undefined, NaN as unknown as string])).toEqual([
      ['a', 2],
      ['b', 1],
    ]);
    const g = S.groupBy([1, 2, 3, 4], (x) => x % 2);
    expect([...g.keys()]).toEqual([1, 0]);
    expect(
      S.sortedKeys(
        new Map([
          ['b', 1],
          ['a', 2],
        ]),
      ),
    ).toEqual(['a', 'b']);
    expect(S.dropNaN([1, NaN, 2])).toEqual([1, 2]);
  });
});
