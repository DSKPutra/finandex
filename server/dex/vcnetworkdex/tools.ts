// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// VCNetworkDex (§8.5): co-investment pairs, partners, network statistics, ego-graph (≤ 50 nodes). Degrees are sample counts.
import { z } from 'zod';
import { artifact, defineTool, method, ToolError, t, type Tool, type ToolContext } from '../../tools/types.ts';
import { barOutput, tableOutput } from '../helpers.ts';
import { appInfo, dataQualityTool, datasetInfo, openDex } from '../shared-tools.ts';
import { loadTable, matches, type Row } from '../table.ts';
import { fold } from '../../../src/shared/text.ts';

const DS = 'VC Co-Investment Network — 303k investor pairs (25% sample)';
const FLAGS = ['sample_25pct', 'degree_is_sample_count', 'cc_by_nc'];
const edgesOf = (ctx: ToolContext) => loadTable(ctx.store, 'heavy/vcnetwork/edges.json');
async function canonical(ctx: ToolContext, q: string): Promise<string> {
  const es = await edgesOf(ctx);
  const names = new Set<string>();
  for (const e of es) {
    names.add(String(e.investor_a));
    names.add(String(e.investor_b));
  }
  const f = fold(q);
  const exact = [...names].find((n) => fold(n) === f);
  if (exact) return exact;
  const part = [...names].filter((n) => fold(n).includes(f));
  if (!part.length) throw new ToolError(`Investor "${q}" not found in the sample network.`);
  return part.sort((a, b) => a.length - b.length)[0]!;
}
const other = (e: Row, inv: string) => (e.investor_a === inv ? String(e.investor_b) : String(e.investor_a));

const topPairs = defineTool({
  name: 'top_pairs',
  description:
    'Strongest co-investor pairs by shared deals (optionally filtered by shared sector/country or an investor).',
  input: z.strictObject({
    sector: z.string().max(60).optional(),
    country: z.string().max(60).optional(),
    investor: z.string().max(80).optional(),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  label: t('Mencari pasangan terkuat…', 'Finding the strongest pairs…'),
  numeric: true,
  async run(ctx, input) {
    const inv = input.investor ? await canonical(ctx, input.investor) : null;
    const es = (await edgesOf(ctx)).filter(
      (e) =>
        matches(e.top_shared_sector, input.sector) &&
        matches(e.top_shared_country, input.country) &&
        (!inv || e.investor_a === inv || e.investor_b === inv),
    );
    const top = es
      .slice()
      .sort((a, b) => (b.shared_deals as number) - (a.shared_deals as number))
      .slice(0, input.limit ?? 10);
    return barOutput(ctx, {
      tool: 'top_pairs',
      title: ctx.locale === 'id' ? 'Pasangan co-investor terkuat' : 'Strongest co-investor pairs',
      groups: top.map((e) => ({
        key: `${String(e.investor_a)} – ${String(e.investor_b)}`,
        value: e.shared_deals as number,
      })),
      format: 'int',
      dataset: DS,
      tab: 'pairs',
      formulas: ['rank'],
      inputs: input,
      rows: es.length,
      flags: FLAGS,
      data: {
        pairs: top.map((e) => ({
          a: e.investor_a,
          b: e.investor_b,
          shared_deals: e.shared_deals,
          first_year: e.first_year,
          last_year: e.last_year,
          sector: e.top_shared_sector,
          country: e.top_shared_country,
        })),
      },
    });
  },
});

const investorPartners = defineTool({
  name: 'investor_partners',
  description: 'Co-investment partners of one investor in the sample, ranked by shared deals.',
  input: z.strictObject({ investor: z.string().min(1).max(80), limit: z.number().int().min(1).max(25).optional() }),
  label: t('Mencari partner investor…', 'Finding partners…'),
  numeric: true,
  async run(ctx, input) {
    const inv = await canonical(ctx, input.investor);
    const es = (await edgesOf(ctx))
      .filter((e) => e.investor_a === inv || e.investor_b === inv)
      .sort((a, b) => (b.shared_deals as number) - (a.shared_deals as number));
    return barOutput(ctx, {
      tool: 'investor_partners',
      title: `${inv} — partners`,
      groups: es.slice(0, input.limit ?? 10).map((e) => ({ key: other(e, inv), value: e.shared_deals as number })),
      format: 'int',
      dataset: DS,
      tab: 'investors',
      formulas: ['count'],
      inputs: input,
      rows: es.length,
      flags: FLAGS,
      data: { investor: inv, partners_in_sample: es.length },
    });
  },
});

const networkStats = defineTool({
  name: 'network_stats',
  description:
    'Network statistics of the sample (pairs, unique investors, share of one-off pairs, top sectors/countries) or of one investor (partners, weighted degree).',
  input: z.strictObject({ investor: z.string().max(80).optional() }),
  label: t('Menghitung statistik jaringan…', 'Computing network statistics…'),
  numeric: true,
  async run(ctx, input) {
    const s = await ctx.store.json<Record<string, unknown>>('core/vcnetwork/summary.json');
    if (input.investor) {
      const inv = await canonical(ctx, input.investor);
      const es = (await edgesOf(ctx)).filter((e) => e.investor_a === inv || e.investor_b === inv);
      const w = es.reduce((a, e) => a + (e.shared_deals as number), 0);
      return tableOutput(ctx, {
        tool: 'network_stats',
        title: inv,
        columns: [
          { key: 'k', label: '', format: 'text' },
          { key: 'v', label: '', format: 'num' },
        ],
        rows: [
          { k: 'partners_in_sample', v: es.length },
          { k: 'weighted_degree', v: w },
        ],
        dataset: DS,
        tab: 'investors',
        formulas: ['count', 'sum'],
        inputs: input,
        rowsUsed: es.length,
        flags: FLAGS,
        data: { investor: inv, partners: es.length, weighted_degree: w },
      });
    }
    return tableOutput(ctx, {
      tool: 'network_stats',
      title: ctx.locale === 'id' ? 'Statistik jaringan (sampel)' : 'Network statistics (sample)',
      columns: [
        { key: 'k', label: '', format: 'text' },
        { key: 'v', label: '', format: 'num' },
      ],
      rows: [
        { k: 'pairs', v: s.rows },
        { k: 'unique_investors', v: s.unique_investors },
        { k: 'pairs_with_one_shared_deal_share', v: s.pairs_shared_deals_1_share },
      ],
      dataset: DS,
      tab: 'graph',
      formulas: ['count', 'share'],
      inputs: input,
      rowsUsed: Number(s.rows),
      flags: FLAGS,
      data: {
        pairs: s.rows,
        unique_investors: s.unique_investors,
        one_off_share: s.pairs_shared_deals_1_share,
        top5_shared_sectors: s.top5_shared_sectors,
        top5_shared_countries: s.top5_shared_countries,
        year_range: s.year_range,
      },
    });
  },
});

const egoGraph = defineTool({
  name: 'ego_graph',
  description:
    'One-hop ego network of an investor (≤ 50 nodes, edge width = shared deals) drawn as a force-directed graph.',
  input: z.strictObject({ investor: z.string().min(1).max(80), max_nodes: z.number().int().min(5).max(50).optional() }),
  label: t('Menggambar ego-graph…', 'Drawing the ego graph…'),
  numeric: true,
  async run(ctx, input) {
    const inv = await canonical(ctx, input.investor);
    const es = (await edgesOf(ctx))
      .filter((e) => e.investor_a === inv || e.investor_b === inv)
      .sort((a, b) => (b.shared_deals as number) - (a.shared_deals as number))
      .slice(0, (input.max_nodes ?? 30) - 1);
    const nodes = [
      { id: inv, label: inv, value: es.reduce((a, e) => a + (e.shared_deals as number), 0), center: true },
      ...es.map((e) => ({ id: other(e, inv), label: other(e, inv), value: e.shared_deals as number })),
    ];
    return {
      data: {
        investor: inv,
        nodes: nodes.length,
        strongest: es.slice(0, 5).map((e) => ({ partner: other(e, inv), shared_deals: e.shared_deals })),
      },
      ui: [
        artifact(ctx, {
          title: `Ego-graph: ${inv}`,
          summary: `${nodes.length - 1} partners`,
          dataset: DS,
          tab: 'graph',
          entity: inv,
          spec: {
            type: 'graph',
            nodes,
            edges: es.map((e) => ({ source: inv, target: other(e, inv), value: e.shared_deals as number })),
          },
        }),
      ],
      method: method(ctx, {
        tool: 'ego_graph',
        formulas: ['count'],
        extraSteps: [
          {
            id: 'Node = investor; edge = pasangan di sampel; ketebalan = shared_deals.',
            en: 'Node = investor; edge = pair in the sample; width = shared_deals.',
          },
        ],
        inputs: input,
        rows: es.length,
        dataset: DS,
        flags: FLAGS,
      }),
    };
  },
});

const sectorCountryLinks = defineTool({
  name: 'sector_country_links',
  description: 'Most common shared sectors and countries of co-investment pairs, optionally filtered by one of them.',
  input: z.strictObject({
    sector: z.string().max(60).optional(),
    country: z.string().max(60).optional(),
    field: z.enum(['top_shared_sector', 'top_shared_country']).optional(),
  }),
  label: t('Menghitung keterkaitan sektor/negara…', 'Counting sector/country links…'),
  numeric: true,
  async run(ctx, input) {
    const es = (await edgesOf(ctx)).filter(
      (e) => matches(e.top_shared_sector, input.sector) && matches(e.top_shared_country, input.country),
    );
    const f = input.field ?? (input.sector ? 'top_shared_country' : 'top_shared_sector');
    const m = new Map<string, number>();
    for (const e of es) if (e[f]) m.set(String(e[f]), (m.get(String(e[f])) ?? 0) + 1);
    const gs = [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([k, v]) => ({ key: k, value: v }));
    return barOutput(ctx, {
      tool: 'sector_country_links',
      title: f,
      groups: gs,
      format: 'int',
      dataset: DS,
      tab: 'pairs',
      formulas: ['count'],
      inputs: input,
      rows: es.length,
      flags: FLAGS,
    });
  },
});

export const tools: Tool<never>[] = [
  datasetInfo,
  appInfo,
  openDex,
  ...([topPairs, investorPartners, networkStats, egoGraph, sectorCountryLinks] as unknown as Tool<never>[]),
  dataQualityTool(async (ctx) => ctx.store.json('core/vcnetwork/quality.json')),
] as unknown as Tool<never>[];
