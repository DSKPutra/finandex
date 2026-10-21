// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// VCDex (§8.5): investor directory search, profiles, rankings, stage mix, country summaries. No funding promises,
// no personal contacts.
import { z } from 'zod';
import { median } from '../../../src/shared/analytics/stats.ts';
import { artifact, defineTool, method, ToolError, t, type Tool, type ToolContext } from '../../tools/types.ts';
import { barOutput } from '../helpers.ts';
import { appInfo, dataQualityTool, datasetInfo, openDex } from '../shared-tools.ts';
import { loadTable, matches, textSearch, type Row } from '../table.ts';

const DS = 'VC Investor Directory 2026 (25% sample, 8,827 investors)';
const FLAGS = ['sample_25pct', 'cc_by_nc', 'no_funding_promise'];
const rowsOf = (ctx: ToolContext) => loadTable(ctx.store, 'heavy/vcdirectory/investors.json');
const find = async (ctx: ToolContext, q: string): Promise<Row> => {
  const rows = await rowsOf(ctx);
  const r = rows.find((x) => x.slug === q || matches(x.name, q)) ?? textSearch(rows, q, ['name', 'domain'], 1)[0];
  if (!r) throw new ToolError(`Investor "${q}" not in the 25% sample; use investor_search.`);
  return r;
};

const investorSearch = defineTool({
  name: 'investor_search',
  description:
    'Search investors by name/sector text, optional HQ country and type (VC, PE, CVC, accelerator, government, bank-debt, other).',
  input: z.strictObject({
    query: z.string().max(80).optional(),
    country: z.string().max(60).optional(),
    type: z.string().max(30).optional(),
    sector: z.string().max(60).optional(),
    limit: z.number().int().min(1).max(20).optional(),
  }),
  label: t('Mencari investor…', 'Searching investors…'),
  numeric: false,
  async run(ctx, input) {
    let rows = (await rowsOf(ctx)).filter(
      (r) =>
        matches(r.hq_country, input.country) &&
        matches(r.type, input.type) &&
        (!input.sector || matches(r.top_sectors, input.sector, 'includes')),
    );
    rows = input.query
      ? textSearch(rows, input.query, ['name', 'top_sectors', 'top_countries'], input.limit ?? 10)
      : rows.sort((a, b) => (b.deals as number) - (a.deals as number)).slice(0, input.limit ?? 10);
    return {
      data: {
        matched: rows.length,
        results: rows.map((r) => ({
          slug: r.slug,
          name: r.name,
          type: r.type,
          hq_country: r.hq_country,
          deals: r.deals,
          lead_deals: r.lead_deals,
          top_sectors: r.top_sectors,
        })),
        note: 'directory sample; no contact details',
      },
    };
  },
});

const investorProfile = defineTool({
  name: 'investor_profile',
  description:
    'Profile of one investor: type, HQ, deals, lead deals, portfolio companies, first/last deal year, deals 2025–2026, top sectors/countries, stage mix, median round.',
  input: z.strictObject({ investor: z.string().min(1).max(80) }),
  label: t('Membaca profil investor…', 'Reading investor profile…'),
  numeric: false,
  async run(ctx, input) {
    const r = await find(ctx, input.investor);
    const { profile_url, ...rest } = r;
    return { data: { ...rest, attribution: profile_url, flags: FLAGS } };
  },
});

const rankInvestors = defineTool({
  name: 'rank_investors',
  description:
    'Rank investors by deals, lead_deals, portfolio_companies, deals_2025_2026 or median_round_usd, optionally filtered by HQ country/type.',
  input: z.strictObject({
    metric: z.enum(['deals', 'lead_deals', 'portfolio_companies', 'deals_2025_2026', 'median_round_usd']),
    country: z.string().max(60).optional(),
    type: z.string().max(30).optional(),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  label: t('Menyusun peringkat investor…', 'Ranking investors…'),
  numeric: true,
  async run(ctx, input) {
    const rows = (await rowsOf(ctx)).filter(
      (r) => matches(r.hq_country, input.country) && matches(r.type, input.type) && typeof r[input.metric] === 'number',
    );
    rows.sort(
      (a, b) =>
        (b[input.metric] as number) - (a[input.metric] as number) || String(a.name).localeCompare(String(b.name)),
    );
    const top = rows.slice(0, input.limit ?? 10);
    return barOutput(ctx, {
      tool: 'rank_investors',
      title: input.metric,
      groups: top.map((r) => ({ key: String(r.name), value: r[input.metric] as number })),
      format: input.metric === 'median_round_usd' ? 'money_usd' : 'int',
      dataset: DS,
      tab: 'ranking',
      formulas: ['rank'],
      inputs: input,
      rows: rows.length,
      flags: FLAGS,
      data: {
        rows: top.map((r) => ({
          name: r.name,
          type: r.type,
          hq_country: r.hq_country,
          deals: r.deals,
          lead_deals: r.lead_deals,
        })),
      },
    });
  },
});

const stageMix = defineTool({
  name: 'stage_mix',
  description: 'Stage mix (seed / early / growth shares) of one investor.',
  input: z.strictObject({ investor: z.string().min(1).max(80) }),
  label: t('Membaca stage mix…', 'Reading the stage mix…'),
  numeric: true,
  async run(ctx, input) {
    const r = await find(ctx, input.investor);
    const gs = [
      { key: 'seed', value: r.seed_share as number },
      { key: 'early', value: r.early_share as number },
      { key: 'growth', value: r.growth_share as number },
    ];
    return barOutput(ctx, {
      tool: 'stage_mix',
      title: `${String(r.name)} — stage mix`,
      groups: gs,
      format: 'pct',
      dataset: DS,
      tab: 'stages',
      formulas: ['share'],
      inputs: input,
      rows: 1,
      flags: FLAGS,
      data: { investor: r.name, deals: r.deals },
    });
  },
});

const countrySummary = defineTool({
  name: 'country_summary',
  description:
    'Investors headquartered in a country (count, by type, median deals, most active), or the top HQ countries when no country is given.',
  input: z.strictObject({ country: z.string().max(60).optional(), limit: z.number().int().min(1).max(25).optional() }),
  label: t('Meringkas negara…', 'Summarising the country…'),
  numeric: true,
  async run(ctx, input) {
    const all = await rowsOf(ctx);
    if (!input.country) {
      const m = new Map<string, number>();
      for (const r of all) if (r.hq_country) m.set(String(r.hq_country), (m.get(String(r.hq_country)) ?? 0) + 1);
      const gs = [...m.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, input.limit ?? 10)
        .map(([k, v]) => ({ key: k, value: v }));
      return barOutput(ctx, {
        tool: 'country_summary',
        title: ctx.locale === 'id' ? 'Investor per negara HQ' : 'Investors by HQ country',
        groups: gs,
        format: 'int',
        dataset: DS,
        tab: 'countries',
        formulas: ['count'],
        inputs: input,
        rows: all.length,
        flags: FLAGS,
      });
    }
    const rows = all.filter((r) => matches(r.hq_country, input.country));
    const types = new Map<string, number>();
    for (const r of rows) types.set(String(r.type), (types.get(String(r.type)) ?? 0) + 1);
    return {
      data: {
        country: input.country,
        investors: rows.length,
        median_deals: rows.length ? median(rows.map((r) => r.deals as number)) : null,
        by_type: Object.fromEntries(types),
        most_active: rows
          .sort((a, b) => (b.deals as number) - (a.deals as number))
          .slice(0, 5)
          .map((r) => ({ name: r.name, deals: r.deals, type: r.type })),
        flags: FLAGS,
      },
      ui: [
        artifact(ctx, {
          title: `${input.country}: ${rows.length} investor`,
          summary: `${rows.length}`,
          dataset: DS,
          tab: 'countries',
          spec: {
            type: 'bar',
            categories: [...types.keys()],
            series: [{ name: 'investors', values: [...types.values()] }],
            horizontal: true,
            value_format: 'int',
          },
        }),
      ],
      method: method(ctx, {
        tool: 'country_summary',
        formulas: ['count', 'median'],
        inputs: input,
        rows: rows.length,
        dataset: DS,
        flags: FLAGS,
      }),
    };
  },
});

export const tools: Tool<never>[] = [
  datasetInfo,
  appInfo,
  openDex,
  ...([investorSearch, investorProfile, rankInvestors, stageMix, countrySummary] as unknown as Tool<never>[]),
  dataQualityTool(async (ctx) => ctx.store.json('core/vcdirectory/quality.json')),
] as unknown as Tool<never>[];
