// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for InflationDex (§9): Peta Inflasi · Peringkat · Biaya Barang · Wilayah & Pendapatan.
import { list, L, type DexViews } from './types.ts';

const YEARS = 'Tahun inflasi berbeda per negara (selalu ditampilkan di samping nilai).';
const YEARS_EN = 'The inflation year differs per country (always shown next to the value).';
const REGIONS = [
  'Latin America & Caribbean',
  'Middle East, North Africa, Afghanistan & Pakistan',
  'Sub-Saharan Africa',
  'Europe & Central Asia',
  'East Asia & Pacific',
  'South Asia',
  'North America',
];
const INCOME = ['High income', 'Upper middle income', 'Lower middle income', 'Low income'];
const all = { value: '', label: L('Semua', 'All') };

export const views: DexViews = {
  map: {
    intro: L(
      `Inflasi tahunan terbaru untuk 179 negara. ${YEARS}`,
      `Latest annual inflation for 179 countries. ${YEARS_EN}`,
    ),
    controls: [
      {
        kind: 'text',
        key: 'countries',
        label: L('Negara (pisahkan koma)', 'Countries (comma-separated)'),
        default: 'Indonesia, Malaysia, Thailand, Philippines, Singapore',
      },
    ],
    calls: (v) => [
      {
        tool: 'country_inflation',
        input: { countries: list(v.countries).slice(0, 10).length ? list(v.countries).slice(0, 10) : ['Indonesia'] },
      },
      { tool: 'rank_countries', input: { metric: 'inflation_annual_pct', order: 'desc', limit: 30 } },
    ],
  },
  ranking: {
    intro: L(
      `Peringkat negara menurut inflasi atau indeks biaya hidup. Indeks biaya hidup & harga barang hanya untuk 45 negara. ${YEARS}`,
      `Countries ranked by inflation or cost-of-living indices. Cost-of-living indices & item prices cover only 45 countries. ${YEARS_EN}`,
    ),
    controls: [
      {
        kind: 'select',
        key: 'metric',
        label: L('Metrik', 'Metric'),
        options: [
          { value: 'inflation_annual_pct', label: L('Inflasi tahunan', 'Annual inflation') },
          { value: 'cost_living_index', label: L('Indeks biaya hidup', 'Cost-of-living index') },
          { value: 'rent_index', label: L('Indeks sewa', 'Rent index') },
          { value: 'groceries_index', label: L('Indeks belanja dapur', 'Groceries index') },
          { value: 'restaurants_index', label: L('Indeks restoran', 'Restaurants index') },
          { value: 'purchasing_power_index', label: L('Indeks daya beli', 'Purchasing power index') },
        ],
        default: 'inflation_annual_pct',
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
    ],
    calls: (v) => [{ tool: 'rank_countries', input: { metric: v.metric, order: v.order, limit: 20 } }],
  },
  items: {
    intro: L(
      'Harga barang (roti, tiket transport bulanan, sewa, utilitas dalam USD) — hanya 45 negara.',
      'Item prices (bread, monthly transport pass, rent, utilities in USD) — only 45 countries.',
    ),
    controls: [
      {
        kind: 'text',
        key: 'countries',
        label: L('Negara (pisahkan koma, maks. 8)', 'Countries (comma-separated, max 8)'),
        default: 'Indonesia, Malaysia, Singapore, Thailand',
      },
      {
        kind: 'select',
        key: 'metric',
        label: L('Peringkat barang', 'Item ranking'),
        options: [
          { value: 'rent_monthly_usd', label: L('Sewa bulanan', 'Monthly rent') },
          { value: 'bread_price_usd', label: L('Harga roti', 'Bread price') },
          { value: 'transport_monthly_pass_usd', label: L('Tiket transport bulanan', 'Monthly transport pass') },
          { value: 'utilities_monthly_usd', label: L('Utilitas bulanan', 'Monthly utilities') },
        ],
        default: 'rent_monthly_usd',
      },
    ],
    calls: (v) => [
      {
        tool: 'cost_items',
        input: { countries: list(v.countries).slice(0, 8).length ? list(v.countries).slice(0, 8) : ['Indonesia'] },
      },
      { tool: 'rank_countries', input: { metric: v.metric, order: 'desc', limit: 20 } },
    ],
  },
  regions: {
    intro: L(
      `Median inflasi per wilayah atau kelompok pendapatan Bank Dunia. ${YEARS}`,
      `Median inflation by World Bank region or income group. ${YEARS_EN}`,
    ),
    controls: [
      {
        kind: 'select',
        key: 'group_by',
        label: L('Kelompokkan', 'Group by'),
        options: [
          { value: 'region', label: L('Wilayah', 'Region') },
          { value: 'income_level', label: L('Kelompok pendapatan', 'Income level') },
          { value: 'none', label: L('Semua negara', 'All countries') },
        ],
        default: 'region',
      },
      {
        kind: 'select',
        key: 'region',
        label: L('Filter wilayah', 'Region filter'),
        options: [all, ...REGIONS.map((r) => ({ value: r, label: r }))],
        default: '',
      },
      {
        kind: 'select',
        key: 'income_level',
        label: L('Filter pendapatan', 'Income filter'),
        options: [all, ...INCOME.map((r) => ({ value: r, label: r }))],
        default: '',
      },
    ],
    calls: (v) => [
      { tool: 'inflation_stats', input: { group_by: v.group_by } },
      {
        tool: 'rank_countries',
        input: {
          metric: 'inflation_annual_pct',
          order: 'desc',
          limit: 20,
          ...(v.region ? { region: v.region } : {}),
          ...(v.income_level ? { income_level: v.income_level } : {}),
        },
      },
    ],
  },
};
