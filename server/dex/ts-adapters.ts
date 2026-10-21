// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Time-series adapters (one per price-based dataset) feeding the shared toolkit.
import { calendarYearReturns } from '../../src/shared/analytics/series.ts';
import type { CalDate } from '../../src/shared/dates.ts';
import type { SeriesFile } from '../../src/shared/data-contracts.ts';
import { ToolError, type ToolContext } from '../tools/types.ts';
import type { TsAdapter, TsEntity, TsSeries } from './shared-tools.ts';

const PCT_METRICS = {
  ret_1D: 'pct',
  ret_1W: 'pct',
  ret_1M: 'pct',
  ret_3M: 'pct',
  ret_6M: 'pct',
  ret_YTD: 'pct',
  ret_1Y: 'pct',
  ret_3Y: 'pct',
  ret_5Y: 'pct',
  ret_10Y: 'pct',
  ret_MAX: 'pct',
  cagr_5Y: 'pct',
  cagr_10Y: 'pct',
  vol_1Y: 'pct',
  mdd: 'pct',
  pct_from_ath: 'pct',
} as const;

function fromSeriesFile(f: SeriesFile): TsSeries {
  return {
    d: f.d,
    p: (f.ac ?? f.c) as number[],
    c: f.c as number[],
    ohlc_from: f.ohlc_from,
    ...(f.o ? { o: f.o, h: f.h!, l: f.l! } : {}),
  };
}

function calFromSeries(s: TsSeries): Record<string, { ret: number | null; partial: boolean }> {
  return calendarYearReturns(s.d, s.p);
}

// ------------------------------------------------------------------------------------------------ Finandex AI (global)
interface GlobalAsset {
  symbol: string;
  slug: string;
  display_name: string;
  display_name_id: string;
  asset_name: string;
  asset_type: string;
  category: string;
  country: string;
  geo_region: string;
  quote_unit: string;
  periods_per_year: number;
  last_date: CalDate;
  quality: { low_precision: boolean; has_volume: boolean; nonpositive_close_rows: string[] };
  metrics: Record<string, unknown>;
}

const GLOBAL_ALIASES: Record<string, string[]> = {
  '^GSPC': ['sp500', 's&p', 's&p 500', 'spx'],
  '^IXIC': ['nasdaq', 'nasdaq composite'],
  '^FTSE': ['ftse', 'ftse 100'],
  '^GDAXI': ['dax'],
  '^N225': ['nikkei', 'nikkei 225'],
  '^HSI': ['hang seng'],
  '000001.SS': ['shanghai', 'sse'],
  '^KS11': ['kospi'],
  '^BSESN': ['sensex'],
  '^NSEI': ['nifty', 'nifty 50'],
  'CL=F': ['wti', 'minyak', 'crude oil', 'oil', 'minyak wti'],
  'BZ=F': ['brent'],
  'GC=F': ['gold', 'emas'],
  'SI=F': ['silver', 'perak'],
  'HG=F': ['copper', 'tembaga'],
  'NG=F': ['natural gas', 'gas alam'],
  'ZC=F': ['corn', 'jagung'],
  'ZW=F': ['wheat', 'gandum'],
  'BTC-USD': ['bitcoin', 'btc'],
  'ETH-USD': ['ethereum', 'eth'],
  'BNB-USD': ['bnb'],
  'XRP-USD': ['xrp', 'ripple'],
  'ADA-USD': ['cardano', 'ada'],
  'DOGE-USD': ['dogecoin', 'doge'],
  'LTC-USD': ['litecoin', 'ltc'],
  'SOL-USD': ['solana', 'sol'],
  'AUDUSD=X': ['aud', 'australian dollar', 'dolar australia'],
  'CADUSD=X': ['cad', 'canadian dollar', 'dolar kanada'],
  'CHFUSD=X': ['chf', 'swiss franc', 'franc swiss', 'chf/usd'],
  'CNYUSD=X': ['cny', 'yuan', 'renminbi'],
  'EURUSD=X': ['eur', 'euro', 'eur/usd'],
  'GBPUSD=X': ['gbp', 'pound', 'poundsterling'],
  'INRUSD=X': ['inr', 'rupee', 'rupee india'],
  'JPYUSD=X': ['jpy', 'yen'],
};

export const GLOBAL_EVENTS = [
  { id: 'nasdaq_peak_2000', date: '2000-03-10', label: { id: 'Puncak NASDAQ (dot-com)', en: 'NASDAQ peak (dot-com)' } },
  {
    id: 'lehman_2008',
    date: '2008-09-15',
    label: { id: 'Kebangkrutan Lehman Brothers', en: 'Lehman Brothers bankruptcy' },
  },
  { id: 'snb_2015', date: '2015-01-15', label: { id: 'SNB melepas patokan franc', en: 'SNB scraps the franc cap' } },
  { id: 'yuan_2015', date: '2015-08-11', label: { id: 'Devaluasi yuan', en: 'Yuan devaluation' } },
  { id: 'brexit_2016', date: '2016-06-24', label: { id: 'Hasil referendum Brexit', en: 'Brexit referendum result' } },
  { id: 'btc_halving_2016', date: '2016-07-09', label: { id: 'Halving Bitcoin 2016', en: 'Bitcoin halving 2016' } },
  {
    id: 'who_pandemic_2020',
    date: '2020-03-11',
    label: { id: 'WHO menyatakan pandemi', en: 'WHO declares a pandemic' },
  },
  { id: 'wti_negative_2020', date: '2020-04-20', label: { id: 'WTI negatif', en: 'WTI turns negative' } },
  { id: 'btc_halving_2020', date: '2020-05-11', label: { id: 'Halving Bitcoin 2020', en: 'Bitcoin halving 2020' } },
  {
    id: 'russia_ukraine_2022',
    date: '2022-02-24',
    label: { id: 'Invasi Rusia ke Ukraina', en: 'Russia invades Ukraine' },
  },
  { id: 'eth_merge_2022', date: '2022-09-15', label: { id: 'Ethereum Merge', en: 'Ethereum Merge' } },
  { id: 'svb_2023', date: '2023-03-10', label: { id: 'Kejatuhan SVB', en: 'SVB collapse' } },
  { id: 'btc_halving_2024', date: '2024-04-20', label: { id: 'Halving Bitcoin 2024', en: 'Bitcoin halving 2024' } },
] as const;

export function globalAdapter(): TsAdapter & { catalog(ctx: ToolContext): Promise<GlobalAsset[]> } {
  const catalog = async (ctx: ToolContext) =>
    (await ctx.store.json<{ assets: GlobalAsset[] }>('core/global/catalog.json')).assets;
  const bySym = async (ctx: ToolContext, id: string) => {
    const a = (await catalog(ctx)).find((x) => x.symbol === id);
    if (!a) throw new ToolError(`Unknown asset ${id}`);
    return a;
  };
  return {
    dataset: 'Global Financial Markets Dataset 2000–Present',
    tab: 'markets',
    yFormat: 'price',
    catalog,
    events: GLOBAL_EVENTS.map((e) => ({ id: e.id, date: e.date, label: e.label })),
    rankMetrics: { ...PCT_METRICS, last_close: 'price' },
    filterFields: ['asset_type', 'geo_region', 'country'],
    async entities(ctx) {
      return (await catalog(ctx)).map((a): TsEntity => ({
        id: a.symbol,
        name: ctx.locale === 'id' ? a.display_name_id : a.display_name,
        aliases: [a.display_name, a.display_name_id, a.asset_name, a.slug, ...(GLOBAL_ALIASES[a.symbol] ?? [])],
        type: a.asset_type,
        as_of: a.last_date,
        ppy: a.periods_per_year,
        unit: a.quote_unit,
        group: { asset_type: a.asset_type, geo_region: a.geo_region, country: a.country, category: a.category },
      }));
    },
    async series(ctx, id) {
      const a = await bySym(ctx, id);
      return fromSeriesFile(await ctx.store.json<SeriesFile>(`core/global/series/${a.slug}.json`));
    },
    async metrics(ctx, id) {
      return (await bySym(ctx, id)).metrics;
    },
    async calendar(ctx, id) {
      const cal = await ctx.store.json<Record<string, Record<string, { ret: number | null; partial: boolean }>>>(
        'core/global/calendar_returns.json',
      );
      return cal[id] ?? {};
    },
    async corr3y(ctx) {
      return (
        await ctx.store.json<{ matrix: Record<string, Record<string, number | null>> }>(
          'core/global/correlation_3y.json',
        )
      ).matrix;
    },
    async flagsFor(ctx, id) {
      const a = await bySym(ctx, id);
      const f: string[] = [];
      if (a.quality.low_precision) f.push('low_precision');
      if (a.quality.nonpositive_close_rows.length) f.push('nonpositive_close');
      if (a.asset_type === 'Currency') f.push('fx_bar_may_shift_one_day');
      if (a.symbol === 'ZC=F' || a.symbol === 'ZW=F') f.push('unit_us_cents_per_bushel');
      return f;
    },
  };
}

// ------------------------------------------------------------------------------------------------ CommerceDex
interface CommerceCo {
  company_id: string;
  name: string;
  ticker: string;
  price_currency: string;
  financials_currency: string;
  country_code: string;
  region: string;
  segment: string;
  exchange: string;
  last_date: string;
  [k: string]: unknown;
}

export function commerceAdapter(): TsAdapter & { companies(ctx: ToolContext): Promise<CommerceCo[]> } {
  const companies = async (ctx: ToolContext) =>
    (await ctx.store.json<{ companies: CommerceCo[] }>('core/commerce/catalog.json')).companies;
  const get = async (ctx: ToolContext, id: string) => {
    const c = (await companies(ctx)).find((x) => x.company_id === id);
    if (!c) throw new ToolError(`Unknown company ${id}`);
    return c;
  };
  return {
    dataset: 'Global E-Commerce Giants 2015–2026',
    tab: 'companies',
    yFormat: 'price',
    companies,
    rankMetrics: { ...PCT_METRICS, fin_net_margin: 'pct', fin_operating_margin: 'pct', fin_revenue_yoy: 'pct' },
    filterFields: ['segment', 'region', 'country_code'],
    async entities(ctx) {
      return (await companies(ctx)).map((c) => ({
        id: c.company_id,
        name: c.name,
        aliases: [c.ticker, c.company_id.replace(/-/g, ' ')],
        type: c.segment,
        as_of: c.last_date,
        ppy: 252,
        currency: c.price_currency,
        group: { segment: c.segment, region: c.region, country_code: c.country_code },
      }));
    },
    async series(ctx, id) {
      return fromSeriesFile(
        await ctx.store.json<SeriesFile>(`core/commerce/series/${(await get(ctx, id)).company_id}.json`),
      );
    },
    async metrics(ctx, id) {
      const { wiki_extract: _w, founders: _f, ...m } = await get(ctx, id);
      return m;
    },
    async calendar(ctx, id) {
      return calFromSeries(await this.series(ctx, id));
    },
    async flagsFor(ctx, id) {
      const c = await get(ctx, id);
      return c.financials_currency !== c.price_currency ? ['financials_currency_differs'] : [];
    },
  };
}

// ------------------------------------------------------------------------------------------------ IDFinanDex market series
export const IDFIN_NAMES: Record<string, { id: string; en: string; aliases: string[] }> = {
  IHSG: {
    id: 'IHSG (Indeks Harga Saham Gabungan)',
    en: 'IHSG (Jakarta Composite Index)',
    aliases: ['jci', 'jakarta composite', 'idx composite'],
  },
  USDIDR: { id: 'USD/IDR', en: 'USD/IDR', aliases: ['rupiah', 'kurs', 'usd idr'] },
  GOLD: { id: 'Emas', en: 'Gold', aliases: ['emas', 'gold'] },
  OIL: { id: 'Minyak', en: 'Oil', aliases: ['minyak', 'oil', 'wti'] },
  SP500: { id: 'S&P 500', en: 'S&P 500', aliases: ['sp500', 's&p'] },
  VIX: { id: 'VIX', en: 'VIX', aliases: ['volatility index'] },
};

export function idfinAdapter(): TsAdapter {
  const ser = async (ctx: ToolContext) =>
    (
      await ctx.store.json<{ as_of: string; series: Record<string, { d: string[]; c: number[] }> }>(
        'core/idfin/series.json',
      )
    ).series;
  return {
    dataset: 'Daily Multi-Asset Macroeconomic and Financial Time Series Dataset (Indonesia & Global Markets)',
    tab: 'assets',
    yFormat: 'num',
    rankMetrics: PCT_METRICS,
    async entities(ctx) {
      const s = await ser(ctx);
      return Object.keys(s).map((k) => ({
        id: k,
        name: IDFIN_NAMES[k]?.[ctx.locale] ?? k,
        aliases: IDFIN_NAMES[k]?.aliases ?? [],
        type: 'market',
        as_of: s[k]!.d.at(-1)!,
        ppy: 252,
      }));
    },
    async series(ctx, id) {
      const s = (await ser(ctx))[id];
      if (!s) throw new ToolError(`Unknown series ${id}`);
      return { d: s.d, p: s.c, c: s.c };
    },
    async metrics(ctx, id) {
      const m = (await ctx.store.json<Record<string, Record<string, unknown>>>('core/idfin/metrics.json'))[id];
      if (!m) throw new ToolError(`Unknown series ${id}`);
      return m;
    },
    async calendar(ctx, id) {
      return (
        (
          await ctx.store.json<Record<string, Record<string, { ret: number | null; partial: boolean }>>>(
            'core/idfin/calendar_returns.json',
          )
        )[id] ?? {}
      );
    },
    async corr3y(ctx) {
      return (
        await ctx.store.json<{ matrix: Record<string, Record<string, number | null>> }>(
          'core/idfin/correlation_3y.json',
        )
      ).matrix;
    },
    async flagsFor(_ctx, id) {
      return id === 'OIL'
        ? ['nonpositive_close']
        : id === 'USDIDR'
          ? ['fx_bad_prints_removed']
          : ['carry_forward_excluded'];
    },
  };
}

// ------------------------------------------------------------------------------------------------ RupiahDex
export const RUPIAH_EVENTS = [
  {
    id: 'lehman_2008',
    date: '2008-09-15',
    label: { id: 'Kebangkrutan Lehman Brothers', en: 'Lehman Brothers bankruptcy' },
  },
  {
    id: 'taper_tantrum_2013',
    date: '2013-05-22',
    label: { id: 'Testimoni Bernanke (taper tantrum)', en: 'Bernanke testimony (taper tantrum)' },
  },
  { id: 'yuan_2015', date: '2015-08-11', label: { id: 'Devaluasi yuan', en: 'Yuan devaluation' } },
  {
    id: 'who_pandemic_2020',
    date: '2020-03-11',
    label: { id: 'WHO menyatakan pandemi', en: 'WHO declares a pandemic' },
  },
];

export function rupiahAdapter(): TsAdapter {
  return {
    dataset: 'USD/IDR daily exchange rate',
    tab: 'rate',
    yFormat: 'num',
    rankMetrics: PCT_METRICS,
    events: RUPIAH_EVENTS,
    async entities(ctx) {
      const s = await ctx.store.json<SeriesFile>('core/rupiah/series.json');
      return [
        {
          id: 'USDIDR',
          name: 'USD/IDR',
          aliases: ['rupiah', 'kurs', 'usd/idr', 'idr', 'dollar'],
          type: 'fx',
          as_of: s.as_of,
          ppy: 252,
        },
      ];
    },
    async series(ctx) {
      return fromSeriesFile(await ctx.store.json<SeriesFile>('core/rupiah/series.json'));
    },
    async metrics(ctx) {
      return ctx.store.json<Record<string, unknown>>('core/rupiah/metrics.json');
    },
    async calendar(ctx) {
      return ctx.store.json('core/rupiah/calendar_returns.json');
    },
    async flagsFor() {
      return ['fx_bad_prints_removed', 'rising_means_rupiah_weaker'];
    },
  };
}

// ------------------------------------------------------------------------------------------------ IDXDex
interface IdxStock {
  ticker: string;
  name: string | null;
  last_date: string;
  [k: string]: unknown;
}
export function idxAdapter(): TsAdapter & { stocks(ctx: ToolContext): Promise<IdxStock[]> } {
  const stocks = async (ctx: ToolContext) =>
    (await ctx.store.json<{ stocks: IdxStock[] }>('core/idx/catalog.json')).stocks;
  const get = async (ctx: ToolContext, id: string) => {
    const s = (await stocks(ctx)).find((x) => x.ticker === id);
    if (!s) throw new ToolError(`Unknown IDX ticker ${id}`);
    return s;
  };
  return {
    dataset: 'Complete Indonesia Stock Market IDX 2000–2024',
    tab: 'stocks',
    yFormat: 'price',
    stocks,
    rankMetrics: {
      ...PCT_METRICS,
      roe: 'pct',
      npm: 'pct',
      der: 'num',
      per: 'num',
      pbv: 'num',
      market_cap_idr: 'money_idr',
      avg_value_traded_20d_idr: 'money_idr',
      zero_volume_share_1Y: 'pct',
      beta_3Y_vs_IHSG: 'num',
    },
    async entities(ctx) {
      return (await stocks(ctx)).map((s) => ({
        id: s.ticker,
        name: s.name ? `${s.ticker} — ${s.name}` : s.ticker,
        aliases: [s.name ?? ''],
        type: 'stock',
        as_of: s.last_date,
        ppy: 252,
        currency: 'IDR',
      }));
    },
    async series(ctx, id) {
      return fromSeriesFile(await ctx.store.json<SeriesFile>(`heavy/idx/series/${(await get(ctx, id)).ticker}.json`));
    },
    async metrics(ctx, id) {
      return get(ctx, id);
    },
    async calendar(ctx, id) {
      return calFromSeries(await this.series(ctx, id));
    },
    async flagsFor(ctx, id) {
      const s = await get(ctx, id);
      const f = ['prices_as_of_2024_05_17'];
      if ((s.zero_volume_share_1Y as number | null) !== null && (s.zero_volume_share_1Y as number) > 0.5)
        f.push('illiquid');
      return f;
    },
  };
}

// ------------------------------------------------------------------------------------------------ CryptDex prices
export const COIN_NAMES: Record<string, string> = {
  ADA: 'Cardano',
  AVAX: 'Avalanche',
  BCH: 'Bitcoin Cash',
  BNB: 'BNB',
  BTC: 'Bitcoin',
  DOGE: 'Dogecoin',
  DOT: 'Polkadot',
  ETH: 'Ethereum',
  LEO: 'UNUS SED LEO',
  LINK: 'Chainlink',
  LTC: 'Litecoin',
  NEAR: 'NEAR Protocol',
  SHIB: 'Shiba Inu',
  SOL: 'Solana',
  TON: 'Toncoin (TON → GRAM)',
  TRX: 'TRON',
  UNI: 'Uniswap',
  XRP: 'XRP',
};

export function cryptoAdapter(): TsAdapter {
  const assets = async (ctx: ToolContext) =>
    (await ctx.store.json<{ assets: Record<string, unknown>[] }>('core/crypto/catalog.json')).assets;
  const get = async (ctx: ToolContext, id: string) => {
    const a = (await assets(ctx)).find((x) => x.ticker === id);
    if (!a) throw new ToolError(`Unknown coin ${id}; available: ${Object.keys(COIN_NAMES).join(', ')}`);
    return a;
  };
  return {
    dataset: 'Crypto Prices Historical Data (18 coins)',
    tab: 'history',
    yFormat: 'price',
    rankMetrics: PCT_METRICS,
    async entities(ctx) {
      return (await assets(ctx)).map((a) => {
        const id = a.ticker as string;
        return {
          id,
          name: COIN_NAMES[id] ?? id,
          aliases: id === 'TON' ? ['gram', 'toncoin'] : [COIN_NAMES[id] ?? ''],
          type: 'crypto',
          as_of: a.last_date as string,
          ppy: 365,
          currency: 'USD',
        };
      });
    },
    async series(ctx, id) {
      return fromSeriesFile(
        await ctx.store.json<SeriesFile>(`core/crypto/series/${(await get(ctx, id)).ticker as string}.json`),
      );
    },
    async metrics(ctx, id) {
      return get(ctx, id);
    },
    async calendar(ctx, id) {
      return calFromSeries(await this.series(ctx, id));
    },
    async flagsFor(_ctx, id) {
      return id === 'SHIB'
        ? ['quantized_prices_early_2021', 'spike_removed']
        : id === 'TON'
          ? ['ticker_change_TON_to_GRAM']
          : [];
    },
  };
}

// ------------------------------------------------------------------------------------------------ NASDAQ / S&P 500 (pending until data exists)
export function stockUniverseAdapter(key: 'nasdaq' | 'sp500', dataset: string): TsAdapter {
  const stocks = async (ctx: ToolContext) => {
    try {
      return (await ctx.store.json<{ stocks: Record<string, unknown>[] }>(`core/${key}/catalog.json`)).stocks;
    } catch {
      throw new ToolError(
        `${dataset} is not available yet (status pending-data: the input file has not been uploaded). Say so honestly; do not answer from memory.`,
      );
    }
  };
  const get = async (ctx: ToolContext, id: string) => {
    const s = (await stocks(ctx)).find((x) => x.ticker === id.toUpperCase());
    if (!s) throw new ToolError(`Unknown ticker ${id}`);
    return s;
  };
  return {
    dataset,
    tab: 'screener',
    yFormat: 'price',
    rankMetrics: {
      ...PCT_METRICS,
      beta_3Y: 'num',
      multiple_MAX: 'num',
      ...(key === 'sp500'
        ? { ttm_yield: 'pct', dividend_increase_streak_years: 'int', avg_dollar_volume_20d: 'money_usd' }
        : {}),
    },
    async entities(ctx) {
      return (await stocks(ctx)).map((s) => ({
        id: s.ticker as string,
        name: s.ticker as string,
        aliases: [],
        type: 'stock',
        as_of: s.last_date as string,
        ppy: 252,
        currency: 'USD',
      }));
    },
    async series(ctx, id) {
      return fromSeriesFile(
        await ctx.store.json<SeriesFile>(`heavy/${key}/series/${(await get(ctx, id)).ticker as string}.json`),
      );
    },
    async metrics(ctx, id) {
      return get(ctx, id);
    },
    async calendar(ctx, id) {
      return calFromSeries(await this.series(ctx, id));
    },
    async flagsFor(ctx, id) {
      return ((await get(ctx, id)).quality_flags as string[]) ?? [];
    },
  };
}
