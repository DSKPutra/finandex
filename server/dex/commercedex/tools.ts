// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// CommerceDex (§8.5): profiles, financials (currency-aware), peer groups, the provided e-commerce index, World Bank macro.
import { z } from 'zod';
import { median } from '../../../src/shared/analytics/stats.ts';
import { fmtDate, fmtPct } from '../../../src/shared/format.ts';
import { artifact, defineTool, method, ToolError, t, type Tool, type ToolContext } from '../../tools/types.ts';
import { barOutput, tableOutput } from '../helpers.ts';
import { appInfo, datasetInfo, openDex, dataQualityTool, resolveEntity, timeSeriesTools } from '../shared-tools.ts';
import { commerceAdapter } from '../ts-adapters.ts';

const ad = commerceAdapter();
const DS = ad.dataset;
const FIN_METRICS = [
  'total_revenue',
  'gross_profit',
  'operating_income',
  'net_income',
  'ebitda',
  'total_assets',
  'total_liabilities',
  'total_equity',
  'operating_cash_flow',
  'free_cash_flow',
] as const;

interface FinRow {
  company_id: string;
  fiscal_year: number;
  currency: string;
  [k: string]: number | string | null;
}
const finRows = async (ctx: ToolContext) =>
  (await ctx.store.json<{ rows: FinRow[] }>('core/commerce/financials.json')).rows;

const companyProfile = defineTool({
  name: 'company_profile',
  description:
    'Profile of one e-commerce company (ticker, exchange, country, segment, founding, HQ, website, Wikipedia extract with CC BY-SA 4.0 attribution).',
  input: z.strictObject({ id: z.string().min(1).max(80) }),
  label: t('Membaca profil perusahaan…', 'Reading company profile…'),
  numeric: false,
  async run(ctx, input) {
    const e = await resolveEntity(ctx, ad, input.id);
    const c = (await ad.companies(ctx)).find((x) => x.company_id === e.id)!;
    return {
      data: {
        id: c.company_id,
        name: c.name,
        ticker: c.ticker,
        exchange: c.exchange,
        country_code: c.country_code,
        region: c.region,
        segment: c.segment,
        price_currency: c.price_currency,
        financials_currency: c.financials_currency,
        founded_date: c.founded_date,
        headquarters: c.headquarters,
        website: c.website,
        description: typeof c.wiki_extract === 'string' ? c.wiki_extract.slice(0, 700) : null,
        attribution: c.wiki_url ? `Wikipedia (CC BY-SA 4.0): ${String(c.wiki_url)}` : null,
      },
      citations: [{ dex: 'commercedex', dataset: DS, as_of: c.last_date }],
    };
  },
});

const financials = defineTool({
  name: 'financials',
  description:
    'Annual financial statements of 1–5 companies for chosen metrics. ALWAYS report the currency: 5 ADRs (alibaba, jdcom, pinduoduo, vipshop = CNY; stoneco = BRL) report in another currency than their share price. Never compare absolute amounts across currencies; margins are comparable.',
  input: z.strictObject({
    ids: z.array(z.string().min(1).max(80)).min(1).max(5),
    metrics: z
      .array(z.enum([...FIN_METRICS, 'net_margin', 'operating_margin']))
      .min(1)
      .max(6)
      .optional(),
  }),
  label: t('Membaca laporan keuangan…', 'Reading financial statements…'),
  numeric: true,
  async run(ctx, input) {
    const ents = await Promise.all(input.ids.map((i) => resolveEntity(ctx, ad, i)));
    const rows = await finRows(ctx);
    const metrics = input.metrics ?? ['total_revenue', 'net_income', 'net_margin'];
    const out = ents.map((e) => {
      const rs = rows.filter((r) => r.company_id === e.id).sort((a, b) => a.fiscal_year - b.fiscal_year);
      return {
        id: e.id,
        name: e.name,
        currency: rs[0]?.currency ?? null,
        years: rs.map((r) => {
          const o: Record<string, unknown> = { fiscal_year: r.fiscal_year };
          for (const m of metrics) {
            if (m === 'net_margin')
              o[m] =
                typeof r.total_revenue === 'number' && r.total_revenue
                  ? (r.net_income as number) / r.total_revenue
                  : null;
            else if (m === 'operating_margin')
              o[m] =
                typeof r.total_revenue === 'number' && r.total_revenue
                  ? (r.operating_income as number) / r.total_revenue
                  : null;
            else o[m] = r[m] ?? null;
          }
          return o;
        }),
      };
    });
    const latest = await Promise.all(ents.map((e) => ad.metrics(ctx, e.id)));
    const ccys = new Set(out.map((o) => o.currency));
    const flags = ccys.size > 1 ? ['mixed_currencies_do_not_compare_absolute_amounts'] : [];
    const tableRows = out.flatMap((o) => o.years.map((y) => ({ name: `${o.name} (${o.currency})`, ...y })));
    const first = metrics[0]!;
    return {
      data: {
        companies: out,
        latest_fy_summary: latest.map((m) => ({
          id: m.company_id,
          fy: m.fin_latest_fy,
          currency: m.financials_currency,
          net_margin: m.fin_net_margin,
          operating_margin: m.fin_operating_margin,
          revenue: m.fin_revenue,
          net_income: m.fin_net_income,
          revenue_yoy: m.fin_revenue_yoy,
        })),
        flags,
      },
      ui: [
        artifact(ctx, {
          title: `${first} — ${out.map((o) => `${o.name} (${o.currency})`).join(', ')}`,
          summary: out.map((o) => `${o.name}: ${o.currency}`).join('; '),
          dataset: DS,
          tab: 'fundamentals',
          spec: {
            type: 'bar',
            categories: [...new Set(out.flatMap((o) => o.years.map((y) => String(y.fiscal_year))))].sort(),
            series: out.map((o) => ({
              name: `${o.name} (${o.currency})`,
              values: [...new Set(out.flatMap((x) => x.years.map((y) => String(y.fiscal_year))))]
                .sort()
                .map((fy) => (o.years.find((y) => String(y.fiscal_year) === fy)?.[first] as number | null) ?? null),
            })),
            horizontal: false,
            value_format: first.includes('margin') ? 'pct' : 'compact',
          },
        }),
        ...tableOutput(ctx, {
          tool: 'financials',
          title: 'Financials',
          columns: [
            { key: 'name', label: 'Company (ccy)', format: 'text' },
            { key: 'fiscal_year', label: 'FY', format: 'text' },
            ...metrics.map((m) => ({
              key: m,
              label: m,
              format: m.includes('margin') ? ('pct' as const) : ('compact' as const),
            })),
          ],
          rows: tableRows,
          dataset: DS,
          formulas: [],
          inputs: {},
          rowsUsed: 0,
        }).ui!,
      ],
      method: method(ctx, {
        tool: 'financials',
        formulas: ['share'],
        extraSteps: [
          {
            id: 'Margin = laba ÷ pendapatan pada tahun fiskal yang sama (mata uang laporan keuangan).',
            en: 'Margin = profit ÷ revenue in the same fiscal year (statement currency).',
          },
        ],
        inputs: { ids: ents.map((e) => e.id), metrics },
        rows: tableRows.length,
        dataset: DS,
        flags,
      }),
    };
  },
});

const peerCompare = defineTool({
  name: 'peer_compare',
  description:
    'Median of a metric per peer group (segment, region or country) across the 43 companies. Use for "which segment/region has the best median 1Y return/margin".',
  input: z.strictObject({
    group: z.enum(['segment', 'region', 'country_code']),
    metric: z.enum([
      'ret_1Y',
      'ret_YTD',
      'ret_3Y',
      'ret_5Y',
      'vol_1Y',
      'mdd',
      'fin_net_margin',
      'fin_operating_margin',
      'fin_revenue_yoy',
    ]),
  }),
  label: t('Membandingkan kelompok…', 'Comparing peer groups…'),
  numeric: true,
  async run(ctx, input) {
    const cos = await ad.companies(ctx);
    const g = new Map<string, number[]>();
    for (const c of cos) {
      const k = c[input.group] as string;
      if (!g.has(k)) g.set(k, []);
      const v = c[input.metric];
      if (typeof v === 'number') g.get(k)!.push(v);
    }
    const groups = [...g.entries()]
      .map(([key, vs]) => ({ key, value: vs.length ? median(vs) : null, n: vs.length }))
      .filter((x) => x.value !== null)
      .sort((a, b) => b.value! - a.value! || (a.key < b.key ? -1 : 1));
    return barOutput(ctx, {
      tool: 'peer_compare',
      title: `Median ${input.metric} per ${input.group}`,
      groups,
      format: 'pct',
      dataset: DS,
      tab: 'companies',
      formulas: ['median', 'simple_return'],
      inputs: input,
      rows: cos.length,
      data: { group: input.group, metric: input.metric },
    });
  },
});

const indexCompare = defineTool({
  name: 'index_compare',
  description:
    'The provided E-Commerce index (equal-weight, daily rebalanced, base 100 on 2015-01-05 — dataset methodology): metrics since start, ATH, drawdown; optionally compared with one company (rebased).',
  input: z.strictObject({ id: z.string().max(80).optional() }),
  label: t('Membaca indeks e-commerce…', 'Reading the e-commerce index…'),
  numeric: true,
  async run(ctx, input) {
    const ix = await ctx.store.json<{
      d: string[];
      level: number[];
      constituents: number[];
      partial_days: string[];
      metrics: Record<string, unknown>;
    }>('core/commerce/index.json');
    const series = [{ name: 'E-Commerce Index', y: ix.level as (number | null)[] }];
    let comp: Record<string, unknown> | null = null;
    if (input.id) {
      const e = await resolveEntity(ctx, ad, input.id);
      const s = await ad.series(ctx, e.id);
      const m = new Map(s.d.map((d, i) => [d, s.p[i]!]));
      const firstIdx = ix.d.findIndex((d) => m.has(d));
      const base = m.get(ix.d[firstIdx]!)!;
      const baseIx = ix.level[firstIdx]!;
      series.push({ name: e.name, y: ix.d.map((d) => (m.has(d) ? (m.get(d)! / base) * baseIx : null)) });
      comp = { id: e.id, name: e.name, ...(await ad.metrics(ctx, e.id)) };
    }
    const m = ix.metrics;
    return {
      data: {
        index: {
          since_start: m.ret_MAX,
          ath: m.ath_close,
          ath_date: m.ath_date,
          mdd: m.mdd,
          mdd_peak: m.mdd_peak_date,
          mdd_trough: m.mdd_trough_date,
          ret_1Y: m.ret_1Y,
          last: m.last_close,
          last_date: m.last_date,
          partial_constituent_days: ix.partial_days,
        },
        company: comp,
      },
      ui: [
        artifact(ctx, {
          title: 'E-Commerce Index (base 100 = 2015-01-05)',
          summary: `Since start ${fmtPct(m.ret_MAX as number, ctx.locale)}; ATH ${fmtDate(m.ath_date as string, ctx.locale)}.`,
          dataset: DS,
          tab: 'index',
          spec: {
            type: 'line',
            x: ix.d,
            series,
            y_format: 'num',
            log_allowed: true,
            annotations: [{ x: m.ath_date as string, label: 'ATH' }],
          },
        }),
      ],
      method: method(ctx, {
        tool: 'index_compare',
        formulas: ['simple_return', 'max_drawdown', 'high_low_52w'],
        extraSteps: [
          {
            id: 'Indeks = metodologi dataset (equal-weight, rebalance harian, basis 100 pada 2015-01-05); hari dengan konstituen turun > 20% ditandai parsial.',
            en: 'Index = dataset methodology (equal-weight, daily rebalance, base 100 on 2015-01-05); days whose constituents drop > 20% are flagged partial.',
          },
        ],
        inputs: input,
        rows: ix.d.length,
        period: { start: ix.d[0]!, end: ix.d.at(-1)! },
        dataset: DS,
        flags: ix.partial_days.length ? ['partial_constituent_days', 'survivorship_bias'] : ['survivorship_bias'],
      }),
    };
  },
});

const macro = defineTool({
  name: 'macro',
  description:
    'World Bank macro indicator for one of the 13 countries (2010–2025): internet_users_pct, gdp_per_capita_usd, gdp_total_usd, population_total, urban_population_pct, mobile_subs_per_100, account_ownership_pct_adult, fdi_inflow_pct_gdp. country_code = ISO2 (ID, US, CN, IN, JP, KR, SG, BR, AR, CA, DE, GB, PL).',
  input: z.strictObject({ country_code: z.string().length(2), indicator: z.string().min(3).max(40) }),
  label: t('Membaca indikator makro…', 'Reading macro indicator…'),
  numeric: true,
  async run(ctx, input) {
    const mac = await ctx.store.json<{
      rows: { country_code: string; year: number; indicator: string; value: number | null }[];
    }>('core/commerce/macro.json');
    const rows = mac.rows
      .filter((r) => r.country_code === input.country_code.toUpperCase() && r.indicator === input.indicator)
      .sort((a, b) => a.year - b.year);
    if (!rows.length)
      throw new ToolError(
        `No rows for ${input.country_code}/${input.indicator}. Indicators: ${[...new Set(mac.rows.map((r) => r.indicator))].join(', ')}; countries: ${[...new Set(mac.rows.map((r) => r.country_code))].join(', ')}.`,
      );
    const pct = input.indicator.endsWith('_pct') || input.indicator.includes('pct');
    return {
      data: {
        country_code: input.country_code.toUpperCase(),
        indicator: input.indicator,
        latest: rows.at(-1),
        values: rows.map((r) => [r.year, r.value]),
        source: 'World Bank (CC BY 4.0) via dataset',
        units: pct ? 'percent' : 'as provided',
      },
      ui: [
        artifact(ctx, {
          title: `${input.indicator} — ${input.country_code.toUpperCase()}`,
          summary: `${rows.at(-1)!.year}: ${rows.at(-1)!.value}`,
          dataset: 'World Bank (via Global E-Commerce Giants dataset)',
          tab: 'macro',
          spec: {
            type: 'line',
            x: rows.map((r) => String(r.year)),
            series: [{ name: input.indicator, y: rows.map((r) => r.value) }],
            y_format: pct ? 'pct_points' : 'compact',
            log_allowed: false,
          },
        }),
      ],
      method: method(ctx, {
        tool: 'macro',
        formulas: [],
        extraSteps: [
          {
            id: 'Nilai indikator World Bank sebagaimana di dataset (tanpa transformasi).',
            en: 'World Bank indicator values as provided in the dataset (no transformation).',
          },
        ],
        inputs: input,
        rows: rows.length,
        period: { start: String(rows[0]!.year), end: String(rows.at(-1)!.year) },
        dataset: 'World Bank (via dataset)',
      }),
    };
  },
});

export const tools: Tool<never>[] = [
  ...([datasetInfo, appInfo, openDex] as unknown as Tool<never>[]),
  ...timeSeriesTools(ad),
  ...([companyProfile, financials, peerCompare, indexCompare, macro] as unknown as Tool<never>[]),
  dataQualityTool(async (ctx, id) => {
    const q = await ctx.store.json<{
      tickers: Record<string, unknown>;
      financials_currency_override: Record<string, string>;
      rows_dropped_null_close: number;
    }>('core/commerce/quality.json');
    if (id) {
      const e = await resolveEntity(ctx, ad, id);
      return {
        company: e.id,
        ...((q.tickers[e.id] as object) ?? {}),
        financials_currency_override: q.financials_currency_override[e.id] ?? null,
      };
    }
    return {
      rows_dropped_null_close: q.rows_dropped_null_close,
      financials_currency_override: q.financials_currency_override,
      companies_with_spikes: Object.entries(q.tickers)
        .filter(([, v]) => ((v as { spikes_removed: string[] }).spikes_removed ?? []).length)
        .map(([k]) => k),
    };
  }) as unknown as Tool<never>,
];
export const adapter = ad;
