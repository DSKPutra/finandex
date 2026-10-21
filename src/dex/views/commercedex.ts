// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for CommerceDex (§9): Peta Global · Perusahaan · Fundamental · Indeks E-Commerce · Makro.
import { clean, L, list, type DexViews } from './types.ts';

const PEER_METRICS = [
  { value: 'ret_1Y', label: L('Return 1 tahun', '1Y return') },
  { value: 'ret_YTD', label: L('Return YTD', 'YTD return') },
  { value: 'ret_3Y', label: L('Return 3 tahun', '3Y return') },
  { value: 'ret_5Y', label: L('Return 5 tahun', '5Y return') },
  { value: 'vol_1Y', label: L('Volatilitas 1 tahun', '1Y volatility') },
  { value: 'mdd', label: L('Drawdown maksimum', 'Max drawdown') },
  { value: 'fin_net_margin', label: L('Margin bersih', 'Net margin') },
  { value: 'fin_operating_margin', label: L('Margin operasi', 'Operating margin') },
  { value: 'fin_revenue_yoy', label: L('Pertumbuhan pendapatan', 'Revenue growth') },
];
const FIN = [
  { value: 'total_revenue', label: L('Pendapatan', 'Revenue') },
  { value: 'net_income', label: L('Laba bersih', 'Net income') },
  { value: 'net_margin', label: L('Margin bersih', 'Net margin') },
  { value: 'operating_margin', label: L('Margin operasi', 'Operating margin') },
  { value: 'free_cash_flow', label: L('Arus kas bebas', 'Free cash flow') },
  { value: 'total_assets', label: L('Total aset', 'Total assets') },
];
const INDICATORS = [
  { value: 'internet_users_pct', label: L('Pengguna internet (% populasi)', 'Internet users (% of population)') },
  { value: 'gdp_per_capita_usd', label: L('PDB per kapita (USD)', 'GDP per capita (USD)') },
  { value: 'gdp_total_usd', label: L('PDB total (USD)', 'Total GDP (USD)') },
  { value: 'population_total', label: L('Populasi', 'Population') },
  { value: 'urban_population_pct', label: L('Populasi perkotaan (%)', 'Urban population (%)') },
  { value: 'mobile_subs_per_100', label: L('Langganan seluler per 100', 'Mobile subscriptions per 100') },
  { value: 'account_ownership_pct_adult', label: L('Kepemilikan rekening (% dewasa)', 'Account ownership (% adults)') },
  { value: 'fdi_inflow_pct_gdp', label: L('Arus masuk FDI (% PDB)', 'FDI inflow (% of GDP)') },
];
const COUNTRIES = ['ID', 'US', 'CN', 'IN', 'JP', 'KR', 'SG', 'BR', 'AR', 'CA', 'DE', 'GB', 'PL'].map((c) => ({
  value: c,
  label: c,
}));

export const views: DexViews = {
  map: {
    intro: L(
      '43 perusahaan e-commerce per negara dan wilayah (median). Bias survivorship: hanya perusahaan yang masih tercatat.',
      '43 e-commerce companies by country and region (median). Survivorship bias: only companies still listed.',
    ),
    controls: [
      { kind: 'select', key: 'metric', label: L('Metrik', 'Metric'), options: PEER_METRICS, default: 'ret_1Y' },
    ],
    calls: (v) => [
      { tool: 'peer_compare', input: { group: 'country_code', metric: v.metric } },
      { tool: 'peer_compare', input: { group: 'region', metric: v.metric } },
    ],
  },
  companies: {
    intro: L(
      'Harga saham dalam mata uang listing; profil dari Wikipedia (CC BY-SA 4.0).',
      'Share prices in the listing currency; profiles from Wikipedia (CC BY-SA 4.0).',
    ),
    controls: [
      {
        kind: 'text',
        key: 'id',
        label: L('Perusahaan (id)', 'Company (id)'),
        default: 'amazon',
        placeholder: 'amazon, alibaba, sea, gotogroup',
      },
      {
        kind: 'select',
        key: 'segment_metric',
        label: L('Bandingkan segmen menurut', 'Compare segments by'),
        options: PEER_METRICS,
        default: 'ret_1Y',
      },
    ],
    entityKey: 'id',
    calls: (v) => [
      { tool: 'get_snapshot', input: { id: v.id || 'amazon' } },
      { tool: 'get_history', input: { id: v.id || 'amazon' } },
      { tool: 'drawdowns', input: { id: v.id || 'amazon' } },
      { tool: 'peer_compare', input: { group: 'segment', metric: v.segment_metric } },
    ],
  },
  fundamentals: {
    intro: L(
      'Laporan keuangan ±4 tahun. Alibaba, JD.com, PDD, Vipshop melapor dalam CNY dan StoneCo dalam BRL — jangan bandingkan angka absolut lintas mata uang; margin sebanding.',
      'About 4 years of statements. Alibaba, JD.com, PDD, Vipshop report in CNY and StoneCo in BRL — do not compare absolute amounts across currencies; margins are comparable.',
    ),
    controls: [
      {
        kind: 'text',
        key: 'ids',
        label: L('Perusahaan (1–5, pisahkan koma)', 'Companies (1–5, comma-separated)'),
        default: 'amazon, alibaba, sea',
      },
      { kind: 'select', key: 'metric', label: L('Metrik utama', 'Main metric'), options: FIN, default: 'net_margin' },
    ],
    calls: (v) => [
      {
        tool: 'financials',
        input: { ids: list(v.ids).slice(0, 5), metrics: [...new Set([v.metric!, 'total_revenue', 'net_income'])] },
      },
    ],
  },
  index: {
    intro: L(
      'Indeks e-commerce dari dataset (equal-weight, rebalance harian, basis 100 = 5 Jan 2015); hari dengan konstituen berkurang ditandai parsial.',
      'Dataset e-commerce index (equal-weight, daily rebalanced, base 100 = 5 Jan 2015); days with missing constituents are flagged partial.',
    ),
    controls: [
      {
        kind: 'text',
        key: 'id',
        label: L('Bandingkan dengan (opsional)', 'Compare with (optional)'),
        default: '',
        placeholder: 'amazon',
      },
    ],
    calls: (v) => [{ tool: 'index_compare', input: clean({ id: v.id }) }],
  },
  macro: {
    intro: L(
      'Indikator World Bank (CC BY 4.0) sebagaimana di dataset, 2010–2025.',
      'World Bank indicators (CC BY 4.0) as provided in the dataset, 2010–2025.',
    ),
    controls: [
      { kind: 'select', key: 'country', label: L('Negara', 'Country'), options: COUNTRIES, default: 'ID' },
      {
        kind: 'select',
        key: 'indicator',
        label: L('Indikator', 'Indicator'),
        options: INDICATORS,
        default: 'internet_users_pct',
      },
    ],
    calls: (v) => [{ tool: 'macro', input: { country_code: v.country, indicator: v.indicator } }],
  },
};
