// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for IDFinanDex (§9): Dashboard Makro · Aset · Tren Ter-normalisasi · Korelasi · Rezim Suku Bunga.
import { clean, int, L, list, type DexViews } from './types.ts';

const ASSETS = [
  { value: 'IHSG', label: 'IHSG' },
  { value: 'USDIDR', label: 'USD/IDR' },
  { value: 'GOLD', label: L('Emas', 'Gold') },
  { value: 'OIL', label: L('Minyak', 'Oil') },
  { value: 'SP500', label: 'S&P 500' },
  { value: 'VIX', label: 'VIX' },
];
const MARKET = ['IHSG', 'USDIDR', 'GOLD', 'OIL', 'SP500', 'VIX'];

export const views: DexViews = {
  macro: {
    intro: L(
      'CPI di dataset = inflasi tahunan (%), bukan indeks harga. BI rate dan suku bunga AS dalam persen.',
      'CPI in the dataset = annual inflation (%), not a price index. BI rate and US rate in percent.',
    ),
    controls: [
      {
        kind: 'text',
        key: 'start',
        label: L('Keputusan BI rate sejak (YYYY-MM-DD)', 'BI rate decisions since (YYYY-MM-DD)'),
        default: '2024-01-01',
      },
    ],
    calls: (v) => [
      { tool: 'rate_differential', input: {} },
      { tool: 'rate_decisions', input: clean({ start: v.start }) },
      { tool: 'macro_series', input: { indicator: 'CPI' } },
    ],
  },
  assets: {
    intro: L(
      'Hari libur diisi carry-forward dan dikecualikan dari return; bad print USD/IDR dibuang.',
      'Holidays are carry-forward rows and excluded from returns; USD/IDR bad prints are removed.',
    ),
    controls: [{ kind: 'select', key: 'id', label: L('Aset', 'Asset'), options: ASSETS, default: 'IHSG' }],
    entityKey: 'id',
    calls: (v) => [
      { tool: 'get_snapshot', input: { id: v.id } },
      { tool: 'get_history', input: { id: v.id } },
      { tool: 'drawdowns', input: { id: v.id } },
    ],
  },
  normalized: {
    intro: L(
      'Basis 100 pada tanggal awal; suku bunga & CPI adalah persentase sehingga tidak dinormalisasi.',
      'Base 100 at the start date; rates & CPI are percentages and are not normalised.',
    ),
    controls: [
      {
        kind: 'text',
        key: 'assets',
        label: L('Seri (2–6, pisahkan koma)', 'Series (2–6, comma-separated)'),
        default: 'IHSG, GOLD, SP500, USDIDR',
      },
      { kind: 'text', key: 'start', label: L('Mulai (YYYY-MM-DD)', 'Start (YYYY-MM-DD)'), default: '2010-01-04' },
    ],
    calls: (v) => [
      {
        tool: 'normalized_trend',
        input: clean({
          assets: list(v.assets)
            .map((a) => a.toUpperCase())
            .filter((a) => MARKET.includes(a))
            .slice(0, 6),
          start: v.start,
        }),
      },
    ],
  },
  correlation: {
    intro: L(
      'Korelasi return harian; hari carry-forward dikecualikan. Korelasi bukan kausalitas.',
      'Correlation of daily returns; carry-forward days excluded. Correlation is not causation.',
    ),
    controls: [
      {
        kind: 'select',
        key: 'years',
        label: L('Jendela', 'Window'),
        options: ['1', '3', '5'].map((y) => ({ value: y, label: L(`${y} tahun`, `${y} years`) })),
        default: '3',
      },
    ],
    calls: (v) => [{ tool: 'correlation', input: { ids: MARKET, years: int(v.years, 3) } }],
  },
  regime: {
    intro: L(
      'Deskripsi historis return per rezim BI rate atau tingkat VIX — bukan prediksi.',
      'Historical description of returns by BI-rate regime or VIX level — not a forecast.',
    ),
    controls: [
      {
        kind: 'select',
        key: 'asset',
        label: L('Aset', 'Asset'),
        options: ASSETS.filter((a) => a.value !== 'VIX'),
        default: 'IHSG',
      },
      {
        kind: 'select',
        key: 'by',
        label: L('Kelompokkan menurut', 'Group by'),
        options: [
          { value: 'bi_rate_direction', label: L('Arah BI rate', 'BI-rate direction') },
          { value: 'vix_bucket', label: L('Tingkat VIX', 'VIX bucket') },
        ],
        default: 'bi_rate_direction',
      },
    ],
    calls: (v) => [
      { tool: 'regime_returns', input: { asset: v.asset, by: v.by } },
      { tool: 'rate_differential', input: {} },
    ],
  },
};
