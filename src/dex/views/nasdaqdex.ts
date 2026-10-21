// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for NASDAQDex (§9): Pulse · Screener · Growth Lab · Teknikal · Bandingkan.
import { L, list, type DexViews } from './types.ts';

const ORDER = [
  { value: 'desc', label: L('Tertinggi', 'Highest') },
  { value: 'asc', label: L('Terendah', 'Lowest') },
];
const SCREEN = [
  { value: 'ret_YTD', label: L('Return YTD', 'YTD return') },
  { value: 'ret_1M', label: L('Return 1 bulan', '1M return') },
  { value: 'ret_1Y', label: L('Return 1 tahun', '1Y return') },
  { value: 'ret_5Y', label: L('Return 5 tahun', '5Y return') },
  { value: 'vol_1Y', label: L('Volatilitas 1 tahun', '1Y volatility') },
  { value: 'mdd', label: L('Drawdown maksimum', 'Max drawdown') },
  { value: 'beta_3Y', label: L('Beta 3 tahun vs ^IXIC', '3Y beta vs ^IXIC') },
];
const GROWTH = [
  { value: 'multiple_MAX', label: L('Kelipatan sejak awal', 'Multiple since start') },
  { value: 'cagr_5Y', label: L('CAGR 5 tahun', '5Y CAGR') },
  { value: 'cagr_10Y', label: L('CAGR 10 tahun', '10Y CAGR') },
  { value: 'pct_from_ath', label: L('Jarak dari ATH', 'Distance from ATH') },
];
const PERIODS = ['1M', 'YTD', '1Y', '3Y', '5Y', '10Y', 'MAX'].map((v) => ({ value: v, label: v }));
const PENDING = L(
  'Data NASDAQ belum diunggah (status pending-data). ',
  'NASDAQ data has not been uploaded yet (pending-data). ',
);
const pre = (l: { id: string; en: string }) => L(PENDING.id + l.id, PENDING.en + l.en);

export const views: DexViews = {
  pulse: {
    intro: pre(
      L(
        'Breadth pasar dan indeks equal-weight vs ^IXIC; indeks EW bias survivorship.',
        'Market breadth and the equal-weight index vs ^IXIC; the EW index has survivorship bias.',
      ),
    ),
    calls: () => [{ tool: 'pulse', input: {} }],
  },
  screener: {
    intro: pre(
      L(
        'Harga ter-adjust sumber; tanpa volume & dividen (dividen → SnP500Dex).',
        'Source-adjusted prices; no volume & dividends (dividends → SnP500Dex).',
      ),
    ),
    controls: [
      { kind: 'select', key: 'metric', label: L('Metrik', 'Metric'), options: SCREEN, default: 'ret_YTD' },
      { kind: 'select', key: 'order', label: L('Urutan', 'Order'), options: ORDER, default: 'desc' },
    ],
    calls: (v) => [{ tool: 'rank', input: { metric: v.metric, order: v.order, limit: 25 } }],
  },
  growth: {
    intro: pre(
      L(
        'Pertumbuhan jangka panjang; perhatikan `reliable_from` dan flag nilai ekstrem.',
        'Long-run growth; mind `reliable_from` and extreme-value flags.',
      ),
    ),
    controls: [
      { kind: 'select', key: 'metric', label: L('Metrik', 'Metric'), options: GROWTH, default: 'multiple_MAX' },
      {
        kind: 'text',
        key: 'start',
        label: L('Peringkat periode sejak (YYYY-MM-DD)', 'Period ranking since (YYYY-MM-DD)'),
        default: '2020-01-02',
      },
    ],
    calls: (v) => [
      { tool: 'rank', input: { metric: v.metric, order: 'desc', limit: 25 } },
      ...(v.start ? [{ tool: 'period_rank', input: { start: v.start, limit: 20 } }] : []),
    ],
  },
  technical: {
    intro: pre(
      L(
        'SMA50/200, RSI14 dan golden/death cross — deskriptif, bukan sinyal beli/jual.',
        'SMA50/200, RSI14 and golden/death crosses — descriptive, not buy/sell signals.',
      ),
    ),
    controls: [{ kind: 'text', key: 'ticker', label: L('Ticker', 'Ticker'), default: 'AAPL' }],
    entityKey: 'ticker',
    calls: (v) => [
      { tool: 'technical', input: { ticker: (v.ticker || 'AAPL').toUpperCase() } },
      { tool: 'get_history', input: { id: (v.ticker || 'AAPL').toUpperCase() } },
    ],
  },
  compare: {
    controls: [
      {
        kind: 'text',
        key: 'ids',
        label: L('Ticker (2–5, pisahkan koma)', 'Tickers (2–5, comma-separated)'),
        default: 'AAPL, MSFT, GOOGL',
      },
      { kind: 'select', key: 'period', label: L('Periode', 'Period'), options: PERIODS, default: '10Y' },
    ],
    calls: (v) => [
      {
        tool: 'compare',
        input: {
          ids: list(v.ids)
            .map((x) => x.toUpperCase())
            .slice(0, 5),
          period: v.period,
        },
      },
    ],
  },
};
