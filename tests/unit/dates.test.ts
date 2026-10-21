// © 2026 Dea Saka Kurnia Putra. All rights reserved.
import { describe, expect, it } from 'vitest';
import * as D from '../../src/shared/dates.ts';

describe('dates (pure UTC calendar math)', () => {
  it('validates calendar strings', () => {
    expect(D.isCalDate('2024-02-29')).toBe(true);
    expect(D.isCalDate('2023-02-29')).toBe(false);
    expect(D.isCalDate('2024-13-01')).toBe(false);
    expect(D.isCalDate('2024-1-01')).toBe(false);
    expect(D.isCalDate(20240101)).toBe(false);
    expect(() => D.parts('x')).toThrow();
  });
  it('clamps month/year offsets to month end (pandas DateOffset)', () => {
    expect(D.addMonths('2024-03-31', -1)).toBe('2024-02-29');
    expect(D.addMonths('2023-03-31', -1)).toBe('2023-02-28');
    expect(D.addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(D.addYears('2024-02-29', -1)).toBe('2023-02-28');
    expect(D.addYears('2024-02-29', 4)).toBe('2028-02-29');
    expect(D.addMonths('2024-12-15', 1)).toBe('2025-01-15');
    expect(D.addMonths('2024-01-15', -13)).toBe('2022-12-15');
  });
  it('anchors trailing periods', () => {
    expect(D.anchorDate('2026-10-19', '1W')).toBe('2026-10-12');
    expect(D.anchorDate('2026-10-19', 'YTD')).toBe('2025-12-31');
    expect(D.anchorDate('2026-10-19', '1M')).toBe('2026-09-19');
    expect(D.anchorDate('2026-10-19', '3M')).toBe('2026-07-19');
    expect(D.anchorDate('2026-10-19', '6M')).toBe('2026-04-19');
    expect(D.anchorDate('2026-10-19', '1Y')).toBe('2025-10-19');
    expect(D.anchorDate('2026-10-19', '3Y')).toBe('2023-10-19');
    expect(D.anchorDate('2026-10-19', '5Y')).toBe('2021-10-19');
    expect(D.anchorDate('2026-10-19', '10Y')).toBe('2016-10-19');
  });
  it('day numbers round-trip without time-zone shifts', () => {
    for (const d of ['1962-01-02', '2000-02-29', '2026-10-20', '1970-01-01'])
      expect(D.fromDayNumber(D.toDayNumber(d))).toBe(d);
    expect(D.daysBetween('2024-02-28', '2024-03-01')).toBe(2);
    expect(D.addDays('2024-12-31', 1)).toBe('2025-01-01');
  });
  it('binary search on-or-before', () => {
    const ds = ['2020-01-01', '2020-01-03', '2020-01-06'];
    expect(D.idxOnOrBefore(ds, '2019-12-31')).toBe(-1);
    expect(D.idxOnOrBefore(ds, '2020-01-01')).toBe(0);
    expect(D.idxOnOrBefore(ds, '2020-01-05')).toBe(1);
    expect(D.idxOnOrBefore(ds, '2030-01-01')).toBe(2);
  });
  it('parses source formats without conversion', () => {
    expect(D.calendarPrefix('2001-06-28 00:00:00+01:00')).toBe('2001-06-28');
    expect(() => D.calendarPrefix('28/06/2001')).toThrow();
    expect(D.fromMDY('1/31/2013')).toBe('2013-01-31');
    expect(() => D.fromMDY('2/30/2013')).toThrow();
    expect(() => D.fromMDY('2013-01-31')).toThrow();
    expect(D.fromIndonesianDate('09 Des 1997')).toBe('1997-12-09');
    expect(D.fromIndonesianDate('1 Agt 2020')).toBe('2020-08-01');
    expect(D.fromIndonesianDate('15 Mei 2021')).toBe('2021-05-15');
    expect(() => D.fromIndonesianDate('15 May 2021')).toThrow();
    expect(() => D.fromIndonesianDate('31 Feb 2021')).toThrow();
  });
  it('misc helpers', () => {
    expect(D.year('2026-10-19')).toBe(2026);
    expect(D.monthKey('2026-10-19')).toBe('2026-10');
    expect(D.ymIndex('2026-01-31') - D.ymIndex('2025-12-31')).toBe(1);
    expect(D.lastDayOfMonth('2024-02-10')).toBe('2024-02-29');
    expect(D.make(5, 1, 2)).toBe('0005-01-02');
    expect(D.isLeap(1900)).toBe(false);
    expect(D.isLeap(2000)).toBe(true);
  });
});
