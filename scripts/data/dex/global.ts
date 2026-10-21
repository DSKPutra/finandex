// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Finandex AI (global) — file #1 (§4.1). Port of run_global() in kit/reference/finandex_reference.py.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { anchorDate, daysBetween, type CalDate } from '../../../src/shared/dates.ts';
import { assetCoreMetrics, calendarYearReturns, corr, LOW_PRECISION_REL_TICK, rsi14, sma, type Series } from '../../../src/shared/analytics/series.ts';
import { fnum } from '../../../src/shared/analytics/stats.ts';
import { num, readCsv } from '../lib/csv.ts';
import { emptyOHLCV, seriesDoc, sortByDate, type OHLCV } from '../lib/frame.ts';
import { ROOT, x } from '../lib/io.ts';
import type { DexModule, ModuleResult } from '../lib/module.ts';

export const GLOBAL_CSV = () => x('Global_Financial_Markets_Dataset_2000-Present', 'global_financial_markets_2000_Now.csv');
export const META_JSON = () => join(ROOT, 'kit/reference/asset_metadata_authored.json');

export function slug(sym: string): string {
  return sym.replace('^', '').replace(/=/g, '-').replace(/\./g, '-');
}

interface Meta {
  display_name: string;
  display_name_id: string;
  category: string;
  country: string;
  country_id: string;
  geo_region: string;
  quote_unit: string;
  trading_calendar: string;
  periods_per_year: number;
}

export const globalModule: DexModule = {
  name: 'global',
  dex: ['finandex-ai'],
  inputs: [1],
  requires: () => [GLOBAL_CSV()],
  async build(ctx): Promise<ModuleResult> {
    const meta = JSON.parse(readFileSync(META_JSON(), 'utf8')) as Record<string, Meta>;
    const rows = readCsv(GLOBAL_CSV());
    const bySym = new Map<string, OHLCV & { name: string; type: string }>();
    for (const r of rows) {
      const s = r.symbol!;
      let g = bySym.get(s);
      if (!g) bySym.set(s, (g = { ...emptyOHLCV(), name: r.asset_name!, type: r.asset_type! }));
      g.d.push(r.date!);
      g.o.push(num(r.open));
      g.h.push(num(r.high));
      g.l.push(num(r.low));
      g.c.push(num(r.close));
      g.v.push(num(r.volume));
    }
    const syms = [...bySym.keys()].sort();
    const metaKeys = Object.keys(meta).sort();
    if (JSON.stringify(syms) !== JSON.stringify(metaKeys)) throw new Error('metadata must cover exactly the dataset symbols');

    const metrics: Record<string, Record<string, unknown>> = {};
    const cal: Record<string, unknown> = {};
    const quality: Record<string, Record<string, unknown>> = {};
    const series: Record<string, Series> = {};
    const files: Record<string, unknown> = {};

    for (const sym of syms) {
      const g = sortByDate(bySym.get(sym)!);
      const md = meta[sym]!;
      const { d, c } = g;
      const m = assetCoreMetrics(d, c, md.periods_per_year);
      Object.assign(m, { symbol: sym, asset_name: g.name, asset_type: g.type });
      m.sma50 = sma(c, 50);
      m.sma200 = sma(c, 200);
      m.rsi14 = rsi14(c);
      metrics[sym] = m;
      cal[sym] = calendarYearReturns(d, c);
      series[sym] = { d, p: c };

      let sanit = 0;
      let flat = 0;
      const nonpos: CalDate[] = [];
      let maxGap = 0;
      let volZero = 0;
      const a1 = anchorDate(d[d.length - 1]!, '1Y');
      let recent = 0;
      let recentPos = 0;
      for (let i = 0; i < d.length; i++) {
        const o = g.o[i]!;
        const h = g.h[i]!;
        const l = g.l[i]!;
        const cc = c[i]!;
        const v = g.v[i]!;
        if (h < Math.max(o, l, cc) || l > Math.min(o, h, cc)) sanit++;
        if (o === h && h === l && l === cc) flat++;
        if (cc <= 0) nonpos.push(d[i]!);
        if (i > 0) maxGap = Math.max(maxGap, daysBetween(d[i - 1]!, d[i]!));
        if (v === 0) volZero++;
        if (d[i]! > a1) {
          recent++;
          if (v > 0) recentPos++;
        }
      }
      const last = c[c.length - 1]!;
      const q = {
        candles_sanitized: sanit,
        flat_ohlc_rows: flat,
        nonpositive_close_rows: nonpos,
        max_gap_calendar_days: maxGap,
        has_volume: recent > 0 && recentPos / recent >= 0.9,
        volume_zero_share: fnum(volZero / d.length),
        low_precision: 0.0001 / Math.abs(last) >= LOW_PRECISION_REL_TICK,
        rel_tick_at_last_close: fnum(0.0001 / Math.abs(last)),
      };
      quality[sym] = q;
      files[`core/global/series/${slug(sym)}.json`] = seriesDoc(sym, d, { o: g.o, h: g.h, l: g.l, c, ...(q.has_volume ? { v: g.v } : {}) }, { quality: q });
      ctx.shared.set(`global:${sym}`, series[sym]!);
    }

    const corrm: Record<string, Record<string, number | null>> = {};
    for (const a of syms) {
      corrm[a] = {};
      for (const b of syms) corrm[a]![b] = a === b ? 1.0 : a < b ? corr(series[a]!, series[b]!, 3) : corrm[b]![a]!;
    }
    const asOf = syms.map((s) => metrics[s]!.last_date as string).sort().at(-1)!;
    const catalog = syms.map((sym) => ({
      ...meta[sym]!,
      symbol: sym,
      asset_name: metrics[sym]!.asset_name,
      asset_type: metrics[sym]!.asset_type,
      dataset_region: 'Global',
      slug: slug(sym),
      first_date: metrics[sym]!.first_date,
      last_date: metrics[sym]!.last_date,
      rows: metrics[sym]!.rows,
      quality: quality[sym],
    }));
    const catalogDoc = { dataset: 'global', as_of: asOf, assets: catalog };

    files['core/global/catalog.json'] = {
      ...catalogDoc,
      assets: catalog.map((a) => ({ ...a, metrics: metrics[a.symbol] })),
    };
    files['core/global/metrics.json'] = metrics;
    files['core/global/correlation_3y.json'] = { as_of: asOf, symbols: syms, matrix: corrm };
    files['core/global/calendar_returns.json'] = cal;
    files['core/global/quality.json'] = {
      as_of: asOf,
      assets: quality,
      notes: {
        wti_negative: 'CL=F close -37.63 on 2020-04-20 is real; max drawdown below -100% is shown with a footnote; log scale disabled for series with values <= 0.',
        low_precision: 'JPYUSD=X and INRUSD=X are quoted with 4 decimals (1 tick ≈ 1.6% / 0.95%) → low-precision badge.',
        fx_volume: 'Currency volume is always 0 → volume panel hidden; volume 0 = not available.',
        candles: '3,327 rows with close outside high–low and 7 rows with high < low: for candlesticks only, high = max(o,h,l,c), low = min(o,h,l,c).',
        fx_bar_shift: 'FX bars can be shifted by one day from the event date (e.g. the CHF spike is recorded on the 2015-01-16 bar).',
      },
    };

    return {
      dex: ['finandex-ai'],
      status: 'built',
      asOf,
      golden: {
        'global/catalog.json': catalogDoc,
        'global/golden_metrics.json': metrics,
        'global/golden_calendar_returns.json': cal,
        'global/golden_correlation_3y.json': corrm,
      },
      files,
      quality: { assets: syms.length, rows: rows.length },
    };
  },
};
