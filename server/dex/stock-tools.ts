// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// NASDAQDex / SnP500Dex (§8.5): stock-universe toolkit on top of the shared time-series tools. Both Dex are
// pending-data until inputs #2 / #3 are uploaded; every tool then returns an instructive is_error result.
import { z } from 'zod';
import type { SeriesFile } from '../../src/shared/data-contracts.ts';
import { lastCross, periodMetrics, rsi14, sma } from '../../src/shared/analytics/series.ts';
import { idxOnOrBefore, type CalDate } from '../../src/shared/dates.ts';
import { artifact, defineTool, method, t, ToolError, type Tool, type ToolContext } from '../tools/types.ts';
import { barOutput, tableOutput } from './helpers.ts';
import { appInfo, dataQualityTool, datasetInfo, openDex, timeSeriesTools } from './shared-tools.ts';
import { stockUniverseAdapter } from './ts-adapters.ts';

const PERIODS = ['1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', '10Y'] as const;
const DISCLAIMER = {
  id: 'Simulasi historis, bukan rekomendasi investasi; kinerja masa lalu tidak menjamin hasil masa depan.',
  en: 'Historical simulation, not an investment recommendation; past performance does not guarantee future results.',
};

export function stockTools(key: 'nasdaq' | 'sp500', dataset: string): Tool<never>[] {
  const ad = stockUniverseAdapter(key, dataset);
  const pending = () =>
    new ToolError(
      `${dataset} is not available yet (status pending-data: the input file has not been uploaded). Say so honestly; do not answer from memory.`,
    );
  const json = async <T>(ctx: ToolContext, path: string): Promise<T> => {
    try {
      return await ctx.store.json<T>(path);
    } catch {
      throw pending();
    }
  };
  const seriesOf = async (ctx: ToolContext, ticker: string) =>
    json<SeriesFile>(ctx, `heavy/${key}/series/${ticker.toUpperCase()}.json`);

  const pulse = defineTool({
    name: 'pulse',
    description:
      'Market breadth of the universe at the latest date: % of stocks above SMA200 (eligible = ≥ 200 bars), advancers/decliners, new 52-week highs/lows, equal-weight index. Survivorship bias applies (current constituents only).',
    input: z.strictObject({}),
    label: t('Menghitung breadth pasar…', 'Computing market breadth…'),
    numeric: true,
    async run(ctx, input) {
      const p = await json<Record<string, unknown> & { ew_series: { d: CalDate[]; level: number[] } }>(
        ctx,
        `core/${key}/pulse.json`,
      );
      const { ew_series, ...rest } = p;
      const step = Math.max(1, Math.floor(ew_series.d.length / 1500));
      return {
        data: { ...rest, flags: ['survivorship_bias'] },
        ui: [
          artifact(ctx, {
            title: ctx.locale === 'id' ? 'Indeks equal-weight' : 'Equal-weight index',
            summary: `above SMA200: ${String(rest.pct_above_sma200)}`,
            dataset,
            tab: 'pulse',
            spec: {
              type: 'line',
              x: ew_series.d.filter((_, i) => i % step === 0),
              series: [{ name: 'EW', y: ew_series.level.filter((_, i) => i % step === 0) }],
              y_format: 'num',
              log_allowed: true,
              rebased: true,
            },
          }),
        ],
        method: method(ctx, {
          tool: 'pulse',
          formulas: ['breadth', 'sma_rsi', 'rebase_100'],
          inputs: input,
          rows: Number(rest.sma200_eligible ?? 0),
          dataset,
          flags: ['survivorship_bias'],
        }),
      };
    },
  });

  const technical = defineTool({
    name: 'technical',
    description:
      'Technical snapshot of one ticker on display close: SMA50, SMA200, RSI14, last golden/death cross within 60 bars. Descriptive only, not a trading signal.',
    input: z.strictObject({ ticker: z.string().min(1).max(12) }),
    label: t('Menghitung indikator teknikal…', 'Computing technicals…'),
    numeric: true,
    async run(ctx, input) {
      const s = await seriesOf(ctx, input.ticker);
      const c = s.c.map((v) => v ?? NaN);
      const out = {
        ticker: s.id,
        as_of: s.as_of,
        close: c.at(-1) ?? null,
        sma50: sma(c, 50),
        sma200: sma(c, 200),
        rsi14: rsi14(c),
        last_cross: lastCross(c, s.d),
      };
      const n = Math.min(c.length, 260);
      const x = s.d.slice(-n);
      const roll = (k: number) => c.slice(-n).map((_, i) => sma(c.slice(0, c.length - n + i + 1), k));
      return {
        data: { ...out, note: 'descriptive indicator, not a signal' },
        ui: [
          artifact(ctx, {
            title: `${s.id} — SMA50/200`,
            summary: `RSI14 ${out.rsi14 === null ? '–' : out.rsi14.toFixed(1)}`,
            dataset,
            tab: 'technical',
            entity: s.id,
            spec: {
              type: 'line',
              x,
              series: [
                { name: 'close', y: c.slice(-n) },
                { name: 'SMA50', y: roll(50) },
                { name: 'SMA200', y: roll(200) },
              ],
              y_format: 'price',
              log_allowed: false,
            },
          }),
        ],
        method: method(ctx, {
          tool: 'technical',
          formulas: ['sma_rsi'],
          inputs: input,
          rows: c.length,
          period: { start: s.d[0] ?? null, end: s.as_of },
          dataset,
        }),
      };
    },
  });

  const periodRank = defineTool({
    name: 'period_rank',
    description:
      'Rank tickers by simple return between two arbitrary dates (close on/before each date), from the price matrix.',
    input: z.strictObject({
      start: z.string().length(10),
      end: z.string().length(10).optional(),
      order: z.enum(['desc', 'asc']).optional(),
      limit: z.number().int().min(1).max(30).optional(),
    }),
    label: t('Mengurutkan return periode…', 'Ranking period returns…'),
    numeric: true,
    async run(ctx, input) {
      const meta = await json<{ dates: CalDate[]; tickers: string[]; shape: [number, number] }>(
        ctx,
        `heavy/${key}/matrix/${key === 'sp500' ? 'adj' : 'close'}.meta.json`,
      );
      const buf = await ctx.store.binary(`heavy/${key}/matrix/${key === 'sp500' ? 'adj' : 'close'}.f32`);
      const f = new Float32Array(buf);
      const nT = meta.tickers.length;
      const i0 = idxOnOrBefore(meta.dates, input.start);
      const i1 = idxOnOrBefore(meta.dates, input.end ?? meta.dates.at(-1)!);
      if (i0 < 0 || i1 <= i0)
        throw new ToolError(
          `No data between ${input.start} and ${input.end ?? 'latest'}; the matrix covers ${meta.dates[0]}…${meta.dates.at(-1)}.`,
        );
      const res: { key: string; value: number }[] = [];
      meta.tickers.forEach((tk, j) => {
        const a = f[i0 * nT + j]!;
        const b = f[i1 * nT + j]!;
        if (Number.isFinite(a) && Number.isFinite(b) && a > 0) res.push({ key: tk, value: b / a - 1 });
      });
      const dir = input.order === 'asc' ? 1 : -1;
      res.sort((a, b) => dir * (a.value - b.value) || (a.key < b.key ? -1 : 1));
      return barOutput(ctx, {
        tool: 'period_rank',
        title: `${meta.dates[i0]} → ${meta.dates[i1]}`,
        groups: res.slice(0, input.limit ?? 10),
        format: 'pct',
        dataset,
        tab: 'screener',
        formulas: ['simple_return', 'rank'],
        inputs: input,
        rows: res.length,
        flags: ['survivorship_bias', 'float32_matrix'],
        data: { start_used: meta.dates[i0], end_used: meta.dates[i1], eligible: res.length },
      });
    },
  });

  const extra: Tool<never>[] = [];
  if (key === 'sp500') {
    const divs = (ctx: ToolContext) => json<Record<string, Record<string, unknown>>>(ctx, 'core/sp500/dividends.json');
    const getDiv = async (ctx: ToolContext, tk: string) => {
      const d = (await divs(ctx))[tk.toUpperCase()];
      if (!d) throw new ToolError(`Unknown ticker ${tk}.`);
      return d;
    };
    const dividends = defineTool({
      name: 'dividends',
      description:
        'Dividend profile: TTM dividends and TTM yield (TTM ÷ last close), annual dividends, increase streak (years), dividend CAGR 5Y/10Y, last dividend.',
      input: z.strictObject({ ticker: z.string().min(1).max(12) }),
      label: t('Mengambil dividen…', 'Fetching dividends…'),
      numeric: true,
      async run(ctx, input) {
        const d = await getDiv(ctx, input.ticker);
        const ann = Object.entries((d.annual_dividends as Record<string, number>) ?? {}).slice(-20);
        return barOutput(ctx, {
          tool: 'dividends',
          title: `${input.ticker.toUpperCase()} — ${ctx.locale === 'id' ? 'dividen tahunan' : 'annual dividends'}`,
          groups: ann.map(([k, v]) => ({ key: k, value: v })),
          format: 'price',
          dataset,
          tab: 'dividends',
          formulas: ['dividend_ttm'],
          inputs: input,
          rows: ann.length,
          horizontal: false,
          data: {
            ticker: input.ticker.toUpperCase(),
            ttm_dividends: d.ttm_dividends,
            ttm_yield: d.ttm_yield,
            dividend_increase_streak_years: d.dividend_increase_streak_years,
            dividend_cagr_5Y: d.dividend_cagr_5Y,
            dividend_cagr_10Y: d.dividend_cagr_10Y,
            last_dividend: d.last_dividend,
            last_full_year: d.last_full_year,
          },
        });
      },
    });
    const splits = defineTool({
      name: 'splits',
      description: 'Stock split history (date, ratio) of a ticker.',
      input: z.strictObject({ ticker: z.string().min(1).max(12) }),
      label: t('Mengambil riwayat split…', 'Fetching splits…'),
      numeric: false,
      async run(ctx, input) {
        const d = await getDiv(ctx, input.ticker);
        return { data: { ticker: input.ticker.toUpperCase(), splits: d.splits } };
      },
    });
    const volumeProfile = defineTool({
      name: 'volume_profile',
      description: 'Liquidity: average volume 20D and 3M and average dollar volume 20D.',
      input: z.strictObject({ ticker: z.string().min(1).max(12) }),
      label: t('Menghitung likuiditas…', 'Computing liquidity…'),
      numeric: true,
      async run(ctx, input) {
        const d = await getDiv(ctx, input.ticker);
        return tableOutput(ctx, {
          tool: 'volume_profile',
          title: `${input.ticker.toUpperCase()} — volume`,
          columns: [
            { key: 'k', label: '', format: 'text' },
            { key: 'v', label: '', format: 'compact' },
          ],
          rows: [
            { k: 'avg_volume_20d', v: d.avg_volume_20d },
            { k: 'avg_volume_3M', v: d.avg_volume_3M },
            { k: 'avg_dollar_volume_20d', v: d.avg_dollar_volume_20d },
          ],
          dataset,
          tab: 'liquidity',
          formulas: ['monthly_aggregate'],
          inputs: input,
          rowsUsed: 3,
        });
      },
    });
    const simulateInvestment = defineTool({
      name: 'simulate_investment',
      description:
        'Historical simulation of investing an amount (USD) in a ticker from a start date to the latest date: with dividend reinvestment (Adj Close ratio) and without (price only + cash dividends). Always add that it is not a recommendation.',
      input: z.strictObject({
        ticker: z.string().min(1).max(12),
        start: z.string().length(10),
        amount_usd: z.number().positive().max(1e9).optional(),
      }),
      label: t('Menyimulasikan investasi…', 'Simulating investment…'),
      numeric: true,
      async run(ctx, input) {
        const s = await seriesOf(ctx, input.ticker);
        if (!s.ac) throw new ToolError('No adjusted close for this series.');
        const si = idxOnOrBefore(s.d, input.start);
        if (si < 0) throw new ToolError(`${s.id} has no data on/before ${input.start}; first date is ${s.d[0]}.`);
        const ei = s.d.length - 1;
        const amt = input.amount_usd ?? 10_000;
        const ac = s.ac.map((v) => v ?? NaN);
        const c = s.c.map((v) => v ?? NaN);
        const shares = amt / c[si]!;
        let cash = 0;
        for (const [i, a] of s.div ?? []) if (i > si && i <= ei) cash += a * shares;
        const res = {
          ticker: s.id,
          start_date: s.d[si]!,
          end_date: s.d[ei]!,
          amount_usd: amt,
          value_with_reinvestment: (amt * ac[ei]!) / ac[si]!,
          value_price_only: shares * c[ei]!,
          dividends_cash_no_reinvest: cash,
          value_without_reinvestment_incl_cash: shares * c[ei]! + cash,
        };
        const step = Math.max(1, Math.floor((ei - si) / 1200));
        const idx = Array.from({ length: Math.floor((ei - si) / step) + 1 }, (_, k) => si + k * step);
        return {
          data: { ...res, disclaimer: DISCLAIMER[ctx.locale] },
          ui: [
            artifact(ctx, {
              title: `${s.id}: ${amt.toLocaleString('en-US')} USD`,
              summary: `${res.value_with_reinvestment.toFixed(0)} USD`,
              dataset,
              tab: 'simulator',
              entity: s.id,
              spec: {
                type: 'line',
                x: idx.map((i) => s.d[i]!),
                series: [
                  { name: 'DRIP', y: idx.map((i) => (amt * ac[i]!) / ac[si]!) },
                  { name: 'price only', y: idx.map((i) => shares * c[i]!) },
                ],
                y_format: 'money_usd',
                log_allowed: true,
              },
            }),
          ],
          method: method(ctx, {
            tool: 'simulate_investment',
            formulas: ['drip'],
            inputs: input,
            rows: ei - si + 1,
            period: { start: res.start_date, end: res.end_date },
            dataset,
          }),
        };
      },
    });
    const totalVsPrice = defineTool({
      name: 'total_vs_price_return',
      description:
        'Total return (Adj Close, dividends reinvested) vs price return (Close) for standard periods of a ticker.',
      input: z.strictObject({
        ticker: z.string().min(1).max(12),
        periods: z.array(z.enum(PERIODS)).min(1).max(8).optional(),
      }),
      label: t('Membandingkan total vs price return…', 'Comparing total vs price return…'),
      numeric: true,
      async run(ctx, input) {
        const s = await seriesOf(ctx, input.ticker);
        const ps = input.periods ?? ['1Y', '3Y', '5Y', '10Y'];
        const tr = periodMetrics(
          s.d,
          (s.ac ?? s.c).map((v) => v ?? NaN),
        );
        const pr = periodMetrics(
          s.d,
          s.c.map((v) => v ?? NaN),
        );
        const rows = ps.map((p) => ({
          period: p,
          total_return: tr[`ret_${p}`] ?? null,
          price_return: pr[`ret_${p}`] ?? null,
        }));
        return {
          data: { ticker: s.id, as_of: s.as_of, rows },
          ui: [
            artifact(ctx, {
              title: `${s.id}: TR vs PR`,
              summary: rows
                .map((r) => `${r.period} ${r.total_return?.toFixed(3) ?? '–'}/${r.price_return?.toFixed(3) ?? '–'}`)
                .join('; '),
              dataset,
              tab: 'dividends',
              entity: s.id,
              spec: {
                type: 'bar',
                categories: ps,
                series: [
                  { name: 'total return', values: rows.map((r) => r.total_return) },
                  { name: 'price return', values: rows.map((r) => r.price_return) },
                ],
                horizontal: false,
                value_format: 'pct',
              },
            }),
          ],
          method: method(ctx, {
            tool: 'total_vs_price_return',
            formulas: ['simple_return', 'period_anchor'],
            inputs: input,
            rows: s.d.length,
            period: { start: s.d[0] ?? null, end: s.as_of },
            dataset,
          }),
        };
      },
    });
    extra.push(...([dividends, splits, volumeProfile, simulateInvestment, totalVsPrice] as unknown as Tool<never>[]));
  }
  return [
    datasetInfo,
    appInfo,
    openDex,
    ...timeSeriesTools(ad),
    ...([pulse, technical, periodRank] as unknown as Tool<never>[]),
    ...extra,
    dataQualityTool(async (ctx, id) => {
      const q = await json<Record<string, unknown> & { tickers: Record<string, unknown> }>(
        ctx,
        `core/${key}/quality.json`,
      );
      const { tickers, ...rest } = q;
      return id
        ? { ...rest, ticker: id.toUpperCase(), detail: tickers[id.toUpperCase()] ?? null }
        : { ...rest, tickers_count: Object.keys(tickers).length };
    }),
  ] as unknown as Tool<never>[];
}
