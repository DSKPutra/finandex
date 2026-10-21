// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for IPODex (§9): Ringkasan · Negara & Bursa · India SME vs Mainboard · Cari IPO.
import { clean, int, L, type DexViews } from './types.ts';

const LIMITS = L(
  'Sampel 38% catatan IPO 2019–2026; hanya status Completed yang sudah listing; ukuran memakai nominal terverifikasi. Bukan rekomendasi investasi.',
  '38% sample of 2019–2026 IPO records; only Completed IPOs are listed; sizes use verified amounts. Not investment advice.',
);
const STATUS = [
  { value: '', label: L('Semua status', 'All statuses') },
  { value: 'Completed', label: L('Completed (listing)', 'Completed (listed)') },
  { value: 'Announced / filed', label: L('Diumumkan / diajukan', 'Announced / filed') },
  { value: 'Withdrawn / postponed', label: L('Ditarik / ditunda', 'Withdrawn / postponed') },
];
const st = {
  kind: 'select' as const,
  key: 'status',
  label: L('Status listing', 'Listing status'),
  options: STATUS,
  default: 'Completed',
};

export const views: DexViews = {
  summary: {
    intro: LIMITS,
    controls: [st],
    calls: (v) => {
      const f = clean({ listing_status: v.status });
      return [
        { tool: 'ipo_summary', input: { group_by: 'listing_status' } },
        { tool: 'ipo_summary', input: { group_by: 'year', filters: f } },
        { tool: 'ipo_size_stats', input: { filters: f } },
      ];
    },
  },
  countries: {
    intro: L(
      'Jumlah IPO atau total ukuran (USD terverifikasi) per negara dan bursa.',
      'IPO count or total size (verified USD) by country and exchange.',
    ),
    controls: [
      {
        kind: 'select',
        key: 'metric',
        label: L('Metrik', 'Metric'),
        options: [
          { value: 'count', label: L('Jumlah', 'Count') },
          { value: 'usd', label: 'USD' },
        ],
        default: 'count',
      },
      st,
    ],
    calls: (v) => {
      const f = clean({ listing_status: v.status });
      return [
        { tool: 'ipo_summary', input: { group_by: 'country', metric: v.metric, filters: f, limit: 20 } },
        { tool: 'ipo_summary', input: { group_by: 'exchange', metric: v.metric, filters: f, limit: 20 } },
      ];
    },
  },
  india: {
    intro: L(
      'Catatan IPO India per papan (Mainboard vs SME), semua status; sebagian catatan tanpa keterangan papan.',
      'India IPO records by board (Mainboard vs SME), all statuses; some records have no board.',
    ),
    controls: [
      {
        kind: 'select',
        key: 'year',
        label: L('Tahun', 'Year'),
        options: [
          { value: '', label: L('Semua tahun', 'All years') },
          ...[2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map((y) => ({ value: String(y), label: String(y) })),
        ],
        default: '',
      },
    ],
    calls: (v) => [{ tool: 'india_sme_vs_mainboard', input: clean({ year: v.year ? int(v.year, 0) || '' : '' }) }],
  },
  search: {
    intro: L(
      'Cari IPO menurut perusahaan atau ticker; selalu cantumkan sumber berita.',
      'Search IPOs by company or ticker; always cite the news source.',
    ),
    entityKey: 'query',
    controls: [
      {
        kind: 'text',
        key: 'query',
        label: L('Perusahaan / ticker', 'Company / ticker'),
        default: '',
        placeholder: 'bank, TCS…',
      },
      { kind: 'text', key: 'country', label: L('Negara', 'Country'), default: '' },
      st,
    ],
    calls: (v) => [
      {
        tool: 'ipo_search',
        input: clean({
          query: v.query?.trim(),
          filters: clean({ country: v.country?.trim(), listing_status: v.status }),
          limit: 20,
        }),
      },
      { tool: 'withdrawn_ipos', input: clean({ filters: clean({ country: v.country?.trim() }), limit: 15 }) },
    ],
  },
};
