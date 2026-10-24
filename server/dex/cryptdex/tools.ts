// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// CryptDex tools (§8.5). Snapshot = single CoinGecko day; stablecoins by heuristic; protocol TVL double-counts;
// APY is high-risk; bots are information only and referral links are never shown.
import { z } from 'zod';
import { median } from '../../../src/shared/analytics/stats';
import { normaliseKey } from '../../../src/shared/text';
import type { TsAdapter } from '../adapters';
import { asOfFor } from '../shared-tools';
import { artifact, defineTool, downsample, method, ToolError, tr } from '../../tools/kit';
import type { ToolCtx, ToolDef } from '../../tools/kit';

type Coin = Record<string, string | number | boolean | null>;
const SNAP = 'Daily_Crypto_Market_Tracker_CoinGecko.zip';
const DEFI = 'DeFi_Daily-_TVL_Stablecoins_DEX__Yields.zip';
const FEES = 'Daily_DeFi_Fees__Revenue.zip';
const YIELDS = 'Daily_DeFi_Yield__TVL_Snapshots.zip';
const BOTS = 'Crypto_Trading_Bots__AI_Agents_Dataset_v5.zip';
const s = (dataset: string, as_of: string) => ({ dex: 'cryptdex', dataset, as_of });
const snapOf = (ctx: ToolCtx) => ctx.store.json<Record<string, unknown> & { snapshot_date: string; coins_table: Coin[] }>('core/crypto/snapshot.json');
const RISK = { id: 'APY tinggi biasanya berasal dari reward token dan berisiko tinggi (termasuk kehilangan seluruh dana). Bukan rekomendasi.', en: 'High APY usually comes from token rewards and is high-risk (including total loss). Not a recommendation.' };

export function tools(_ad: TsAdapter): ToolDef[] {
  return [
    defineTool({
      name: 'market_snapshot',
      description: 'CoinGecko single-day snapshot of the top 250 coins: total market cap, BTC/ETH dominance, stablecoin market cap and share (heuristic), top 10 by market cap, top 7-day gainers/losers in the top 100.',
      input: z.object({}).strict(),
      label: { id: 'Membaca snapshot pasar kripto…', en: 'Reading crypto market snapshot…' },
      run: async (_i, ctx) => {
        const { coins_table: _c, ...snap } = await snapOf(ctx);
        const top = snap.top10_by_market_cap as { symbol: string; market_cap_usd: number }[];
        return {
          data: snap,
          ui: [artifact('bar', tr(ctx.locale, 'Kapitalisasi 10 koin terbesar (USD)', 'Top 10 market caps (USD)'), { type: 'bar', categories: top.map((c) => c.symbol.toUpperCase()), series: [{ name: 'market cap', data: top.map((c) => c.market_cap_usd) }], horizontal: true, yUnit: 'currency', currency: 'USD' }, s(SNAP, snap.snapshot_date))],
          method: method('market_snapshot', ['dominance', 'stablecoin_heuristic', 'share'], { inputs: {}, rows_used: snap.coins as number, dataset: SNAP, as_of: snap.snapshot_date, flags: ['single_snapshot', 'stablecoin_heuristic', 'pct_fields_already_in_percent'] }),
          citations: [s(SNAP, snap.snapshot_date)],
        };
      },
    }),
    defineTool({
      name: 'coin_lookup',
      description: 'Look up a coin in the 250-coin snapshot by symbol or name: price, market cap & rank, volume, 1h/24h/7d/30d change (percent units), supply, ATH/ATL.',
      input: z.object({ query: z.string().min(1).max(60) }).strict(),
      label: { id: 'Mencari koin…', en: 'Looking up coin…' },
      run: async ({ query }, ctx) => {
        const snap = await snapOf(ctx);
        const q = normaliseKey(query);
        const hits = snap.coins_table.filter((c) => normaliseKey(String(c.symbol)) === q || normaliseKey(String(c.name)) === q || normaliseKey(String(c.coin_id)) === q);
        const res = hits.length ? hits : snap.coins_table.filter((c) => normaliseKey(String(c.name)).includes(q)).slice(0, 5);
        if (!res.length) throw new ToolError('Coin not in the 250-coin snapshot.');
        return { data: { snapshot_date: snap.snapshot_date, results: res.slice(0, 5) }, citations: [s(SNAP, snap.snapshot_date)] };
      },
    }),
    defineTool({
      name: 'rank_snapshot',
      description: 'Rank snapshot coins by market_cap, price_change_pct_24h, price_change_pct_7d, price_change_pct_30d, or ath_change_pct (percent units), optionally only the top 100 by market cap.',
      input: z.object({ metric: z.enum(['market_cap', 'price_change_pct_24h', 'price_change_pct_7d', 'price_change_pct_30d', 'ath_change_pct']), order: z.enum(['desc', 'asc']), top100_only: z.boolean().nullable(), limit: z.number().int().min(1).max(25).nullable() }).strict(),
      label: { id: 'Memeringkat koin…', en: 'Ranking coins…' },
      run: async ({ metric, order, top100_only, limit }, ctx) => {
        const snap = await snapOf(ctx);
        const key = metric === 'market_cap' ? 'market_cap_usd' : metric;
        const pool = snap.coins_table.filter((c) => (!top100_only || (c.market_cap_rank as number) <= 100) && typeof c[key] === 'number');
        const top = pool.sort((a, b) => (order === 'desc' ? (b[key] as number) - (a[key] as number) : (a[key] as number) - (b[key] as number)) || ((a.market_cap_rank as number) - (b.market_cap_rank as number))).slice(0, limit ?? 10);
        return {
          data: { metric, units: metric === 'market_cap' ? 'USD' : 'percent', results: top.map((c) => ({ rank: c.market_cap_rank, symbol: c.symbol, name: c.name, value: c[key] })) },
          ui: [artifact('bar', metric, { type: 'bar', categories: top.map((c) => String(c.symbol).toUpperCase()), series: [{ name: metric, data: top.map((c) => (metric === 'market_cap' ? (c[key] as number) : (c[key] as number) / 100)) }], horizontal: true, yUnit: metric === 'market_cap' ? 'currency' : 'pct', ...(metric === 'market_cap' ? { currency: 'USD' } : {}) }, s(SNAP, snap.snapshot_date))],
          method: method('rank_snapshot', ['rank_sort'], { inputs: { metric, order, top100_only, limit }, rows_used: pool.length, dataset: SNAP, as_of: snap.snapshot_date, flags: ['single_snapshot'] }),
          citations: [s(SNAP, snap.snapshot_date)],
        };
      },
    }),
    defineTool({
      name: 'supply_info',
      description: 'Supply data of one coin from the snapshot: circulating, total and max supply (null = no fixed max), fully diluted valuation.',
      input: z.object({ symbol: z.string().min(1).max(30) }).strict(),
      label: { id: 'Membaca suplai…', en: 'Reading supply…' },
      run: async ({ symbol }, ctx) => {
        const snap = await snapOf(ctx);
        const c = snap.coins_table.find((x) => String(x.symbol).toLowerCase() === symbol.toLowerCase());
        if (!c) throw new ToolError('Symbol not in the snapshot.');
        const pick = ['symbol', 'name', 'circulating_supply', 'total_supply', 'max_supply', 'fully_diluted_valuation', 'market_cap_usd'];
        return { data: { snapshot_date: snap.snapshot_date, ...Object.fromEntries(pick.map((k) => [k, c[k] ?? null])), circulating_share_of_max: typeof c.max_supply === 'number' && typeof c.circulating_supply === 'number' ? c.circulating_supply / c.max_supply : null }, citations: [s(SNAP, snap.snapshot_date)] };
      },
    }),
    defineTool({
      name: 'defi_overview',
      description: 'DeFi headline numbers: total TVL (latest, ATH and date, % of ATH, 1Y/YTD change), stablecoin supply (latest, ATH), stablecoin-to-TVL ratio, and the protocol double-counting ratio with an explanation.',
      input: z.object({}).strict(),
      label: { id: 'Membaca ringkasan DeFi…', en: 'Reading DeFi overview…' },
      run: async (_i, ctx) => {
        const tvl = await ctx.store.json<{ d: string[]; tvl_usd: (number | null)[]; summary: Record<string, unknown> }>('core/crypto/defi/tvl.json');
        const st = await ctx.store.json<{ summary: Record<string, unknown> }>('core/crypto/defi/stablecoin_supply.json');
        const pr = await ctx.store.json<{ summary: Record<string, unknown> }>('core/crypto/defi/protocols_summary.json');
        const as_of = tvl.d.at(-1)!;
        const ds = downsample(tvl.d, [tvl.tvl_usd], 400);
        return {
          data: {
            as_of,
            tvl: tvl.summary,
            stablecoin_supply: st.summary,
            stablecoin_to_tvl_ratio: (st.summary.latest_usd as number) / (tvl.summary.latest_usd as number),
            protocols: { sum_tvl_excl_cex_usd: pr.summary.sum_tvl_excl_cex_usd, double_counting_ratio_vs_headline: pr.summary.double_counting_ratio_vs_headline },
            double_counting_note: 'Protocol TVLs double-count (e.g. liquid staking tokens re-deposited into lending); the sum is only for comparing categories, never a market total.',
          },
          ui: [artifact('line', tr(ctx.locale, 'TVL DeFi (USD)', 'DeFi TVL (USD)'), { type: 'line', x: ds.x, series: [{ name: 'TVL', data: ds.ys[0]!, area: true }], yUnit: 'currency', currency: 'USD', marks: [{ x: tvl.summary.ath_date as string, label: 'ATH' }] }, s(DEFI, as_of))],
          method: method('defi_overview', ['ath', 'simple_return', 'tvl_double_count', 'share'], { inputs: {}, rows_used: tvl.d.length, dataset: DEFI, as_of, flags: ['tvl_double_counting', 'notebook_outputs_not_used'] }),
          citations: [s(DEFI, as_of)],
        };
      },
    }),
    defineTool({
      name: 'defi_tvl_history',
      description: 'Daily DeFi TVL history (USD) between optional dates.',
      input: z.object({ start: z.string().nullable(), end: z.string().nullable() }).strict(),
      label: { id: 'Membaca riwayat TVL…', en: 'Reading TVL history…' },
      run: async ({ start, end }, ctx) => {
        const tvl = await ctx.store.json<{ d: string[]; tvl_usd: (number | null)[] }>('core/crypto/defi/tvl.json');
        const idx = tvl.d.map((_d, i) => i).filter((i) => (!start || tvl.d[i]! >= start) && (!end || tvl.d[i]! <= end));
        const x = idx.map((i) => tvl.d[i]!);
        const y = idx.map((i) => tvl.tvl_usd[i] ?? null);
        const ds = downsample(x, [y], 400);
        const fin = y.filter((v): v is number => v !== null && v > 0);
        return {
          data: { start: x[0], end: x.at(-1), first: fin[0] ?? null, last: fin.at(-1) ?? null, change: fin.length > 1 ? fin.at(-1)! / fin[0]! - 1 : null },
          ui: [artifact('line', 'TVL', { type: 'line', x: ds.x, series: [{ name: 'TVL', data: ds.ys[0]! }], yUnit: 'currency', currency: 'USD' }, s(DEFI, x.at(-1)!))],
          method: method('defi_tvl_history', ['simple_return'], { inputs: { start, end }, rows_used: x.length, dataset: DEFI, as_of: x.at(-1)! }),
          citations: [s(DEFI, x.at(-1)!)],
        };
      },
    }),
    defineTool({
      name: 'chain_tvl',
      description: 'Chain TVL: latest TVL and share for all chains (top 15), or the daily history of one chain.',
      input: z.object({ chain: z.string().nullable(), view: z.enum(['latest', 'history']) }).strict(),
      label: { id: 'Membaca TVL per chain…', en: 'Reading chain TVL…' },
      run: async ({ chain, view }, ctx) => {
        if (view === 'latest') {
          const c = await ctx.store.json<{ rows: { chain: string; tvl_usd: number; snapshot_date: string }[] }>('core/crypto/defi/chains_latest.json');
          const total = c.rows.reduce((a, r) => a + (r.tvl_usd || 0), 0);
          const rows = [...c.rows].sort((a, b) => b.tvl_usd - a.tvl_usd).filter((r) => !chain || r.chain.toLowerCase() === chain.toLowerCase()).slice(0, 15).map((r) => ({ chain: r.chain, tvl_usd: r.tvl_usd, share: r.tvl_usd / total }));
          const as_of = c.rows[0]!.snapshot_date;
          return {
            data: { total_chains: c.rows.length, rows },
            ui: [artifact('bar', tr(ctx.locale, 'TVL per chain (USD)', 'TVL by chain (USD)'), { type: 'bar', categories: rows.map((r) => r.chain), series: [{ name: 'TVL', data: rows.map((r) => r.tvl_usd) }], horizontal: true, yUnit: 'currency', currency: 'USD' }, s(DEFI, as_of))],
            method: method('chain_tvl', ['share', 'rank_sort'], { inputs: { chain, view }, rows_used: c.rows.length, dataset: DEFI, as_of }),
            citations: [s(DEFI, as_of)],
          };
        }
        if (!chain) throw new ToolError('Give a chain name for history (e.g. Ethereum, Solana).');
        const t = await ctx.store.json<{ columns: string[]; dict: Record<string, string[]>; rows: (number | string | null)[][] }>('heavy/crypto/defi/chain_tvl_history.json');
        const ci = t.dict.chain!.findIndex((x) => x.toLowerCase() === chain.toLowerCase());
        if (ci < 0) throw new ToolError(`Unknown chain. Chains with history: ${t.dict.chain!.join(', ')}`);
        const rows = t.rows.filter((r) => r[1] === ci);
        const x = rows.map((r) => String(r[0]));
        const ds = downsample(x, [rows.map((r) => r[2] as number)], 400);
        return {
          data: { chain: t.dict.chain![ci], start: x[0], end: x.at(-1), last: rows.at(-1)?.[2] ?? null },
          ui: [artifact('line', `${t.dict.chain![ci]} TVL`, { type: 'line', x: ds.x, series: [{ name: 'TVL', data: ds.ys[0]! }], yUnit: 'currency', currency: 'USD' }, s(DEFI, x.at(-1)!))],
          method: method('chain_tvl', ['simple_return'], { inputs: { chain, view }, rows_used: rows.length, dataset: DEFI, as_of: x.at(-1)! }),
          citations: [s(DEFI, x.at(-1)!)],
        };
      },
    }),
    defineTool({
      name: 'protocols',
      description: 'Largest DeFi protocols by TVL (excluding CEX by default), optionally filtered by category or chain; plus TVL by category. Sums double-count.',
      input: z.object({ category: z.string().nullable(), chain: z.string().nullable(), limit: z.number().int().min(1).max(25).nullable() }).strict(),
      label: { id: 'Membaca protokol DeFi…', en: 'Reading DeFi protocols…' },
      run: async ({ category, chain, limit }, ctx) => {
        const asof = await asOfFor(ctx);
        const p = await ctx.store.json<{ summary: Record<string, unknown>; top500: Coin[] }>('core/crypto/defi/protocols_summary.json');
        const rows = p.top500.filter((r) => r.category !== 'CEX' && (!category || String(r.category).toLowerCase() === category.toLowerCase()) && (!chain || String(r.primary_chain).toLowerCase() === chain.toLowerCase())).slice(0, limit ?? 10);
        return {
          data: { results: rows, top10_categories_usd: p.summary.top10_categories_usd, cex_rows_excluded: p.summary.cex_rows, double_counting_ratio_vs_headline: p.summary.double_counting_ratio_vs_headline },
          ui: [artifact('bar', tr(ctx.locale, 'Protokol terbesar menurut TVL', 'Largest protocols by TVL'), { type: 'bar', categories: rows.map((r) => String(r.name)), series: [{ name: 'TVL', data: rows.map((r) => r.tvl_usd as number) }], horizontal: true, yUnit: 'currency', currency: 'USD' }, s(DEFI, asof))],
          method: method('protocols', ['rank_sort', 'tvl_double_count'], { inputs: { category, chain, limit }, rows_used: p.top500.length, dataset: DEFI, as_of: asof, flags: ['tvl_double_counting', 'cex_excluded'] }),
          citations: [s(DEFI, asof)],
        };
      },
    }),
    defineTool({
      name: 'stablecoins',
      description: 'Largest USD-pegged stablecoins by circulating supply with share of total supply, and counts by peg mechanism (DefiLlama).',
      input: z.object({ top: z.number().int().min(1).max(25).nullable() }).strict(),
      label: { id: 'Membaca stablecoin…', en: 'Reading stablecoins…' },
      run: async ({ top }, ctx) => {
        const asof = await asOfFor(ctx);
        const st = await ctx.store.json<{ summary: Record<string, unknown>; rows: Coin[] }>('core/crypto/defi/stablecoins_latest.json');
        const sup = await ctx.store.json<{ summary: { latest_usd: number } }>('core/crypto/defi/stablecoin_supply.json');
        const rows = st.rows.filter((r) => r.peg_type === 'peggedUSD').sort((a, b) => (b.circulating as number) - (a.circulating as number)).slice(0, top ?? 10).map((r) => ({ symbol: r.symbol, name: r.name, circulating: r.circulating, share_of_total_supply: (r.circulating as number) / sup.summary.latest_usd, peg_mechanism: r.peg_mechanism }));
        return {
          data: { results: rows, peg_mechanism_counts: st.summary.peg_mechanism_counts, total_supply_usd: sup.summary.latest_usd },
          ui: [artifact('bar', tr(ctx.locale, 'Stablecoin USD terbesar', 'Largest USD stablecoins'), { type: 'bar', categories: rows.map((r) => String(r.symbol)), series: [{ name: 'share', data: rows.map((r) => r.share_of_total_supply) }], horizontal: true, yUnit: 'pct' }, s(DEFI, asof))],
          method: method('stablecoins', ['share', 'rank_sort'], { inputs: { top }, rows_used: st.rows.length, dataset: DEFI, as_of: asof }),
          citations: [s(DEFI, asof)],
        };
      },
    }),
    defineTool({
      name: 'dex_activity',
      description: 'Monthly DEX volume and fees (USD); the last month is incomplete. Includes the last complete month and the record month.',
      input: z.object({}).strict(),
      label: { id: 'Membaca aktivitas DEX…', en: 'Reading DEX activity…' },
      run: async (_i, ctx) => {
        const asof = await asOfFor(ctx);
        const m = await ctx.store.json<{ month: string[]; dex_volume_usd: (number | null)[]; fees_usd: (number | null)[]; summary: Record<string, unknown> }>('core/crypto/defi/dex_monthly.json');
        const n = Math.max(0, m.month.length - 60);
        return {
          data: m.summary,
          ui: [artifact('bar', tr(ctx.locale, 'Volume DEX bulanan (USD)', 'Monthly DEX volume (USD)'), { type: 'bar', categories: m.month.slice(n), series: [{ name: 'volume', data: m.dex_volume_usd.slice(n) }], yUnit: 'currency', currency: 'USD' }, s(DEFI, asof))],
          method: method('dex_activity', ['sum'], { inputs: {}, rows_used: m.summary.rows as number, dataset: DEFI, as_of: asof, flags: ['last_month_incomplete'] }),
          citations: [s(DEFI, asof)],
        };
      },
    }),
    defineTool({
      name: 'yield_pools',
      description: 'Yield pools from the latest DefiLlama snapshot with filters (stablecoin only, chain, project, minimum TVL): median and p90 APY (percent units) and the largest pools. Always carries a risk warning; not a recommendation.',
      input: z.object({ stablecoin: z.boolean().nullable(), chain: z.string().nullable(), project: z.string().nullable(), min_tvl: z.number().nullable(), limit: z.number().int().min(1).max(25).nullable() }).strict(),
      label: { id: 'Membaca pool yield…', en: 'Reading yield pools…' },
      run: async ({ stablecoin, chain, project, min_tvl, limit }, ctx) => {
        const asof = await asOfFor(ctx);
        const y = await ctx.store.json<{ summary: Record<string, unknown> }>('core/crypto/defi/yields_summary.json');
        const latest = await ctx.store.json<{ rows: Coin[] }>('core/crypto/yields/latest.json');
        const rows = latest.rows.filter((r) => (stablecoin === null || r.stablecoin === stablecoin) && (!chain || String(r.chain).toLowerCase() === chain.toLowerCase()) && (!project || String(r.project).toLowerCase().includes(project.toLowerCase())) && (min_tvl === null || (r.tvlUsd as number) >= min_tvl));
        const apy = rows.map((r) => r.apy).filter((v): v is number => typeof v === 'number');
        const top = [...rows].sort((a, b) => (b.tvlUsd as number) - (a.tvlUsd as number)).slice(0, limit ?? 10);
        return {
          data: { snapshot_summary_all_pools: y.summary, filtered_pools: rows.length, filtered_median_apy_pct: apy.length ? median(apy) : null, largest: top.map((r) => ({ project: r.project, chain: r.chain, symbol: r.symbol, tvlUsd: r.tvlUsd, apy_pct: r.apy, apy_reward_pct: r.apyReward })), risk_warning: RISK[ctx.locale] },
          ui: [artifact('bar', tr(ctx.locale, 'APY pool terbesar (persen)', 'APY of largest pools (percent)'), { type: 'bar', categories: top.map((r) => `${r.project}/${r.symbol}`), series: [{ name: 'APY', data: top.map((r) => (r.apy as number) / 100) }], horizontal: true, yUnit: 'pct' }, s(YIELDS, asof))],
          method: method('yield_pools', ['median', 'rank_sort'], { inputs: { stablecoin, chain, project, min_tvl, limit }, rows_used: rows.length, dataset: `${YIELDS}, ${DEFI}`, as_of: asof, flags: ['apy_high_risk', 'reward_token_apy', 'single_snapshot'] }),
          citations: [s(DEFI, asof), s(YIELDS, asof)],
        };
      },
    }),
    defineTool({
      name: 'fees_revenue',
      description: 'Protocol fees (USD, 24h) and protocol revenue from the latest fees snapshot (deduplicated by name+date), grouped by protocol or category.',
      input: z.object({ group_by: z.enum(['protocol', 'category']), limit: z.number().int().min(1).max(25).nullable() }).strict(),
      label: { id: 'Membaca fee protokol…', en: 'Reading protocol fees…' },
      run: async ({ group_by, limit }, ctx) => {
        const f = await ctx.store.json<{ snapshot_date: string; rows: Coin[] }>('core/crypto/fees/latest.json');
        let rows: { key: string; total24h: number; dailyRevenue: number | null }[];
        if (group_by === 'protocol') rows = f.rows.map((r) => ({ key: String(r.name), total24h: (r.total24h as number) ?? 0, dailyRevenue: (r.dailyRevenue as number | null) ?? null }));
        else {
          const m = new Map<string, number>();
          for (const r of f.rows) m.set(String(r.category), (m.get(String(r.category)) ?? 0) + ((r.total24h as number) || 0));
          rows = [...m.entries()].map(([key, total24h]) => ({ key, total24h, dailyRevenue: null }));
        }
        const top = rows.sort((a, b) => b.total24h - a.total24h || (a.key < b.key ? -1 : 1)).slice(0, limit ?? 10);
        return {
          data: { snapshot_date: f.snapshot_date, group_by, results: top },
          ui: [artifact('bar', tr(ctx.locale, `Fee 24 jam per ${group_by} (USD)`, `24h fees by ${group_by} (USD)`), { type: 'bar', categories: top.map((r) => r.key), series: [{ name: 'fees 24h', data: top.map((r) => r.total24h) }], horizontal: true, yUnit: 'currency', currency: 'USD' }, s(FEES, f.snapshot_date))],
          method: method('fees_revenue', ['sum', 'rank_sort'], { inputs: { group_by, limit }, rows_used: f.rows.length, dataset: FEES, as_of: f.snapshot_date, flags: ['dedup_name_date_keep_first'] }),
          citations: [s(FEES, f.snapshot_date)],
        };
      },
    }),
    defineTool({
      name: 'fees_trend',
      description: 'Daily 24h fees and revenue of one protocol across the fee snapshots (about one month).',
      input: z.object({ name: z.string().min(1) }).strict(),
      label: { id: 'Membaca tren fee…', en: 'Reading fee trend…' },
      run: async ({ name }, ctx) => {
        const t = await ctx.store.json<{ columns: string[]; dict: Record<string, string[]>; rows: (number | string | null)[][] }>('heavy/crypto/fees/history.json');
        const ni = t.dict.name!.findIndex((x) => x.toLowerCase() === name.toLowerCase());
        if (ni < 0) throw new ToolError('Protocol not found in the fee snapshots.');
        const c = (k: string) => t.columns.indexOf(k);
        const rows = t.rows.filter((r) => r[c('name')] === ni).map((r) => ({ date: t.dict.snapshot_date![r[c('snapshot_date')] as number]!, fees: r[c('total24h')] as number | null, revenue: r[c('dailyRevenue')] as number | null })).sort((a, b) => (a.date < b.date ? -1 : 1));
        return {
          data: { name: t.dict.name![ni], rows },
          ui: [artifact('line', `${t.dict.name![ni]} fees`, { type: 'line', x: rows.map((r) => r.date), series: [{ name: 'fees 24h', data: rows.map((r) => r.fees) }, { name: 'revenue', data: rows.map((r) => r.revenue) }], yUnit: 'currency', currency: 'USD' }, s(FEES, rows.at(-1)?.date ?? ''))],
          method: method('fees_trend', ['sum'], { inputs: { name }, rows_used: rows.length, dataset: FEES, as_of: rows.at(-1)?.date ?? '' }),
          citations: [s(FEES, rows.at(-1)?.date ?? '')],
        };
      },
    }),
    defineTool({
      name: 'bots_kb',
      description: 'Search the trading-bot knowledge base (bot/chain profiles, verified facts, Q&A, real-capital tests, LLM consensus) and return counts. Educational only; never recommends a bot and never returns referral links.',
      input: z.object({ query: z.string().nullable(), record_type: z.enum(['bot_profile', 'chain_profile', 'verified_fact', 'qa_pair', 'real_test_data', 'llm_consensus']).nullable(), limit: z.number().int().min(1).max(10).nullable() }).strict(),
      label: { id: 'Mencari knowledge base bot…', en: 'Searching bot knowledge base…' },
      run: async ({ query, record_type, limit }, ctx) => {
        const asof = await asOfFor(ctx);
        const files = ['core/crypto/bots/profiles.json', 'core/crypto/bots/facts.json', 'core/crypto/bots/qa.json'];
        const all = (await Promise.all(files.map((f) => ctx.store.json<{ rows: Coin[]; summary?: Record<string, unknown> }>(f)))).flatMap((x) => x.rows);
        const summary = (await ctx.store.json<{ summary: Record<string, unknown> }>(files[0]!)).summary;
        const q = query ? normaliseKey(query) : '';
        const hits = all.filter((r) => (!record_type || r.record_type === record_type) && (!q || normaliseKey(`${r.question ?? ''} ${r.answer ?? ''} ${r.section ?? ''}`).includes(q))).slice(0, limit ?? 5);
        const rt = summary.record_types as Record<string, number>;
        return {
          data: { counts: { rows: summary.rows, record_types: rt, bot_profiles: summary.bot_profiles }, results: hits, note: 'Information only — not an endorsement; referral links removed.' },
          ui: [artifact('bar', tr(ctx.locale, 'Isi knowledge base bot', 'Bot knowledge-base contents'), { type: 'bar', categories: Object.keys(rt), series: [{ name: 'records', data: Object.values(rt) }], horizontal: true }, s(BOTS, asof))],
          method: method('bots_kb', ['count'], { inputs: { query, record_type, limit }, rows_used: summary.rows as number, dataset: BOTS, as_of: asof, flags: ['information_only', 'referral_links_removed'] }),
          citations: [s(BOTS, asof)],
        };
      },
    }),
    defineTool({
      name: 'security_checklist',
      description: 'Finandex safety checklist for crypto bots and DeFi (editorial). Use whenever bots, yields, wallets, seed phrases, or private keys come up.',
      input: z.object({}).strict(),
      label: { id: 'Menyiapkan checklist keamanan…', en: 'Preparing safety checklist…' },
      run: async (_i, ctx) => {
        const asof = await asOfFor(ctx);
        const sec = await ctx.store.json<{ checklist: { id: string[]; en: string[] } }>('core/crypto/bots/security.json');
        const items = sec.checklist[ctx.locale];
        return {
          data: { checklist: items },
          ui: [artifact('card', tr(ctx.locale, 'Checklist keamanan', 'Safety checklist'), { type: 'card', tone: 'warning', body: tr(ctx.locale, 'Jangan pernah membagikan seed phrase atau private key.', 'Never share a seed phrase or private key.'), items }, s(BOTS, asof))],
        };
      },
    }),
  ];
}
