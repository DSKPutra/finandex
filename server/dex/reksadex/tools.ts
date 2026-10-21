// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// ReksaDex (§8.5): industry AUM, managers, custodians, fund search/detail/ranking, USD view of IDR returns.
import { z } from 'zod';
import { median } from '../../../src/shared/analytics/stats.ts';
import { fmtMoney, fmtPct } from '../../../src/shared/format.ts';
import { fold } from '../../../src/shared/text.ts';
import { idxOnOrBefore, lastDayOfMonth, ymIndex } from '../../../src/shared/dates.ts';
import { artifact, defineTool, method, ToolError, t, type Tool, type ToolContext } from '../../tools/types.ts';
import { barOutput, tableOutput } from '../helpers.ts';
import { appInfo, dataQualityTool, datasetInfo, openDex } from '../shared-tools.ts';
import { matches, textSearch } from '../table.ts';

const DS = 'Mutual Fund (Reksa Dana) Dataset in Indonesia';
const TYPE_ID: Record<string, string> = {
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
const TYPES = Object.keys(TYPE_ID) as [string, ...string[]];
interface Fund {
  fund: string;
  slug: string;
  mi: string;
  bk: string;
  type: string;
  ccy: string;
  aum: number;
  nav: number;
  first_date: string;
  ret_1M: number | null;
  ret_YTD: number | null;
  ret_1Y: number | null;
  ret_3Y: number | null;
  vol_1Y_monthly_annualized: number | null;
  extreme_count: number;
}
interface Industry {
  as_of: string;
  active_funds_as_of: number;
  aum_total_idr_as_of: number;
  aum_by_type_as_of: Record<string, { count: number; aum: number }>;
  aum_by_ccy_as_of: Record<string, number>;
  median_ret_1Y_by_type: Record<string, number>;
  mi_latest: { mi: string; aum: number; share: number; fund_count: number }[];
  bk_latest: { bk: string; aum: number; share: number; fund_count: number }[];
  timeseries: {
    d: string[];
    aum_total: number[];
    funds_active: number[];
    by_type: Record<string, number[]>;
    by_ccy: Record<string, number[]>;
  };
  mi_timeseries_top20: Record<string, number[]>;
}
const industry = (ctx: ToolContext) => ctx.store.json<Industry>('core/reksa/industry.json');
const funds = async (ctx: ToolContext) => (await ctx.store.json<{ funds: Fund[] }>('core/reksa/catalog.json')).funds;
const typeLabel = (ctx: ToolContext, tp: string) => (ctx.locale === 'id' ? (TYPE_ID[tp] ?? tp) : tp);
const FLAGS = ['monthly_snapshots', 'returns_exclude_distributions', 'usd_funds_valued_in_idr'];

async function findFund(ctx: ToolContext, q: string): Promise<Fund> {
  const fs = await funds(ctx);
  const f =
    fs.find((x) => x.slug === q || fold(x.fund) === fold(q)) ??
    textSearch(fs as unknown as Record<string, unknown>[], q, ['fund'], 1)[0];
  if (!f) throw new ToolError(`Fund "${q}" not found among active funds; use fund_search.`);
  return f as unknown as Fund;
}

const industryOverview = defineTool({
  name: 'industry_overview',
  description:
    'Industry totals at the latest month-end snapshot (or year-end): total AUM (IDR), active funds, AUM & count by fund type and currency, median 1Y return by type.',
  input: z.strictObject({}),
  label: t('Membaca ringkasan industri…', 'Reading the industry overview…'),
  numeric: true,
  async run(ctx) {
    const ind = await industry(ctx);
    const types = Object.entries(ind.aum_by_type_as_of).sort((a, b) => b[1].aum - a[1].aum);
    return {
      data: {
        as_of: ind.as_of,
        aum_total_idr: ind.aum_total_idr_as_of,
        active_funds: ind.active_funds_as_of,
        by_type: types.map(([k, v]) => ({
          type: k,
          label: typeLabel(ctx, k),
          count: v.count,
          aum_idr: v.aum,
          share: v.aum / ind.aum_total_idr_as_of,
        })),
        by_currency: ind.aum_by_ccy_as_of,
        median_ret_1Y_by_type: ind.median_ret_1Y_by_type,
        flags: FLAGS,
      },
      ui: [
        artifact(ctx, {
          title: ctx.locale === 'id' ? 'AUM per jenis reksa dana' : 'AUM by fund type',
          summary: `${fmtMoney(ind.aum_total_idr_as_of, 'IDR', ctx.locale)} · ${ind.active_funds_as_of} ${ctx.locale === 'id' ? 'produk aktif' : 'active funds'}`,
          dataset: DS,
          asOf: ind.as_of,
          tab: 'industry',
          spec: {
            type: 'bar',
            categories: types.map(([k]) => typeLabel(ctx, k)),
            series: [{ name: 'AUM (IDR)', values: types.map(([, v]) => v.aum) }],
            horizontal: true,
            value_format: 'money_idr',
          },
        }),
      ],
      method: method(ctx, {
        tool: 'industry_overview',
        formulas: ['sum', 'share', 'count'],
        extraSteps: [
          {
            id: 'Baris aktif = NAB > 0, unit > 0, NAB/unit > 0 pada snapshot terakhir.',
            en: 'Active rows = AUM > 0, units > 0, NAV/unit > 0 on the latest snapshot.',
          },
        ],
        inputs: {},
        rows: ind.active_funds_as_of,
        dataset: DS,
        asOf: ind.as_of,
        flags: FLAGS,
      }),
    };
  },
});

const aumTrend = defineTool({
  name: 'aum_trend',
  description: 'Monthly AUM time series: total, by fund type, by currency, or for one investment manager (mi = name).',
  input: z.strictObject({
    by: z.enum(['total', 'type', 'ccy', 'mi']),
    type: z.enum(TYPES).optional(),
    mi: z.string().max(120).optional(),
    start: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    end: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  label: t('Menyusun tren AUM…', 'Building the AUM trend…'),
  numeric: true,
  async run(ctx, input) {
    const ind = await industry(ctx);
    const ts = ind.timeseries;
    const keep = ts.d.map((d) => (!input.start || d >= input.start) && (!input.end || d <= input.end));
    const x = ts.d.filter((_, i) => keep[i]);
    let series: { name: string; y: number[] }[] = [];
    if (input.by === 'total') series = [{ name: 'AUM', y: ts.aum_total.filter((_, i) => keep[i]) }];
    else if (input.by === 'type')
      series = Object.entries(ts.by_type)
        .filter(([k]) => !input.type || k === input.type)
        .sort((a, b) => b[1].at(-1)! - a[1].at(-1)!)
        .slice(0, 8)
        .map(([k, v]) => ({ name: typeLabel(ctx, k), y: v.filter((_, i) => keep[i]) }));
    else if (input.by === 'ccy')
      series = Object.entries(ts.by_ccy).map(([k, v]) => ({ name: k, y: v.filter((_, i) => keep[i]) }));
    else {
      const key = Object.keys(ind.mi_timeseries_top20).find((k) => matches(k, input.mi, 'includes'));
      if (!key) throw new ToolError(`Manager "${input.mi}" not in the top-20 series; use mi_leaderboard.`);
      series = [{ name: key, y: ind.mi_timeseries_top20[key]!.filter((_, i) => keep[i]) }];
    }
    return {
      data: {
        by: input.by,
        first: { date: x[0], values: series.map((s) => [s.name, s.y[0]]) },
        last: { date: x.at(-1), values: series.map((s) => [s.name, s.y.at(-1)]) },
        points: x.length,
      },
      ui: [
        artifact(ctx, {
          title: `AUM — ${input.by}`,
          summary: series.map((s) => `${s.name}: ${fmtMoney(s.y.at(-1), 'IDR', ctx.locale)}`).join('; '),
          dataset: DS,
          asOf: ind.as_of,
          tab: 'industry',
          spec: {
            type: 'line',
            x,
            series: series.map((s) => ({ name: s.name, y: s.y, area: input.by !== 'total' })),
            y_format: 'money_idr',
            log_allowed: false,
          },
        }),
      ],
      method: method(ctx, {
        tool: 'aum_trend',
        formulas: ['sum'],
        inputs: input,
        rows: x.length,
        period: { start: x[0] ?? null, end: x.at(-1) ?? null },
        dataset: DS,
        asOf: ind.as_of,
        flags: FLAGS,
      }),
    };
  },
});

const fundSearch = defineTool({
  name: 'fund_search',
  description:
    'Search ACTIVE funds by name, optionally filtered by type and manager. Returns up to 10 matches with AUM and returns.',
  input: z.strictObject({
    query: z.string().min(1).max(120),
    type: z.enum(TYPES).optional(),
    mi: z.string().max(120).optional(),
  }),
  label: t('Mencari reksa dana…', 'Searching funds…'),
  numeric: false,
  async run(ctx, input) {
    const fs = (await funds(ctx)).filter(
      (f) => (!input.type || f.type === input.type) && matches(f.mi, input.mi, 'includes'),
    );
    const hits = textSearch(
      fs as unknown as Record<string, unknown>[],
      input.query,
      ['fund', 'mi'],
      10,
    ) as unknown as Fund[];
    return {
      data: {
        query: input.query,
        results: hits.map((f) => ({
          fund: f.fund,
          slug: f.slug,
          type: f.type,
          mi: f.mi,
          ccy: f.ccy,
          aum_idr: f.aum,
          ret_1Y: f.ret_1Y,
        })),
      },
    };
  },
});

const fundDetail = defineTool({
  name: 'fund_detail',
  description:
    'Detail of ONE active fund: manager, custodian, type, currency, AUM, NAV/unit, returns 1M/YTD/1Y/3Y, monthly volatility, NAV history chart.',
  input: z.strictObject({ fund: z.string().min(1).max(160) }),
  label: t('Membaca detail reksa dana…', 'Reading fund detail…'),
  numeric: true,
  async run(ctx, input) {
    const f = await findFund(ctx, input.fund);
    const s = await ctx.store.json<{ d: string[]; nav: number[]; aum: number[] }>(`heavy/reksa/funds/${f.slug}.json`);
    const flags = [
      ...FLAGS,
      ...(f.extreme_count ? ['extreme_month_flagged'] : []),
      ...(f.ccy === 'USD' ? ['usd_fund_nav_in_idr'] : []),
    ];
    return {
      data: { ...f, extreme_count: f.extreme_count, flags },
      ui: [
        artifact(ctx, {
          title: `${f.fund} — NAB/unit`,
          summary: `1Y ${fmtPct(f.ret_1Y, ctx.locale)}; AUM ${fmtMoney(f.aum, 'IDR', ctx.locale)}`,
          dataset: DS,
          tab: 'search',
          entity: f.slug,
          spec: {
            type: 'line',
            x: s.d,
            series: [{ name: 'NAV/unit (IDR)', y: s.nav }],
            y_format: 'num',
            log_allowed: true,
          },
        }),
      ],
      method: method(ctx, {
        tool: 'fund_detail',
        formulas: ['monthly_return'],
        inputs: { fund: f.fund },
        rows: s.d.length,
        period: { start: s.d[0]!, end: s.d.at(-1)! },
        dataset: DS,
        flags,
      }),
    };
  },
});

const rankFunds = defineTool({
  name: 'rank_funds',
  description:
    'Rank active funds by aum, ret_1M, ret_YTD, ret_1Y, ret_3Y or vol_1Y, filtered by type/manager/currency. Historical ranking only — never a recommendation.',
  input: z.strictObject({
    metric: z.enum(['aum', 'ret_1M', 'ret_YTD', 'ret_1Y', 'ret_3Y', 'vol_1Y']),
    type: z.enum(TYPES).optional(),
    mi: z.string().max(120).optional(),
    ccy: z.enum(['IDR', 'USD']).optional(),
    order: z.enum(['desc', 'asc']).optional(),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  label: t('Menyusun peringkat reksa dana…', 'Ranking funds…'),
  numeric: true,
  async run(ctx, input) {
    const key = input.metric === 'vol_1Y' ? 'vol_1Y_monthly_annualized' : input.metric;
    const fs = (await funds(ctx)).filter(
      (f) =>
        (!input.type || f.type === input.type) &&
        (!input.ccy || f.ccy === input.ccy) &&
        matches(f.mi, input.mi, 'includes') &&
        typeof f[key as keyof Fund] === 'number',
    );
    const dir = input.order === 'asc' ? 1 : -1;
    const top = fs
      .sort(
        (a, b) =>
          dir * ((a[key as keyof Fund] as number) - (b[key as keyof Fund] as number)) || (a.fund < b.fund ? -1 : 1),
      )
      .slice(0, input.limit ?? 10);
    return barOutput(ctx, {
      tool: 'rank_funds',
      title: `${ctx.locale === 'id' ? 'Peringkat' : 'Ranking'} ${input.metric}${input.type ? ' — ' + typeLabel(ctx, input.type) : ''}`,
      groups: top.map((f) => ({ key: f.fund, value: f[key as keyof Fund] as number })),
      format: input.metric === 'aum' ? 'money_idr' : 'pct',
      dataset: DS,
      tab: 'ranking',
      formulas: ['rank', 'monthly_return'],
      inputs: input,
      rows: fs.length,
      flags: [...FLAGS, 'not_a_recommendation'],
      data: { candidates: fs.length },
    });
  },
});

const miLeaderboard = defineTool({
  name: 'mi_leaderboard',
  description: 'Investment managers ranked by AUM, AUM share or number of active funds at the latest snapshot.',
  input: z.strictObject({
    metric: z.enum(['aum', 'share', 'fund_count']).optional(),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  label: t('Menyusun peringkat manajer investasi…', 'Ranking investment managers…'),
  numeric: true,
  async run(ctx, input) {
    const ind = await industry(ctx);
    const m = input.metric ?? 'aum';
    const rows = ind.mi_latest
      .slice()
      .sort((a, b) => b[m] - a[m] || (a.mi < b.mi ? -1 : 1))
      .slice(0, input.limit ?? 10);
    return barOutput(ctx, {
      tool: 'mi_leaderboard',
      title: `MI — ${m}`,
      groups: rows.map((r) => ({ key: r.mi, value: r[m] })),
      format: m === 'aum' ? 'money_idr' : m === 'share' ? 'pct' : 'int',
      dataset: DS,
      asOf: ind.as_of,
      tab: 'managers',
      formulas: ['sum', 'share'],
      inputs: input,
      rows: ind.mi_latest.length,
      data: {
        as_of: ind.as_of,
        total_aum_idr: ind.aum_total_idr_as_of,
        rows: rows.map((r) => ({ mi: r.mi, aum_idr: r.aum, share: r.share, fund_count: r.fund_count })),
      },
    });
  },
});

const custodianShare = defineTool({
  name: 'custodian_share',
  description: 'Custodian banks ranked by AUM share at the latest snapshot.',
  input: z.strictObject({ limit: z.number().int().min(1).max(25).optional() }),
  label: t('Menghitung porsi bank kustodian…', 'Computing custodian shares…'),
  numeric: true,
  async run(ctx, input) {
    const ind = await industry(ctx);
    const rows = ind.bk_latest.slice(0, input.limit ?? 10);
    return barOutput(ctx, {
      tool: 'custodian_share',
      title: ctx.locale === 'id' ? 'Porsi AUM bank kustodian' : 'Custodian AUM share',
      groups: rows.map((r) => ({ key: r.bk, value: r.share })),
      format: 'pct',
      dataset: DS,
      asOf: ind.as_of,
      tab: 'custodians',
      formulas: ['share'],
      inputs: input,
      rows: ind.bk_latest.length,
      data: { rows: rows.map((r) => ({ bk: r.bk, aum_idr: r.aum, share: r.share, funds: r.fund_count })) },
    });
  },
});

const fundReturnUsd = defineTool({
  name: 'fund_return_usd',
  description:
    'Return of a fund in IDR AND converted to USD with RupiahDex month-end USD/IDR (removes/adds the FX effect). Useful for USD-denominated funds, whose NAV is stored in IDR.',
  input: z.strictObject({
    fund: z.string().min(1).max(160),
    months: z.union([z.literal(12), z.literal(36)]).optional(),
  }),
  label: t('Menghitung return dalam USD…', 'Computing USD return…'),
  numeric: true,
  async run(ctx, input) {
    const f = await findFund(ctx, input.fund);
    const s = await ctx.store.json<{ d: string[]; nav: number[] }>(`heavy/reksa/funds/${f.slug}.json`);
    const fx = await ctx.store.json<{ d: string[]; c: number[] }>('core/rupiah/series.json');
    const months = input.months ?? 12;
    const lym = ymIndex(s.d.at(-1)!);
    const j = s.d.findIndex((d) => ymIndex(d) === lym - months);
    if (j < 0) throw new ToolError(`No NAV exactly ${months} months before ${s.d.at(-1)} for this fund.`);
    const rate = (d: string) => fx.c[idxOnOrBefore(fx.d, lastDayOfMonth(d))]!;
    const idr = s.nav.at(-1)! / s.nav[j]! - 1;
    const usd = s.nav.at(-1)! / rate(s.d.at(-1)!) / (s.nav[j]! / rate(s.d[j]!)) - 1;
    const x = s.d.slice(j);
    return {
      data: {
        fund: f.fund,
        ccy: f.ccy,
        months,
        start: s.d[j],
        end: s.d.at(-1),
        return_idr: idr,
        return_usd: usd,
        fx_start: rate(s.d[j]!),
        fx_end: rate(s.d.at(-1)!),
      },
      ui: [
        artifact(ctx, {
          title: `${f.fund}: IDR vs USD`,
          summary: `IDR ${fmtPct(idr, ctx.locale)} · USD ${fmtPct(usd, ctx.locale)}`,
          dataset: DS,
          tab: 'search',
          entity: f.slug,
          spec: {
            type: 'line',
            x,
            series: [
              { name: 'IDR (100)', y: s.nav.slice(j).map((v) => (v / s.nav[j]!) * 100) },
              {
                name: 'USD (100)',
                y: s.nav.slice(j).map((v, k) => (v / rate(x[k]!) / (s.nav[j]! / rate(s.d[j]!))) * 100),
              },
            ],
            y_format: 'num',
            log_allowed: true,
            rebased: true,
          },
        }),
      ],
      method: method(ctx, {
        tool: 'fund_return_usd',
        formulas: ['monthly_return', 'fx_conversion'],
        inputs: input,
        rows: x.length,
        period: { start: s.d[j]!, end: s.d.at(-1)! },
        dataset: `${DS} + USD/IDR (RupiahDex)`,
        flags: FLAGS,
      }),
    };
  },
});

const typeMedian = defineTool({
  name: 'type_return_stats',
  description:
    'Median and distribution of a return metric (ret_1Y, ret_YTD, ret_3Y) for active funds of one type (e.g. Equity Fund = reksa dana saham).',
  input: z.strictObject({ type: z.enum(TYPES), metric: z.enum(['ret_1Y', 'ret_YTD', 'ret_3Y']).optional() }),
  label: t('Menghitung statistik return…', 'Computing return statistics…'),
  numeric: true,
  async run(ctx, input) {
    const metric = input.metric ?? 'ret_1Y';
    const fs = (await funds(ctx)).filter((f) => f.type === input.type && typeof f[metric] === 'number');
    const vs = fs.map((f) => f[metric] as number);
    const med = vs.length ? median(vs) : null;
    return tableOutput(ctx, {
      tool: 'type_return_stats',
      title: `${typeLabel(ctx, input.type)} — ${metric}`,
      columns: [
        { key: 'stat', label: 'Stat', format: 'text' },
        { key: 'value', label: metric, format: 'pct' },
      ],
      rows: [
        { stat: 'median', value: med },
        { stat: 'n', value: null, n: vs.length },
      ],
      dataset: DS,
      tab: 'ranking',
      formulas: ['median', 'monthly_return'],
      inputs: input,
      rowsUsed: vs.length,
      flags: FLAGS,
      data: { type: input.type, metric, median: med, n: vs.length },
    });
  },
});

export const tools: Tool<never>[] = [
  datasetInfo,
  appInfo,
  openDex,
  ...([
    industryOverview,
    aumTrend,
    fundSearch,
    fundDetail,
    rankFunds,
    miLeaderboard,
    custodianShare,
    fundReturnUsd,
    typeMedian,
  ] as unknown as Tool<never>[]),
  dataQualityTool(async (ctx) => ctx.store.json('core/reksa/quality.json')),
] as unknown as Tool<never>[];
