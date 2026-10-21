// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for PovertyDex (§9): MPI by country; survey years differ per country.
import { L, list, type DexViews } from './types.ts';

const NOTE = L(
  'Indeks Kemiskinan Multidimensi (bukan kemiskinan moneter); tahun survei berbeda per negara.',
  'Multidimensional Poverty Index (not monetary poverty); survey years differ per country.',
);
const IND = [
  ['mpi_value', 'Nilai MPI (0–1)', 'MPI value (0–1)'],
  ['mpi_headcount', 'Headcount (%)', 'Headcount (%)'],
  ['mpi_intensity', 'Intensitas (%)', 'Intensity (%)'],
  ['child_mortality', 'Kontribusi kematian anak', 'Child mortality contribution'],
  ['years_of_schooling', 'Kontribusi lama sekolah', 'Years of schooling contribution'],
  ['cooking_fuel', 'Kontribusi bahan bakar memasak', 'Cooking fuel contribution'],
  ['sanitation', 'Kontribusi sanitasi', 'Sanitation contribution'],
  ['electricity', 'Kontribusi listrik', 'Electricity contribution'],
].map(([value, id, en]) => ({ value: value!, label: L(id!, en!) }));

export const views: DexViews = {
  map: { intro: NOTE, calls: () => [{ tool: 'rank_mpi', input: { indicator: 'mpi_value', limit: 30 } }] },
  ranking: {
    intro: NOTE,
    controls: [
      { kind: 'select', key: 'indicator', label: L('Indikator', 'Indicator'), options: IND, default: 'mpi_value' },
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
    calls: (v) => [{ tool: 'rank_mpi', input: { indicator: v.indicator, order: v.order, limit: 20 } }],
  },
  dimensions: {
    intro: L(
      'Kontribusi tiap indikator terhadap MPI suatu negara.',
      "Each indicator's contribution to a country's MPI.",
    ),
    entityKey: 'country',
    controls: [{ kind: 'text', key: 'country', label: L('Negara', 'Country'), default: 'Indonesia' }],
    calls: (v) => [{ tool: 'country_mpi', input: { country: v.country || 'Indonesia' } }],
  },
  compare: {
    controls: [
      {
        kind: 'text',
        key: 'countries',
        label: L('Negara (pisahkan koma)', 'Countries (comma-separated)'),
        default: 'Indonesia, Philippines, India, Bangladesh',
      },
    ],
    calls: (v) => {
      const c = list(v.countries).slice(0, 8);
      return [{ tool: 'compare_mpi', input: { countries: c.length >= 2 ? c : ['Indonesia', 'India'] } }];
    },
  },
};
