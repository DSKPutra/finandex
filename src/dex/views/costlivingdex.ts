// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for CostLivingDex (§9). ALL values are synthetic (Numbeo/Mercer/EIU-like patterns).
import { clean, L, list, type DexViews } from './types.ts';

const SYN = L(
  'Data sintetis (pola Numbeo/Mercer/EIU), bukan hasil survei nyata.',
  'Synthetic data (Numbeo/Mercer/EIU-like patterns), not real survey results.',
);
const METRICS = [
  ['cost_of_living_index', 'Indeks biaya hidup', 'Cost of living index'],
  ['quality_of_life_index', 'Indeks kualitas hidup', 'Quality of life index'],
  ['rent_index', 'Indeks sewa', 'Rent index'],
  ['groceries_index', 'Indeks belanja', 'Groceries index'],
  ['local_purchasing_power_index', 'Daya beli lokal', 'Local purchasing power'],
  ['avg_monthly_net_salary_usd', 'Gaji bersih bulanan (USD)', 'Monthly net salary (USD)'],
  ['safety_index', 'Indeks keamanan', 'Safety index'],
  ['pollution_index', 'Indeks polusi', 'Pollution index'],
].map(([value, id, en]) => ({ value: value!, label: L(id!, en!) }));

export const views: DexViews = {
  ranking: {
    intro: SYN,
    controls: [
      {
        kind: 'select',
        key: 'metric',
        label: L('Metrik', 'Metric'),
        options: METRICS,
        default: 'cost_of_living_index',
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
      {
        kind: 'select',
        key: 'survey',
        label: L('Survei', 'Survey'),
        options: [
          { value: '2024-06-15', label: '2024-06-15' },
          { value: '2023-06-15', label: '2023-06-15' },
        ],
        default: '2024-06-15',
      },
    ],
    calls: (v) => [
      { tool: 'rank_cities', input: { metric: v.metric, order: v.order, survey_date: v.survey, limit: 20 } },
    ],
  },
  profile: {
    intro: SYN,
    entityKey: 'city',
    controls: [{ kind: 'text', key: 'city', label: L('Kota', 'City'), default: 'Jakarta' }],
    calls: (v) => [{ tool: 'city_profile', input: { cities: [v.city || 'Jakarta'] } }],
  },
  compare: {
    intro: SYN,
    controls: [
      {
        kind: 'text',
        key: 'cities',
        label: L('Kota (pisahkan koma)', 'Cities (comma-separated)'),
        default: 'Jakarta, Singapore, Kuala Lumpur, Bangkok',
      },
    ],
    calls: (v) => [
      {
        tool: 'city_profile',
        input: { cities: list(v.cities).slice(0, 6).length ? list(v.cities).slice(0, 6) : ['Jakarta'] },
      },
    ],
  },
  change: {
    intro: L(
      'Perubahan indeks antara survei 2023 dan 2024 (data sintetis).',
      'Index change between the 2023 and 2024 surveys (synthetic data).',
    ),
    controls: [
      { kind: 'text', key: 'city', label: L('Kota', 'City'), default: 'Jakarta' },
      {
        kind: 'select',
        key: 'metric',
        label: L('Metrik', 'Metric'),
        options: METRICS,
        default: 'cost_of_living_index',
      },
    ],
    calls: (v) => [
      { tool: 'compare_surveys', input: clean({ city: v.city || 'Jakarta', metric: v.metric }) as { city: string } },
    ],
  },
};
