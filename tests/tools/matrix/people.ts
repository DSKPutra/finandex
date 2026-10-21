// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tool-matrix fixtures (group: people): social sentiment, salaries, startups, food delivery, companies, VC, IPOs.
import { expect } from 'vitest';
import type { MatrixCall, Matrix } from './types.ts';

const common = (dexId: string): MatrixCall[] => [
  { tool: 'dataset_info', input: {} },
  { tool: 'app_info', input: {} },
  { tool: 'open_dex', input: { dexId, entity: 'x', reason: 'r' } },
  { tool: 'data_quality', input: {} },
];
const near =
  (v: number, tol = 1e-6) =>
  (x: unknown) =>
    expect(Math.abs(Number(x) - v)).toBeLessThanOrEqual(tol);

const social = (dexId: string, extra: MatrixCall[]): MatrixCall[] => [
  ...common(dexId),
  { tool: 'sentiment_overview', input: {} },
  { tool: 'sentiment_overview', input: { group_by: 'platform' } },
  { tool: 'sentiment_overview', input: { group_by: 'month', include_all: true } },
  { tool: 'sentiment_overview', input: { group_by: 'language', include_all: false } },
  { tool: 'topic_breakdown', input: { field: 'topic' } },
  { tool: 'topic_breakdown', input: { field: 'topic_tags', limit: 5 } },
  { tool: 'topic_breakdown', input: { field: 'aspect_pricing' } },
  { tool: 'topic_breakdown', input: { field: 'no_such_field' }, error: true },
  { tool: 'search_posts', input: { query: 'bank app fees' } },
  { tool: 'search_posts', input: { query: 'a', platform: 'reddit', sentiment: 'negative', limit: 3 } },
  { tool: 'search_posts', input: { query: 'zzzqqqxx' }, check: (d) => expect(d.results).toEqual([]) },
  { tool: 'trend', input: {} },
  { tool: 'trend', input: { metric: 'sentiment_share', since: '2025-01' } },
  { tool: 'trend', input: { since: '2099-01' }, check: (d) => expect(d.last).toBeNull() },
  { tool: 'aspect_sentiment', input: { aspect: 'pricing' } },
  { tool: 'aspect_sentiment', input: { aspect: 'nonexistent' }, error: true },
  ...extra,
];

const SE = { country: 'US', role_family: 'software-eng' };

export const matrix: Matrix = {
  fintechdex: social('fintechdex', [
    {
      tool: 'sentiment_overview',
      input: { include_all: true },
      check: (d) => {
        near(0.0732387227572225)(d.results[0].negative);
        expect(d.rows_used).toBe(3946);
      },
    },
  ]),
  personalfinandex: social('personalfinandex', [
    {
      tool: 'sentiment_overview',
      input: { include_all: true },
      check: (d) => {
        near(0.25048732943469787)(d.results[0].positive);
        expect(d.dataset_totals_all_rows.published_range).toEqual(['2011-02-24', '2026-09-16']);
      },
    },
  ]),

  salarydex: [
    ...common('salarydex'),
    {
      tool: 'salary_stats',
      input: { filters: SE },
      check: (d) => {
        expect(d.median).toBe(124800);
        expect(d.rows_in_dataset).toBe(100060);
      },
    },
    { tool: 'salary_stats', input: { filters: { country: 'United States' }, stat: 'p25' } },
    { tool: 'salary_stats', input: { filters: { country: 'IN' }, stat: 'p75' } },
    { tool: 'salary_stats', input: { filters: { seniority: 'senior' }, stat: 'mean' } },
    { tool: 'salary_stats', input: { filters: { skill: 'python' }, stat: 'count' } },
    {
      tool: 'salary_stats',
      input: { filters: { country: 'US', industry: 'zzz-none' } },
      check: (d) => expect(d.insufficient).toBe(true),
    },
    {
      tool: 'salary_stats',
      input: { filters: { country: 'ZZ' }, stat: 'count' },
      check: (d) => expect(d.median).toBeNull(),
    },
    {
      tool: 'compare_salaries',
      input: {
        groups: [
          { label: 'US', filters: SE },
          { label: 'IN', filters: { country: 'IN', role_family: 'software-eng' } },
          { label: 'none', filters: { country: 'ZZ' } },
        ],
      },
      check: (d) => {
        expect(d.results[1].value).toBe(8721);
        expect(d.results[2].value).toBeNull();
      },
    },
    { tool: 'skill_premium', input: { skill: 'python' } },
    { tool: 'skill_premium', input: { skill: 'python', country: 'US' } },
    { tool: 'skill_premium', input: { skill: 'zzz-unknown-skill' }, check: (d) => expect(d.premium).toBeNull() },
    { tool: 'top_skills', input: {}, check: (d) => expect(d.results[0].key).toBe('excel') },
    { tool: 'top_skills', input: { country: 'US', role_family: 'software-eng', limit: 5 } },
    { tool: 'salary_distribution', input: { group_by: 'country' } },
    { tool: 'salary_distribution', input: { group_by: 'role_family', filters: { country: 'US' }, limit: 5 } },
    { tool: 'salary_distribution', input: { group_by: 'seniority' } },
  ],

  startupdex: [
    ...common('startupdex'),
    {
      tool: 'funding_summary',
      input: { group_by: 'none', status: 'all' },
      check: (d) => {
        near(582519636011, 1)(d.groups[0].usd);
        expect(d.groups[0].rounds_with_amount).toBe(16770);
      },
    },
    {
      tool: 'funding_summary',
      input: { group_by: 'none', filters: { country: 'Indonesia' }, status: 'all' },
      check: (d) => expect(d.groups[0].rounds).toBe(163),
    },
    { tool: 'funding_summary', input: { group_by: 'year' } },
    { tool: 'funding_summary', input: { group_by: 'country', metric: 'usd', limit: 5 } },
    { tool: 'funding_summary', input: { group_by: 'sector', filters: { year: 2024, stage: 'Seed' } } },
    { tool: 'funding_summary', input: { group_by: 'stage', metric: 'rounds', filters: { lead_investor: 'sequoia' } } },
    {
      tool: 'funding_summary',
      input: { group_by: 'none', filters: { country: 'Atlantis' } },
      check: (d) => expect(d.groups).toEqual([]),
    },
    { tool: 'rounds_search', input: { query: 'Verkor' } },
    { tool: 'rounds_search', input: { filters: { country: 'Indonesia', sector: 'Fintech' }, limit: 3 } },
    { tool: 'median_round', input: { stage: 'Seed' }, check: (d) => expect(d.results[0].value).toBe(3200000) },
    { tool: 'median_round', input: { year: 2024, status: 'verified' } },
    { tool: 'mega_rounds', input: {}, check: (d) => near(0.6110506461850471)(d.share_of_dollars) },
    { tool: 'mega_rounds', input: { year: 2021, limit: 3 } },
    { tool: 'company_rounds', input: { company: 'Verkor' } },
    { tool: 'company_rounds', input: { company: 'verkor.com' } },
    { tool: 'investor_leads', input: {} },
    { tool: 'investor_leads', input: { lead_investor: 'sequoia', limit: 5 } },
  ],

  idfooddeliverydex: [
    ...common('idfooddeliverydex'),
    {
      tool: 'markup_stats',
      input: { group_by: 'none' },
      check: (d) => {
        expect(d.median_markup_pct).toBe(23.73);
        expect(d.items).toBe(10000);
      },
    },
    {
      tool: 'markup_stats',
      input: { group_by: 'none', filters: { city: 'Atlantis' } },
      check: (d) => expect(d.median_markup_pct).toBeNull(),
    },
    { tool: 'markup_stats', input: { group_by: 'city' }, check: (d) => expect(d.results[0].key).toBe('Bandung') },
    { tool: 'markup_stats', input: { group_by: 'cuisine', limit: 5 } },
    {
      tool: 'markup_stats',
      input: { group_by: 'cloud_kitchen' },
      check: (d) => expect(d.results.map((r: { value: number }) => r.value).sort()).toEqual([0.2, 0.2647]),
    },
    { tool: 'markup_stats', input: { group_by: 'merchant', filters: { cloud_kitchen: false, city: 'Bandung' } } },
    { tool: 'item_search', input: { query: 'nasi goreng' } },
    { tool: 'item_search', input: { query: 'ayam', city: 'Bandung', cuisine: 'zzz', limit: 3 } },
    { tool: 'price_compare', input: {} },
    { tool: 'price_compare', input: { merchant: 'kopi', item: 'kopi susu' } },
    { tool: 'fee_promo_stats', input: {} },
    { tool: 'fee_promo_stats', input: { group_by: 'city', metric: 'promo_discount_pct' } },
    { tool: 'fee_promo_stats', input: { group_by: 'cuisine' } },
    { tool: 'fee_promo_stats', input: { group_by: 'cloud_kitchen', metric: 'packaging_fee_idr' } },
    { tool: 'provider_tiers', input: { field: 'inflation_distortion_tier' } },
    { tool: 'provider_tiers', input: { field: 'consumer_affordability_tier' } },
    { tool: 'provider_tiers', input: { field: 'cloud_kitchen_premium_bias' } },
    { tool: 'provider_tiers', input: { field: 'platform_take_rate_burden' } },
  ],

  opencompanydex: [
    ...common('opencompanydex'),
    { tool: 'company_search', input: { query: 'tech' } },
    { tool: 'company_search', input: { query: 'bank', country: 'Indonesia', sector: 'zzz', limit: 3 } },
    {
      tool: 'company_counts',
      input: { group_by: 'none', filters: { country: 'Indonesia' } },
      check: (d) => expect(d.matched).toBe(509),
    },
    { tool: 'company_counts', input: { group_by: 'none' }, check: (d) => expect(d.median_founded_year).toBe(2013) },
    { tool: 'company_counts', input: { group_by: 'country', limit: 5 } },
    { tool: 'company_counts', input: { group_by: 'sector' } },
    { tool: 'company_counts', input: { group_by: 'industry' } },
    { tool: 'company_counts', input: { group_by: 'status' } },
    { tool: 'company_counts', input: { group_by: 'founded_decade' } },
    {
      tool: 'company_counts',
      input: { group_by: 'employees_range', filters: { country: 'Atlantis' } },
      check: (d) => expect(d.median_founded_year).toBeNull(),
    },
    { tool: 'funded_share', input: { group_by: 'none' }, check: (d) => near(0.08903)(d.results[0].value) },
    { tool: 'funded_share', input: { group_by: 'country', limit: 5 } },
    { tool: 'funded_share', input: { group_by: 'sector' } },
    { tool: 'funded_share', input: { group_by: 'status' } },
    { tool: 'business_models', input: {} },
    { tool: 'business_models', input: { country: 'Indonesia', limit: 5 } },
  ],

  vcnetworkdex: [
    ...common('vcnetworkdex'),
    {
      tool: 'top_pairs',
      input: {},
      check: (d) => expect(d.pairs[0]).toMatchObject({ a: 'Index Ventures', b: 'Sequoia Capital', shared_deals: 54 }),
    },
    { tool: 'top_pairs', input: { sector: 'Fintech', country: 'India', limit: 5 } },
    { tool: 'top_pairs', input: { investor: 'sequoia capital' } },
    { tool: 'top_pairs', input: { investor: 'sequoia' } },
    { tool: 'top_pairs', input: { investor: 'zzzqqqxx' }, error: true },
    { tool: 'investor_partners', input: { investor: 'Tiger Global', limit: 5 } },
    { tool: 'investor_partners', input: { investor: 'zzzqqqxx' }, error: true },
    { tool: 'network_stats', input: {}, check: (d) => near(0.8315338474721509)(d.one_off_share) },
    { tool: 'network_stats', input: { investor: 'Sequoia Capital' } },
    { tool: 'ego_graph', input: { investor: 'Sequoia Capital' } },
    { tool: 'ego_graph', input: { investor: 'Index Ventures', max_nodes: 5 } },
    { tool: 'ego_graph', input: { investor: 'zzzqqqxx' }, error: true },
    { tool: 'sector_country_links', input: {} },
    { tool: 'sector_country_links', input: { sector: 'Fintech' } },
    { tool: 'sector_country_links', input: { country: 'India', field: 'top_shared_sector' } },
  ],

  vcdex: [
    ...common('vcdex'),
    { tool: 'investor_search', input: {} },
    {
      tool: 'investor_search',
      input: { query: 'fintech', country: 'Indonesia', type: 'VC', sector: 'fintech', limit: 3 },
    },
    { tool: 'investor_profile', input: { investor: 'Tiger Global' } },
    { tool: 'investor_profile', input: { investor: 'sequoia' } },
    { tool: 'investor_profile', input: { investor: 'zzzqqqxx' }, error: true },
    {
      tool: 'rank_investors',
      input: { metric: 'deals' },
      check: (d) => expect(d.rows[0]).toMatchObject({ name: 'Tiger Global', deals: 897 }),
    },
    { tool: 'rank_investors', input: { metric: 'lead_deals', country: 'United States', type: 'VC', limit: 5 } },
    { tool: 'rank_investors', input: { metric: 'portfolio_companies' } },
    { tool: 'rank_investors', input: { metric: 'deals_2025_2026' } },
    { tool: 'rank_investors', input: { metric: 'median_round_usd' } },
    { tool: 'stage_mix', input: { investor: 'Tiger Global' } },
    { tool: 'stage_mix', input: { investor: 'zzzqqqxx' }, error: true },
    { tool: 'country_summary', input: {} },
    { tool: 'country_summary', input: { limit: 3 } },
    { tool: 'country_summary', input: { country: 'Indonesia' }, check: (d) => expect(d.investors).toBe(23) },
    { tool: 'country_summary', input: { country: 'Atlantis' }, check: (d) => expect(d.median_deals).toBeNull() },
  ],

  ipodex: [
    ...common('ipodex'),
    {
      tool: 'ipo_summary',
      input: { group_by: 'none', filters: { listing_status: 'Completed' } },
      check: (d) => expect(d.matched).toBe(1084),
    },
    { tool: 'ipo_summary', input: { group_by: 'year' } },
    { tool: 'ipo_summary', input: { group_by: 'country', metric: 'usd' } },
    { tool: 'ipo_summary', input: { group_by: 'exchange', metric: 'usd', amount_status: 'all', limit: 5 } },
    { tool: 'ipo_summary', input: { group_by: 'board', filters: { country: 'India', year: 2024 } } },
    { tool: 'ipo_summary', input: { group_by: 'sector' } },
    { tool: 'ipo_summary', input: { group_by: 'ipo_type' } },
    {
      tool: 'ipo_summary',
      input: { group_by: 'listing_status', filters: { exchange: 'zzz', sector: 'zzz', board: 'SME' } },
    },
    { tool: 'ipo_search', input: { query: 'bank' } },
    { tool: 'ipo_search', input: { filters: { country: 'India' }, limit: 3 } },
    { tool: 'ipo_size_stats', input: {}, check: (d) => expect(d.median_usd).toBe(79518072) },
    { tool: 'ipo_size_stats', input: { amount_status: 'all', filters: { country: 'India' } } },
    {
      tool: 'ipo_size_stats',
      input: { filters: { country: 'Atlantis' } },
      check: (d) => expect(d.median_usd).toBeNull(),
    },
    {
      tool: 'india_sme_vs_mainboard',
      input: {},
      check: (d) =>
        expect(
          Object.fromEntries(d.results.map((r: { key: string; value: number }) => [r.key, r.value])),
        ).toMatchObject({ Mainboard: 355, SME: 339 }),
    },
    { tool: 'india_sme_vs_mainboard', input: { year: 2024 } },
    { tool: 'withdrawn_ipos', input: {} },
    { tool: 'withdrawn_ipos', input: { filters: { country: 'India' }, limit: 3 } },
  ],
};
