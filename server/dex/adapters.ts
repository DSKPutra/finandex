// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Entity adapters: a uniform view (catalog, series, quality, calendar) over each time-series Dex's data
// files, used by the shared tools (§8.4).
import type { DexId } from '../../src/config/dex-registry';
import type { CalendarReturns } from '../../src/shared/analytics/series';
import type { SeriesFile } from '../../src/shared/data-contracts';
import { normaliseKey } from '../../src/shared/text';
import type { DataStore } from '../data/store';

export type Entity = {
  id: string;
  name: string;
  type: string;
  /** Extra searchable aliases (local names, tickers). */
  aliases: string[];
  /** Display-ready metrics (golden fields) + descriptors. */
  metrics: Record<string, unknown>;
};

export type Series = {
  d: string[];
  /** Price for display / highs / ATH. */
  price: (number | null)[];
  /** Basis for returns & risk (Adj Close / total return where available). */
  ret: (number | null)[];
  ohlc?: { o: (number | null)[]; h: (number | null)[]; l: (number | null)[] };
};

export type TsAdapter = {
  dex: DexId;
  /** Dataset label for citations (source file names, §3.1). */
  dataset: string;
  entityLabel: { id: string; en: string };
  ppy: (id: string) => number;
  basisNote?: { id: string; en: string };
  entities: () => Promise<Entity[]>;
  series: (id: string) => Promise<Series>;
  quality: (id?: string) => Promise<unknown>;
  calendar: (id: string) => Promise<CalendarReturns | null>;
  /** Filterable categorical fields for `rank` (e.g. asset_type, region). */
  filterFields: string[];
};

type Item = Record<string, unknown>;
type Catalog = { as_of: string; items: Item[] };

const fromSeries = (s: SeriesFile, retKey: 'c' | 'ac' = 'c'): Series => ({
  d: s.d,
  price: s.c,
  ret: (retKey === 'ac' ? s.ac : s.c) ?? s.c,
  ...(s.o && s.h && s.l ? { ohlc: { o: s.o, h: s.h, l: s.l } } : {}),
});

const memoize = <T>(f: () => Promise<T>) => {
  let p: Promise<T> | undefined;
  return () => (p ??= f().catch((e: unknown) => {
    p = undefined;
    throw e;
  }));
};

export function makeAdapters(store: DataStore): Partial<Record<DexId, TsAdapter>> {
  const cat = (path: string) => memoize(() => store.json<Catalog>(path));
  const calFile = (path: string) => memoize(() => store.json<Record<string, CalendarReturns>>(path));

  // Finandex AI ------------------------------------------------------------------
  const gCat = cat('core/global/catalog.json');
  const gCal = calFile('core/global/calendar_returns.json');
  const gQual = memoize(() => store.json<Record<string, unknown>>('core/global/quality.json'));
  const global: TsAdapter = {
    dex: 'finandex-ai',
    dataset: 'Global_Financial_Markets_Dataset_2000-Present.zip',
    entityLabel: { id: 'aset', en: 'asset' },
    ppy: (id) => (id.endsWith('-USD') ? 365 : 252),
    filterFields: ['asset_type', 'geo_region', 'country'],
    entities: memoize(async () =>
      (await gCat()).items.map((a) => ({
        id: a.symbol as string,
        name: a.display_name as string,
        type: a.asset_type as string,
        aliases: [a.display_name_id, a.asset_name, a.slug, a.country, a.country_id].filter(Boolean).map(String),
        metrics: { ...(a.metrics as Item), display_name: a.display_name, display_name_id: a.display_name_id, geo_region: a.geo_region, country: a.country, quote_unit: a.quote_unit, slug: a.slug, low_precision: (a.quality as Item).low_precision },
      })),
    ),
    series: async (id) => {
      const e = (await global.entities()).find((x) => x.id === id);
      return fromSeries(await store.json<SeriesFile>(`core/global/series/${e?.metrics.slug as string}.json`));
    },
    quality: async (id) => (id ? (await gQual())[id] : { assets: Object.keys(await gQual()).length }),
    calendar: async (id) => (await gCal())[id] ?? null,
  };

  // NASDAQ ------------------------------------------------------------------------
  const nCat = cat('core/nasdaq/catalog.json');
  const nCal = calFile('core/nasdaq/calendar_returns.json');
  const nQual = memoize(() => store.json<{ tickers: Record<string, unknown> } & Item>('core/nasdaq/quality.json'));
  const nasdaq: TsAdapter = {
    dex: 'nasdaqdex',
    dataset: 'NASDAQ_daily_stock_prices_OHLC_prices_between_1962-01-02_till_2026-09-18_Dataset.zip',
    entityLabel: { id: 'saham', en: 'stock' },
    ppy: () => 252,
    basisNote: { id: 'harga ter-adjust sumber', en: 'source-adjusted prices' },
    filterFields: [],
    entities: memoize(async () => (await nCat()).items.map((m) => ({ id: m.ticker as string, name: m.ticker as string, type: 'stock', aliases: [], metrics: m }))),
    series: async (id) => fromSeries(await store.json<SeriesFile>(`heavy/nasdaq/series/${id}.json`)),
    quality: async (id) => {
      const q = await nQual();
      return id ? { ticker: q.tickers[id], systemic_dates: q.systemic_dates, rules: q.rules } : { systemic_dates: q.systemic_dates, rules: q.rules, totals: q.totals };
    },
    calendar: async (id) => (await nCal())[id] ?? null,
  };

  // S&P 500 -----------------------------------------------------------------------
  const sCat = cat('core/sp500/catalog.json');
  const sCal = calFile('core/sp500/calendar_returns.json');
  const sQual = memoize(() => store.json<{ tickers: Record<string, unknown> } & Item>('core/sp500/quality.json'));
  const sp500: TsAdapter = {
    dex: 'snp500dex',
    dataset: 'S_P_500_US_Stock_Market_Data_2026_master_stock_data.csv',
    entityLabel: { id: 'saham', en: 'stock' },
    ppy: () => 252,
    basisNote: { id: 'return memakai Adj Close (total return)', en: 'returns use Adj Close (total return)' },
    filterFields: [],
    entities: memoize(async () => (await sCat()).items.map((m) => ({ id: m.ticker as string, name: m.ticker as string, type: 'stock', aliases: [], metrics: m }))),
    series: async (id) => fromSeries(await store.json<SeriesFile>(`heavy/sp500/series/${id}.json`), 'ac'),
    quality: async (id) => {
      const q = await sQual();
      return id ? { ticker: q.tickers[id], rules: q.rules, insufficient_history: q.tickers_insufficient_history } : { rows_dropped_null_close: q.rows_dropped_null_close, rules: q.rules, tickers_insufficient_history: q.tickers_insufficient_history };
    },
    calendar: async (id) => (await sCal())[id] ?? null,
  };

  // CommerceDex ------------------------------------------------------------------
  const cCat = cat('core/commerce/catalog.json');
  const cQual = memoize(() => store.json<{ tickers: Record<string, unknown> } & Item>('core/commerce/quality.json'));
  const commerce: TsAdapter = {
    dex: 'commercedex',
    dataset: 'Global_E-Commerce_Giants_2015_2026_.zip',
    entityLabel: { id: 'perusahaan', en: 'company' },
    ppy: () => 252,
    basisNote: { id: 'return memakai adj_close; harga dalam mata uang listing', en: 'returns use adj_close; prices in listing currency' },
    filterFields: ['segment', 'region', 'country_code'],
    entities: memoize(async () =>
      (await cCat()).items.map((m) => ({ id: m.company_id as string, name: m.name as string, type: m.segment as string, aliases: [m.ticker as string], metrics: m })),
    ),
    series: async (id) => fromSeries(await store.json<SeriesFile>(`core/commerce/series/${id}.json`), 'ac'),
    quality: async (id) => {
      const q = await cQual();
      return id ? { company: q.tickers[id], financials_currency_override: q.financials_currency_override } : { rows_dropped_null_close: q.rows_dropped_null_close, financials_currency_override: q.financials_currency_override };
    },
    calendar: async () => null,
  };

  // IDFinanDex ---------------------------------------------------------------------
  const iSeries = memoize(() => store.json<{ market: Record<string, { d: string[]; v: number[] }> }>('core/idfin/series.json'));
  const iMetrics = memoize(() => store.json<Record<string, Item>>('core/idfin/metrics.json'));
  const iCal = calFile('core/idfin/calendar_returns.json');
  const IDF_NAMES: Record<string, string> = { OIL: 'Minyak (OIL)', GOLD: 'Emas (GOLD)', USDIDR: 'USD/IDR', SP500: 'S&P 500', IHSG: 'IHSG', VIX: 'VIX' };
  const idfin: TsAdapter = {
    dex: 'idfinandex',
    dataset: 'Daily_Multi-Asset_Macroeconomic_and_Financial_Time_Series_Dataset_Indonesia_Global_Markets.csv',
    entityLabel: { id: 'aset', en: 'asset' },
    ppy: () => 252,
    basisNote: { id: 'nilai carry-forward hari libur dikecualikan', en: 'holiday carry-forward values excluded' },
    filterFields: [],
    entities: memoize(async () =>
      Object.entries(await iMetrics()).map(([k, m]) => ({ id: k, name: IDF_NAMES[k] ?? k, type: 'series', aliases: [k.toLowerCase(), k === 'IHSG' ? 'jci' : '', k === 'GOLD' ? 'emas' : ''].filter(Boolean), metrics: m })),
    ),
    series: async (id) => {
      const s = (await iSeries()).market[id];
      if (!s) throw new Error(`unknown series ${id}`);
      return { d: s.d, price: s.v, ret: s.v };
    },
    quality: async (id) => {
      const q = await store.json<Record<string, unknown>>('core/idfin/quality.json');
      return id ? q[id] : q;
    },
    calendar: async (id) => (await iCal())[id] ?? null,
  };

  // RupiahDex -----------------------------------------------------------------------
  const rMetrics = memoize(() => store.json<Item>('core/rupiah/metrics.json'));
  const rupiah: TsAdapter = {
    dex: 'rupiahdex',
    dataset: 'USDIDR_daily_exchange_rate.zip',
    entityLabel: { id: 'kurs', en: 'rate' },
    ppy: () => 252,
    basisNote: { id: 'USD/IDR naik = rupiah melemah; bad print dibuang', en: 'USD/IDR up = rupiah weaker; bad prints removed' },
    filterFields: [],
    entities: memoize(async () => [{ id: 'USDIDR', name: 'USD/IDR', type: 'fx', aliases: ['rupiah', 'idr', 'usd', 'kurs', 'dolar', 'dollar'], metrics: await rMetrics() }]),
    series: async () => fromSeries(await store.json<SeriesFile>('core/rupiah/series.json')),
    quality: async () => store.json('core/rupiah/quality.json'),
    calendar: async () => store.json<CalendarReturns>('core/rupiah/calendar_returns.json'),
  };

  // IDXDex ---------------------------------------------------------------------------
  const xCat = cat('core/idx/catalog.json');
  const xQual = memoize(() => store.json<{ tickers: Record<string, unknown> } & Item>('core/idx/quality.json'));
  const idx: TsAdapter = {
    dex: 'idxdex',
    dataset: 'Complete_Indonesia_Stock_Market_IDX_2000-2024.zip',
    entityLabel: { id: 'saham', en: 'stock' },
    ppy: () => 252,
    basisNote: { id: 'return memakai Adj Close; harga s/d 2024-05-17', en: 'returns use Adj Close; prices up to 2024-05-17' },
    filterFields: [],
    entities: memoize(async () =>
      (await xCat()).items.map((m) => ({ id: m.ticker as string, name: (m.name as string | null) ?? (m.ticker as string), type: 'stock', aliases: [m.ticker as string], metrics: m })),
    ),
    series: async (id) => fromSeries(await store.json<SeriesFile>(`heavy/idx/series/${id}.json`), 'ac'),
    quality: async (id) => {
      const q = await xQual();
      return id ? { ticker: q.tickers[id], prices_as_of: q.prices_as_of, rules: q.rules } : { prices_as_of: q.prices_as_of, tickers_in_prices: q.tickers_in_prices, rules: q.rules };
    },
    calendar: async () => null,
  };

  // CryptDex (prices) -----------------------------------------------------------------
  const kCat = cat('core/crypto/catalog.json');
  const kQual = memoize(() => store.json<{ tickers: Record<string, unknown>; notes: unknown }>('core/crypto/quality.json'));
  const COIN_NAMES: Record<string, string> = {
    BTC: 'Bitcoin', ETH: 'Ethereum', BNB: 'BNB', XRP: 'XRP', ADA: 'Cardano', DOGE: 'Dogecoin', SOL: 'Solana', TRX: 'TRON', TON: 'Toncoin (TON → GRAM)',
    DOT: 'Polkadot', LINK: 'Chainlink', LTC: 'Litecoin', BCH: 'Bitcoin Cash', AVAX: 'Avalanche', SHIB: 'Shiba Inu', LEO: 'UNUS SED LEO', UNI: 'Uniswap', NEAR: 'NEAR Protocol',
  };
  const crypto: TsAdapter = {
    dex: 'cryptdex',
    dataset: 'Crypto_Prices_Historical_Data.zip',
    entityLabel: { id: 'koin', en: 'coin' },
    ppy: () => 365,
    filterFields: [],
    entities: memoize(async () =>
      (await kCat()).items.map((m) => ({ id: m.ticker as string, name: COIN_NAMES[m.ticker as string] ?? (m.ticker as string), type: 'crypto', aliases: ((m.ticker_history as { ticker: string }[]) ?? []).map((t) => t.ticker), metrics: m })),
    ),
    series: async (id) => fromSeries(await store.json<SeriesFile>(`core/crypto/series/${id}.json`)),
    quality: async (id) => {
      const q = await kQual();
      return id ? { coin: q.tickers[id], notes: q.notes } : q.notes;
    },
    calendar: async () => null,
  };

  // ReksaDex (monthly NAV) ---------------------------------------------------------------
  const fCat = cat('core/reksa/catalog.json');
  const reksa: TsAdapter = {
    dex: 'reksadex',
    dataset: 'Mutual_Fund_Reksa_Dana_Dataset_in_Indonesia.zip',
    entityLabel: { id: 'reksa dana', en: 'fund' },
    ppy: () => 12,
    basisNote: { id: 'NAB/unit bulanan, tanpa pembagian hasil', en: 'monthly NAV/unit, excluding distributions' },
    filterFields: ['type', 'mi', 'ccy'],
    entities: memoize(async () => (await fCat()).items.map((m) => ({ id: m.slug as string, name: m.fund as string, type: m.type as string, aliases: [m.mi as string], metrics: m }))),
    series: async (id) => {
      const f = await store.json<{ d: string[]; nav: number[] }>(`heavy/reksa/funds/${id}.json`);
      return { d: f.d, price: f.nav, ret: f.nav };
    },
    quality: async () => store.json('core/reksa/quality.json'),
    calendar: async () => null,
  };

  return { 'finandex-ai': global, nasdaqdex: nasdaq, snp500dex: sp500, commercedex: commerce, idfinandex: idfin, rupiahdex: rupiah, idxdex: idx, cryptdex: crypto, reksadex: reksa };
}

/** Accent/case-insensitive entity search: exact id, then prefix, then substring on id/name/aliases. */
export function searchEntities(entities: Entity[], query: string, limit = 10): Entity[] {
  const q = normaliseKey(query).replace(/[^a-z0-9 ]/g, ' ').trim();
  const qq = normaliseKey(query);
  if (!qq) return [];
  const score = (e: Entity): number => {
    const keys = [e.id, e.name, ...e.aliases].map((k) => normaliseKey(k));
    if (keys.some((k) => k === qq)) return 0;
    if (keys.some((k) => k.startsWith(qq))) return 1;
    if (keys.some((k) => k.includes(qq))) return 2;
    if (q && keys.some((k) => k.replace(/[^a-z0-9 ]/g, ' ').includes(q))) return 3;
    return 9;
  };
  return entities
    .map((e) => ({ e, s: score(e) }))
    .filter((x) => x.s < 9)
    .sort((a, b) => a.s - b.s || (a.e.id < b.e.id ? -1 : 1))
    .slice(0, limit)
    .map((x) => x.e);
}
