// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for VCDex (§9): Direktori · Peringkat · Stage Mix · Negara.
import { clean, L, type DexViews } from './types.ts';

const LIMITS = L(
  'Sampel 25% direktori investor; tanpa kontak pribadi. Finandex tidak menjanjikan pendanaan dan ini bukan nasihat keuangan.',
  '25% sample of the investor directory; no personal contacts. Finandex promises no funding and this is not financial advice.',
);
const TYPES = ['VC', 'PE', 'CVC', 'accelerator', 'government', 'bank-debt', 'other'];
const ANY = { value: '', label: L('Semua', 'All') };
const type = {
  kind: 'select' as const,
  key: 'type',
  label: L('Tipe', 'Type'),
  options: [ANY, ...TYPES.map((t) => ({ value: t, label: t }))],
  default: '',
};

export const views: DexViews = {
  directory: {
    intro: LIMITS,
    controls: [
      {
        kind: 'text',
        key: 'query',
        label: L('Nama / sektor', 'Name / sector'),
        default: '',
        placeholder: 'fintech, Sequoia…',
      },
      { kind: 'text', key: 'country', label: L('Negara HQ', 'HQ country'), default: 'Indonesia' },
      type,
      { kind: 'text', key: 'sector', label: L('Sektor', 'Sector'), default: '' },
    ],
    calls: (v) => [
      {
        tool: 'investor_search',
        input: clean({
          query: v.query?.trim(),
          country: v.country?.trim(),
          type: v.type,
          sector: v.sector?.trim(),
          limit: 20,
        }),
      },
    ],
  },
  ranking: {
    intro: L(
      'Peringkat investor menurut metrik yang dipilih (hitungan sampel).',
      'Investors ranked by the chosen metric (sample counts).',
    ),
    controls: [
      {
        kind: 'select',
        key: 'metric',
        label: L('Metrik', 'Metric'),
        options: [
          { value: 'deals', label: L('Deal', 'Deals') },
          { value: 'lead_deals', label: L('Deal sebagai lead', 'Lead deals') },
          { value: 'portfolio_companies', label: L('Perusahaan portofolio', 'Portfolio companies') },
          { value: 'deals_2025_2026', label: L('Deal 2025–2026', 'Deals 2025–2026') },
          { value: 'median_round_usd', label: L('Median putaran (USD)', 'Median round (USD)') },
        ],
        default: 'deals',
      },
      { kind: 'text', key: 'country', label: L('Negara HQ (opsional)', 'HQ country (optional)'), default: '' },
      type,
    ],
    calls: (v) => [
      {
        tool: 'rank_investors',
        input: clean({ metric: v.metric, country: v.country?.trim(), type: v.type, limit: 20 }),
      },
    ],
  },
  stages: {
    intro: L(
      'Porsi deal per tahap untuk satu investor, beserta profilnya.',
      'Share of deals by stage for one investor, with its profile.',
    ),
    entityKey: 'investor',
    controls: [{ kind: 'text', key: 'investor', label: L('Investor', 'Investor'), default: 'Tiger Global' }],
    calls: (v) => {
      const i = v.investor?.trim() || 'Tiger Global';
      return [
        { tool: 'stage_mix', input: { investor: i } },
        { tool: 'investor_profile', input: { investor: i } },
      ];
    },
  },
  countries: {
    intro: L(
      'Negara kantor pusat investor; isi negara untuk ringkasan per negara.',
      'Investor HQ countries; enter a country for its summary.',
    ),
    controls: [
      { kind: 'text', key: 'country', label: L('Negara (opsional)', 'Country (optional)'), default: 'Indonesia' },
    ],
    calls: (v) => [
      { tool: 'country_summary', input: { limit: 20 } },
      ...(v.country?.trim() ? [{ tool: 'country_summary', input: { country: v.country.trim() } }] : []),
    ],
  },
};
