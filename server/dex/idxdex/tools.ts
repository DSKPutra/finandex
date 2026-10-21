// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// IDXDex (§8.5): profiles, fundamentals & valuation, screening, beta vs IHSG, liquidity, e-IPO statistics.
import { z } from 'zod';
import { median, mean } from '../../../src/shared/analytics/stats.ts';
import { beta } from '../../../src/shared/analytics/series.ts';
import { fmtDate, fmtMoney, fmtNum, fmtPct } from '../../../src/shared/format.ts';
import { artifact, defineTool, method, ToolError, t, type Tool, type ToolContext } from '../../tools/types.ts';
import { barOutput, tableOutput } from '../helpers.ts';
import { appInfo, dataQualityTool, datasetInfo, openDex, resolveEntity, timeSeriesTools } from '../shared-tools.ts';
import { idfinAdapter, idxAdapter } from '../ts-adapters.ts';
import { matches } from '../table.ts';

const ad = idxAdapter();
const DS = ad.dataset;
const DS_IPO = 'e-IPO Indonesia Data — Investment';
const PRICE_FLAG = 'prices_as_of_2024_05_17';
type IpoRow = Record<string, string | number | null>;
const ipoRows = async (ctx: ToolContext) => (await ctx.store.json<{ rows: IpoRow[] }>('core/idx/ipo.json')).rows;
const companies = async (ctx: ToolContext) =>
  (
    await ctx.store.json<{
      rows: {
        code: string;
        name: string;
        profile_url: string;
        listing_date: string;
        has_prices: boolean;
        sector: string | null;
        subsector: string | null;
      }[];
    }>('core/idx/companies.json')
  ).rows;

const companyProfile = defineTool({
  name: 'company_profile',
  description:
    'Issuer profile: name, listing date (from the official issuer list), IDX profile URL, sector/subsector (only for e-IPO issuers 2021+), price as-of.',
  input: z.strictObject({ ticker: z.string().min(2).max(12) }),
  label: t('Membaca profil emiten…', 'Reading issuer profile…'),
  numeric: false,
  async run(ctx, input) {
    const code = input.ticker.toUpperCase();
    const c = (await companies(ctx)).find((x) => x.code === code);
    if (!c) throw new ToolError(`${code} not in the issuer list (941 issuers).`);
    const m = c.has_prices ? await ad.metrics(ctx, code).catch(() => null) : null;
    return {
      data: {
        ...c,
        sector_note: c.sector ? null : 'sector is only available for issuers in the e-IPO file (2021+)',
        last_close: m?.last_close ?? null,
        last_date: m?.last_date ?? null,
        flags: [PRICE_FLAG],
      },
    };
  },
});

const fundamentals = defineTool({
  name: 'fundamentals',
  description:
    'Financial statement items & ratios of an IDX issuer for FY2020–2023 (revenue, net income, assets, equity, liabilities, EPS, shares, FCF) and ROE/NPM/DER on the latest available FY. DER is less meaningful for banks.',
  input: z.strictObject({ ticker: z.string().min(2).max(12) }),
  label: t('Membaca fundamental…', 'Reading fundamentals…'),
  numeric: true,
  async run(ctx, input) {
    const e = await resolveEntity(ctx, ad, input.ticker.toUpperCase());
    const m = await ad.metrics(ctx, e.id);
    const f = (
      await ctx.store.json<
        Record<string, Record<string, { fy: number; value: number; by_year: Record<string, number> }>>
      >('core/idx/fundamentals.json')
    )[e.id];
    if (!f) throw new ToolError(`No financial statements for ${e.id} in the dataset (604 issuers covered).`);
    const years = ['2020', '2021', '2022', '2023'];
    const rows = Object.entries(f).map(([k, v]) => ({
      item: k,
      ...Object.fromEntries(years.map((y) => [y, v.by_year[y] ?? null])),
    }));
    const roeSeries = years.map((y) => {
      const ni = f.net_income?.by_year[y];
      const eq = f.equity?.by_year[y];
      return typeof ni === 'number' && typeof eq === 'number' && eq > 0 ? ni / eq : null;
    });
    return {
      data: {
        ticker: e.id,
        fund_fy: m.fund_fy,
        roe: m.roe,
        npm: m.npm,
        der: m.der,
        roe_by_year: Object.fromEntries(years.map((y, i) => [y, roeSeries[i]])),
        items: f,
        note: 'ratios on the latest available FY; prices as of 2024-05-17',
      },
      ui: [
        artifact(ctx, {
          title: `${e.id} — ROE`,
          summary: `ROE FY${m.fund_fy}: ${fmtPct(m.roe as number, ctx.locale)}`,
          dataset: 'Dataset Financial Statement in IDX Indonesia',
          tab: 'fundamentals',
          entity: e.id,
          spec: {
            type: 'bar',
            categories: years,
            series: [{ name: 'ROE', values: roeSeries }],
            horizontal: false,
            value_format: 'pct',
          },
        }),
        ...tableOutput(ctx, {
          tool: 'fundamentals',
          title: `${e.id} — ${ctx.locale === 'id' ? 'laporan keuangan' : 'financial statements'} (IDR)`,
          columns: [
            { key: 'item', label: 'Item', format: 'text' },
            ...years.map((y) => ({ key: y, label: `FY${y}`, format: 'compact' as const })),
          ],
          rows,
          dataset: DS,
          formulas: [],
          inputs: {},
          rowsUsed: 0,
        }).ui!,
      ],
      method: method(ctx, {
        tool: 'fundamentals',
        formulas: ['ratios_idx'],
        inputs: { ticker: e.id },
        rows: rows.length,
        dataset: 'Dataset Financial Statement in IDX Indonesia',
        flags: ['der_less_relevant_for_banks'],
      }),
    };
  },
});

const valuation = defineTool({
  name: 'valuation',
  description:
    'Valuation of an IDX stock: last close (2024-05-17), market cap = close × shares, PER = close ÷ basic EPS (n/m if EPS ≤ 0), PBV = market cap ÷ equity — fundamentals on the latest available FY.',
  input: z.strictObject({ ticker: z.string().min(2).max(12) }),
  label: t('Menghitung valuasi…', 'Computing valuation…'),
  numeric: true,
  async run(ctx, input) {
    const e = await resolveEntity(ctx, ad, input.ticker.toUpperCase());
    const m = await ad.metrics(ctx, e.id);
    if (m.fund_fy === undefined) throw new ToolError(`No fundamentals for ${e.id}; valuation unavailable.`);
    const rows = [
      {
        metric: 'last_close',
        value: fmtNum(m.last_close as number, ctx.locale) + ` (${fmtDate(m.last_date as string, ctx.locale)})`,
      },
      { metric: 'market_cap', value: fmtMoney(m.market_cap_idr as number, 'IDR', ctx.locale) },
      { metric: 'PER', value: m.per === null ? 'n/m' : fmtNum(m.per as number, ctx.locale, 2) },
      { metric: 'PBV', value: m.pbv === null ? 'n/m' : fmtNum(m.pbv as number, ctx.locale, 2) },
      { metric: 'fundamentals FY', value: String(m.fund_fy) },
    ];
    return tableOutput(ctx, {
      tool: 'valuation',
      title: `${e.id} — ${ctx.locale === 'id' ? 'valuasi' : 'valuation'}`,
      columns: [
        { key: 'metric', label: 'Metric', format: 'text' },
        { key: 'value', label: 'Value', format: 'text' },
      ],
      rows,
      dataset: DS,
      tab: 'fundamentals',
      formulas: ['ratios_idx'],
      inputs: { ticker: e.id },
      rowsUsed: 1,
      flags: [PRICE_FLAG],
      data: {
        ticker: e.id,
        last_close: m.last_close,
        last_date: m.last_date,
        market_cap_idr: m.market_cap_idr,
        per: m.per,
        pbv: m.pbv,
        fund_fy: m.fund_fy,
      },
    });
  },
});

const screen = defineTool({
  name: 'screen_fundamentals',
  description:
    'Screen IDX stocks by fundamentals (min/max ROE, max PER, min market cap, max DER) — historical screening, never a recommendation.',
  input: z.strictObject({
    roe_min: z.number().optional(),
    per_max: z.number().optional(),
    per_min: z.number().optional(),
    mcap_min_idr: z.number().optional(),
    der_max: z.number().optional(),
    npm_min: z.number().optional(),
    limit: z.number().int().min(1).max(25).optional(),
    sort_by: z.enum(['roe', 'per', 'market_cap_idr', 'pbv', 'npm']).optional(),
  }),
  label: t('Menyaring saham…', 'Screening stocks…'),
  numeric: true,
  async run(ctx, input) {
    const ss = await ad.stocks(ctx);
    const ok = ss.filter((s) => {
      const n = (k: string) => (typeof s[k] === 'number' ? (s[k] as number) : null);
      if (input.roe_min !== undefined && !(n('roe')! >= input.roe_min)) return false;
      if (input.per_max !== undefined && !(n('per') !== null && n('per')! <= input.per_max)) return false;
      if (input.per_min !== undefined && !(n('per') !== null && n('per')! >= input.per_min)) return false;
      if (input.mcap_min_idr !== undefined && !(n('market_cap_idr')! >= input.mcap_min_idr)) return false;
      if (input.der_max !== undefined && !(n('der') !== null && n('der')! <= input.der_max)) return false;
      if (input.npm_min !== undefined && !(n('npm')! >= input.npm_min)) return false;
      return true;
    });
    const key = input.sort_by ?? 'market_cap_idr';
    const top = ok
      .sort(
        (a, b) =>
          ((b[key] as number) ?? -Infinity) - ((a[key] as number) ?? -Infinity) || (a.ticker < b.ticker ? -1 : 1),
      )
      .slice(0, input.limit ?? 15);
    return tableOutput(ctx, {
      tool: 'screen_fundamentals',
      title: ctx.locale === 'id' ? 'Hasil penyaringan' : 'Screen results',
      columns: [
        { key: 'ticker', label: 'Ticker', format: 'text' },
        { key: 'name', label: 'Name', format: 'text' },
        { key: 'roe', label: 'ROE', format: 'pct' },
        { key: 'per', label: 'PER', format: 'num' },
        { key: 'pbv', label: 'PBV', format: 'num' },
        { key: 'market_cap_idr', label: 'Mkt cap', format: 'money_idr' },
      ],
      rows: top.map((s) => ({
        ticker: s.ticker,
        name: s.name,
        roe: s.roe,
        per: s.per,
        pbv: s.pbv,
        market_cap_idr: s.market_cap_idr,
        fund_fy: s.fund_fy,
      })),
      dataset: DS,
      tab: 'fundamentals',
      formulas: ['ratios_idx'],
      inputs: input,
      rowsUsed: ss.length,
      flags: [PRICE_FLAG, 'not_a_recommendation'],
      data: { matched: ok.length },
    });
  },
});

const betaVsIhsg = defineTool({
  name: 'beta_vs_ihsg',
  description:
    'Beta (3Y) and correlation of an IDX stock versus IHSG (IHSG from the IDFinanDex dataset, cut at 2024-05-17).',
  input: z.strictObject({
    ticker: z.string().min(2).max(12),
    years: z.union([z.literal(1), z.literal(3), z.literal(5)]).optional(),
  }),
  label: t('Menghitung beta…', 'Computing beta…'),
  numeric: true,
  async run(ctx, input) {
    const e = await resolveEntity(ctx, ad, input.ticker.toUpperCase());
    const years = input.years ?? 3;
    const m = await ad.metrics(ctx, e.id);
    let b = m.beta_3Y_vs_IHSG as number | null;
    const s = await ad.series(ctx, e.id);
    const ihsg = await idfinAdapter().series(ctx, 'IHSG');
    if (years !== 3) b = beta({ d: s.d, p: s.p }, { d: ihsg.d, p: ihsg.p }, years);
    const i0 = Math.max(0, s.d.length - 252 * years);
    return {
      data: { ticker: e.id, years, beta: b, benchmark: 'IHSG (IDFinanDex)', last_date: s.d.at(-1) },
      ui: [
        artifact(ctx, {
          title: `${e.id} vs IHSG (rebase 100)`,
          summary: `Beta ${years}Y = ${b === null ? 'n/a' : b.toFixed(2)}`,
          dataset: DS,
          tab: 'stocks',
          entity: e.id,
          spec: {
            type: 'line',
            x: s.d.slice(i0),
            series: [
              { name: e.id, y: s.p.slice(i0).map((v) => (v / s.p[i0]!) * 100) },
              {
                name: 'IHSG',
                y: s.d.slice(i0).map((d) => {
                  const k = ihsg.d.indexOf(d);
                  return k >= 0
                    ? (ihsg.p[k]! /
                        ihsg.p[
                          Math.max(
                            0,
                            ihsg.d.findIndex((x) => x >= s.d[i0]!),
                          )
                        ]!) *
                        100
                    : null;
                }),
              },
            ],
            y_format: 'num',
            log_allowed: true,
            rebased: true,
          },
        }),
      ],
      method: method(ctx, {
        tool: 'beta_vs_ihsg',
        formulas: ['beta'],
        inputs: { ticker: e.id, years },
        rows: s.d.length,
        dataset: `${DS} + IHSG (IDFinanDex)`,
        flags: [PRICE_FLAG],
      }),
    };
  },
});

const liquidity = defineTool({
  name: 'liquidity',
  description:
    'Liquidity of an IDX stock: share of zero-volume days over the last year and average 20-day traded value (IDR). Many IDX stocks are illiquid (flat OHLC, zero volume).',
  input: z.strictObject({ ticker: z.string().min(2).max(12) }),
  label: t('Menghitung likuiditas…', 'Computing liquidity…'),
  numeric: true,
  async run(ctx, input) {
    const e = await resolveEntity(ctx, ad, input.ticker.toUpperCase());
    const m = await ad.metrics(ctx, e.id);
    return tableOutput(ctx, {
      tool: 'liquidity',
      title: `${e.id} — ${ctx.locale === 'id' ? 'likuiditas' : 'liquidity'}`,
      columns: [
        { key: 'metric', label: 'Metric', format: 'text' },
        { key: 'value', label: 'Value', format: 'text' },
      ],
      rows: [
        { metric: 'zero_volume_share_1Y', value: fmtPct(m.zero_volume_share_1Y as number, ctx.locale) },
        { metric: 'avg_value_traded_20d', value: fmtMoney(m.avg_value_traded_20d_idr as number, 'IDR', ctx.locale) },
      ],
      dataset: DS,
      tab: 'stocks',
      formulas: ['share'],
      inputs: { ticker: e.id },
      rowsUsed: Number(m.rows ?? 0),
      flags: [PRICE_FLAG],
      data: {
        ticker: e.id,
        zero_volume_share_1Y: m.zero_volume_share_1Y,
        avg_value_traded_20d_idr: m.avg_value_traded_20d_idr,
      },
    });
  },
});

const ipoList = defineTool({
  name: 'ipo_list',
  description:
    'List e-IPO records (2021–2026) filtered by status (Closed/Canceled/Offering), listing year, sector, board or participant admin. Return D1 is the first-day return; "Return from Listing Date" is per the dataset snapshot.',
  input: z.strictObject({
    status: z.enum(['Closed', 'Canceled', 'Offering']).optional(),
    year: z.number().int().min(2019).max(2030).optional(),
    sector: z.string().max(80).optional(),
    board: z.string().max(40).optional(),
    participant_admin: z.string().max(80).optional(),
    limit: z.number().int().min(1).max(50).optional(),
  }),
  label: t('Mengambil daftar IPO…', 'Listing IPOs…'),
  numeric: true,
  async run(ctx, input) {
    const rs = (await ipoRows(ctx)).filter(
      (r) =>
        (!input.status || r['IPO Status'] === input.status) &&
        (!input.year || String(r['Listing Date'] ?? '').startsWith(String(input.year))) &&
        matches(r.Sector, input.sector) &&
        matches(r['Listing Board'], input.board) &&
        matches(r['Participant Admin'], input.participant_admin, 'includes'),
    );
    const rows = rs
      .slice(0, input.limit ?? 20)
      .map((r) => ({
        ticker: r['Ticker Code'],
        company: r['Company Name'],
        listing_date: r['Listing Date'],
        sector: r.Sector,
        board: r['Listing Board'],
        final_price: r['Final Price (Rp)'],
        return_d1: r['Return D1'],
        participant_admin: r['Participant Admin'],
      }));
    return tableOutput(ctx, {
      tool: 'ipo_list',
      title: `e-IPO (${rs.length})`,
      columns: [
        { key: 'ticker', label: 'Ticker', format: 'text' },
        { key: 'company', label: 'Company', format: 'text' },
        { key: 'listing_date', label: 'Listing', format: 'date' },
        { key: 'board', label: 'Board', format: 'text' },
        { key: 'return_d1', label: 'D1', format: 'pct' },
      ],
      rows,
      dataset: DS_IPO,
      tab: 'ipo',
      formulas: ['count'],
      inputs: input,
      rowsUsed: rs.length,
      data: { matched: rs.length },
    });
  },
});

const ipoStats = defineTool({
  name: 'ipo_stats',
  description:
    'Statistics of CLOSED e-IPOs grouped by year, sector, board, participant_admin or underwriter: count, median & mean first-day (D1) return, share positive. Use for "median first-day IPO return", "which securities firm handled most IPOs".',
  input: z.strictObject({
    group_by: z.enum(['year', 'sector', 'board', 'participant_admin', 'underwriter', 'none']).optional(),
    limit: z.number().int().min(1).max(30).optional(),
  }),
  label: t('Menghitung statistik IPO…', 'Computing IPO statistics…'),
  numeric: true,
  async run(ctx, input) {
    const st = (await ctx.store.json<{ stats: Record<string, unknown> }>('core/idx/ipo.json')).stats;
    const closed = (await ipoRows(ctx)).filter((r) => r['IPO Status'] === 'Closed');
    const gb = input.group_by ?? 'none';
    const keyOf = (r: IpoRow): string[] => {
      if (gb === 'year') return [String(r['Listing Date'] ?? 'nan').slice(0, 4)];
      if (gb === 'sector') return r.Sector ? [String(r.Sector)] : [];
      if (gb === 'board') return [String(r['Listing Board'] ?? '(kosong)')];
      if (gb === 'participant_admin') return r['Participant Admin'] ? [String(r['Participant Admin'])] : [];
      if (gb === 'underwriter')
        return String(r['Underwriter(s)'] ?? '')
          .split(/[,;]/)
          .map((x) => x.trim())
          .filter(Boolean);
      return ['all'];
    };
    const g = new Map<string, number[]>();
    const cnt = new Map<string, number>();
    for (const r of closed)
      for (const k of keyOf(r)) {
        if (!g.has(k)) g.set(k, []);
        cnt.set(k, (cnt.get(k) ?? 0) + 1);
        if (typeof r['Return D1'] === 'number') g.get(k)!.push(r['Return D1'] as number);
      }
    const rows = [...g.entries()]
      .map(([k, v]) => ({
        key: k,
        ipos: cnt.get(k)!,
        with_d1: v.length,
        median_d1: v.length ? median(v) : null,
        mean_d1: v.length ? mean(v) : null,
        positive_share: v.length ? v.filter((x) => x > 0).length / v.length : null,
      }))
      .sort((a, b) =>
        gb === 'year' ? (a.key < b.key ? -1 : 1) : b.with_d1 - a.with_d1 || b.ipos - a.ipos || (a.key < b.key ? -1 : 1),
      )
      .slice(0, input.limit ?? 15);
    return {
      ...barOutput(ctx, {
        tool: 'ipo_stats',
        title: gb === 'none' ? 'Median D1 (Closed IPOs)' : `IPO — ${gb}`,
        groups: rows.map((r) => ({
          key: r.key,
          value: gb === 'participant_admin' || gb === 'underwriter' ? r.with_d1 : r.median_d1,
        })),
        format: gb === 'participant_admin' || gb === 'underwriter' ? 'int' : 'pct',
        dataset: DS_IPO,
        tab: 'ipo',
        formulas: ['median', 'count'],
        inputs: input,
        rows: closed.length,
        data: {
          closed_ipos: closed.length,
          overall_median_d1: st.median_return_D1,
          overall_mean_d1: st.mean_return_D1,
          share_positive_d1: st.share_positive_D1,
          groups: rows,
          note: 'participant admin counts = rows with a D1 return; ties broken A→Z',
        },
      }),
    };
  },
});

const ipoDetail = defineTool({
  name: 'ipo_detail',
  description:
    'All e-IPO fields for one ticker (book-building schedule, prices, D1–D7 returns, underwriters, warrant ratio).',
  input: z.strictObject({ ticker: z.string().min(2).max(12) }),
  label: t('Membaca detail IPO…', 'Reading IPO detail…'),
  numeric: false,
  async run(ctx, input) {
    const code = input.ticker.toUpperCase();
    const r = (await ipoRows(ctx)).find((x) => String(x['Ticker Code']).replace(/-.*$/, '') === code);
    if (!r) throw new ToolError(`${code} not in the e-IPO data (2021+ listings).`);
    return { data: { ...r, note: 'Return from Listing Date is per the dataset snapshot (date not stated)' } };
  },
});

export const tools: Tool<never>[] = [
  ...([datasetInfo, appInfo, openDex] as unknown as Tool<never>[]),
  ...timeSeriesTools(ad),
  ...([
    companyProfile,
    fundamentals,
    valuation,
    screen,
    betaVsIhsg,
    liquidity,
    ipoList,
    ipoStats,
    ipoDetail,
  ] as unknown as Tool<never>[]),
  dataQualityTool(async (ctx, id) => {
    const q = await ctx.store.json<{ tickers: Record<string, unknown> } & Record<string, unknown>>(
      'core/idx/quality.json',
    );
    const { tickers, ...rest } = q;
    return id
      ? { ticker: id.toUpperCase(), ...((tickers[id.toUpperCase()] as object) ?? {}), prices_as_of: rest.prices_as_of }
      : rest;
  }) as unknown as Tool<never>,
];
export const adapter = ad;
