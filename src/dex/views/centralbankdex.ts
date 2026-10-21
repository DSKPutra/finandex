// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for CentralBankDex (§9): Neraca G3 · Suku Bunga & Kurva · Uang Beredar · Peta Negara · Label Rezim.
import { clean, L, type DexViews } from './types.ts';

const IND = [
  { value: 'broad_money_growth', label: L('Pertumbuhan uang beredar (%)', 'Broad money growth (%)') },
  { value: 'broad_money_pct_gdp', label: L('Uang beredar (% PDB)', 'Broad money (% of GDP)') },
  { value: 'policy_rate', label: L('Suku bunga kebijakan (%)', 'Policy rate (%)') },
  { value: 'cpi_yoy', label: L('Inflasi IHK (% yoy)', 'CPI inflation (% yoy)') },
];
const CARRIED = 'Nilai US/G3 harian dibawa antar-rilis resmi; titik perubahan yang dipakai.';
const CARRIED_EN = 'Daily US/G3 values are carried between official releases; change points are used.';

export const views: DexViews = {
  g3: {
    intro: L(
      `Neraca Fed (juta USD), ECB (juta EUR), BoJ (100 juta JPY), dan gabungan G3 (triliun USD) — satuan berbeda, jangan dicampur. ${CARRIED}`,
      `Balance sheets of the Fed (USD million), ECB (EUR million), BoJ (JPY 100 million) and G3 combined (USD trillion) — units differ, never mix them. ${CARRIED_EN}`,
    ),
    controls: [
      {
        kind: 'select',
        key: 'bank',
        label: L('Bank sentral', 'Central bank'),
        options: [
          { value: 'fed', label: 'The Fed' },
          { value: 'ecb', label: 'ECB' },
          { value: 'boj', label: 'BoJ' },
          { value: 'g3', label: L('Gabungan G3', 'G3 combined') },
        ],
        default: 'fed',
      },
      { kind: 'text', key: 'start', label: L('Mulai (YYYY-MM-DD)', 'Start (YYYY-MM-DD)'), default: '' },
    ],
    calls: (v) => [{ tool: 'balance_sheets', input: clean({ series: [v.bank || 'fed'], start: v.start }) }],
  },
  rates: {
    intro: L(
      `Suku bunga kebijakan AS, imbal hasil Treasury 10Y, spread 10Y−2Y (poin persentase), dan periode inversi kurva. ${CARRIED}`,
      `US policy rate, 10Y Treasury yield, 10Y−2Y spread (percentage points) and yield-curve inversion periods. ${CARRIED_EN}`,
    ),
    controls: [
      {
        kind: 'select',
        key: 'set',
        label: L('Seri', 'Series'),
        options: [
          { value: 'rates', label: L('Kebijakan & 10Y', 'Policy & 10Y') },
          { value: 'spread', label: L('Spread 10Y−2Y', '10Y−2Y spread') },
          { value: 'cpi', label: L('Inflasi IHK AS', 'US CPI inflation') },
        ],
        default: 'rates',
      },
      { kind: 'text', key: 'start', label: L('Mulai (YYYY-MM-DD)', 'Start (YYYY-MM-DD)'), default: '2000-01-01' },
    ],
    calls: (v) => [
      {
        tool: 'us_rates',
        input: clean({
          series:
            v.set === 'spread'
              ? ['spread_10y_2y']
              : v.set === 'cpi'
                ? ['cpi_yoy', 'policy']
                : ['policy', 'treasury_10y'],
          start: v.start,
        }),
      },
      { tool: 'yield_curve_inversions', input: clean({ start: v.start }) },
    ],
  },
  money: {
    intro: L(
      'M2 AS (miliar USD) dan indikator uang beredar tahunan World Bank per negara (agregat WB bukan negara).',
      'US M2 (USD billion) and annual World Bank money indicators per country (WB aggregates are not countries).',
    ),
    entityKey: 'country',
    controls: [
      { kind: 'text', key: 'country', label: L('Negara (nama/ISO3)', 'Country (name/ISO3)'), default: 'IDN' },
      {
        kind: 'select',
        key: 'indicator',
        label: L('Indikator', 'Indicator'),
        options: IND.slice(0, 2),
        default: 'broad_money_growth',
      },
    ],
    calls: (v) => [
      { tool: 'us_rates', input: { series: ['m2'] } },
      { tool: 'country_money', input: { country: v.country || 'IDN', indicator: v.indicator } },
    ],
  },
  countries: {
    intro: L(
      'Peringkat negara menurut indikator uang tahunan World Bank; agregat (WLD, EAS, IDA, …) dikeluarkan kecuali dipilih.',
      'Countries ranked by an annual World Bank money indicator; aggregates (WLD, EAS, IDA, …) are excluded unless chosen.',
    ),
    controls: [
      {
        kind: 'select',
        key: 'indicator',
        label: L('Indikator', 'Indicator'),
        options: IND,
        default: 'broad_money_growth',
      },
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
      { kind: 'text', key: 'year', label: L('Tahun', 'Year'), default: '' },
      {
        kind: 'select',
        key: 'agg',
        label: L('Agregat WB', 'WB aggregates'),
        options: [
          { value: '', label: L('Dikeluarkan', 'Excluded') },
          { value: 'yes', label: L('Disertakan', 'Included') },
        ],
        default: '',
      },
    ],
    calls: (v) => {
      const y = Number(v.year);
      return [
        {
          tool: 'rank_countries',
          input: clean({
            indicator: v.indicator,
            order: v.order,
            year: v.year && Number.isInteger(y) && y >= 1960 && y <= 2030 ? y : '',
            include_aggregates: v.agg === 'yes' ? true : '',
            limit: 25,
          }),
        },
      ];
    },
  },
  regimes: {
    intro: L(
      'Label rezim moneter, kurva imbal hasil, dan tingkat stres yang DIBUAT PENYEDIA DATASET — label penyedia, bukan data resmi. Ditampilkan bersama spread 10Y−2Y.',
      'Monetary-policy, yield-curve and stress regime labels GENERATED BY THE DATASET PROVIDER — provider labels, not official data. Shown with the 10Y−2Y spread.',
    ),
    controls: [
      { kind: 'text', key: 'start', label: L('Mulai (YYYY-MM-DD)', 'Start (YYYY-MM-DD)'), default: '2015-01-01' },
      { kind: 'text', key: 'end', label: L('Sampai (YYYY-MM-DD)', 'End (YYYY-MM-DD)'), default: '' },
    ],
    calls: (v) => [
      { tool: 'provider_labels', input: clean({ start: v.start, end: v.end }) },
      { tool: 'us_rates', input: clean({ series: ['spread_10y_2y', 'policy'], start: v.start, end: v.end }) },
    ],
  },
};
