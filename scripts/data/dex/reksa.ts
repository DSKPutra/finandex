// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// ReksaDex — file #8 (§4.7). Port of run_reksa() in kit/reference/finandex_reference_id.py.
import { EXTREME_DN, EXTREME_UP } from '../../../src/shared/analytics/series.ts';
import { fnum, median, std, sum } from '../../../src/shared/analytics/stats.ts';
import { fromMDY, year, ymIndex } from '../../../src/shared/dates.ts';
import { slugify } from '../../../src/shared/text.ts';
import { num, readCsv } from '../lib/csv.ts';
import { x } from '../lib/io.ts';
import type { DexModule, ModuleResult } from '../lib/module.ts';

const CSV = () => x('Mutual_Fund_Reksa_Dana_Dataset_in_Indonesia', 'Reksadana di Indonesia.csv');

export const REKSA_TYPE_ID: Record<string, string> = {
  'Capital Protected Fund': 'Terproteksi',
  'Fixed Income Fund': 'Pendapatan Tetap',
  'Equity Fund': 'Saham',
  'Money Market Fund': 'Pasar Uang',
  'Mixed Asset Fund': 'Campuran',
  'Index Fund': 'Indeks',
  'Exchanged Traded Fund': 'ETF',
  'Global Fund': 'Global',
  'Sukuk Based Fund': 'Sukuk',
};

interface R {
  date: string;
  ym: number;
  mi: string;
  bk: string;
  fund: string;
  type: string;
  ccy: string;
  aum: number;
  units: number;
  nav: number;
  r: number;
  extreme: boolean;
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export const reksaModule: DexModule = {
  name: 'reksa',
  dex: ['reksadex'],
  inputs: [8],
  requires: () => [CSV()],
  async build(ctx): Promise<ModuleResult> {
    const raw = readCsv(CSV());
    const rowsTotal = raw.length;
    const a: R[] = [];
    for (const r of raw) {
      const aum = num(r['NAB (Dalam Rupiah)']);
      const units = num(r['Unit Penyertaan']);
      const nav = num(r['NAB per Unit']);
      if (!(aum > 0 && units > 0 && nav > 0)) continue;
      const date = fromMDY(r['Tanggal Lengkap']!);
      a.push({ date, ym: ymIndex(date), mi: r['Nama MI']!, bk: r['Nama BK']!, fund: r['Produk RD']!, type: r['Tipe RD']!, ccy: r.Denominasi!, aum, units, nav, r: NaN, extreme: false });
    }
    // stable sort by (fund, date)
    a.sort((p, q) => cmp(p.fund, q.fund) || cmp(p.date, q.date));
    for (let i = 0; i < a.length; i++) {
      const prev = i > 0 && a[i - 1]!.fund === a[i]!.fund ? a[i - 1]! : null;
      const cur = a[i]!;
      cur.r = prev && cur.ym - prev.ym === 1 ? cur.nav / prev.nav - 1 : NaN;
      cur.extreme = cur.r >= EXTREME_UP || cur.r <= EXTREME_DN;
    }
    const last = a.reduce((m, r) => (r.date > m ? r.date : m), a[0]!.date);
    const L = a.filter((r) => r.date === last);
    const aumTotal = sum(L.map((r) => r.aum));
    const sumBy = (rows: R[], k: 'type' | 'mi' | 'bk' | 'ccy') => {
      const m = new Map<string, { count: number; sum: number[] }>();
      for (const r of rows) {
        if (!m.has(r[k])) m.set(r[k], { count: 0, sum: [] });
        const g = m.get(r[k])!;
        g.count++;
        g.sum.push(r.aum);
      }
      return [...m.entries()].map(([key, g]) => ({ key, count: g.count, aum: sum(g.sum) }));
    };
    const byType = sumBy(L, 'type').sort((p, q) => cmp(p.key, q.key));
    const byMi = sumBy(L, 'mi').sort((p, q) => q.aum - p.aum);
    const byBk = sumBy(L, 'bk').sort((p, q) => q.aum - p.aum);
    const byCcy = sumBy(L, 'ccy').sort((p, q) => cmp(p.key, q.key));
    const byDate = new Map<string, number[]>();
    for (const r of a) {
      if (!byDate.has(r.date)) byDate.set(r.date, []);
      byDate.get(r.date)!.push(r.aum);
    }
    const dates = [...byDate.keys()].sort();
    const aumTs = dates.map((d) => sum(byDate.get(d)!));
    const cntTs = dates.map((d) => byDate.get(d)!.length);
    const aumByYearEnd: Record<string, number | null> = {};
    const cntByYearEnd: Record<string, number> = {};
    dates.forEach((d, i) => {
      aumByYearEnd[String(year(d))] = fnum(aumTs[i]);
      cntByYearEnd[String(year(d))] = cntTs[i]!;
    });

    const lym = ymIndex(last);
    const lastMonth = Number(last.slice(5, 7));
    const funds: Record<string, Record<string, unknown>> = {};
    const fundSeries: Record<string, { d: string[]; nav: number[]; aum: number[] }> = {};
    let i = 0;
    while (i < a.length) {
      let j = i;
      while (j + 1 < a.length && a[j + 1]!.fund === a[i]!.fund) j++;
      const gr = a.slice(i, j + 1);
      i = j + 1;
      const maxYm = Math.max(...gr.map((r) => r.ym));
      fundSeries[gr[0]!.fund] = { d: gr.map((r) => r.date), nav: gr.map((r) => r.nav), aum: gr.map((r) => r.aum) };
      if (maxYm !== lym) continue;
      const byYm = new Map(gr.map((r) => [r.ym, r.nav]));
      const lastNav = byYm.get(maxYm)!;
      const ret = (months: number) => (byYm.has(maxYm - months) ? fnum(lastNav / byYm.get(maxYm - months)! - 1) : null);
      const rr = gr.map((r) => r.r).filter((v) => !Number.isNaN(v));
      const tail = rr.slice(-12);
      const lr = gr[gr.length - 1]!;
      funds[lr.fund] = {
        mi: lr.mi,
        bk: lr.bk,
        type: lr.type,
        ccy: lr.ccy,
        aum: fnum(lr.aum),
        nav: fnum(lr.nav),
        first_date: gr[0]!.date,
        ret_1M: ret(1),
        ret_YTD: ret(lastMonth),
        ret_1Y: ret(12),
        ret_3Y: ret(36),
        vol_1Y_monthly_annualized: tail.length >= 12 ? fnum(std(tail, 1) * Math.sqrt(12)) : null,
        extreme_months: gr.filter((r) => r.extreme).map((r) => r.date),
      };
    }
    const medByType: Record<string, number> = {};
    const tg = new Map<string, number[]>();
    for (const f of Object.values(funds)) {
      const t = f.type as string;
      if (!tg.has(t)) tg.set(t, []);
      if (f.ret_1Y !== null) tg.get(t)!.push(f.ret_1Y as number);
    }
    for (const t of [...tg.keys()].sort()) {
      const m = median(tg.get(t)!);
      if (!Number.isNaN(m)) medByType[t] = m;
    }
    const top10Funds = Object.entries(funds)
      .map(([fund, v]) => ({ fund, mi: v.mi, type: v.type, aum: v.aum as number }))
      .sort((p, q) => q.aum - p.aum)
      .slice(0, 10);
    const industry = {
      as_of: last,
      rows_total: rowsTotal,
      rows_active: a.length,
      active_funds_as_of: L.length,
      aum_total_idr_as_of: fnum(aumTotal),
      aum_by_type_as_of: Object.fromEntries(byType.map((g) => [g.key, { count: g.count, aum: fnum(g.aum) }])),
      aum_by_ccy_as_of: Object.fromEntries(byCcy.map((g) => [g.key, fnum(g.aum)])),
      top10_mi_by_aum: byMi.slice(0, 10).map((g) => ({ mi: g.key, aum: fnum(g.aum), share: fnum(g.aum / aumTotal) })),
      top5_bk_by_aum: byBk.slice(0, 5).map((g) => ({ bk: g.key, aum: fnum(g.aum), share: fnum(g.aum / aumTotal) })),
      aum_total_by_year_end: aumByYearEnd,
      active_funds_by_year_end: cntByYearEnd,
      median_ret_1Y_by_type: medByType,
      top10_funds_by_aum: top10Funds,
      notes: {
        aum_currency: 'All NAB and NAB per Unit values are in IDR, including USD-denominated funds (verified: USD fund NAV/unit median ~Rp15,095).',
        returns: 'Month-over-month NAV/unit change, only for consecutive months; excludes distributions (dividend-paying / capital-protected funds understate total return).',
        extreme_rule: 'monthly r >= +100% or <= -50% flagged and excluded from aggregates',
      },
    };

    // ---- app files
    const files: Record<string, unknown> = {};
    const typeTs: Record<string, number[]> = {};
    const types = [...new Set(a.map((r) => r.type))].sort();
    const ccys = [...new Set(a.map((r) => r.ccy))].sort();
    const ccyTs: Record<string, number[]> = {};
    const di = new Map(dates.map((d, k) => [d, k]));
    for (const t of types) typeTs[t] = new Array(dates.length).fill(0);
    for (const c of ccys) ccyTs[c] = new Array(dates.length).fill(0);
    const miAum = new Map<string, number[]>();
    for (const r of a) {
      const k = di.get(r.date)!;
      typeTs[r.type]![k]! += r.aum;
      ccyTs[r.ccy]![k]! += r.aum;
      if (!miAum.has(r.mi)) miAum.set(r.mi, new Array(dates.length).fill(0));
      miAum.get(r.mi)![k]! += r.aum;
    }
    const miLatest = sumBy(L, 'mi').sort((p, q) => q.aum - p.aum);
    files['core/reksa/industry.json'] = {
      ...industry,
      type_labels_id: REKSA_TYPE_ID,
      timeseries: { d: dates, aum_total: aumTs, funds_active: cntTs, by_type: typeTs, by_ccy: ccyTs },
      mi_latest: miLatest.map((g) => ({ mi: g.key, aum: g.aum, share: g.aum / aumTotal, fund_count: g.count })),
      bk_latest: byBk.map((g) => ({ bk: g.key, aum: g.aum, share: g.aum / aumTotal, fund_count: g.count })),
      mi_timeseries_top20: Object.fromEntries(miLatest.slice(0, 20).map((g) => [g.key, miAum.get(g.key)])),
    };
    const usd = ctx.shared.get('rupiah:USDIDR');
    const slugs = new Map<string, string>();
    const used = new Set<string>();
    for (const fund of Object.keys(funds).sort()) {
      let s = slugify(fund) || 'fund';
      for (let k = 2; used.has(s); k++) s = `${slugify(fund)}-${k}`;
      used.add(s);
      slugs.set(fund, s);
    }
    files['core/reksa/catalog.json'] = {
      as_of: last,
      funds: Object.entries(funds).map(([fund, f]) => ({ fund, slug: slugs.get(fund), ...f, extreme_months: undefined, extreme_count: (f.extreme_months as string[]).length })),
    };
    for (const [fund, s] of Object.entries(fundSeries)) {
      if (!funds[fund]) continue;
      files[`heavy/reksa/funds/${slugs.get(fund)}.json`] = { fund, as_of: s.d[s.d.length - 1], ...s };
    }
    files['core/reksa/quality.json'] = {
      rows_total: rowsTotal,
      rows_active: a.length,
      encoding: 'UTF-8 with BOM (stripped)',
      date_format: 'Tanggal Lengkap = M/D/YYYY',
      extreme_rule: industry.notes.extreme_rule,
      funds_with_extreme_months: Object.values(funds).filter((f) => (f.extreme_months as string[]).length).length,
      usd_conversion_available: Boolean(usd),
    };
    return {
      dex: ['reksadex'],
      status: 'built',
      asOf: last,
      golden: { 'reksa/golden_industry.json': industry, 'reksa/golden_funds_active.json': funds },
      files,
    };
  },
};
