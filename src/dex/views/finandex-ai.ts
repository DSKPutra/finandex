// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for Finandex AI (§9): Pasar Global · Bandingkan · Korelasi · Kalender Return · Peristiwa.
import { GLOBAL_EVENTS } from '../../../server/dex/ts-adapters.ts';
import { clean, int, L, list, type DexViews } from './types.ts';

const METRICS = [
  { value: 'ret_YTD', label: L('Return YTD', 'YTD return') },
  { value: 'ret_1M', label: L('Return 1 bulan', '1M return') },
  { value: 'ret_1Y', label: L('Return 1 tahun', '1Y return') },
  { value: 'ret_5Y', label: L('Return 5 tahun', '5Y return') },
  { value: 'cagr_10Y', label: L('CAGR 10 tahun', '10Y CAGR') },
  { value: 'vol_1Y', label: L('Volatilitas 1 tahun', '1Y volatility') },
  { value: 'mdd', label: L('Drawdown maksimum', 'Max drawdown') },
  { value: 'pct_from_ath', label: L('Jarak dari ATH', 'Distance from ATH') },
];
const ALL = { value: '', label: L('Semua', 'All') };
const TYPES = [ALL, ...['Stock Index', 'Commodity', 'Cryptocurrency', 'Currency'].map((v) => ({ value: v, label: v }))];
const REGIONS = [ALL, ...['Americas', 'Europe', 'Asia-Pacific', 'Global'].map((v) => ({ value: v, label: v }))];
const PERIODS = ['1M', '3M', 'YTD', '1Y', '3Y', '5Y', '10Y', 'MAX'].map((v) => ({ value: v, label: v }));
const ORDER = [
  { value: 'desc', label: L('Tertinggi', 'Highest') },
  { value: 'asc', label: L('Terendah', 'Lowest') },
];

export const views: DexViews = {
  markets: {
    intro: L(
      '34 aset global (indeks, komoditas, kripto, mata uang). Tidak ada IHSG/IDR (lihat IDFinanDex/RupiahDex); JPY/INR presisi rendah; bar FX bisa bergeser 1 hari.',
      '34 global assets (indices, commodities, crypto, currencies). No IHSG/IDR (see IDFinanDex/RupiahDex); JPY/INR are low precision; FX bars may shift by one day.',
    ),
    controls: [
      { kind: 'select', key: 'metric', label: L('Metrik', 'Metric'), options: METRICS, default: 'ret_YTD' },
      { kind: 'select', key: 'order', label: L('Urutan', 'Order'), options: ORDER, default: 'desc' },
      { kind: 'select', key: 'type', label: L('Kategori', 'Category'), options: TYPES, default: '' },
      { kind: 'select', key: 'region', label: L('Wilayah', 'Region'), options: REGIONS, default: '' },
      {
        kind: 'text',
        key: 'id',
        label: L('Aset (simbol)', 'Asset (symbol)'),
        default: '^GSPC',
        placeholder: '^GSPC, GC=F, BTC-USD',
      },
    ],
    entityKey: 'id',
    calls: (v) => [
      {
        tool: 'rank',
        input: clean({
          metric: v.metric,
          order: v.order,
          limit: 25,
          filter: v.type
            ? { field: 'asset_type', value: v.type }
            : v.region
              ? { field: 'geo_region', value: v.region }
              : undefined,
        }),
      },
      { tool: 'get_snapshot', input: { id: v.id || '^GSPC' } },
      { tool: 'get_history', input: { id: v.id || '^GSPC' } },
    ],
  },
  compare: {
    intro: L(
      'Return dibandingkan setelah rebase ke 100 pada tanggal awal yang sama.',
      'Returns compared after rebasing to 100 on a common start date.',
    ),
    controls: [
      {
        kind: 'text',
        key: 'ids',
        label: L('Aset (2–5, pisahkan koma)', 'Assets (2–5, comma-separated)'),
        default: 'GC=F, BTC-USD, ^GSPC',
      },
      { kind: 'select', key: 'period', label: L('Periode', 'Period'), options: PERIODS, default: '5Y' },
    ],
    calls: (v) => [{ tool: 'compare', input: { ids: list(v.ids).slice(0, 5), period: v.period } }],
  },
  correlation: {
    intro: L(
      'Korelasi return harian pada tanggal yang sama; korelasi bukan kausalitas.',
      'Correlation of daily returns on common dates; correlation is not causation.',
    ),
    controls: [
      {
        kind: 'text',
        key: 'ids',
        label: L('Aset (2–8, pisahkan koma)', 'Assets (2–8, comma-separated)'),
        default: '^GSPC, ^GDAXI, ^FTSE, ^N225, GC=F, BTC-USD',
      },
      {
        kind: 'select',
        key: 'years',
        label: L('Jendela', 'Window'),
        options: ['1', '3', '5'].map((y) => ({ value: y, label: L(`${y} tahun`, `${y} years`) })),
        default: '3',
      },
    ],
    calls: (v) => [{ tool: 'correlation', input: { ids: list(v.ids).slice(0, 8), years: int(v.years, 3) } }],
  },
  calendar: {
    intro: L(
      'Return per tahun kalender; tahun berjalan ditandai parsial.',
      'Calendar-year returns; the current year is flagged partial.',
    ),
    controls: [
      {
        kind: 'text',
        key: 'ids',
        label: L('Aset (1–8, pisahkan koma)', 'Assets (1–8, comma-separated)'),
        default: '^GSPC, ^IXIC, GC=F, CL=F, BTC-USD',
      },
      { kind: 'text', key: 'from', label: L('Dari tahun', 'From year'), default: '2010' },
    ],
    calls: (v) => [
      {
        tool: 'calendar_returns',
        input: clean({ ids: list(v.ids).slice(0, 8), from_year: v.from ? int(v.from, 2010) : undefined }),
      },
    ],
  },
  events: {
    intro: L(
      'Hanya peristiwa dengan tanggal terverifikasi; jendela −5…+20 hari bursa.',
      'Only events with verified dates; window −5…+20 trading days.',
    ),
    controls: [
      {
        kind: 'select',
        key: 'event',
        label: L('Peristiwa', 'Event'),
        options: GLOBAL_EVENTS.map((e) => ({ value: e.id, label: e.label })),
        default: 'lehman_2008',
      },
      {
        kind: 'text',
        key: 'ids',
        label: L('Aset (1–6, pisahkan koma)', 'Assets (1–6, comma-separated)'),
        default: '^GSPC, GC=F, CL=F, EURUSD=X',
      },
    ],
    calls: (v) => [{ tool: 'event_window', input: { symbols: list(v.ids).slice(0, 6), event_id: v.event } }],
  },
};
