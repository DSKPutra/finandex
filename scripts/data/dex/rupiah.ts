// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// RupiahDex — file #7 (§4.6). Port of run_usdidr() in kit/reference/finandex_reference_id.py.
import { assetCoreMetrics, calendarYearReturns, fxClean, rsi14, sma } from '../../../src/shared/analytics/series.ts';
import { fnum, mean } from '../../../src/shared/analytics/stats.ts';
import { idxOnOrBefore, year } from '../../../src/shared/dates.ts';
import { num, readCsv } from '../lib/csv.ts';
import { x } from '../lib/io.ts';
import { seriesDoc } from '../lib/frame.ts';
import type { DexModule, ModuleResult } from '../lib/module.ts';

const CSV = () => x('USDIDR_daily_exchange_rate', 'usd_idr_daily_cleaned.csv');
export const RUPIAH_LOOKUPS = ['2008-10-24', '2015-09-29', '2018-10-11', '2020-03-23', '2024-06-21', '2026-01-02'];

export const rupiahModule: DexModule = {
  name: 'rupiah',
  dex: ['rupiahdex'],
  inputs: [7],
  requires: () => [CSV()],
  async build(ctx): Promise<ModuleResult> {
    const raw = readCsv(CSV());
    const n0 = raw.length;
    // calendar date AS WRITTEN (first 10 chars) — never shift by the +01:00 offset
    const rows = raw
      .map((r) => ({ d: r.Date!.slice(0, 10), o: num(r.Open), h: num(r.High), l: num(r.Low), c: num(r.Close) }))
      .filter((r) => !Number.isNaN(r.c))
      .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
    const { d, p, removed } = fxClean(
      rows.map((r) => r.d),
      rows.map((r) => r.c),
    );
    const m = assetCoreMetrics(d, p, 252);
    m.sma50 = sma(p, 50);
    m.sma200 = sma(p, 200);
    m.rsi14 = rsi14(p);
    const cal = calendarYearReturns(d, p);
    const byYear = new Map<number, number[]>();
    d.forEach((dd, i) => {
      const y = year(dd);
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y)!.push(p[i]!);
    });
    const yavg: Record<string, number | null> = {};
    for (const y of [...byYear.keys()].sort((a, b) => a - b)) yavg[String(y)] = fnum(mean(byYear.get(y)!));
    const lookups: Record<string, { date: string; close: number | null }> = {};
    for (const q of RUPIAH_LOOKUPS) {
      const i = idxOnOrBefore(d, q);
      lookups[q] = { date: d[i]!, close: fnum(p[i]) };
    }
    // cross-check with IDFinanDex USDIDR (after its own cleaning)
    const other = ctx.shared.get('idfin:USDIDR');
    let cross: Record<string, unknown> | null = null;
    if (other) {
      const om = new Map(other.d.map((dd, i) => [dd, other.p[i]!]));
      let overlap = 0;
      let maxDiff = 0;
      let gt1 = 0;
      d.forEach((dd, i) => {
        const v = om.get(dd);
        if (v === undefined) return;
        overlap++;
        const diff = Math.abs(v / p[i]! - 1);
        if (diff > maxDiff) maxDiff = diff;
        if (diff > 0.01) gt1++;
      });
      cross = { overlap_days: overlap, max_abs_diff: fnum(maxDiff), days_diff_gt_1pct: gt1 };
    }
    const quality = { rows_raw: n0, rows_dropped_null_close: n0 - rows.length, spikes_removed: removed, cross_check_vs_idfin: cross };
    const removedSet = new Set(removed);
    const kept = rows.filter((r) => !removedSet.has(r.d));
    const asOf = d[d.length - 1]!;
    ctx.shared.set('rupiah:USDIDR', { d, p });
    return {
      dex: ['rupiahdex'],
      status: 'built',
      asOf,
      golden: {
        'usdidr/golden_metrics.json': m,
        'usdidr/golden_calendar_returns.json': cal,
        'usdidr/golden_yearly_average.json': yavg,
        'usdidr/golden_lookups.json': lookups,
        'usdidr/quality_report.json': quality,
      },
      files: {
        'core/rupiah/series.json': seriesDoc(
          'USDIDR',
          kept.map((r) => r.d),
          { o: kept.map((r) => r.o), h: kept.map((r) => r.h), l: kept.map((r) => r.l), c: kept.map((r) => r.c) },
          { note: 'USD/IDR close; rising = rupiah weakening. Bad prints removed (§4.6).' },
        ),
        'core/rupiah/metrics.json': m,
        'core/rupiah/calendar_returns.json': cal,
        'core/rupiah/yearly_average.json': yavg,
        'core/rupiah/quality.json': quality,
      },
    };
  },
};
