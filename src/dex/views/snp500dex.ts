// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for SnP500Dex (§9): Pulse · Dividen · Simulator · Screener · Volume & Likuiditas.
import { L, type DexViews } from './types.ts';

const ORDER = [
  { value: 'desc', label: L('Tertinggi', 'Highest') },
  { value: 'asc', label: L('Terendah', 'Lowest') },
];
const SCREEN = [
  { value: 'ttm_yield', label: L('Dividend yield TTM', 'TTM dividend yield') },
  {
    value: 'dividend_increase_streak_years',
    label: L('Streak kenaikan dividen (tahun)', 'Dividend increase streak (years)'),
  },
  { value: 'ret_YTD', label: L('Return YTD', 'YTD return') },
  { value: 'ret_1Y', label: L('Return 1 tahun', '1Y return') },
  { value: 'ret_5Y', label: L('Return 5 tahun', '5Y return') },
  { value: 'vol_1Y', label: L('Volatilitas 1 tahun', '1Y volatility') },
  { value: 'beta_3Y', label: L('Beta 3 tahun', '3Y beta') },
  { value: 'mdd', label: L('Drawdown maksimum', 'Max drawdown') },
];
const PENDING = L(
  'Data S&P 500 belum diunggah (status pending-data). ',
  'S&P 500 data has not been uploaded yet (pending-data). ',
);
const pre = (l: { id: string; en: string }) => L(PENDING.id + l.id, PENDING.en + l.en);
const tk = (s: string | undefined, d: string) => (s || d).trim().toUpperCase();

export const views: DexViews = {
  pulse: {
    intro: pre(
      L(
        '233 dari ±500 konstituen; benchmark ^GSPC adalah indeks harga (tanpa dividen).',
        '233 of ~500 constituents; the ^GSPC benchmark is a price index (no dividends).',
      ),
    ),
    calls: () => [{ tool: 'pulse', input: {} }],
  },
  dividends: {
    intro: pre(
      L(
        'Riwayat dividen tunai dan split; total return memakai Adj Close.',
        'Cash dividend and split history; total return uses Adj Close.',
      ),
    ),
    controls: [{ kind: 'text', key: 'ticker', label: L('Ticker', 'Ticker'), default: 'KO' }],
    entityKey: 'ticker',
    calls: (v) => [
      { tool: 'dividends', input: { ticker: tk(v.ticker, 'KO') } },
      { tool: 'total_vs_price_return', input: { ticker: tk(v.ticker, 'KO') } },
      { tool: 'splits', input: { ticker: tk(v.ticker, 'KO') } },
    ],
  },
  simulator: {
    intro: pre(
      L(
        'Simulasi historis dengan dan tanpa reinvestasi dividen (DRIP) — bukan rekomendasi; kinerja masa lalu tidak menjamin masa depan.',
        'Historical simulation with and without dividend reinvestment (DRIP) — not a recommendation; past performance does not guarantee future results.',
      ),
    ),
    controls: [
      { kind: 'text', key: 'ticker', label: L('Ticker', 'Ticker'), default: 'KO' },
      { kind: 'text', key: 'start', label: L('Mulai (YYYY-MM-DD)', 'Start (YYYY-MM-DD)'), default: '2000-01-03' },
      { kind: 'text', key: 'amount', label: L('Jumlah (USD)', 'Amount (USD)'), default: '10000' },
    ],
    entityKey: 'ticker',
    calls: (v) => [
      {
        tool: 'simulate_investment',
        input: {
          ticker: tk(v.ticker, 'KO'),
          start: v.start || '2000-01-03',
          amount_usd: Math.max(1, Number(v.amount) || 10000),
        },
      },
    ],
  },
  screener: {
    intro: pre(
      L('Saham EA dan beberapa lainnya memiliki riwayat pendek.', 'EA and some other stocks have a short history.'),
    ),
    controls: [
      { kind: 'select', key: 'metric', label: L('Metrik', 'Metric'), options: SCREEN, default: 'ttm_yield' },
      { kind: 'select', key: 'order', label: L('Urutan', 'Order'), options: ORDER, default: 'desc' },
    ],
    calls: (v) => [{ tool: 'rank', input: { metric: v.metric, order: v.order, limit: 25 } }],
  },
  volume: {
    intro: pre(
      L(
        'Volume dan nilai transaksi (USD) sebagai gambaran likuiditas.',
        'Volume and traded value (USD) as a liquidity picture.',
      ),
    ),
    controls: [{ kind: 'text', key: 'ticker', label: L('Ticker', 'Ticker'), default: 'AAPL' }],
    entityKey: 'ticker',
    calls: (v) => [
      { tool: 'volume_profile', input: { ticker: tk(v.ticker, 'AAPL') } },
      { tool: 'rank', input: { metric: 'avg_dollar_volume_20d', order: 'desc', limit: 25 } },
    ],
  },
};
