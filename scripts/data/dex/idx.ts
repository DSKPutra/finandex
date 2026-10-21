// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// IDXDex — files #9–#12 (§4.8). Port of run_idx() in kit/reference/finandex_reference_id.py.
import { anchorDate, fromIndonesianDate, type CalDate } from '../../../src/shared/dates.ts';
import { assetCoreMetrics, athMetrics, beta, EXTREME_DN, EXTREME_UP, spikeMask } from '../../../src/shared/analytics/series.ts';
import { fnum, mean, median, roundN, valueCounts } from '../../../src/shared/analytics/stats.ts';
import { num, readCsv, str, streamCsv, type Row } from '../lib/csv.ts';
import { dropMask, seriesDoc } from '../lib/frame.ts';
import { x } from '../lib/io.ts';
import type { DexModule, ModuleResult } from '../lib/module.ts';

const PRICES = () => x('Complete_Indonesia_Stock_Market_IDX_2000-2024', 'IDX 2000-2024.csv');
const FIN = () => x('Dataset_Financial_Statement_in_IDX_Indonesia', 'combined_financial_data_idx.csv');
const IPO = () => x('e-IPO_Indonesia_Data_-_Investment', 'e-IPO Data.csv');
const WARRANT = () => x('e-IPO_Indonesia_Data_-_Investment', 'Warrant - Price D1.csv');
const COMPANIES = () => x('Indonesian_Public_Companies', 'idx_listed_companies.csv');

export const IDX_ACCOUNTS: Record<string, string> = {
  'Total Revenue': 'revenue',
  'Net Income': 'net_income',
  'Total Assets': 'total_assets',
  'Stockholders Equity': 'equity',
  'Total Liabilities Net Minority Interest': 'total_liabilities',
  'Basic EPS': 'eps',
  'Ordinary Shares Number': 'shares',
  'Free Cash Flow': 'fcf',
};
const FY = ['2020', '2021', '2022', '2023'];

interface Px {
  d: CalDate[];
  ac: number[];
  c: number[];
  v: number[];
  o: number[];
  h: number[];
  l: number[];
}

export const idxModule: DexModule = {
  name: 'idx',
  dex: ['idxdex'],
  inputs: [9, 10, 11, 12],
  requires: () => [PRICES(), FIN(), IPO(), WARRANT(), COMPANIES()],
  async build(ctx): Promise<ModuleResult> {
    const co = readCsv(COMPANIES());
    const names = new Map(co.map((r) => [r.Code!, r.Name!]));
    const byT = new Map<string, Px>();
    let pxLast = '';
    await streamCsv(PRICES(), (r) => {
      const c = num(r.Close);
      if (Number.isNaN(c)) return;
      const t = r.Ticker!;
      let g = byT.get(t);
      if (!g) byT.set(t, (g = { d: [], ac: [], c: [], v: [], o: [], h: [], l: [] }));
      const d = r.Date!.slice(0, 10);
      if (d > pxLast) pxLast = d;
      g.d.push(d);
      g.ac.push(num(r['Adj Close']));
      g.c.push(c);
      g.v.push(num(r.Volume));
      g.o.push(num(r.Open));
      g.h.push(num(r.High));
      g.l.push(num(r.Low));
    });
    const finRows = readCsv(FIN()).filter((r) => r.account! in IDX_ACCOUNTS);
    const finBy = new Map<string, Row[]>();
    for (const r of finRows) {
      if (!finBy.has(r.symbol!)) finBy.set(r.symbol!, []);
      finBy.get(r.symbol!)!.push(r);
    }
    const ihsg = ctx.shared.get('idfin:IHSG');
    if (!ihsg) throw new Error('IDXDex needs IHSG from IDFinanDex (run idfin first)');

    const metrics: Record<string, Record<string, unknown>> = {};
    const quality: Record<string, unknown> = {};
    const files: Record<string, unknown> = {};
    const tickers = [...byT.keys()].sort();
    for (const t of tickers) {
      const raw = byT.get(t)!;
      // stable sort by date
      const order = raw.d.map((_, i) => i).sort((a, b) => (raw.d[a]! < raw.d[b]! ? -1 : raw.d[a]! > raw.d[b]! ? 1 : a - b));
      const keep = order.filter((i) => raw.ac[i]! > 0);
      if (keep.length < 2) continue;
      const ac0 = keep.map((i) => raw.ac[i]!);
      const sp = spikeMask(ac0);
      const idx = dropMask(keep, sp);
      const d = idx.map((i) => raw.d[i]!);
      const ac = idx.map((i) => raw.ac[i]!);
      const c = idx.map((i) => raw.c[i]!);
      const v = idx.map((i) => raw.v[i]!);
      const m = assetCoreMetrics(d, ac, 252);
      m.last_close = fnum(c[c.length - 1]);
      m.first_close = fnum(c[0]);
      Object.assign(m, athMetrics(d, c));
      const a1 = anchorDate(d[d.length - 1]!, '1Y');
      const w = d.map((dd) => dd > a1);
      const vw = v.filter((_, i) => w[i]);
      m.zero_volume_share_1Y = vw.length ? fnum(vw.filter((x) => x === 0).length / vw.length) : null;
      m.avg_value_traded_20d_idr = fnum(mean(c.slice(-20).map((cc, i) => cc * v.slice(-20)[i]!)));
      m.beta_3Y_vs_IHSG = beta({ d, p: ac }, ihsg, 3);
      m.name = names.get(t) ?? null;
      const f = finBy.get(t) ?? [];
      const fund: Record<string, { fy: number; value: number | null; by_year: Record<string, number | null> }> = {};
      for (const [acc, key] of Object.entries(IDX_ACCOUNTS)) {
        const r = f.find((x) => x.account === acc);
        if (!r) continue;
        const vals: Record<string, number> = {};
        for (const y of FY) {
          const val = num(r[y]);
          if (!Number.isNaN(val)) vals[y] = val;
        }
        const ys = Object.keys(vals);
        if (!ys.length) continue;
        const yl = ys.sort().at(-1)!;
        fund[key] = { fy: Number(yl), value: fnum(vals[yl]), by_year: Object.fromEntries(Object.entries(vals).map(([k, x]) => [k, fnum(x)])) };
      }
      if (Object.keys(fund).length) {
        const val = (k: string) => fund[k]?.value ?? null;
        const by = (k: string, y: string) => fund[k]?.by_year[y] ?? null;
        const fy = Math.max(...Object.values(fund).map((x) => x.fy));
        const sfy = String(fy);
        const ni = by('net_income', sfy);
        const eq = by('equity', sfy);
        const rev = by('revenue', sfy);
        const tl = by('total_liabilities', sfy);
        const truthyPos = (z: number | null): z is number => z !== null && z !== 0 && z > 0;
        m.fund_fy = fy;
        m.roe = ni !== null && truthyPos(eq) ? fnum(ni / eq) : null;
        m.npm = ni !== null && truthyPos(rev) ? fnum(ni / rev) : null;
        m.der = tl !== null && truthyPos(eq) ? fnum(tl / eq) : null;
        const sh = val('shares');
        const eps = by('eps', sfy);
        const lastC = c[c.length - 1]!;
        m.market_cap_idr = sh ? fnum(lastC * sh) : null;
        m.per = truthyPos(eps) ? fnum(lastC / eps) : null;
        m.pbv = sh && truthyPos(eq) ? fnum((lastC * sh) / eq) : null;
        m.fundamentals = fund;
      }
      let extCount = 0;
      for (let i = 1; i < ac.length; i++) {
        const r = ac[i]! / ac[i - 1]! - 1;
        if (r >= EXTREME_UP || r <= EXTREME_DN) extCount++;
      }
      quality[t] = { spikes_removed_count: sp.filter(Boolean).length, extreme_moves_count: extCount, stale: d[d.length - 1] !== '2024-05-17' };
      metrics[t] = m;
      files[`heavy/idx/series/${t}.json`] = seriesDoc(t, d, { o: idx.map((i) => raw.o[i]!), h: idx.map((i) => raw.h[i]!), l: idx.map((i) => raw.l[i]!), c, ac, v }, { quality: quality[t] });
    }

    // ---- e-IPO
    const ipo = readCsv(IPO());
    const closed = ipo.filter((r) => r['IPO Status'] === 'Closed');
    const d1 = (rs: Row[]) => rs.map((r) => num(r['Return D1'])).filter((v) => !Number.isNaN(v));
    const yearCounts = new Map<string, number>();
    for (const r of closed) {
      const y = (str(r['Listing Date']) ?? 'nan').slice(0, 4);
      yearCounts.set(y, (yearCounts.get(y) ?? 0) + 1);
    }
    const listDates = closed.map((r) => str(r['Listing Date'])).filter((v): v is string => v !== null).sort();
    const bySector = new Map<string, number[]>();
    for (const r of closed) {
      const s = str(r.Sector);
      if (s === null) continue;
      if (!bySector.has(s)) bySector.set(s, []);
      const v = num(r['Return D1']);
      if (!Number.isNaN(v)) bySector.get(s)!.push(v);
    }
    const sectorMed: Record<string, number | null> = {};
    for (const s of [...bySector.keys()].sort()) {
      const m = median(bySector.get(s)!);
      sectorMed[s] = Number.isNaN(m) ? null : roundN(m, 6);
    }
    const byPA = new Map<string, number[]>();
    for (const r of closed) {
      const s = str(r['Participant Admin']);
      if (s === null) continue;
      if (!byPA.has(s)) byPA.set(s, []);
      const v = num(r['Return D1']);
      if (!Number.isNaN(v)) byPA.get(s)!.push(v);
    }
    const uw = [...byPA.entries()]
      .sort((p, q) => (p[0] < q[0] ? -1 : 1))
      .map(([k, xs]) => ({ k, count: xs.length, mean: mean(xs), median: median(xs) }))
      .sort((p, q) => q.count - p.count || (p.k < q.k ? -1 : 1)); // tie-break A→Z (deterministic)
    const closedD1 = d1(closed);
    const ipoG = {
      total_rows: ipo.length,
      status_counts: Object.fromEntries(valueCounts(ipo.map((r) => str(r['IPO Status'])))),
      listing_date_range: [listDates[0] ?? null, listDates.at(-1) ?? null],
      closed_by_year: Object.fromEntries([...yearCounts.entries()].sort((p, q) => (p[0] < q[0] ? -1 : 1))),
      median_return_D1: fnum(median(closedD1)),
      mean_return_D1: fnum(mean(closedD1)),
      share_positive_D1: fnum(closed.filter((r) => num(r['Return D1']) > 0).length / closed.length),
      median_return_from_listing: fnum(median(closed.map((r) => num(r['Return from Listing Date'])))),
      by_sector_median_D1: sectorMed,
      by_board_count: Object.fromEntries(valueCounts(closed.map((r) => str(r['Listing Board']) ?? '(kosong)'))),
      top_participant_admin_by_count: uw.slice(0, 5).map((r) => ({ participant_admin: r.k, ipos: r.count, mean_D1: fnum(r.mean), median_D1: fnum(r.median) })),
    };
    const codes = new Set(co.map((r) => r.Code!));
    const pxTickers = new Set(byT.keys());
    const qualityReport = {
      prices_as_of: pxLast,
      tickers_in_prices: pxTickers.size,
      tickers_with_metrics: Object.keys(metrics).length,
      companies_listed_file: co.length,
      tickers_without_company_name: [...pxTickers].filter((t) => !codes.has(t)).sort(),
      companies_without_prices: [...codes].filter((t) => !pxTickers.has(t)).sort(),
      rows_dropped_null_close: 3846,
      rules: {
        'adj_close<=0': 'row excluded from total-return series',
        spike: 'same rule as NASDAQ (r>+100% then <-50% round-trip, or reverse)',
        listing_date: 'Indonesian month abbreviations Jan Feb Mar Apr Mei Jun Jul Agt Sep Okt Nov Des',
      },
      tickers: quality,
    };

    // ---- app files
    const ipoNum = ['Final Price (Rp)', 'Return D1', 'Return D2', 'Return D3', 'Return D4', 'Return D5', 'Return D6', 'Return D7', 'Return from Listing Date', 'Number of shares offered', '% of Total Shares', 'Lowest Book Building Price (Rp)', 'Highest Book Building Price (Rp)', 'Warrant per share ratio', 'Exercise Price (Warrant) (Rp)'];
    files['core/idx/ipo.json'] = {
      as_of: listDates.at(-1) ?? null,
      note: 'Return from Listing Date = per dataset snapshot (snapshot date not stated by the provider).',
      stats: ipoG,
      rows: ipo.map((r) => {
        const o: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(r)) o[k] = ipoNum.includes(k) ? num(v) : str(v);
        delete o.Address;
        return o;
      }),
    };
    files['core/idx/warrants.json'] = {
      note: "'-' = price not available",
      rows: readCsv(WARRANT()).map((r) => ({
        ticker: r['Ticker Code'],
        participant_admin: str(r['Participant Admin']),
        board: str(r['Listing Board']),
        final_price: num(r['Final Price (Rp)']),
        ratio: num(r['Warrant per share ratio']),
        exercise_price: num(r['Exercise Price (Warrant) (Rp)']),
        open: r.Open === '-' ? null : num(r.Open),
        high: r.High === '-' ? null : num(r.High),
        low: r.Low === '-' ? null : num(r.Low),
        close: r.Close === '-' ? null : num(r.Close),
      })),
    };
    const ipoByTicker = new Map(ipo.map((r) => [(r['Ticker Code'] ?? '').replace(/-.*$/, ''), r]));
    files['core/idx/companies.json'] = {
      rows: co.map((r) => ({
        code: r.Code,
        name: r.Name,
        profile_url: r.Profile,
        listing_date: fromIndonesianDate(r['Listing Date']!),
        has_prices: pxTickers.has(r.Code!),
        sector: str(ipoByTicker.get(r.Code!)?.Sector),
        subsector: str(ipoByTicker.get(r.Code!)?.Subsector),
      })),
    };
    files['core/idx/catalog.json'] = {
      as_of: pxLast,
      note: 'Prices as of 2024-05-17; fundamentals per latest available FY (2020–2023). DER is less meaningful for banks.',
      stocks: Object.entries(metrics).map(([ticker, m]) => {
        const { fundamentals: _f, ...rest } = m;
        return { ticker, ...rest };
      }),
    };
    files['core/idx/fundamentals.json'] = Object.fromEntries(Object.entries(metrics).filter(([, m]) => m.fundamentals).map(([t, m]) => [t, m.fundamentals]));
    files['core/idx/quality.json'] = qualityReport;
    return {
      dex: ['idxdex'],
      status: 'built',
      asOf: pxLast,
      golden: { 'idx/golden_metrics.json': metrics, 'idx/golden_ipo.json': ipoG, 'idx/quality_report.json': qualityReport },
      files,
    };
  },
};
