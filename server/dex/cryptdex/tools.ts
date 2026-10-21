// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// CryptDex (§8.5): CoinGecko snapshot, prices, DefiLlama DeFi (TVL, chains, protocols, stablecoins, DEX, yields),
// fees & revenue, trading-bot knowledge base (information only) and a security checklist.
import { z } from 'zod';
import { median, quantile } from '../../../src/shared/analytics/stats.ts';
import { fmtDate, fmtMoney, fmtPct, fmtPctPoints } from '../../../src/shared/format.ts';
import { fold } from '../../../src/shared/text.ts';
import { DISCLAIMER_CRYPTO_EN, DISCLAIMER_CRYPTO_ID } from '../../../src/config/brand.ts';
import { artifact, defineTool, method, ToolError, t, type Tool, type ToolContext } from '../../tools/types.ts';
import { barOutput, infoCard, tableOutput } from '../helpers.ts';
import { appInfo, dataQualityTool, datasetInfo, openDex, resolveEntity, timeSeriesTools } from '../shared-tools.ts';
import { cryptoAdapter } from '../ts-adapters.ts';
import { histogram, loadTable, matches, textSearch } from '../table.ts';

const ad = cryptoAdapter();
const DS_CG = 'Daily Crypto Market Tracker (CoinGecko) — single snapshot';
const DS_DEFI = 'DeFi Daily — TVL, Stablecoins, DEX & Yields (DefiLlama)';
const DS_FEES = 'Daily DeFi Fees & Revenue';
const DS_Y = 'Daily DeFi Yield & TVL Snapshots';
const DS_BOT = 'Crypto Trading Bots & AI Agents Dataset v5 (CC BY 4.0, TelegramTrading.net)';
type Coin = Record<string, string | number | boolean | null>;
interface Snapshot {
  snapshot_date: string;
  coins: number;
  total_market_cap_top250_usd: number;
  btc_dominance_top250: number;
  eth_dominance_top250: number;
  stablecoins_heuristic: string[];
  stablecoin_market_cap_usd: number;
  stablecoin_share_top250: number;
  coins_table: Coin[];
}
const snap = (ctx: ToolContext) => ctx.store.json<Snapshot>('core/crypto/snapshot.json');
const disc = (ctx: ToolContext) => (ctx.locale === 'id' ? DISCLAIMER_CRYPTO_ID : DISCLAIMER_CRYPTO_EN);

const marketSnapshot = defineTool({
  name: 'market_snapshot',
  description:
    'CoinGecko snapshot (ONE date) of the top-250 coins: total market cap, BTC/ETH dominance and heuristic stablecoin share — all relative to the 250 coins, not the whole market.',
  input: z.strictObject({}),
  label: t('Membaca snapshot pasar…', 'Reading the market snapshot…'),
  numeric: true,
  async run(ctx) {
    const s = await snap(ctx);
    const top = s.coins_table
      .slice()
      .sort((a, b) => (a.market_cap_rank as number) - (b.market_cap_rank as number))
      .slice(0, 10);
    const others = s.total_market_cap_top250_usd - top.reduce((a, c) => a + (c.market_cap_usd as number), 0);
    return {
      data: {
        snapshot_date: s.snapshot_date,
        coins: s.coins,
        total_market_cap_usd: s.total_market_cap_top250_usd,
        btc_dominance: s.btc_dominance_top250,
        eth_dominance: s.eth_dominance_top250,
        stablecoin_share: s.stablecoin_share_top250,
        stablecoin_market_cap_usd: s.stablecoin_market_cap_usd,
        stablecoins_heuristic: s.stablecoins_heuristic,
        basis: 'shares are of the 250 coins in the snapshot (heuristic stablecoins)',
      },
      ui: [
        artifact(ctx, {
          title: ctx.locale === 'id' ? 'Komposisi kapitalisasi (250 koin)' : 'Market-cap composition (250 coins)',
          summary: `BTC ${fmtPct(s.btc_dominance_top250, ctx.locale)} · ETH ${fmtPct(s.eth_dominance_top250, ctx.locale)} · stablecoin ${fmtPct(s.stablecoin_share_top250, ctx.locale)}`,
          dataset: DS_CG,
          asOf: s.snapshot_date,
          tab: 'market',
          spec: {
            type: 'bar',
            categories: [...top.map((c) => String(c.symbol).toUpperCase()), 'Others'],
            series: [
              {
                name: 'Share',
                values: [
                  ...top.map((c) => (c.market_cap_usd as number) / s.total_market_cap_top250_usd),
                  others / s.total_market_cap_top250_usd,
                ],
              },
            ],
            horizontal: true,
            value_format: 'pct',
          },
        }),
      ],
      method: method(ctx, {
        tool: 'market_snapshot',
        formulas: ['dominance', 'stablecoin_heuristic', 'sum'],
        inputs: {},
        rows: s.coins,
        dataset: DS_CG,
        asOf: s.snapshot_date,
        flags: ['single_snapshot', 'stablecoin_heuristic', 'share_of_top250_only'],
      }),
    };
  },
});

const coinLookup = defineTool({
  name: 'coin_lookup',
  description:
    'Snapshot fields of one coin (price, market cap, rank, 24h/7d/30d change in PERCENT units, ATH & change from ATH, supply).',
  input: z.strictObject({ query: z.string().min(1).max(60) }),
  label: t('Mencari koin…', 'Looking up the coin…'),
  numeric: false,
  async run(ctx, input) {
    const s = await snap(ctx);
    const q = fold(input.query);
    const c =
      s.coins_table.find(
        (x) => fold(String(x.symbol)) === q || fold(String(x.name)) === q || fold(String(x.coin_id)) === q,
      ) ?? s.coins_table.find((x) => fold(String(x.name)).includes(q));
    if (!c) throw new ToolError(`"${input.query}" not among the 250 coins of the ${s.snapshot_date} snapshot.`);
    return {
      data: {
        snapshot_date: s.snapshot_date,
        coin: c,
        units: 'price_change_pct_* and ath_change_pct are already in percent (0.87 = 0.87%)',
      },
    };
  },
});

const rankSnapshot = defineTool({
  name: 'rank_snapshot',
  description:
    'Rank the 250 snapshot coins by market_cap, price_change_pct_24h/7d/30d (percent units) or ath_change_pct.',
  input: z.strictObject({
    metric: z.enum([
      'market_cap_usd',
      'price_change_pct_24h',
      'price_change_pct_7d',
      'price_change_pct_30d',
      'ath_change_pct',
    ]),
    order: z.enum(['desc', 'asc']).optional(),
    top100_only: z.boolean().optional(),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  label: t('Menyusun peringkat koin…', 'Ranking coins…'),
  numeric: true,
  async run(ctx, input) {
    const s = await snap(ctx);
    const dir = input.order === 'asc' ? 1 : -1;
    const rows = s.coins_table
      .filter(
        (c) => typeof c[input.metric] === 'number' && (!input.top100_only || (c.market_cap_rank as number) <= 100),
      )
      .sort(
        (a, b) =>
          dir * ((a[input.metric] as number) - (b[input.metric] as number)) ||
          String(a.coin_id).localeCompare(String(b.coin_id)),
      );
    const top = rows.slice(0, input.limit ?? 10);
    return barOutput(ctx, {
      tool: 'rank_snapshot',
      title: input.metric,
      groups: top.map((c) => ({
        key: `${String(c.symbol).toUpperCase()} (${String(c.name)})`,
        value: input.metric === 'market_cap_usd' ? (c[input.metric] as number) : (c[input.metric] as number) / 100,
      })),
      format: input.metric === 'market_cap_usd' ? 'money_usd' : 'pct',
      dataset: DS_CG,
      asOf: s.snapshot_date,
      tab: 'market',
      formulas: ['rank'],
      inputs: input,
      rows: rows.length,
      flags: ['single_snapshot'],
      data: { snapshot_date: s.snapshot_date, units: 'values converted from percent units to fractions in the chart' },
    });
  },
});

const supplyInfo = defineTool({
  name: 'supply_info',
  description: 'Circulating, total and max supply of one coin (max_supply null = no fixed cap or not reported).',
  input: z.strictObject({ symbol: z.string().min(1).max(20) }),
  label: t('Membaca suplai koin…', 'Reading coin supply…'),
  numeric: false,
  async run(ctx, input) {
    const s = await snap(ctx);
    const c = s.coins_table.find((x) => fold(String(x.symbol)) === fold(input.symbol));
    if (!c) throw new ToolError(`${input.symbol} not in the snapshot.`);
    return {
      data: {
        snapshot_date: s.snapshot_date,
        symbol: c.symbol,
        name: c.name,
        circulating_supply: c.circulating_supply,
        total_supply: c.total_supply,
        max_supply: c.max_supply,
        note: c.max_supply === null ? 'no fixed max supply or not reported' : null,
      },
    };
  },
});

interface Tvl {
  as_of: string;
  d: string[];
  v: number[];
  summary: {
    latest_usd: number;
    ath_usd: number;
    ath_date: string;
    latest_pct_of_ath: number;
    ret_1Y: number | null;
    ret_YTD: number | null;
    first_positive_date: string;
  };
}
const defiOverview = defineTool({
  name: 'defi_overview',
  description:
    'Headline DeFi TVL (latest vs peak), stablecoin supply (latest vs peak), stablecoin/TVL ratio and the double-counting note (sum of protocol TVL ≈ 3.1× the headline). Use for "how big is DeFi", "why protocol TVLs add up to more".',
  input: z.strictObject({}),
  label: t('Membaca ringkasan DeFi…', 'Reading the DeFi overview…'),
  numeric: true,
  async run(ctx) {
    const tvl = await ctx.store.json<Tvl>('core/crypto/defi/tvl.json');
    const st = await ctx.store.json<{
      as_of: string;
      d: string[];
      v: number[];
      summary: { latest_usd: number; ath_usd: number; ath_date: string };
    }>('core/crypto/defi/stablecoin_supply.json');
    const prot = await ctx.store.json<{ double_counting_ratio: number }>('core/crypto/defi/protocols_summary.json');
    return {
      data: {
        as_of: tvl.as_of,
        tvl_usd: tvl.summary.latest_usd,
        tvl_ath_usd: tvl.summary.ath_usd,
        tvl_ath_date: tvl.summary.ath_date,
        tvl_pct_of_ath: tvl.summary.latest_pct_of_ath,
        tvl_ret_1Y: tvl.summary.ret_1Y,
        stablecoin_supply_usd: st.summary.latest_usd,
        stablecoin_ath_usd: st.summary.ath_usd,
        stablecoin_ath_date: st.summary.ath_date,
        stablecoin_to_tvl: st.summary.latest_usd / tvl.summary.latest_usd,
        double_counting_ratio: prot.double_counting_ratio,
        note: 'Sum of protocol TVLs (excl. CEX) double-counts the same assets across protocols — use it only to compare categories, never as a market total. Notebook #13 figures are from an older data version and are not used.',
      },
      ui: [
        artifact(ctx, {
          title: 'DeFi TVL (US$)',
          summary: `${fmtMoney(tvl.summary.latest_usd, 'USD', ctx.locale)} = ${fmtPct(tvl.summary.latest_pct_of_ath, ctx.locale)} ${ctx.locale === 'id' ? 'dari puncak' : 'of the peak'} (${fmtDate(tvl.summary.ath_date, ctx.locale)})`,
          dataset: DS_DEFI,
          asOf: tvl.as_of,
          tab: 'defi',
          spec: {
            type: 'line',
            x: tvl.d,
            series: [{ name: 'TVL', y: tvl.v, area: true }],
            y_format: 'money_usd',
            log_allowed: false,
            annotations: [{ x: tvl.summary.ath_date, label: 'ATH' }],
          },
        }),
      ],
      method: method(ctx, {
        tool: 'defi_overview',
        formulas: ['simple_return', 'tvl_double_count'],
        inputs: {},
        rows: tvl.d.length,
        period: { start: tvl.d[0]!, end: tvl.d.at(-1)! },
        dataset: DS_DEFI,
        asOf: tvl.as_of,
        flags: ['tvl_double_counting'],
      }),
    };
  },
});

const defiTvlHistory = defineTool({
  name: 'defi_tvl_history',
  description: 'Headline DeFi TVL history in a date range (zeros before 2018-02-12 are pre-coverage).',
  input: z.strictObject({
    start: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    end: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  label: t('Mengambil riwayat TVL…', 'Fetching TVL history…'),
  numeric: true,
  async run(ctx, input) {
    const tvl = await ctx.store.json<Tvl>('core/crypto/defi/tvl.json');
    const idx = tvl.d
      .map((_, i) => i)
      .filter(
        (i) => (!input.start || tvl.d[i]! >= input.start) && (!input.end || tvl.d[i]! <= input.end) && tvl.v[i]! > 0,
      );
    if (!idx.length) throw new ToolError('No positive TVL in that range.');
    const a = idx[0]!;
    const b = idx.at(-1)!;
    return {
      data: {
        start: { date: tvl.d[a], tvl: tvl.v[a] },
        end: { date: tvl.d[b], tvl: tvl.v[b] },
        change: tvl.v[b]! / tvl.v[a]! - 1,
      },
      ui: [
        artifact(ctx, {
          title: 'DeFi TVL',
          summary: `${fmtPct(tvl.v[b]! / tvl.v[a]! - 1, ctx.locale)}`,
          dataset: DS_DEFI,
          tab: 'defi',
          spec: {
            type: 'line',
            x: idx.map((i) => tvl.d[i]!),
            series: [{ name: 'TVL', y: idx.map((i) => tvl.v[i]!) }],
            y_format: 'money_usd',
            log_allowed: true,
          },
        }),
      ],
      method: method(ctx, {
        tool: 'defi_tvl_history',
        formulas: ['simple_return'],
        inputs: input,
        rows: idx.length,
        period: { start: tvl.d[a]!, end: tvl.d[b]! },
        dataset: DS_DEFI,
      }),
    };
  },
});

const chainTvl = defineTool({
  name: 'chain_tvl',
  description:
    'TVL by blockchain: latest ranking with shares of total chain TVL, or the history of one chain (25 chains have history).',
  input: z.strictObject({
    chain: z.string().max(40).optional(),
    mode: z.enum(['latest', 'history']).optional(),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  label: t('Membaca TVL per chain…', 'Reading TVL by chain…'),
  numeric: true,
  async run(ctx, input) {
    if (input.mode === 'history') {
      if (!input.chain) throw new ToolError('Give a chain for history.');
      const h = await ctx.store.json<Record<string, { d: string[]; v: number[] }>>(
        'heavy/crypto/defi/chain_tvl_history.json',
      );
      const key = Object.keys(h).find((k) => fold(k) === fold(input.chain!));
      if (!key) throw new ToolError(`No history for ${input.chain}; available: ${Object.keys(h).join(', ')}`);
      const s = h[key]!;
      return {
        data: { chain: key, first: { date: s.d[0], tvl: s.v[0] }, last: { date: s.d.at(-1), tvl: s.v.at(-1) } },
        ui: [
          artifact(ctx, {
            title: `${key} TVL`,
            summary: fmtMoney(s.v.at(-1), 'USD', ctx.locale),
            dataset: DS_DEFI,
            tab: 'defi',
            spec: { type: 'line', x: s.d, series: [{ name: key, y: s.v }], y_format: 'money_usd', log_allowed: false },
          }),
        ],
        method: method(ctx, { tool: 'chain_tvl', formulas: [], inputs: input, rows: s.d.length, dataset: DS_DEFI }),
      };
    }
    const c = await ctx.store.json<{
      as_of: string;
      total_tvl_usd: number;
      rows: { chain: string; tvl_usd: number; share: number }[];
    }>('core/crypto/defi/chains_latest.json');
    const rows = input.chain
      ? c.rows.filter((r) => fold(r.chain) === fold(input.chain!))
      : c.rows.slice(0, input.limit ?? 10);
    return barOutput(ctx, {
      tool: 'chain_tvl',
      title: ctx.locale === 'id' ? 'Porsi TVL per chain' : 'TVL share by chain',
      groups: rows.map((r) => ({ key: r.chain, value: r.share })),
      format: 'pct',
      dataset: DS_DEFI,
      asOf: c.as_of,
      tab: 'defi',
      formulas: ['share'],
      inputs: input,
      rows: c.rows.length,
      data: {
        as_of: c.as_of,
        total_chain_tvl_usd: c.total_tvl_usd,
        rows: rows.map((r) => ({ chain: r.chain, tvl_usd: r.tvl_usd, share: r.share })),
      },
    });
  },
});

const protocols = defineTool({
  name: 'protocols',
  description:
    'DeFi protocols (CEX excluded) by TVL, optionally filtered by category or chain; or category totals (category=__all__). Protocol TVLs double-count — compare only.',
  input: z.strictObject({
    category: z.string().max(60).optional(),
    chain: z.string().max(40).optional(),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  label: t('Membaca protokol DeFi…', 'Reading DeFi protocols…'),
  numeric: true,
  async run(ctx, input) {
    const p = await ctx.store.json<{
      as_of: string;
      double_counting_ratio: number;
      by_category: { category: string; tvl_usd: number; protocols: number }[];
      top: {
        name: string;
        category: string | null;
        primary_chain: string | null;
        chains: string | null;
        tvl_usd: number;
      }[];
    }>('core/crypto/defi/protocols_summary.json');
    if (input.category === '__all__')
      return barOutput(ctx, {
        tool: 'protocols',
        title: ctx.locale === 'id' ? 'TVL per kategori (dihitung ganda)' : 'TVL by category (double-counted)',
        groups: p.by_category.slice(0, input.limit ?? 10).map((c) => ({ key: c.category, value: c.tvl_usd })),
        format: 'money_usd',
        dataset: DS_DEFI,
        asOf: p.as_of,
        tab: 'defi',
        formulas: ['sum', 'tvl_double_count'],
        inputs: input,
        rows: p.by_category.length,
        flags: ['tvl_double_counting'],
        data: { double_counting_ratio: p.double_counting_ratio },
      });
    const rows = p.top
      .filter(
        (r) => matches(r.category, input.category) && (!input.chain || matches(r.chains, input.chain, 'includes')),
      )
      .slice(0, input.limit ?? 10);
    return barOutput(ctx, {
      tool: 'protocols',
      title: ctx.locale === 'id' ? 'Protokol DeFi teratas (TVL)' : 'Top DeFi protocols (TVL)',
      groups: rows.map((r) => ({ key: r.name, value: r.tvl_usd })),
      format: 'money_usd',
      dataset: DS_DEFI,
      asOf: p.as_of,
      tab: 'defi',
      formulas: ['rank', 'tvl_double_count'],
      inputs: input,
      rows: p.top.length,
      flags: ['tvl_double_counting'],
      data: {
        rows: rows.map((r) => ({ name: r.name, category: r.category, chain: r.primary_chain, tvl_usd: r.tvl_usd })),
        double_counting_ratio: p.double_counting_ratio,
      },
    });
  },
});

const stablecoins = defineTool({
  name: 'stablecoins',
  description:
    'Stablecoins by circulating supply (DefiLlama list, peg type & mechanism) with share of total stablecoin supply.',
  input: z.strictObject({ top: z.number().int().min(1).max(25).optional(), peg_type: z.string().max(30).optional() }),
  label: t('Membaca stablecoin…', 'Reading stablecoins…'),
  numeric: true,
  async run(ctx, input) {
    const s = await ctx.store.json<{
      as_of: string;
      total_supply_usd: number;
      rows: {
        name: string;
        symbol: string;
        peg_type: string | null;
        peg_mechanism: string | null;
        circulating: number | null;
      }[];
    }>('core/crypto/defi/stablecoins_latest.json');
    const rows = s.rows.filter((r) => matches(r.peg_type, input.peg_type)).slice(0, input.top ?? 10);
    return barOutput(ctx, {
      tool: 'stablecoins',
      title: ctx.locale === 'id' ? 'Porsi suplai stablecoin' : 'Stablecoin supply share',
      groups: rows.map((r) => ({ key: r.symbol, value: (r.circulating ?? 0) / s.total_supply_usd })),
      format: 'pct',
      dataset: DS_DEFI,
      asOf: s.as_of,
      tab: 'defi',
      formulas: ['share'],
      inputs: input,
      rows: s.rows.length,
      data: {
        as_of: s.as_of,
        total_supply_usd: s.total_supply_usd,
        rows: rows.map((r) => ({ ...r, share: (r.circulating ?? 0) / s.total_supply_usd })),
      },
    });
  },
});

const dexActivity = defineTool({
  name: 'dex_activity',
  description: 'Monthly DEX volume and fees (complete months only; the current month is excluded).',
  input: z.strictObject({ months: z.number().int().min(1).max(150).optional() }),
  label: t('Membaca aktivitas DEX…', 'Reading DEX activity…'),
  numeric: true,
  async run(ctx, input) {
    const m = await ctx.store.json<{
      months: { month: string; volume_usd: number | null; fees_usd: number | null }[];
      summary: {
        last_complete_month: string;
        last_complete_month_volume_usd: number;
        last_complete_month_fees_usd: number;
        max_month_volume: { month: string; usd: number };
      };
    }>('core/crypto/defi/dex_monthly.json');
    const rows = m.months.slice(-(input.months ?? 36));
    return {
      data: { ...m.summary, recent: rows.slice(-6) },
      ui: [
        artifact(ctx, {
          title: ctx.locale === 'id' ? 'Volume DEX bulanan' : 'Monthly DEX volume',
          summary: `${m.summary.last_complete_month}: ${fmtMoney(m.summary.last_complete_month_volume_usd, 'USD', ctx.locale)}`,
          dataset: DS_DEFI,
          tab: 'defi',
          spec: {
            type: 'bar',
            categories: rows.map((r) => r.month),
            series: [
              { name: 'Volume', values: rows.map((r) => r.volume_usd) },
              { name: 'Fees', values: rows.map((r) => r.fees_usd) },
            ],
            horizontal: false,
            value_format: 'money_usd',
          },
        }),
      ],
      method: method(ctx, {
        tool: 'dex_activity',
        formulas: ['monthly_aggregate'],
        inputs: input,
        rows: rows.length,
        dataset: DS_DEFI,
        flags: ['current_month_excluded', 'fees_missing_before_coverage'],
      }),
    };
  },
});

const yieldPools = defineTool({
  name: 'yield_pools',
  description:
    'Yield pools (DefiLlama, ≥ US$1M TVL; APY in PERCENT units): median/p90 APY, share with reward-token APY, top pools by TVL, filterable by stablecoin/chain/project/min TVL. Always mention reward-token & smart-contract risks; never a recommendation.',
  input: z.strictObject({
    stablecoin: z.boolean().optional(),
    chain: z.string().max(40).optional(),
    project: z.string().max(60).optional(),
    min_tvl: z.number().nonnegative().optional(),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  label: t('Membaca pool yield…', 'Reading yield pools…'),
  numeric: true,
  async run(ctx, input) {
    const y = await ctx.store.json<{
      as_of: string;
      summary: Record<string, number>;
      pools: { columns: string[]; dict: Record<string, (string | null)[]>; rows: unknown[][] };
    }>('core/crypto/defi/yields_summary.json');
    const cols = y.pools.columns;
    const rows = y.pools.rows.map((r) =>
      Object.fromEntries(
        cols.map((c, i) => [c, y.pools.dict[c] && typeof r[i] === 'number' ? y.pools.dict[c]![r[i] as number] : r[i]]),
      ),
    );
    const f = rows.filter(
      (r) =>
        (input.stablecoin === undefined || r.stablecoin === input.stablecoin) &&
        matches(r.chain, input.chain) &&
        matches(r.project, input.project) &&
        (!input.min_tvl || (r.tvl_usd as number) >= input.min_tvl),
    );
    const apy = f.map((r) => r.apy as number).filter(Number.isFinite);
    const hi = f.filter((r) => (r.apy as number) > 5);
    const top = f
      .slice()
      .sort((a, b) => (b.tvl_usd as number) - (a.tvl_usd as number))
      .slice(0, input.limit ?? 10);
    return {
      data: {
        as_of: y.as_of,
        pools: f.length,
        median_apy_pct: apy.length ? median(apy) : null,
        p90_apy_pct: apy.length ? quantile(apy, 0.9) : null,
        apy_gt5_with_reward_share: hi.length
          ? hi.filter((r) => ((r.apy_reward as number) || 0) > 0).length / hi.length
          : null,
        top_by_tvl: top.map((r) => ({
          project: r.project,
          chain: r.chain,
          symbol: r.symbol,
          tvl_usd: r.tvl_usd,
          apy_pct: r.apy,
          apy_reward_pct: r.apy_reward,
        })),
        units: 'APY in percent (4.34 = 4.34%)',
        warning: disc(ctx),
      },
      ui: [
        artifact(ctx, {
          title: ctx.locale === 'id' ? 'Distribusi APY (persen)' : 'APY distribution (percent)',
          summary: `median ${fmtPctPoints(apy.length ? median(apy) : null, ctx.locale)} (n = ${apy.length})`,
          dataset: DS_DEFI,
          asOf: y.as_of,
          tab: 'yield',
          spec: {
            type: 'histogram',
            bins: histogram(
              apy.map((a) => a / 100),
              24,
            ),
            median: apy.length ? median(apy) / 100 : null,
            n: apy.length,
            value_format: 'pct',
          },
        }),
        infoCard(ctx, ctx.locale === 'id' ? 'Peringatan risiko' : 'Risk warning', disc(ctx), DS_DEFI, 'warning'),
      ],
      method: method(ctx, {
        tool: 'yield_pools',
        formulas: ['median', 'share'],
        inputs: input,
        rows: f.length,
        dataset: DS_DEFI,
        asOf: y.as_of,
        flags: ['apy_not_guaranteed', 'reward_token_risk', 'not_a_recommendation'],
      }),
    };
  },
});

const feesRevenue = defineTool({
  name: 'fees_revenue',
  description:
    'Protocol fees (total24h etc.) and daily revenue at the latest (or given) snapshot after dedupe, grouped by protocol or category.',
  input: z.strictObject({
    group_by: z.enum(['protocol', 'category']).optional(),
    metric: z.enum(['total24h', 'total7d', 'total30d', 'total1y', 'daily_revenue']).optional(),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  label: t('Membaca fee & revenue…', 'Reading fees & revenue…'),
  numeric: true,
  async run(ctx, input) {
    const f = await ctx.store.json<{ snapshot_date: string; rows: Record<string, unknown>[] }>(
      'core/crypto/fees/latest.json',
    );
    const m = input.metric ?? 'total24h';
    let groups: { key: string; value: number }[];
    if ((input.group_by ?? 'protocol') === 'category') {
      const g = new Map<string, number>();
      for (const r of f.rows)
        if (r.category && typeof r[m] === 'number')
          g.set(r.category as string, (g.get(r.category as string) ?? 0) + (r[m] as number));
      groups = [...g.entries()].map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);
    } else
      groups = f.rows
        .filter((r) => typeof r[m] === 'number')
        .map((r) => ({ key: r.name as string, value: r[m] as number }))
        .sort((a, b) => b.value - a.value);
    return barOutput(ctx, {
      tool: 'fees_revenue',
      title: `${m} — ${input.group_by ?? 'protocol'}`,
      groups: groups.slice(0, input.limit ?? 10),
      format: 'money_usd',
      dataset: DS_FEES,
      asOf: f.snapshot_date,
      tab: 'fees',
      formulas: ['dedup', 'rank'],
      inputs: input,
      rows: f.rows.length,
      data: {
        snapshot_date: f.snapshot_date,
        protocols: f.rows.length,
        metric_meaning: m === 'daily_revenue' ? 'protocol revenue (USD)' : 'fees (USD)',
      },
    });
  },
});

const feesTrend = defineTool({
  name: 'fees_trend',
  description:
    'Daily snapshot history (≈ 32 snapshots 2026-09-18 → 2026-10-20) of total24h fees and daily revenue for one protocol.',
  input: z.strictObject({ name: z.string().min(1).max(80) }),
  label: t('Membaca tren fee…', 'Reading the fee trend…'),
  numeric: true,
  async run(ctx, input) {
    const h = await ctx.store.json<Record<string, { d: string[]; total24h: number[]; daily_revenue: number[] }>>(
      'heavy/crypto/fees/history.json',
    );
    const key =
      Object.keys(h).find((k) => fold(k) === fold(input.name)) ??
      Object.keys(h).find((k) => fold(k).includes(fold(input.name)));
    if (!key) throw new ToolError(`Protocol "${input.name}" not found in the fees history.`);
    const s = h[key]!;
    return {
      data: {
        name: key,
        snapshots: s.d.length,
        first: { date: s.d[0], total24h: s.total24h[0] },
        last: { date: s.d.at(-1), total24h: s.total24h.at(-1), daily_revenue: s.daily_revenue.at(-1) },
      },
      ui: [
        artifact(ctx, {
          title: `${key} — fees 24h`,
          summary: fmtMoney(s.total24h.at(-1), 'USD', ctx.locale),
          dataset: DS_FEES,
          tab: 'fees',
          spec: {
            type: 'line',
            x: s.d,
            series: [
              { name: 'Fees 24h', y: s.total24h },
              { name: 'Revenue', y: s.daily_revenue },
            ],
            y_format: 'money_usd',
            log_allowed: false,
          },
        }),
      ],
      method: method(ctx, {
        tool: 'fees_trend',
        formulas: ['dedup'],
        inputs: input,
        rows: s.d.length,
        dataset: DS_FEES,
      }),
    };
  },
});

const yieldSnapshot = defineTool({
  name: 'yield_snapshot',
  description:
    'The separate single-date yield snapshot file (#27; 2,000 pools; camelCase normalised): median APY of stablecoin pools and top pools by TVL.',
  input: z.strictObject({ stablecoin: z.boolean().optional() }),
  label: t('Membaca snapshot yield…', 'Reading the yield snapshot…'),
  numeric: true,
  async run(ctx, input) {
    const y = await ctx.store.json<{
      snapshot_date: string;
      summary: {
        stable_median_apy_pct: number;
        median_apy_pct_all: number;
        stablecoin_pools: number;
        pools: number;
        top5_by_tvl: Record<string, unknown>[];
      };
    }>('core/crypto/yields/latest.json');
    const s = y.summary;
    return tableOutput(ctx, {
      tool: 'yield_snapshot',
      title: ctx.locale === 'id' ? 'Snapshot yield' : 'Yield snapshot',
      columns: [
        { key: 'project', label: 'Project', format: 'text' },
        { key: 'chain', label: 'Chain', format: 'text' },
        { key: 'symbol', label: 'Symbol', format: 'text' },
        { key: 'tvlUsd', label: 'TVL', format: 'money_usd' },
        { key: 'apy', label: 'APY %', format: 'pct_points' },
      ],
      rows: s.top5_by_tvl,
      dataset: DS_Y,
      asOf: y.snapshot_date,
      tab: 'yield',
      formulas: ['median'],
      inputs: input,
      rowsUsed: s.pools,
      flags: ['single_snapshot', 'apy_not_guaranteed'],
      data: {
        snapshot_date: y.snapshot_date,
        stable_median_apy_pct: s.stable_median_apy_pct,
        median_apy_pct_all: s.median_apy_pct_all,
        stablecoin_pools: s.stablecoin_pools,
      },
    });
  },
});

const botsKb = defineTool({
  name: 'bots_kb',
  description:
    'Search the trading-bot knowledge base (bot profiles, verified facts, Q&A, chain profiles, real test data). INFORMATION ONLY: never recommend a bot, never render referral links (only source_url reviews), always show reliability & critical_note.',
  input: z.strictObject({
    query: z.string().max(120).optional(),
    record_type: z
      .enum(['bot_profile', 'verified_fact', 'qa_pair', 'llm_consensus', 'chain_profile', 'real_test_data'])
      .optional(),
    limit: z.number().int().min(1).max(10).optional(),
  }),
  label: t('Mencari di knowledge base bot…', 'Searching the bot knowledge base…'),
  numeric: false,
  async run(ctx, input) {
    const parts = await Promise.all(
      ['profiles', 'facts', 'qa'].map((f) =>
        ctx.store.json<{ rows: Record<string, unknown>[] }>(`core/crypto/bots/${f}.json`),
      ),
    );
    let rows = parts.flatMap((p) => p.rows).filter((r) => !input.record_type || r.record_type === input.record_type);
    if (input.query)
      rows = textSearch(rows, input.query, ['question', 'answer', 'bot_category', 'chain'], input.limit ?? 5);
    else rows = rows.slice(0, input.limit ?? 5);
    const all = parts.flatMap((p) => p.rows);
    const byType = new Map<string, number>();
    for (const r of all)
      byType.set(String(r.record_type ?? '(kosong)'), (byType.get(String(r.record_type ?? '(kosong)')) ?? 0) + 1);
    const counts = [...byType.entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .map(([record_type, n]) => ({ record_type, n }));
    return tableOutput(ctx, {
      tool: 'bots_kb',
      title:
        ctx.locale === 'id' ? 'Knowledge base bot — jumlah record per jenis' : 'Bot knowledge base — records by type',
      columns: [
        { key: 'record_type', label: 'Record type', format: 'text' },
        { key: 'n', label: 'n', format: 'int' },
      ],
      rows: counts,
      dataset: DS_BOT,
      tab: 'bots',
      formulas: ['count'],
      inputs: input,
      rowsUsed: all.length,
      flags: ['information_only', 'referral_links_removed', 'not_a_recommendation'],
      data: {
        total_records: all.length,
        bot_profiles: all.filter((r) => r.record_type === 'bot_profile').length,
        results: rows.map((r) => ({
          id: r.id,
          record_type: r.record_type,
          question: r.question,
          answer: r.answer,
          reliability: r.reliability ?? '(kosong)',
          critical_note: r.critical_note,
          source_url: r.source_url,
        })),
        policy: 'information only; no recommendation; referral links removed; never share seed phrases/private keys',
      },
    });
  },
});

const securityChecklist = defineTool({
  name: 'security_checklist',
  description:
    'Finandex security checklist before using any crypto bot / DeFi protocol (scams, wallet drainers, token approvals, custody, seed phrase). Use whenever bots, yields or wallets are discussed, or a user shares a secret.',
  input: z.strictObject({}),
  label: t('Menyiapkan checklist keamanan…', 'Preparing the security checklist…'),
  numeric: false,
  async run(ctx) {
    const id = [
      'Jangan pernah membagikan seed phrase / private key kepada siapa pun — termasuk bot, admin, atau "support".',
      'Waspadai penipuan: janji profit pasti, airdrop palsu, akun peniru, dan tautan referral.',
      'Wallet drainer: jangan menandatangani transaksi/izin yang tidak Anda pahami; cek domain resmi.',
      'Izin token (approval): batasi jumlah, cabut izin yang tidak dipakai secara berkala.',
      'Custody: pahami siapa yang memegang dana (custodial vs non-custodial) dan risikonya.',
      'Mulai dari jumlah kecil, aktifkan 2FA, dan pisahkan dompet untuk eksperimen.',
      'Pool yield: APY tidak dijamin; risiko smart contract, de-peg, impermanent loss, dan reward token jatuh.',
    ];
    const en = [
      'Never share your seed phrase / private key with anyone — including bots, admins or "support".',
      'Beware of scams: guaranteed profits, fake airdrops, impersonator accounts and referral links.',
      'Wallet drainers: never sign transactions/approvals you do not understand; check the official domain.',
      'Token approvals: limit amounts and revoke unused approvals regularly.',
      'Custody: understand who holds the funds (custodial vs non-custodial) and the risks.',
      'Start small, enable 2FA, and use a separate wallet for experiments.',
      'Yield pools: APY is not guaranteed; smart-contract, de-peg, impermanent-loss and reward-token risks.',
    ];
    const items = ctx.locale === 'id' ? id : en;
    return {
      data: { checklist: items, disclaimer: disc(ctx) },
      ui: [
        infoCard(
          ctx,
          ctx.locale === 'id' ? 'Checklist keamanan' : 'Security checklist',
          disc(ctx),
          DS_BOT,
          'warning',
          items,
        ),
      ],
    };
  },
});

export const tools: Tool<never>[] = [
  ...([datasetInfo, appInfo, openDex] as unknown as Tool<never>[]),
  ...timeSeriesTools(ad),
  ...([
    marketSnapshot,
    coinLookup,
    rankSnapshot,
    supplyInfo,
    defiOverview,
    defiTvlHistory,
    chainTvl,
    protocols,
    stablecoins,
    dexActivity,
    yieldPools,
    feesRevenue,
    feesTrend,
    yieldSnapshot,
    botsKb,
    securityChecklist,
  ] as unknown as Tool<never>[]),
  dataQualityTool(async (ctx, id) => {
    const q = await ctx.store.json<{ tickers: Record<string, unknown>; notes: Record<string, string> }>(
      'core/crypto/quality.json',
    );
    const fees = await ctx.store.json<Record<string, unknown>>('core/crypto/fees/history_summary.json');
    if (id) {
      const e = await resolveEntity(ctx, ad, id);
      return { coin: e.id, ...((q.tickers[e.id] as object) ?? {}), notes: q.notes };
    }
    return {
      notes: q.notes,
      fees_dedup: fees.dedup,
      defi: 'protocol TVL double-counting; DEX current month excluded; CEX excluded from DeFi',
      bots: 'referral links removed',
    };
  }) as unknown as Tool<never>,
];
export const adapter = ad;
export { loadTable };
