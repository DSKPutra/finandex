// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Shared tab views for the news-coverage Dex (PopulationDex, HomelessnessDex, HousingDex).
import { clean, L, type DexViews } from './types.ts';

const NOTE = L(
  'Yang diukur adalah liputan berita, bukan jumlah kejadian di dunia nyata. Bulan terakhir parsial.',
  'This measures news coverage, not real-world counts. The latest month is partial.',
);

export const newsViews: DexViews = {
  trend: {
    intro: NOTE,
    controls: [
      {
        kind: 'select',
        key: 'granularity',
        label: L('Periode', 'Granularity'),
        options: [
          { value: 'month', label: L('Bulanan', 'Monthly') },
          { value: 'year', label: L('Tahunan', 'Yearly') },
        ],
        default: 'month',
      },
      {
        kind: 'select',
        key: 'measure',
        label: L('Ukuran', 'Measure'),
        options: [
          { value: 'per_10k_news', label: L('Per 10.000 berita', 'Per 10,000 news articles') },
          { value: 'articles', label: L('Jumlah artikel', 'Articles') },
        ],
        default: 'per_10k_news',
      },
    ],
    calls: (v) => [
      { tool: 'coverage_trend', input: { granularity: v.granularity, measure: v.measure } },
      { tool: 'tone_breakdown', input: { scope: 'by_year' } },
    ],
  },
  geo: {
    intro: NOTE,
    controls: [
      {
        kind: 'select',
        key: 'level',
        label: L('Tingkat', 'Level'),
        options: [
          { value: 'country', label: L('Negara', 'Country') },
          { value: 'city', label: L('Kota', 'City') },
          { value: 'continent', label: L('Benua', 'Continent') },
          { value: 'us_state', label: L('Negara bagian AS', 'US state') },
          { value: 'india_state', label: L('Negara bagian India', 'Indian state') },
        ],
        default: 'country',
      },
      {
        kind: 'select',
        key: 'sort',
        label: L('Urut menurut', 'Sort by'),
        options: [
          { value: 'articles_2023_2026', label: L('Artikel', 'Articles') },
          { value: 'share_pct', label: L('Porsi', 'Share') },
          { value: 'lift', label: 'Lift' },
        ],
        default: 'articles_2023_2026',
      },
    ],
    calls: (v) => [
      { tool: 'coverage_geo', input: { level: v.level, sort_by: v.sort, limit: 20 } },
      { tool: 'tone_breakdown', input: { scope: 'by_country' } },
    ],
  },
  themes: {
    controls: [{ kind: 'text', key: 'q', label: L('Saring tema', 'Filter themes'), default: '' }],
    calls: (v) => [
      { tool: 'themes', input: clean({ query: v.q, limit: 20 }) },
      { tool: 'organisations', input: { limit: 20 } },
    ],
  },
  research: {
    calls: () => [
      { tool: 'research_trend', input: {} },
      { tool: 'patents', input: { view: 'by_year' } },
      { tool: 'patents', input: { view: 'by_office' } },
      { tool: 'top_papers', input: { limit: 10 } },
    ],
  },
  findings: {
    intro: L(
      'Temuan ditulis oleh penyedia data (grade A/B/C), bukan perhitungan Finandex.',
      'Findings are written by the data provider (grade A/B/C), not computed by Finandex.',
    ),
    controls: [{ kind: 'text', key: 'q', label: L('Cari', 'Search'), default: '' }],
    calls: (v) => [{ tool: 'provider_findings', input: clean({ query: v.q }) }],
  },
};
