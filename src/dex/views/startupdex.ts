// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for StartupDex (§9): Ringkasan · Tahapan · Negara & Sektor · Mega-round · Cari Putaran.
import { clean, int, L, type DexViews } from './types.ts';

const LIMITS = L(
  'Sampel 25% putaran 2019–2026; nominal dari berita (verified / unchecked). Bukan rekomendasi investasi.',
  '25% sample of 2019–2026 rounds; amounts from news (verified / unchecked). Not investment advice.',
);
const STATUS = {
  kind: 'select' as const,
  key: 'status',
  label: L('Status nominal', 'Amount status'),
  options: [
    { value: 'verified', label: L('Terverifikasi', 'Verified') },
    { value: 'all', label: L('Semua bernominal', 'All with an amount') },
  ],
  default: 'all',
};
const YEARS = [
  { value: '', label: L('Semua tahun', 'All years') },
  ...[2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => ({ value: String(y), label: String(y) })),
];
const yr = (s: string | undefined) => (s ? int(s, 0) || '' : '');

export const views: DexViews = {
  summary: {
    intro: LIMITS,
    controls: [
      STATUS,
      {
        kind: 'select',
        key: 'metric',
        label: L('Metrik', 'Metric'),
        options: [
          { value: 'usd', label: 'USD' },
          { value: 'rounds', label: L('Putaran', 'Rounds') },
        ],
        default: 'usd',
      },
    ],
    calls: (v) => [
      { tool: 'funding_summary', input: { group_by: 'none', status: v.status } },
      { tool: 'funding_summary', input: { group_by: 'year', status: v.status, metric: v.metric } },
    ],
  },
  stages: {
    intro: L(
      'Median ukuran putaran per tahap (hanya putaran yang mencantumkan nominal).',
      'Median round size by stage (rounds with a disclosed amount only).',
    ),
    controls: [{ kind: 'select', key: 'year', label: L('Tahun', 'Year'), options: YEARS, default: '' }, STATUS],
    calls: (v) => [
      { tool: 'median_round', input: clean({ year: yr(v.year), status: v.status }) },
      {
        tool: 'funding_summary',
        input: clean({ group_by: 'stage', status: v.status, filters: clean({ year: yr(v.year) }) }),
      },
    ],
  },
  geo: {
    intro: L(
      'Putaran per negara dan sektor dalam sampel; negara memakai nama (mis. Indonesia).',
      'Rounds by country and sector in the sample; countries use names (e.g. Indonesia).',
    ),
    controls: [
      {
        kind: 'select',
        key: 'metric',
        label: L('Metrik', 'Metric'),
        options: [
          { value: 'rounds', label: L('Putaran', 'Rounds') },
          { value: 'usd', label: 'USD' },
        ],
        default: 'rounds',
      },
      {
        kind: 'text',
        key: 'country',
        label: L('Negara untuk sektor (opsional)', 'Country for sectors (optional)'),
        default: 'Indonesia',
      },
    ],
    calls: (v) => [
      { tool: 'funding_summary', input: { group_by: 'country', metric: v.metric, status: 'all', limit: 20 } },
      {
        tool: 'funding_summary',
        input: clean({
          group_by: 'sector',
          metric: v.metric,
          status: 'all',
          filters: clean({ country: v.country?.trim() }),
        }),
      },
    ],
  },
  mega: {
    intro: L(
      'Mega-round = putaran ≥ US$100 juta: porsi putaran dan porsi dolar, serta putaran terbesar.',
      'Mega-round = round ≥ US$100M: share of rounds and of dollars, plus the largest rounds.',
    ),
    controls: [{ kind: 'select', key: 'year', label: L('Tahun', 'Year'), options: YEARS, default: '' }],
    calls: (v) => [{ tool: 'mega_rounds', input: clean({ year: yr(v.year), limit: 15 }) }],
  },
  search: {
    intro: L(
      'Cari putaran menurut perusahaan, investor atau sektor; selalu cantumkan sumber berita.',
      'Search rounds by company, investor or sector; always cite the news source.',
    ),
    entityKey: 'query',
    controls: [
      {
        kind: 'text',
        key: 'query',
        label: L('Perusahaan / investor', 'Company / investor'),
        default: '',
        placeholder: 'Verkor, Sequoia…',
      },
      { kind: 'text', key: 'country', label: L('Negara', 'Country'), default: 'Indonesia' },
    ],
    calls: (v) => [
      {
        tool: 'rounds_search',
        input: clean({ query: v.query?.trim(), filters: clean({ country: v.country?.trim() }), limit: 20 }),
      },
      { tool: 'investor_leads', input: { limit: 15 } },
    ],
  },
};
