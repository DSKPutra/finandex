// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// SYNTHETIC test fixture for the stock-universe tools (NASDAQDex / SnP500Dex) while inputs #2/#3 are missing.
// Deterministic random-walk prices run through the real ETL functions; written to a temp dir, never served.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { addDays, type CalDate } from '../../../src/shared/dates.ts';
import type { DataStore } from '../../../server/data/store.ts';
import {
  buildMatrix,
  dividendProfile,
  pulse,
  seriesFile,
  stockUniverse,
  type Bars,
} from '../../../scripts/data/dex/stocks.ts';
import { fileStore } from '../../../scripts/eval/fs-store.ts';

function rng(seed: number) {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
}

function days(from: CalDate, to: CalDate): CalDate[] {
  const out: CalDate[] = [];
  for (let d = from, i = 0; d <= to; d = addDays(d, 1), i++) {
    const dow = (i + 5) % 7; // 2015-01-02 is a Friday
    if (dow !== 5 && dow !== 6) out.push(d);
  }
  return out;
}

function bars(dates: CalDate[], seed: number, start: number, withDiv: boolean, split?: CalDate): Bars {
  const r = rng(seed);
  const b: Bars = { d: [], o: [], h: [], l: [], c: [], ac: [], v: [], div: [], split: [] };
  let c = start;
  let adj = 1;
  dates.forEach((d, i) => {
    c = Math.max(1, c * (1 + (r() - 0.48) * 0.04));
    const div = withDiv && i % 63 === 30 ? c * 0.006 : 0;
    adj *= 1 + div / c;
    b.d.push(d);
    b.o.push(c * (1 + (r() - 0.5) * 0.01));
    b.h.push(c * 1.01);
    b.l.push(c * 0.99);
    b.c.push(c);
    b.ac!.push(c * adj);
    b.v!.push(Math.round(1e6 * (1 + r())));
    b.div!.push(div);
    b.split!.push(split && d === split ? 4 : 0);
  });
  return b;
}

let cached: Promise<DataStore> | null = null;

export function stockStore(): Promise<DataStore> {
  return (cached ??= Promise.resolve().then(() => {
    const root = mkdtempSync(join(tmpdir(), 'finandex-stock-fixture-'));
    const put = (p: string, v: unknown) => {
      mkdirSync(dirname(join(root, p)), { recursive: true });
      writeFileSync(join(root, p), v instanceof Uint8Array ? v : JSON.stringify(v));
    };
    const dates = days('2015-01-02', '2026-08-31');
    const byT = new Map<string, Bars>([
      ['AAA', bars(dates, 1, 50, true)],
      ['BBB', bars(dates, 2, 120, true, dates[1500])],
      ['CCC', bars(dates, 3, 20, false)],
      ['DDD', bars(dates.slice(800), 4, 80, false)],
      ['EEE', bars(dates.slice(-6), 5, 30, false)],
    ]);
    const bench = { d: dates, p: bars(dates, 9, 1000, false).c };
    for (const key of ['nasdaq', 'sp500'] as const) {
      const adj = key === 'sp500';
      const { metrics } = stockUniverse(byT, adj, bench, 252);
      const quality: Record<string, unknown> = {};
      const divs: Record<string, unknown> = {};
      for (const [t, b] of byT) {
        const q = {
          extreme_moves: [],
          insufficient_history: b.d.length < 30,
          reliable_from: t === 'DDD' ? b.d[0] : null,
        };
        quality[t] = q;
        metrics[t]!.quality_flags = q.insufficient_history ? ['insufficient_history'] : [];
        if (adj) {
          divs[t] = dividendProfile(b);
          Object.assign(metrics[t]!, {
            ttm_yield: (divs[t] as Record<string, unknown>).ttm_yield,
            dividend_increase_streak_years: (divs[t] as Record<string, unknown>).dividend_increase_streak_years,
            avg_dollar_volume_20d: (divs[t] as Record<string, unknown>).avg_dollar_volume_20d,
          });
        }
        put(`heavy/${key}/series/${t}.json`, seriesFile(t, adj ? b : { d: b.d, o: b.o, h: b.h, l: b.l, c: b.c }, q));
      }
      const pul = pulse(byT, adj, metrics, '2015-01-02');
      const { _ew_series, ...rest } = pul;
      put(`core/${key}/catalog.json`, {
        as_of: pul.as_of,
        note: 'SYNTHETIC TEST FIXTURE',
        stocks: Object.values(metrics),
      });
      put(`core/${key}/pulse.json`, { ...rest, ew_series: _ew_series, survivorship_bias: true });
      put(`core/${key}/quality.json`, { rules: {}, totals: {}, tickers: quality });
      if (adj) put('core/sp500/dividends.json', divs);
      const mat = buildMatrix(byT, adj);
      const name = adj ? 'adj' : 'close';
      put(`heavy/${key}/matrix/${name}.meta.json`, mat.meta);
      put(`heavy/${key}/matrix/${name}.f32`, mat.bin);
    }
    return fileStore(root);
  }));
}
