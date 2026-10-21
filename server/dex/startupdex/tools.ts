// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// StartupDex (§8.5): funding summaries (verified by default), rounds search, medians by stage, mega-rounds, leads.
import { z } from 'zod';
import { median, sum } from '../../../src/shared/analytics/stats.ts';
import { defineTool, t, type Tool, type ToolContext } from '../../tools/types.ts';
import { barOutput, tableOutput } from '../helpers.ts';
import { appInfo, dataQualityTool, datasetInfo, openDex } from '../shared-tools.ts';
import { loadTable, matches, textSearch, type Row } from '../table.ts';

const DS = 'Global Startup Funding Rounds 2019–2026 (25% sample)';
const FLAGS = ['sample_25pct', 'cc_by_nc'];
const rowsOf = (ctx: ToolContext) => loadTable(ctx.store, 'heavy/startup/rounds.json');
const Filt = z.strictObject({
  country: z.string().max(60).optional(),
  sector: z.string().max(60).optional(),
  stage: z.string().max(40).optional(),
  year: z.number().int().min(2019).max(2030).optional(),
  lead_investor: z.string().max(80).optional(),
});
type F = z.infer<typeof Filt>;
const filt = (rows: Row[], f: F = {}) =>
  rows.filter(
    (r) =>
      matches(r.country, f.country) &&
      matches(r.sector, f.sector) &&
      matches(r.stage, f.stage) &&
      (!f.year || r.year === f.year) &&
      matches(r.lead_investor, f.lead_investor, 'includes'),
  );
const amount = (r: Row, status: 'verified' | 'all') =>
  typeof r.amount_usd === 'number' && (status === 'all' || r.amount_status === 'verified') ? r.amount_usd : NaN;

const fundingSummary = defineTool({
  name: 'funding_summary',
  description:
    'Funding rounds grouped by year, country, sector or stage: number of rounds and disclosed USD. status=verified (default) uses only verified amounts; status=all uses every round with an amount (unchecked/failed_check included) — that is how the dataset-level "total disclosed" is defined.',
  input: z.strictObject({
    group_by: z.enum(['none', 'year', 'country', 'sector', 'stage']),
    filters: Filt.optional(),
    status: z.enum(['verified', 'all']).optional(),
    metric: z.enum(['rounds', 'usd']).optional(),
    limit: z.number().int().min(1).max(30).optional(),
  }),
  label: t('Meringkas pendanaan…', 'Summarising funding…'),
  numeric: true,
  async run(ctx, input) {
    const status = input.status ?? 'verified';
    const rows = filt(await rowsOf(ctx), input.filters);
    const key = (r: Row) =>
      input.group_by === 'none'
        ? 'all'
        : r[input.group_by] === null || r[input.group_by] === undefined
          ? null
          : String(r[input.group_by]);
    const g = new Map<string, { rounds: number; with_amount: number; usd: number[] }>();
    for (const r of rows) {
      const k = key(r);
      if (k === null) continue;
      if (!g.has(k)) g.set(k, { rounds: 0, with_amount: 0, usd: [] });
      const o = g.get(k)!;
      o.rounds++;
      const a = amount(r, status);
      if (Number.isFinite(a)) {
        o.with_amount++;
        o.usd.push(a);
      }
    }
    const metric = input.metric ?? (input.group_by === 'year' ? 'usd' : 'rounds');
    const res = [...g.entries()].map(([k, o]) => ({
      key: k,
      rounds: o.rounds,
      rounds_with_amount: o.with_amount,
      usd: sum(o.usd),
      median_usd: o.usd.length ? median(o.usd) : null,
    }));
    res.sort((a, b) =>
      input.group_by === 'year'
        ? a.key < b.key
          ? -1
          : 1
        : (metric === 'usd' ? b.usd - a.usd : b.rounds - a.rounds) || (a.key < b.key ? -1 : 1),
    );
    return barOutput(ctx, {
      tool: 'funding_summary',
      title: `${metric === 'usd' ? 'USD' : ctx.locale === 'id' ? 'Putaran' : 'Rounds'} — ${input.group_by} (${status})`,
      groups: res.slice(0, input.limit ?? 15).map((r) => ({ key: r.key, value: metric === 'usd' ? r.usd : r.rounds })),
      format: metric === 'usd' ? 'money_usd' : 'int',
      dataset: DS,
      tab: 'summary',
      formulas: ['sum', 'count'],
      inputs: input,
      rows: rows.length,
      flags: [...FLAGS, `amount_status_${status}`],
      horizontal: input.group_by !== 'year',
      data: { status, groups: res.slice(0, 30) },
    });
  },
});

const roundsSearch = defineTool({
  name: 'rounds_search',
  description:
    'Search funding rounds by company/investor text and filters; returns date, company, country, stage, amount, status and news source.',
  input: z.strictObject({
    query: z.string().max(80).optional(),
    filters: Filt.optional(),
    limit: z.number().int().min(1).max(20).optional(),
  }),
  label: t('Mencari putaran pendanaan…', 'Searching funding rounds…'),
  numeric: false,
  async run(ctx, input) {
    let rows = filt(await rowsOf(ctx), input.filters);
    rows = input.query
      ? textSearch(rows, input.query, ['company', 'lead_investor', 'sector'], input.limit ?? 10)
      : rows.slice(0, input.limit ?? 10);
    return {
      data: {
        results: rows.map((r) => ({
          date: r.date,
          company: r.company,
          country: r.country,
          sector: r.sector,
          stage: r.stage,
          amount_usd: r.amount_usd,
          amount_status: r.amount_status,
          lead_investor: r.lead_investor,
          news_source: r.news_source,
          news_url: r.news_url,
          news_excerpt: r.news_excerpt,
        })),
        note: 'news_excerpt = short quote; always cite news_source/news_url',
      },
    };
  },
});

const medianRound = defineTool({
  name: 'median_round',
  description:
    'Median round size (USD) by stage, optionally for one stage and/or year (amounts with a value; status=all matches the dataset-level medians).',
  input: z.strictObject({
    stage: z.string().max(40).optional(),
    year: z.number().int().min(2019).max(2030).optional(),
    status: z.enum(['verified', 'all']).optional(),
  }),
  label: t('Menghitung median putaran…', 'Computing median round…'),
  numeric: true,
  async run(ctx, input) {
    const status = input.status ?? 'all';
    const rows = filt(await rowsOf(ctx), { ...(input.year ? { year: input.year } : {}) });
    const g = new Map<string, number[]>();
    for (const r of rows) {
      if (!r.stage || (input.stage && !matches(r.stage, input.stage))) continue;
      const a = amount(r, status);
      if (!Number.isFinite(a)) continue;
      if (!g.has(String(r.stage))) g.set(String(r.stage), []);
      g.get(String(r.stage))!.push(a);
    }
    const gs = [...g.entries()].map(([k, v]) => ({ key: k, value: median(v), n: v.length })).sort((a, b) => b.n - a.n);
    return barOutput(ctx, {
      tool: 'median_round',
      title: ctx.locale === 'id' ? 'Median ukuran putaran (USD)' : 'Median round size (USD)',
      groups: gs,
      format: 'money_usd',
      dataset: DS,
      tab: 'stages',
      formulas: ['median'],
      inputs: input,
      rows: rows.length,
      flags: [...FLAGS, `amount_status_${status}`],
    });
  },
});

const megaRounds = defineTool({
  name: 'mega_rounds',
  description:
    'Mega-rounds (≥ US$100M) — share of rounds and of dollars, and the largest rounds (optionally in one year).',
  input: z.strictObject({
    year: z.number().int().min(2019).max(2030).optional(),
    limit: z.number().int().min(1).max(20).optional(),
  }),
  label: t('Menghitung mega-round…', 'Computing mega-rounds…'),
  numeric: true,
  async run(ctx, input) {
    const rows = filt(await rowsOf(ctx), { ...(input.year ? { year: input.year } : {}) }).filter(
      (r) => typeof r.amount_usd === 'number',
    );
    const mega = rows.filter((r) => (r.amount_usd as number) >= 100_000_000);
    const total = sum(rows.map((r) => r.amount_usd as number));
    const top = mega
      .slice()
      .sort((a, b) => (b.amount_usd as number) - (a.amount_usd as number))
      .slice(0, input.limit ?? 10);
    return tableOutput(ctx, {
      tool: 'mega_rounds',
      title: ctx.locale === 'id' ? 'Mega-round terbesar' : 'Largest mega-rounds',
      columns: [
        { key: 'company', label: 'Company', format: 'text' },
        { key: 'date', label: 'Date', format: 'date' },
        { key: 'stage', label: 'Stage', format: 'text' },
        { key: 'amount_usd', label: 'USD', format: 'money_usd' },
        { key: 'amount_status', label: 'Status', format: 'text' },
      ],
      rows: top,
      dataset: DS,
      tab: 'mega',
      formulas: ['share', 'sum'],
      inputs: input,
      rowsUsed: rows.length,
      flags: FLAGS,
      data: {
        rounds_with_amount: rows.length,
        mega_rounds: mega.length,
        share_of_rounds: mega.length / rows.length,
        share_of_dollars: sum(mega.map((r) => r.amount_usd as number)) / total,
      },
    });
  },
});

const companyRounds = defineTool({
  name: 'company_rounds',
  description: 'All funding rounds of one company in the sample.',
  input: z.strictObject({ company: z.string().min(1).max(80) }),
  label: t('Mencari putaran perusahaan…', 'Finding company rounds…'),
  numeric: false,
  async run(ctx, input) {
    const rows = (await rowsOf(ctx)).filter(
      (r) => matches(r.company, input.company) || matches(r.domain, input.company),
    );
    return {
      data: {
        company: input.company,
        rounds: rows.map((r) => ({
          date: r.date,
          stage: r.stage,
          amount_usd: r.amount_usd,
          amount_status: r.amount_status,
          lead_investor: r.lead_investor,
          news_source: r.news_source,
        })),
      },
    };
  },
});

const investorLeads = defineTool({
  name: 'investor_leads',
  description: 'Investors that led the most rounds (or the rounds led by one investor).',
  input: z.strictObject({
    lead_investor: z.string().max(80).optional(),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  label: t('Menghitung lead investor…', 'Counting lead investors…'),
  numeric: true,
  async run(ctx, input) {
    const rows = await rowsOf(ctx);
    const m = new Map<string, number>();
    for (const r of rows)
      if (r.lead_investor && matches(r.lead_investor, input.lead_investor, 'includes'))
        m.set(String(r.lead_investor), (m.get(String(r.lead_investor)) ?? 0) + 1);
    const gs = [...m.entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, input.limit ?? 10)
      .map(([k, v]) => ({ key: k, value: v }));
    return barOutput(ctx, {
      tool: 'investor_leads',
      title: ctx.locale === 'id' ? 'Lead investor terbanyak' : 'Most frequent lead investors',
      groups: gs,
      format: 'int',
      dataset: DS,
      tab: 'search',
      formulas: ['count'],
      inputs: input,
      rows: rows.length,
      flags: FLAGS,
    });
  },
});

export const tools: Tool<never>[] = [
  datasetInfo,
  appInfo,
  openDex,
  ...([
    fundingSummary,
    roundsSearch,
    medianRound,
    megaRounds,
    companyRounds,
    investorLeads,
  ] as unknown as Tool<never>[]),
  dataQualityTool(async (ctx) => ctx.store.json('core/startup/quality.json')),
] as unknown as Tool<never>[];
