// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for IDHousingDex (§9): subsidised vs commercial housing listings in Indonesia.
import { clean, L, type DexViews } from './types.ts';

const NOTE = L(
  'Duplikat & harga tidak valid dibuang. Statistik listing, bukan penilaian properti atau nasihat KPR.',
  'Duplicates & invalid prices removed. Listing statistics, not a property valuation or mortgage advice.',
);
const SUB = [
  { value: '', label: L('Semua', 'All') },
  { value: 'subsidi', label: L('Subsidi', 'Subsidised') },
  { value: 'komersil', label: L('Komersil', 'Commercial') },
];

export const views: DexViews = {
  summary: {
    intro: NOTE,
    calls: () => [
      { tool: 'housing_stats', input: { group_by: 'subsidy_status', stat: 'median' } },
      { tool: 'price_per_m2', input: { group_by: 'subsidy_status' } },
      { tool: 'housing_stats', input: { group_by: 'subsidy_status', stat: 'count' } },
    ],
  },
  regions: {
    intro: NOTE,
    controls: [
      {
        kind: 'select',
        key: 'group',
        label: L('Wilayah', 'Region'),
        options: [
          { value: 'province', label: L('Provinsi', 'Province') },
          { value: 'city_regency', label: L('Kota/Kabupaten', 'City/Regency') },
        ],
        default: 'province',
      },
      {
        kind: 'select',
        key: 'stat',
        label: L('Statistik', 'Statistic'),
        options: [
          { value: 'count', label: L('Jumlah listing', 'Listings') },
          { value: 'median', label: L('Median harga', 'Median price') },
          { value: 'p25', label: 'P25' },
          { value: 'p75', label: 'P75' },
        ],
        default: 'count',
      },
      { kind: 'select', key: 'sub', label: L('Jenis', 'Type'), options: SUB, default: '' },
    ],
    calls: (v) => [
      {
        tool: 'housing_stats',
        input: clean({
          group_by: v.group,
          stat: v.stat,
          limit: 25,
          filters: v.sub ? { subsidy_status: v.sub } : undefined,
        }) as { group_by: string },
      },
    ],
  },
  map: {
    intro: L('Titik proyek dengan koordinat valid di Indonesia.', 'Projects with valid coordinates inside Indonesia.'),
    controls: [
      { kind: 'text', key: 'province', label: L('Provinsi', 'Province'), default: 'DI YOGYAKARTA' },
      { kind: 'select', key: 'sub', label: L('Jenis', 'Type'), options: SUB, default: '' },
    ],
    calls: (v) => [{ tool: 'map_points', input: clean({ province: v.province, subsidy_status: v.sub }) }],
  },
  specs: {
    controls: [
      {
        kind: 'select',
        key: 'field',
        label: L('Spesifikasi', 'Specification'),
        options: [
          ['bedrooms', 'Kamar tidur', 'Bedrooms'],
          ['bathrooms', 'Kamar mandi', 'Bathrooms'],
          ['floors', 'Lantai', 'Floors'],
          ['roof_material', 'Material atap', 'Roof material'],
          ['wall_material', 'Material dinding', 'Wall material'],
          ['floor_material', 'Material lantai', 'Floor material'],
          ['foundation_material', 'Pondasi', 'Foundation'],
        ].map(([value, id, en]) => ({ value: value!, label: L(id!, en!) })),
        default: 'bedrooms',
      },
      { kind: 'select', key: 'sub', label: L('Jenis', 'Type'), options: SUB, default: '' },
    ],
    calls: (v) => [
      { tool: 'specs_breakdown', input: clean({ field: v.field, subsidy_status: v.sub }) as { field: string } },
    ],
  },
  developers: {
    controls: [
      {
        kind: 'select',
        key: 'association',
        label: L('Asosiasi', 'Association'),
        options: [
          { value: '', label: L('Semua', 'All') },
          { value: 'REI', label: 'REI' },
          { value: 'APERSI', label: 'APERSI' },
        ],
        default: '',
      },
      { kind: 'text', key: 'developer', label: L('Cari pengembang', 'Search developer'), default: '' },
    ],
    calls: (v) => [
      { tool: 'housing_stats', input: { group_by: 'developer_association', stat: 'share' } },
      { tool: 'developer_summary', input: clean({ association: v.association, developer: v.developer }) },
    ],
  },
};
