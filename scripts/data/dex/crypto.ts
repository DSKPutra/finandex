// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// CryptDex (a) price history #14 and (b) CoinGecko snapshot #15 (§4.9). Port of run_crypto() in finandex_reference_x.py.
import { readdirSync } from 'node:fs';
import { assetCoreMetrics, EXTREME_DN, EXTREME_UP, spikeMask } from '../../../src/shared/analytics/series.ts';
import { fnum, median, nlargest, nsmallest, sum } from '../../../src/shared/analytics/stats.ts';
import { num, readCsv, str, type Row } from '../lib/csv.ts';
import { dropMask, pick, seriesDoc } from '../lib/frame.ts';
import { x } from '../lib/io.ts';
import type { DexModule, ModuleResult } from '../lib/module.ts';

const PRICES = () => x('Crypto_Prices_Historical_Data');
const CG = () => x('Daily_Crypto_Market_Tracker_CoinGecko', 'crypto_daily_history.csv');

export function isStablecoin(r: Row): boolean {
  const s = (str(r.symbol) ?? 'nan').toLowerCase();
  const n = (str(r.name) ?? 'nan').toLowerCase();
  const p = num(r.current_price_usd);
  if (!(p >= 0.97 && p <= 1.03) || n.includes('fund')) return false;
  return s.includes('usd') || n.includes('usd') || n.includes('dollar') || n.includes('stable') || s === 'dai' || s === 'gho';
}

const CG_NUM = ['market_cap_rank', 'current_price_usd', 'market_cap_usd', 'fully_diluted_valuation', 'total_volume_usd', 'high_24h', 'low_24h', 'price_change_24h', 'price_change_pct_1h', 'price_change_pct_24h', 'price_change_pct_7d', 'price_change_pct_30d', 'circulating_supply', 'total_supply', 'max_supply', 'ath', 'ath_change_pct', 'atl', 'atl_change_pct'];

export const cryptoModule: DexModule = {
  name: 'crypto',
  dex: ['cryptdex'],
  inputs: [14, 15],
  requires: () => [PRICES(), CG()],
  async build(): Promise<ModuleResult> {
    const metrics: Record<string, Record<string, unknown>> = {};
    const quality: Record<string, unknown> = {};
    const files: Record<string, unknown> = {};
    for (const f of readdirSync(PRICES()).filter((n) => n.endsWith('.csv')).sort()) {
      const t = f.slice(0, -4); // asset id = file stem (TON.csv: TON → GRAM from 2026-06-16)
      const g = readCsv(`${PRICES()}/${f}`).sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0));
      const cAll = g.map((r) => num(r.close));
      const msp = spikeMask(cAll);
      const gg = dropMask(g, msp);
      const d = gg.map((r) => r.date!);
      const c = gg.map((r) => num(r.close));
      const m = assetCoreMetrics(d, c, 365);
      m.ticker = t;
      const hist: { ticker: string; from: string; to: string }[] = [];
      const seen = new Map<string, { ticker: string; from: string; to: string }>();
      for (const r of g) {
        const k = r.ticker!;
        const h = seen.get(k);
        if (!h) {
          const e = { ticker: k, from: r.date!, to: r.date! };
          seen.set(k, e);
          hist.push(e);
        } else {
          if (r.date! < h.from) h.from = r.date!;
          if (r.date! > h.to) h.to = r.date!;
        }
      }
      m.ticker_history = hist;
      const ext: { date: string; ret: number | null }[] = [];
      for (let i = 1; i < c.length; i++) {
        const r = c[i]! / c[i - 1]! - 1;
        if (r >= EXTREME_UP || r <= EXTREME_DN) ext.push({ date: d[i]!, ret: fnum(r) });
      }
      quality[t] = {
        spikes_removed: pick(g, msp).map((r) => r.date!),
        extreme_moves: ext,
        zero_volume_rows: gg.filter((r) => num(r.volume) === 0).length,
        stale: d[d.length - 1] !== '2026-10-19',
      };
      metrics[t] = m;
      files[`core/crypto/series/${t}.json`] = seriesDoc(t, d, { o: gg.map((r) => num(r.open)), h: gg.map((r) => num(r.high)), l: gg.map((r) => num(r.low)), c, v: gg.map((r) => num(r.volume)) }, { ticker_history: hist, quality: quality[t] });
    }
    const cg = readCsv(CG());
    const stable = cg.filter(isStablecoin);
    const tot = sum(cg.map((r) => num(r.market_cap_usd)));
    const bySym = (s: string) => num(cg.find((r) => r.symbol === s)!.market_cap_usd);
    const top100 = cg.filter((r) => num(r.market_cap_rank) <= 100);
    const rec = (r: Row, cols: string[]) => Object.fromEntries(cols.map((c) => [c, CG_NUM.includes(c) ? fnum(num(r[c])) : str(r[c])]));
    const stSum = sum(stable.map((r) => num(r.market_cap_usd)));
    const snap = {
      snapshot_date: cg[0]!.date,
      coins: cg.length,
      total_market_cap_top250_usd: fnum(tot),
      btc_dominance_top250: fnum(bySym('btc') / tot),
      eth_dominance_top250: fnum(bySym('eth') / tot),
      stablecoins_heuristic: stable.map((r) => r.symbol!).sort(),
      stablecoin_market_cap_usd: fnum(stSum),
      stablecoin_share_top250: fnum(stSum / tot),
      top10_by_market_cap: nsmallest(cg, 10, (r) => num(r.market_cap_rank)).map((r) => rec(r, ['market_cap_rank', 'symbol', 'name', 'current_price_usd', 'market_cap_usd'])),
      top5_7d_gainers_top100: nlargest(top100, 5, (r) => num(r.price_change_pct_7d)).map((r) => rec(r, ['symbol', 'name', 'price_change_pct_7d'])),
      top5_7d_losers_top100: nsmallest(top100, 5, (r) => num(r.price_change_pct_7d)).map((r) => rec(r, ['symbol', 'name', 'price_change_pct_7d'])),
      median_ath_change_pct_top100: fnum(median(top100.map((r) => num(r.ath_change_pct)))),
      notes: {
        pct_fields: 'price_change_pct_* and ath_change_pct are already in PERCENT units (e.g. 0.86634 = 0.87%)',
        max_supply_null: 'null = no fixed max supply (or not reported)',
      },
    };
    const qualityReport = {
      tickers: quality,
      notes: {
        TON_GRAM: "TON.csv changes ticker from TON to GRAM on 2026-06-16 with a continuous price (close 2026-06-15 = open 2026-06-16); treat as ONE asset with ticker_history, display 'TON -> GRAM'.",
        defi: "DeFi notebook references 7 DefiLlama CSVs that were NOT supplied; DeFi module is 'pending data'.",
      },
    };
    files['core/crypto/catalog.json'] = { as_of: '2026-10-19', assets: Object.values(metrics) };
    files['core/crypto/snapshot.json'] = {
      ...snap,
      coins_table: cg.map((r) => ({
        ...rec(r, ['coin_id', 'symbol', 'name', 'ath_date', 'atl_date', ...CG_NUM]),
        stablecoin_heuristic: isStablecoin(r),
      })),
    };
    files['core/crypto/quality.json'] = {
      ...qualityReport,
      notes: { TON_GRAM: qualityReport.notes.TON_GRAM, stablecoin: 'Stablecoins are identified HEURISTICALLY (dataset has no category): price within ±3% of US$1 AND symbol/name contains usd/dollar/stable (or dai/gho) AND name without "fund".' },
    };
    return {
      dex: ['cryptdex'],
      status: 'built',
      asOf: cg[0]!.date!,
      golden: { 'crypto/golden_metrics.json': metrics, 'crypto/golden_snapshot.json': snap, 'crypto/quality_report.json': qualityReport },
      files,
    };
  },
};
