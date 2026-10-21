// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for ReksaDex (§9): Industri · Manajer Investasi · Cari Reksa Dana · Peringkat · Bank Kustodian.
import { clean, int, L, type DexViews } from './types.ts';

const TYPES = [
  { value: '', label: L('Semua jenis', 'All types') },
  { value: 'Equity Fund', label: L('Saham', 'Equity') },
  { value: 'Fixed Income Fund', label: L('Pendapatan Tetap', 'Fixed Income') },
  { value: 'Money Market Fund', label: L('Pasar Uang', 'Money Market') },
  { value: 'Mixed Asset Fund', label: L('Campuran', 'Mixed Asset') },
  { value: 'Capital Protected Fund', label: L('Terproteksi', 'Capital Protected') },
  { value: 'Index Fund', label: L('Indeks', 'Index') },
  { value: 'Exchanged Traded Fund', label: 'ETF' },
  { value: 'Global Fund', label: L('Global', 'Global') },
  { value: 'Sukuk Based Fund', label: L('Sukuk', 'Sukuk') },
];
const LIMIT = 'Snapshot bulanan; return tanpa pembagian hasil; produk USD dinilai dalam IDR.';
const LIMIT_EN = 'Monthly snapshots; returns exclude distributions; USD funds are valued in IDR.';

export const views: DexViews = {
  industry: {
    intro: L(
      `Total AUM, jumlah produk aktif, dan komposisi per jenis & mata uang. ${LIMIT}`,
      `Total AUM, active funds and composition by type & currency. ${LIMIT_EN}`,
    ),
    controls: [
      {
        kind: 'select',
        key: 'by',
        label: L('Tren AUM per', 'AUM trend by'),
        options: [
          { value: 'total', label: L('Total', 'Total') },
          { value: 'type', label: L('Jenis', 'Type') },
          { value: 'ccy', label: L('Mata uang', 'Currency') },
        ],
        default: 'total',
      },
      {
        kind: 'text',
        key: 'start',
        label: L('Mulai (YYYY-MM-DD)', 'Start (YYYY-MM-DD)'),
        default: '',
        placeholder: '2018-01-01',
      },
    ],
    calls: (v) => [
      { tool: 'industry_overview', input: {} },
      { tool: 'aum_trend', input: clean({ by: v.by, start: v.start }) },
    ],
  },
  managers: {
    intro: L(
      'Manajer investasi menurut AUM, porsi AUM, atau jumlah produk aktif pada snapshot terakhir.',
      'Investment managers by AUM, AUM share or number of active funds at the latest snapshot.',
    ),
    controls: [
      {
        kind: 'select',
        key: 'metric',
        label: L('Ukuran', 'Metric'),
        options: [
          { value: 'aum', label: 'AUM' },
          { value: 'share', label: L('Porsi AUM', 'AUM share') },
          { value: 'fund_count', label: L('Jumlah produk', 'Fund count') },
        ],
        default: 'aum',
      },
      {
        kind: 'text',
        key: 'mi',
        label: L('Tren AUM MI (nama, top-20)', 'Manager AUM trend (name, top 20)'),
        default: 'Manulife',
      },
    ],
    calls: (v) => [
      { tool: 'mi_leaderboard', input: { metric: v.metric, limit: 15 } },
      ...(v.mi ? [{ tool: 'aum_trend', input: { by: 'mi', mi: v.mi } }] : []),
    ],
  },
  search: {
    intro: L(
      `Detail satu reksa dana aktif: NAB/unit, AUM, return, dan return dalam USD. ${LIMIT}`,
      `Detail of one active fund: NAV/unit, AUM, returns and USD return. ${LIMIT_EN}`,
    ),
    entityKey: 'fund',
    controls: [
      {
        kind: 'text',
        key: 'fund',
        label: L('Nama / slug reksa dana', 'Fund name / slug'),
        default: 'reksa-dana-axa-obligasi-dollar',
      },
      {
        kind: 'select',
        key: 'months',
        label: L('Periode USD', 'USD period'),
        options: [
          { value: '12', label: L('12 bulan', '12 months') },
          { value: '36', label: L('36 bulan', '36 months') },
        ],
        default: '12',
      },
    ],
    calls: (v) => [
      { tool: 'fund_detail', input: { fund: v.fund } },
      { tool: 'fund_return_usd', input: { fund: v.fund, months: int(v.months, 12) === 36 ? 36 : 12 } },
    ],
  },
  ranking: {
    intro: L(
      'Peringkat historis reksa dana aktif — bukan rekomendasi investasi.',
      'Historical ranking of active funds — not investment advice.',
    ),
    controls: [
      {
        kind: 'select',
        key: 'metric',
        label: L('Ukuran', 'Metric'),
        options: [
          { value: 'aum', label: 'AUM' },
          { value: 'ret_1M', label: L('Return 1 bulan', '1M return') },
          { value: 'ret_YTD', label: 'Return YTD' },
          { value: 'ret_1Y', label: L('Return 1 tahun', '1Y return') },
          { value: 'ret_3Y', label: L('Return 3 tahun', '3Y return') },
          { value: 'vol_1Y', label: L('Volatilitas 1 tahun', '1Y volatility') },
        ],
        default: 'ret_1Y',
      },
      { kind: 'select', key: 'type', label: L('Jenis', 'Type'), options: TYPES, default: 'Equity Fund' },
      {
        kind: 'select',
        key: 'order',
        label: L('Urutan', 'Order'),
        options: [
          { value: 'desc', label: L('Tertinggi', 'Highest') },
          { value: 'asc', label: L('Terendah', 'Lowest') },
        ],
        default: 'desc',
      },
      {
        kind: 'select',
        key: 'ccy',
        label: L('Mata uang', 'Currency'),
        options: [
          { value: '', label: L('Semua', 'All') },
          { value: 'IDR', label: 'IDR' },
          { value: 'USD', label: 'USD' },
        ],
        default: '',
      },
    ],
    calls: (v) => [
      { tool: 'rank_funds', input: clean({ metric: v.metric, type: v.type, order: v.order, ccy: v.ccy, limit: 15 }) },
      ...(v.type
        ? [
            {
              tool: 'type_return_stats',
              input: { type: v.type, metric: v.metric === 'ret_YTD' || v.metric === 'ret_3Y' ? v.metric : 'ret_1Y' },
            },
          ]
        : []),
    ],
  },
  custodians: {
    intro: L(
      'Porsi AUM per bank kustodian pada snapshot terakhir.',
      'AUM share by custodian bank at the latest snapshot.',
    ),
    controls: [{ kind: 'text', key: 'limit', label: L('Jumlah bank', 'Number of banks'), default: '15' }],
    calls: (v) => [{ tool: 'custodian_share', input: { limit: Math.min(25, Math.max(1, int(v.limit, 15))) } }],
  },
};
