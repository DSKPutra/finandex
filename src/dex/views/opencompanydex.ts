// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for OpenCompanyDex (§9): Peta Negara · Sektor & Industri · Status & Pendanaan · Cari Perusahaan.
import { clean, L, type DexViews } from './types.ts';

const LIMITS = L(
  'Sampel 2% (100.000 perusahaan); banyak kolom kosong, jadi angka adalah gambaran kasar.',
  '2% sample (100,000 companies); many columns are empty, so figures are rough.',
);
const country = {
  kind: 'text' as const,
  key: 'country',
  label: L('Negara (opsional)', 'Country (optional)'),
  default: '',
  placeholder: 'Indonesia, India…',
};

export const views: DexViews = {
  map: {
    intro: LIMITS,
    controls: [
      {
        kind: 'select',
        key: 'group_by',
        label: L('Tampilkan', 'Show'),
        options: [
          { value: 'country', label: L('Negara', 'Country') },
          { value: 'founded_decade', label: L('Dekade berdiri', 'Founded decade') },
          { value: 'employees_range', label: L('Jumlah karyawan', 'Employees') },
        ],
        default: 'country',
      },
    ],
    calls: (v) => [{ tool: 'company_counts', input: { group_by: v.group_by, limit: 30 } }],
  },
  sectors: {
    intro: L(
      'Sektor, industri dan model bisnis menurut label di dataset.',
      'Sectors, industries and business models as labelled in the dataset.',
    ),
    controls: [
      {
        kind: 'select',
        key: 'group_by',
        label: L('Kelompok', 'Group'),
        options: [
          { value: 'sector', label: L('Sektor', 'Sector') },
          { value: 'industry', label: L('Industri', 'Industry') },
        ],
        default: 'sector',
      },
      country,
    ],
    calls: (v) => [
      {
        tool: 'company_counts',
        input: clean({ group_by: v.group_by, filters: clean({ country: v.country?.trim() }), limit: 20 }),
      },
      { tool: 'business_models', input: clean({ country: v.country?.trim(), limit: 15 }) },
    ],
  },
  status: {
    intro: L(
      'Status perusahaan dan porsi yang pernah didanai (is_funded); grup n < 30 disembunyikan.',
      'Company status and the share ever funded (is_funded); groups with n < 30 hidden.',
    ),
    controls: [
      {
        kind: 'select',
        key: 'group_by',
        label: L('Porsi didanai per', 'Funded share by'),
        options: [
          { value: 'none', label: L('Keseluruhan', 'Overall') },
          { value: 'country', label: L('Negara', 'Country') },
          { value: 'sector', label: L('Sektor', 'Sector') },
          { value: 'status', label: L('Status', 'Status') },
        ],
        default: 'country',
      },
    ],
    calls: (v) => [
      { tool: 'company_counts', input: { group_by: 'status' } },
      { tool: 'funded_share', input: { group_by: v.group_by, limit: 20 } },
    ],
  },
  search: {
    intro: L(
      'Cari perusahaan menurut nama atau domain dalam sampel 2%.',
      'Search companies by name or domain in the 2% sample.',
    ),
    entityKey: 'query',
    controls: [
      { kind: 'text', key: 'query', label: L('Nama / domain', 'Name / domain'), default: 'bank' },
      { ...country, default: 'Indonesia' },
    ],
    calls: (v) => [
      {
        tool: 'company_search',
        input: clean({ query: v.query?.trim() || 'bank', country: v.country?.trim(), limit: 20 }),
      },
    ],
  },
};
