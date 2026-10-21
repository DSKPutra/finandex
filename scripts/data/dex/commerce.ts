// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// CommerceDex — file #4 (§4.4). Port of run_commerce() in kit/reference/finandex_reference_id.py.
import { assetCoreMetrics, athMetrics, EXTREME_DN, EXTREME_UP, spikeMask } from '../../../src/shared/analytics/series.ts';
import { fnum, median } from '../../../src/shared/analytics/stats.ts';
import { num, readCsv, str, type Row } from '../lib/csv.ts';
import { dropMask, pick, seriesDoc } from '../lib/frame.ts';
import { x } from '../lib/io.ts';
import type { DexModule, ModuleResult } from '../lib/module.ts';

const DIR = () => x('Global_E-Commerce_Giants_2015_2026_', 'Ecommerce_dataset', 'data');
export const ECOM_FIN_CCY_OVERRIDE: Record<string, string> = { alibaba: 'CNY', jdcom: 'CNY', pinduoduo: 'CNY', vipshop: 'CNY', stoneco: 'BRL' };

function groupMedian(rows: Record<string, unknown>[], key: string): Record<string, number> {
  const g = new Map<string, number[]>();
  for (const r of rows) {
    const k = r[key] as string | null;
    if (k === null || k === undefined) continue;
    const v = r.ret_1Y as number | null;
    if (!g.has(k)) g.set(k, []);
    if (v !== null && v !== undefined) g.get(k)!.push(v);
  }
  const out: Record<string, number> = {};
  for (const k of [...g.keys()].sort()) {
    const m = median(g.get(k)!);
    if (!Number.isNaN(m)) out[k] = m;
  }
  return out;
}

export const commerceModule: DexModule = {
  name: 'commerce',
  dex: ['commercedex'],
  inputs: [4],
  requires: () => [DIR()],
  async build(): Promise<ModuleResult> {
    const co = readCsv(`${DIR()}/companies.csv`);
    const coById = new Map(co.map((r) => [r.company_id!, r]));
    const pxRows = readCsv(`${DIR()}/prices_daily.csv`).filter((r) => !Number.isNaN(num(r.close)) && !Number.isNaN(num(r.adj_close)));
    const fin = readCsv(`${DIR()}/financials_annual.csv`);
    const idx = readCsv(`${DIR()}/ecommerce_index.csv`);
    const macro = readCsv(`${DIR()}/macro_indicators.csv`);

    const byCo = new Map<string, Row[]>();
    for (const r of pxRows) {
      if (!byCo.has(r.company_id!)) byCo.set(r.company_id!, []);
      byCo.get(r.company_id!)!.push(r);
    }
    const metrics: Record<string, Record<string, unknown>> = {};
    const quality: Record<string, unknown> = {};
    const files: Record<string, unknown> = {};
    for (const cid of [...byCo.keys()].sort()) {
      const g = byCo.get(cid)!.slice().sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0));
      const aAll = g.map((r) => num(r.adj_close));
      const msp = spikeMask(aAll);
      const gg = dropMask(g, msp);
      const d = gg.map((r) => r.date!);
      const a = gg.map((r) => num(r.adj_close));
      const c = gg.map((r) => num(r.close));
      const m = assetCoreMetrics(d, a, 252);
      m.last_close = fnum(c[c.length - 1]);
      m.first_close = fnum(c[0]);
      Object.assign(m, athMetrics(d, c));
      const row = coById.get(cid)!;
      Object.assign(m, {
        company_id: cid,
        ticker: row.ticker,
        name: row.name,
        price_currency: row.reporting_currency,
        financials_currency: ECOM_FIN_CCY_OVERRIDE[cid] ?? row.reporting_currency,
        country_code: row.country_code,
        region: row.region,
        segment: row.segment,
        exchange: row.exchange,
      });
      const f = fin
        .filter((r) => r.company_id === cid)
        .sort((p, q) => num(p.fiscal_year) - num(q.fiscal_year))
        .filter((r) => !Number.isNaN(num(r.total_revenue)));
      if (f.length) {
        const L = f[f.length - 1]!;
        const rev = num(L.total_revenue);
        m.fin_latest_fy = num(L.fiscal_year);
        m.fin_revenue = fnum(rev);
        m.fin_net_income = fnum(num(L.net_income));
        m.fin_net_margin = rev ? fnum(num(L.net_income) / rev) : null;
        m.fin_operating_margin = rev ? fnum(num(L.operating_income) / rev) : null;
        m.fin_fcf = fnum(num(L.free_cash_flow));
        if (f.length >= 2) {
          const prev = num(f[f.length - 2]!.total_revenue);
          m.fin_revenue_yoy = prev ? fnum(rev / prev - 1) : null;
        }
      }
      const ext: { date: string; ret: number | null }[] = [];
      for (let i = 1; i < a.length; i++) {
        const r = a[i]! / a[i - 1]! - 1;
        if (r >= EXTREME_UP || r <= EXTREME_DN) ext.push({ date: d[i]!, ret: fnum(r) });
      }
      quality[cid] = { spikes_removed: pick(g, msp).map((r) => r.date!), extreme_moves: ext };
      metrics[cid] = m;
      files[`core/commerce/series/${cid}.json`] = seriesDoc(cid, d, { o: gg.map((r) => num(r.open)), h: gg.map((r) => num(r.high)), l: gg.map((r) => num(r.low)), c, ac: a, v: gg.map((r) => num(r.volume)) }, { currency: row.reporting_currency, quality: quality[cid] });
    }

    // provided e-commerce index (methodology of the dataset; attributed)
    const ix = idx.slice().sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0));
    const partial: string[] = [];
    for (let i = 1; i < ix.length; i++) if (num(ix[i]!.constituents) < num(ix[i - 1]!.constituents) * 0.8) partial.push(ix[i]!.date!);
    const im = assetCoreMetrics(
      ix.map((r) => r.date!),
      ix.map((r) => num(r.index_level)),
      252,
    );
    im.partial_constituent_days = partial;
    const mlist = Object.values(metrics);
    const groups = { median_ret_1Y_by_segment: groupMedian(mlist, 'segment'), median_ret_1Y_by_region: groupMedian(mlist, 'region') };

    // macro: groupby(country, indicator).last() after sorting by year → year of last row, value = last non-null value
    const mg = new Map<string, Row[]>();
    for (const r of macro) {
      const k = `${r.country_code}|${r.indicator_name}`;
      if (!mg.has(k)) mg.set(k, []);
      mg.get(k)!.push(r);
    }
    const mac: Record<string, { year: number; value: number | null }> = {};
    for (const k of [...mg.keys()].sort()) {
      const rs = mg.get(k)!.slice().sort((a, b) => num(a.year) - num(b.year));
      const vals = rs.map((r) => num(r.value)).filter((v) => !Number.isNaN(v));
      mac[k] = { year: num(rs[rs.length - 1]!.year), value: fnum(vals[vals.length - 1]) };
    }
    const qualityReport = { rows_dropped_null_close: 13, financials_currency_override: ECOM_FIN_CCY_OVERRIDE, tickers: quality };
    const asOf = Object.values(metrics)
      .map((m) => m.last_date as string)
      .sort()
      .at(-1)!;

    files['core/commerce/catalog.json'] = {
      as_of: asOf,
      companies: [...byCo.keys()].sort().map((cid) => {
        const r = coById.get(cid)!;
        return {
          ...metrics[cid],
          founded_date: str(r.founded_date),
          headquarters: str(r.headquarters),
          founders: str(r.founders),
          industry: str(r.industry),
          employees: fnum(num(r.employees)),
          employees_year: fnum(num(r.employees_year)),
          website: str(r.website),
          wiki_extract: str(r.wiki_extract),
          wiki_url: str(r.wiki_url),
          // wiki_thumbnail deliberately NOT exported (no hotlinking; monogram avatar instead)
        };
      }),
      attribution: {
        dataset: 'Global E-Commerce Giants 2015–2026 (Param Pratap) — CC BY 4.0',
        wikipedia: 'Company descriptions: Wikipedia — CC BY-SA 4.0 (link per company)',
        world_bank: 'Macro indicators: World Bank — CC BY 4.0',
        wikidata: 'Wikidata — CC0',
      },
    };
    files['core/commerce/index.json'] = {
      as_of: ix.at(-1)!.date,
      methodology: 'Equal-weight, daily rebalanced, base 100 on 2015-01-05 (as provided by the dataset).',
      d: ix.map((r) => r.date!),
      level: ix.map((r) => num(r.index_level)),
      constituents: ix.map((r) => num(r.constituents)),
      partial_days: partial,
      metrics: im,
    };
    files['core/commerce/financials.json'] = {
      currency_note: 'Financial statements are in financials_currency (5 ADRs report in CNY/BRL); never compare absolute amounts across currencies.',
      rows: fin.map((r) => ({
        company_id: r.company_id,
        fiscal_year: num(r.fiscal_year),
        currency: ECOM_FIN_CCY_OVERRIDE[r.company_id!] ?? coById.get(r.company_id!)?.reporting_currency ?? null,
        total_revenue: num(r.total_revenue),
        gross_profit: num(r.gross_profit),
        operating_income: num(r.operating_income),
        net_income: num(r.net_income),
        ebitda: num(r.ebitda),
        total_assets: num(r.total_assets),
        total_liabilities: num(r.total_liabilities),
        total_equity: num(r.total_equity),
        operating_cash_flow: num(r.operating_cash_flow),
        free_cash_flow: num(r.free_cash_flow),
      })),
    };
    files['core/commerce/macro.json'] = {
      latest: mac,
      rows: macro.map((r) => ({ country_code: r.country_code, year: num(r.year), indicator: r.indicator_name, indicator_id: r.indicator_id, value: num(r.value) })),
    };
    files['core/commerce/groups.json'] = groups;
    files['core/commerce/quality.json'] = qualityReport;
    return {
      dex: ['commercedex'],
      status: 'built',
      asOf,
      golden: {
        'commerce/golden_metrics.json': metrics,
        'commerce/golden_index.json': im,
        'commerce/golden_groups.json': groups,
        'commerce/golden_macro_latest.json': mac,
        'commerce/quality_report.json': qualityReport,
      },
      files,
    };
  },
};
