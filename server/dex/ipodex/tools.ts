// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// IPODex (§8.5): IPO summaries (Completed = listed; verified sizes by default), search, size stats, India SME vs Mainboard.
import { z } from 'zod';
import { median, sum } from '../../../src/shared/analytics/stats.ts';
import { defineTool, t, type Tool, type ToolContext } from '../../tools/types.ts';
import { barOutput, tableOutput } from '../helpers.ts';
import { appInfo, dataQualityTool, datasetInfo, openDex } from '../shared-tools.ts';
import { loadTable, matches, textSearch, type Row } from '../table.ts';

const DS = 'IPO Data 2019–2026 — India, US, UK & Global IPOs (38% sample)';
const FLAGS = ['sample_38pct', 'cc_by_nc'];
const rowsOf = (ctx: ToolContext) => loadTable(ctx.store, 'heavy/ipo/rows.json');
const Filt = z.strictObject({
  country: z.string().max(60).optional(),
  exchange: z.string().max(60).optional(),
  year: z.number().int().min(2018).max(2030).optional(),
  listing_status: z.string().max(40).optional(),
  sector: z.string().max(60).optional(),
  board: z.string().max(40).optional(),
});
const filt = (rows: Row[], f: z.infer<typeof Filt> = {}) =>
  rows.filter(
    (r) =>
      matches(r.country, f.country) &&
      matches(r.exchange, f.exchange) &&
      (!f.year || r.year === f.year) &&
      matches(r.listing_status, f.listing_status) &&
      matches(r.sector, f.sector) &&
      matches(r.board, f.board),
  );

const ipoSummary = defineTool({
  name: 'ipo_summary',
  description:
    'IPO records grouped by year, country, exchange, board, sector, ipo_type or listing_status (counts), or total issue size in USD (metric=usd, verified amounts by default). Only listing_status "Completed" are listed IPOs; "Announced / filed" are not listings.',
  input: z.strictObject({
    group_by: z.enum(['none', 'year', 'country', 'exchange', 'board', 'sector', 'ipo_type', 'listing_status']),
    filters: Filt.optional(),
    metric: z.enum(['count', 'usd']).optional(),
    amount_status: z.enum(['verified', 'all']).optional(),
    limit: z.number().int().min(1).max(30).optional(),
  }),
  label: t('Meringkas IPO…', 'Summarising IPOs…'),
  numeric: true,
  async run(ctx, input) {
    const rows = filt(await rowsOf(ctx), input.filters);
    const metric = input.metric ?? 'count';
    const st = input.amount_status ?? 'verified';
    const g = new Map<string, number[]>();
    for (const r of rows) {
      const k =
        input.group_by === 'none'
          ? 'all'
          : r[input.group_by] === null || r[input.group_by] === undefined
            ? null
            : String(r[input.group_by]);
      if (k === null) continue;
      if (!g.has(k)) g.set(k, []);
      if (metric === 'count') g.get(k)!.push(1);
      else if (typeof r.issue_size_usd === 'number' && (st === 'all' || r.amount_status === 'verified'))
        g.get(k)!.push(r.issue_size_usd);
    }
    const gs = [...g.entries()]
      .map(([k, v]) => ({ key: k, value: sum(v), n: v.length }))
      .sort((a, b) =>
        input.group_by === 'year' ? (a.key < b.key ? -1 : 1) : b.value - a.value || (a.key < b.key ? -1 : 1),
      )
      .slice(0, input.limit ?? 15);
    return barOutput(ctx, {
      tool: 'ipo_summary',
      title: `IPO ${metric} — ${input.group_by}`,
      groups: gs,
      format: metric === 'count' ? 'int' : 'money_usd',
      dataset: DS,
      tab: input.group_by === 'country' || input.group_by === 'exchange' ? 'countries' : 'summary',
      formulas: metric === 'count' ? ['count'] : ['sum'],
      inputs: input,
      rows: rows.length,
      flags: [...FLAGS, ...(metric === 'usd' ? [`amount_status_${st}`] : [])],
      horizontal: input.group_by !== 'year',
      data: { matched: rows.length },
    });
  },
});

const ipoSearch = defineTool({
  name: 'ipo_search',
  description:
    'Search IPOs by company/ticker text and filters; returns status, exchange, board, issue size (local & USD), amount status and news source.',
  input: z.strictObject({
    query: z.string().max(80).optional(),
    filters: Filt.optional(),
    limit: z.number().int().min(1).max(20).optional(),
  }),
  label: t('Mencari IPO…', 'Searching IPOs…'),
  numeric: false,
  async run(ctx, input) {
    let rows = filt(await rowsOf(ctx), input.filters);
    rows = input.query
      ? textSearch(rows, input.query, ['company', 'ticker', 'sector'], input.limit ?? 10)
      : rows.slice(0, input.limit ?? 10);
    return {
      data: {
        results: rows.map((r) => ({
          company: r.company,
          ticker: r.ticker,
          country: r.country,
          exchange: r.exchange,
          board: r.board,
          listing_status: r.listing_status,
          first_report_date: r.first_report_date,
          issue_size_local: r.issue_size_local,
          currency: r.currency,
          issue_size_usd: r.issue_size_usd,
          amount_status: r.amount_status,
          news_source: r.news_source,
          news_url: r.news_url,
        })),
        note: 'news excerpts are short quotes; always cite the source',
      },
    };
  },
});

const ipoSizeStats = defineTool({
  name: 'ipo_size_stats',
  description: 'Median and total issue size (USD) of IPOs with VERIFIED amounts (default), optionally filtered.',
  input: z.strictObject({ filters: Filt.optional(), amount_status: z.enum(['verified', 'all']).optional() }),
  label: t('Menghitung ukuran IPO…', 'Computing IPO sizes…'),
  numeric: true,
  async run(ctx, input) {
    const st = input.amount_status ?? 'verified';
    const rows = filt(await rowsOf(ctx), input.filters).filter(
      (r) => typeof r.issue_size_usd === 'number' && (st === 'all' || r.amount_status === 'verified'),
    );
    const v = rows.map((r) => r.issue_size_usd as number);
    return tableOutput(ctx, {
      tool: 'ipo_size_stats',
      title: `IPO size (${st})`,
      columns: [
        { key: 'k', label: '', format: 'text' },
        { key: 'v', label: 'USD', format: 'money_usd' },
      ],
      rows: [
        { k: 'median', v: v.length ? median(v) : null },
        { k: 'total', v: sum(v) },
      ],
      dataset: DS,
      tab: 'summary',
      formulas: ['median', 'sum'],
      inputs: input,
      rowsUsed: v.length,
      flags: [...FLAGS, `amount_status_${st}`],
      data: { n: v.length, median_usd: v.length ? median(v) : null, total_usd: sum(v), amount_status: st },
    });
  },
});

const indiaSme = defineTool({
  name: 'india_sme_vs_mainboard',
  description: 'India IPO records by board (Mainboard vs SME), optionally for one year.',
  input: z.strictObject({ year: z.number().int().min(2018).max(2030).optional() }),
  label: t('Membandingkan SME vs Mainboard…', 'Comparing SME vs Mainboard…'),
  numeric: true,
  async run(ctx, input) {
    const rows = filt(await rowsOf(ctx), { country: 'India', ...(input.year ? { year: input.year } : {}) });
    const m = new Map<string, number>();
    for (const r of rows) m.set(String(r.board ?? '(empty)'), (m.get(String(r.board ?? '(empty)')) ?? 0) + 1);
    return barOutput(ctx, {
      tool: 'india_sme_vs_mainboard',
      title: 'India: SME vs Mainboard',
      groups: [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, value: v })),
      format: 'int',
      dataset: DS,
      tab: 'india',
      formulas: ['count'],
      inputs: input,
      rows: rows.length,
      flags: FLAGS,
    });
  },
});

const withdrawn = defineTool({
  name: 'withdrawn_ipos',
  description: 'IPOs with listing_status "Withdrawn / postponed", optionally filtered.',
  input: z.strictObject({ filters: Filt.optional(), limit: z.number().int().min(1).max(25).optional() }),
  label: t('Mencari IPO yang ditarik…', 'Finding withdrawn IPOs…'),
  numeric: true,
  async run(ctx, input) {
    const rows = filt(await rowsOf(ctx), input.filters).filter((r) => String(r.listing_status).startsWith('Withdrawn'));
    return tableOutput(ctx, {
      tool: 'withdrawn_ipos',
      title: `Withdrawn / postponed (${rows.length})`,
      columns: [
        { key: 'company', label: 'Company', format: 'text' },
        { key: 'country', label: 'Country', format: 'text' },
        { key: 'exchange', label: 'Exchange', format: 'text' },
        { key: 'first_report_date', label: 'First report', format: 'date' },
      ],
      rows: rows.slice(0, input.limit ?? 15),
      dataset: DS,
      tab: 'search',
      formulas: ['count'],
      inputs: input,
      rowsUsed: rows.length,
      flags: FLAGS,
      data: { count: rows.length },
    });
  },
});

export const tools: Tool<never>[] = [
  datasetInfo,
  appInfo,
  openDex,
  ...([ipoSummary, ipoSearch, ipoSizeStats, indiaSme, withdrawn] as unknown as Tool<never>[]),
  dataQualityTool(async (ctx) => ctx.store.json('core/ipo/quality.json')),
] as unknown as Tool<never>[];
