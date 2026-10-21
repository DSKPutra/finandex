// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// IDFinanDex — file #5 (§4.5). Port of run_idfin() in kit/reference/finandex_reference_id.py.
import { join } from 'node:path';
import { assetCoreMetrics, calendarYearReturns, corr, fxClean, rsi14, sma, type Series } from '../../../src/shared/analytics/series.ts';
import { fnum } from '../../../src/shared/analytics/stats.ts';
import { num, readCsv, type Row } from '../lib/csv.ts';
import { INPUTS } from '../lib/io.ts';
import type { DexModule, ModuleResult } from '../lib/module.ts';

export const IDFIN_CSV = () => join(INPUTS, 'Daily_Multi-Asset_Macroeconomic_and_Financial_Time_Series_Dataset_Indonesia_Global_Markets.csv');
export const IDF_MARKET = ['OIL', 'GOLD', 'USDIDR', 'SP500', 'IHSG', 'VIX'] as const;
export const IDF_MACRO = ['CPI', 'BI_rate', 'US_rate'] as const;

export function idfinSeries(rows: Row[], col: string): { d: string[]; p: number[]; cf: number; removed: string[] } {
  const s = rows.filter((r) => !Number.isNaN(num(r[col])));
  let d = s.map((r) => r.Date!);
  let p = s.map((r) => num(r[col]));
  // carried-forward rows: exact repeat of the previous value → not a new observation
  const keep = p.map((v, i) => i === 0 || v !== p[i - 1]);
  const cf = keep.filter((k) => !k).length;
  d = d.filter((_, i) => keep[i]);
  p = p.filter((_, i) => keep[i]);
  let removed: string[] = [];
  if (col === 'USDIDR') {
    const r = fxClean(d, p);
    d = r.d;
    p = r.p;
    removed = r.removed;
  }
  return { d, p, cf, removed };
}

export const idfinModule: DexModule = {
  name: 'idfin',
  dex: ['idfinandex'],
  inputs: [5],
  requires: () => [IDFIN_CSV()],
  async build(ctx): Promise<ModuleResult> {
    const rows = readCsv(IDFIN_CSV())
      .map((r): Row & { Date: string } => ({ ...r, Date: r.Date!.slice(0, 10) }))
      .sort((a, b) => (a.Date < b.Date ? -1 : a.Date > b.Date ? 1 : 0));
    const ser: Record<string, Series> = {};
    const metrics: Record<string, unknown> = {};
    const quality: Record<string, unknown> = {};
    for (const col of IDF_MARKET) {
      const { d, p, cf, removed } = idfinSeries(rows, col);
      ser[col] = { d, p };
      const m = assetCoreMetrics(d, p, 252);
      m.sma200 = sma(p, 200);
      m.rsi14 = rsi14(p);
      metrics[col] = m;
      quality[col] = { carried_forward_rows_excluded: cf, spikes_removed: removed, nonpositive_values: d.filter((_, i) => p[i]! <= 0) };
      ctx.shared.set(`idfin:${col}`, ser[col]!);
    }
    const macro: Record<string, { latest: number | null; latest_date: string; changes: { date: string; value: number | null }[] }> = {};
    for (const col of IDF_MACRO) {
      const s = rows.filter((r) => !Number.isNaN(num(r[col])));
      const changes: { date: string; value: number | null }[] = [];
      s.forEach((r, i) => {
        const v = num(r[col]);
        if (i === 0 || v - num(s[i - 1]![col]) !== 0) changes.push({ date: r.Date, value: fnum(v) });
      });
      macro[col] = { latest: fnum(num(s[s.length - 1]![col])), latest_date: s[s.length - 1]!.Date, changes };
    }
    const corrm: Record<string, Record<string, number | null>> = {};
    for (const a of IDF_MARKET) {
      corrm[a] = {};
      for (const b of IDF_MARKET) corrm[a]![b] = a === b ? 1.0 : corr(ser[a]!, ser[b]!, 3);
    }
    const derived = {
      bi_minus_us_rate: fnum(macro.BI_rate!.latest! - macro.US_rate!.latest!),
      bi_real_rate_vs_cpi: fnum(macro.BI_rate!.latest! - macro.CPI!.latest!),
    };
    const cal: Record<string, unknown> = {};
    for (const k of IDF_MARKET) cal[k] = calendarYearReturns(ser[k]!.d, ser[k]!.p);
    const macroDoc = {
      series: macro,
      derived_latest: derived,
      notes: {
        CPI: 'annual inflation rate in % as provided; one value per calendar year',
        BI_rate: 'Bank Indonesia policy rate %, step series',
        US_rate: 'US policy/short rate % as provided, monthly steps',
      },
    };
    const asOf = rows[rows.length - 1]!.Date;
    const files: Record<string, unknown> = {
      'core/idfin/series.json': {
        as_of: asOf,
        note: 'Market series after removing carried-forward holiday rows; USDIDR after FX bad-print removal (§4.5).',
        series: Object.fromEntries(IDF_MARKET.map((k) => [k, { d: ser[k]!.d, c: ser[k]!.p }])),
      },
      'core/idfin/macro.json': {
        ...macroDoc,
        daily: { d: rows.map((r) => r.Date), CPI: rows.map((r) => num(r.CPI)), BI_rate: rows.map((r) => num(r.BI_rate)), US_rate: rows.map((r) => num(r.US_rate)) },
      },
      'core/idfin/metrics.json': metrics,
      'core/idfin/correlation_3y.json': { as_of: asOf, symbols: IDF_MARKET, matrix: corrm },
      'core/idfin/calendar_returns.json': cal,
      'core/idfin/quality.json': quality,
    };
    return {
      dex: ['idfinandex'],
      status: 'built',
      asOf,
      golden: {
        'idfin/golden_metrics.json': metrics,
        'idfin/golden_macro.json': macroDoc,
        'idfin/golden_correlation_3y.json': corrm,
        'idfin/golden_calendar_returns.json': cal,
        'idfin/quality_report.json': quality,
      },
      files,
    };
  },
};
