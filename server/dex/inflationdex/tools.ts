// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// InflationDex (§8.5): latest annual inflation per country (year varies per country) plus cost-of-living columns.
import { z } from 'zod';
import { median } from '../../../src/shared/analytics/stats.ts';
import { artifact, defineTool, method, t, type Tool, type ToolContext } from '../../tools/types.ts';
import { barOutput, tableOutput } from '../helpers.ts';
import { appInfo, dataQualityTool, datasetInfo, openDex } from '../shared-tools.ts';
import { matches, textSearch, type Row } from '../table.ts';

const DS = 'Global Inflation & Cost of Living Dataset';
const FLAGS = ['year_varies_per_country'];
const rowsOf = async (ctx: ToolContext) =>
  (await ctx.store.json<{ rows_table: Row[] }>('core/inflation/summary.json')).rows_table;
const METRICS = [
  'inflation_annual_pct',
  'cost_living_index',
  'rent_index',
  'groceries_index',
  'restaurants_index',
  'purchasing_power_index',
  'bread_price_usd',
  'transport_monthly_pass_usd',
  'rent_monthly_usd',
  'utilities_monthly_usd',
] as const;
const Metric = z.enum(METRICS);
const fmt = (m: string) =>
  (m === 'inflation_annual_pct' ? 'pp' : m.endsWith('_usd') ? 'money_usd' : 'num') as 'pp' | 'money_usd' | 'num';

const countryInflation = defineTool({
  name: 'country_inflation',
  description:
    'Latest annual inflation (in percent, e.g. 2.18 = 2.18%) and cost-of-living columns for one or more countries. Always state inflation_year next to the value (it differs per country).',
  input: z.strictObject({ countries: z.array(z.string().max(60)).min(1).max(10) }),
  label: t('Mengambil inflasi negara…', 'Fetching country inflation…'),
  numeric: true,
  async run(ctx, input) {
    const rows = await rowsOf(ctx);
    const hits = input.countries.map(
      (q) =>
        rows.find((r) => matches(r.country, q) || matches(r.iso3, q)) ??
        textSearch(rows, q, ['country', 'capital'], 1)[0] ??
        null,
    );
    const out = hits.map((r, i) =>
      r
        ? {
            country: r.country,
            iso3: r.iso3,
            inflation_year: r.inflation_year,
            inflation_annual_pct: r.inflation_annual_pct,
            inflation_fraction: typeof r.inflation_annual_pct === 'number' ? r.inflation_annual_pct / 100 : null,
            cost_living_index: r.cost_living_index,
            rent_monthly_usd: r.rent_monthly_usd,
            income_level: r.income_level,
            region: r.region,
          }
        : { query: input.countries[i], error: 'not_found' },
    );
    return tableOutput(ctx, {
      tool: 'country_inflation',
      title: ctx.locale === 'id' ? 'Inflasi tahunan' : 'Annual inflation',
      columns: [
        { key: 'country', label: ctx.locale === 'id' ? 'Negara' : 'Country', format: 'text' },
        { key: 'inflation_year', label: ctx.locale === 'id' ? 'Tahun' : 'Year', format: 'int' },
        { key: 'inflation_annual_pct', label: '%', format: 'pp' },
        { key: 'cost_living_index', label: 'CoL idx', format: 'num' },
      ],
      rows: out,
      dataset: DS,
      tab: 'countries',
      formulas: [],
      inputs: input,
      rowsUsed: out.length,
      flags: FLAGS,
      data: { unit: 'inflation_annual_pct is in percent' },
    });
  },
});

const rankCountries = defineTool({
  name: 'rank_countries',
  description:
    'Rank countries by a metric (default inflation_annual_pct) with optional region / income_level filter. Each row includes its inflation_year.',
  input: z.strictObject({
    metric: Metric.optional(),
    order: z.enum(['desc', 'asc']).optional(),
    region: z.string().max(60).optional(),
    income_level: z.string().max(40).optional(),
    limit: z.number().int().min(1).max(30).optional(),
  }),
  label: t('Mengurutkan negara…', 'Ranking countries…'),
  numeric: true,
  async run(ctx, input) {
    const m = input.metric ?? 'inflation_annual_pct';
    const rows = (await rowsOf(ctx)).filter(
      (r) =>
        typeof r[m] === 'number' &&
        matches(r.region, input.region, 'includes') &&
        matches(r.income_level, input.income_level, 'includes'),
    );
    const dir = input.order === 'asc' ? 1 : -1;
    const top = [...rows]
      .sort((a, b) => dir * ((a[m] as number) - (b[m] as number)) || String(a.country).localeCompare(String(b.country)))
      .slice(0, input.limit ?? 10);
    return barOutput(ctx, {
      tool: 'rank_countries',
      title: m,
      groups: top.map((r) => ({
        key: `${r.country as string}${m === 'inflation_annual_pct' ? ` (${String(r.inflation_year)})` : ''}`,
        value: r[m] as number,
      })),
      format: fmt(m),
      dataset: DS,
      tab: 'ranking',
      formulas: ['rank'],
      inputs: input,
      rows: rows.length,
      flags: FLAGS,
      data: {
        metric: m,
        eligible: rows.length,
        rows: top.map((r) => ({ country: r.country, inflation_year: r.inflation_year, value: r[m] })),
      },
    });
  },
});

const inflationStats = defineTool({
  name: 'inflation_stats',
  description:
    'Median (and count) of latest annual inflation across all countries or a group (region / income_level). Mention that years differ per country.',
  input: z.strictObject({ group_by: z.enum(['none', 'region', 'income_level']).optional() }),
  label: t('Menghitung statistik inflasi…', 'Computing inflation statistics…'),
  numeric: true,
  async run(ctx, input) {
    const rows = (await rowsOf(ctx)).filter((r) => typeof r.inflation_annual_pct === 'number');
    const g = input.group_by ?? 'none';
    const m = new Map<string, number[]>();
    for (const r of rows) {
      const k = g === 'none' ? 'all' : (r[g] as string | null);
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r.inflation_annual_pct as number);
    }
    const years = new Map<string, number>();
    for (const r of rows) years.set(String(r.inflation_year), (years.get(String(r.inflation_year)) ?? 0) + 1);
    const gs = [...m.entries()]
      .map(([k, v]) => ({ key: k, value: median(v), n: v.length }))
      .sort((a, b) => b.value - a.value);
    return barOutput(ctx, {
      tool: 'inflation_stats',
      title: ctx.locale === 'id' ? 'Median inflasi' : 'Median inflation',
      groups: gs,
      format: 'pp',
      dataset: DS,
      tab: 'ranking',
      formulas: ['median'],
      inputs: input,
      rows: rows.length,
      flags: FLAGS,
      data: { unit: 'percent', inflation_year_counts: Object.fromEntries(years) },
    });
  },
});

const costItems = defineTool({
  name: 'cost_items',
  description:
    'Compare price items (bread, transport pass, monthly rent, utilities in USD) and indices for a few countries.',
  input: z.strictObject({ countries: z.array(z.string().max(60)).min(1).max(8) }),
  label: t('Membandingkan harga…', 'Comparing prices…'),
  numeric: true,
  async run(ctx, input) {
    const rows = await rowsOf(ctx);
    const hits = input.countries
      .map((q) => rows.find((r) => matches(r.country, q) || matches(r.iso3, q)))
      .filter((r): r is Row => !!r);
    const cols = ['bread_price_usd', 'transport_monthly_pass_usd', 'rent_monthly_usd', 'utilities_monthly_usd'];
    return {
      data: {
        rows: hits.map((r) => ({ country: r.country, ...Object.fromEntries(cols.map((c) => [c, r[c]])) })),
        flags: [],
      },
      ui: [
        artifact(ctx, {
          title: 'Cost items (USD)',
          summary: hits.map((r) => String(r.country)).join(', '),
          dataset: DS,
          tab: 'countries',
          spec: {
            type: 'bar',
            categories: cols,
            series: hits.map((r) => ({
              name: String(r.country),
              values: cols.map((c) => (typeof r[c] === 'number' ? (r[c] as number) : null)),
            })),
            horizontal: true,
            value_format: 'money_usd',
          },
        }),
      ],
      method: method(ctx, { tool: 'cost_items', formulas: [], inputs: input, rows: hits.length, dataset: DS }),
    };
  },
});

export const tools: Tool<never>[] = [
  datasetInfo,
  appInfo,
  openDex,
  ...([countryInflation, rankCountries, inflationStats, costItems] as unknown as Tool<never>[]),
  dataQualityTool(async (ctx) => ctx.store.json('core/inflation/quality.json')),
] as unknown as Tool<never>[];
