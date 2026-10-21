// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for IDFoodDeliveryDex (§9): Ringkasan Markup · Kota · Kuliner · Cloud Kitchen · Cari Menu.
import { clean, L, type DexViews } from './types.ts';

const EST = L(
  'Harga dine-in adalah ESTIMASI penyedia data, jadi markup juga estimasi; tanggal pengumpulan tidak dicantumkan.',
  'The dine-in price is a provider ESTIMATE, so markups are estimates too; no collection date is given.',
);
const CITIES = ['Bandung', 'Jabodetabek', 'Medan', 'Surabaya'];
const CUISINES = ['Indonesian', 'Chinese', 'Japanese', 'Korean', 'Western', 'Fast Food', 'Bakery', 'Beverages'];
const ANY = { value: '', label: L('Semua', 'All') };
const city = {
  kind: 'select' as const,
  key: 'city',
  label: L('Kota', 'City'),
  options: [ANY, ...CITIES.map((c) => ({ value: c, label: c }))],
  default: '',
};

export const views: DexViews = {
  summary: {
    intro: EST,
    calls: () => [
      { tool: 'markup_stats', input: { group_by: 'none' } },
      { tool: 'fee_promo_stats', input: { group_by: 'none', metric: 'packaging_fee_idr' } },
      { tool: 'fee_promo_stats', input: { group_by: 'none', metric: 'promo_discount_pct' } },
      { tool: 'provider_tiers', input: { field: 'consumer_affordability_tier' } },
    ],
  },
  cities: {
    intro: L('Median markup, biaya kemasan dan promo per kota.', 'Median markup, packaging fee and promo by city.'),
    controls: [
      {
        kind: 'select',
        key: 'metric',
        label: L('Metrik biaya', 'Fee metric'),
        options: [
          { value: 'packaging_fee_idr', label: L('Biaya kemasan', 'Packaging fee') },
          { value: 'promo_discount_pct', label: L('Diskon promo', 'Promo discount') },
        ],
        default: 'packaging_fee_idr',
      },
    ],
    calls: (v) => [
      { tool: 'markup_stats', input: { group_by: 'city' } },
      { tool: 'fee_promo_stats', input: { group_by: 'city', metric: v.metric } },
    ],
  },
  cuisines: {
    intro: L('Median markup per jenis kuliner (dine-in = estimasi).', 'Median markup by cuisine (dine-in = estimate).'),
    controls: [city],
    calls: (v) => [{ tool: 'markup_stats', input: clean({ group_by: 'cuisine', filters: clean({ city: v.city }) }) }],
  },
  cloud: {
    intro: L(
      'Cloud kitchen vs non-cloud; label "premium bias" adalah label penyedia, bukan fakta.',
      'Cloud kitchen vs non-cloud; the "premium bias" label is a provider label, not a fact.',
    ),
    controls: [city],
    calls: (v) => [
      { tool: 'markup_stats', input: clean({ group_by: 'cloud_kitchen', filters: clean({ city: v.city }) }) },
      { tool: 'fee_promo_stats', input: { group_by: 'cloud_kitchen', metric: 'promo_discount_pct' } },
      { tool: 'provider_tiers', input: { field: 'cloud_kitchen_premium_bias' } },
    ],
  },
  search: {
    intro: L(
      'Cari item menu; harga online vs estimasi dine-in per kota.',
      'Search menu items; online vs estimated dine-in price by city.',
    ),
    entityKey: 'query',
    controls: [
      { kind: 'text', key: 'query', label: L('Menu', 'Menu item'), default: 'nasi goreng' },
      city,
      {
        kind: 'select',
        key: 'cuisine',
        label: L('Kuliner', 'Cuisine'),
        options: [ANY, ...CUISINES.map((c) => ({ value: c, label: c }))],
        default: '',
      },
    ],
    calls: (v) => {
      const q = v.query?.trim() || 'nasi goreng';
      return [
        { tool: 'item_search', input: clean({ query: q, city: v.city, cuisine: v.cuisine, limit: 20 }) },
        { tool: 'price_compare', input: { item: q } },
      ];
    },
  },
};
