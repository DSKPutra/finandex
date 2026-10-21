// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// IDFoodDeliveryDex — file #20 (§4.18). Port of run_food() in kit/reference/finandex_reference_x.py.
import { fnum, med, mean, valueCounts } from '../../../src/shared/analytics/stats.ts';
import { bool, num, readCsv, str, type Row } from '../lib/csv.ts';
import { columnar } from '../lib/frame.ts';
import { x } from '../lib/io.ts';
import type { DexModule, ModuleResult } from '../lib/module.ts';

const CSV = () => x('Indonesian_Food_Delivery_Benchmark_-_10k_Menus', 'indonesian_food_delivery_benchmark.csv');
export const FOOD_PROVIDER_LABELS = ['inflation_distortion_tier', 'consumer_affordability_tier', 'cloud_kitchen_premium_bias', 'platform_take_rate_burden', 'confidence_score'];

function medBy(rows: Row[], key: (r: Row) => string | null): Record<string, number | null> {
  const m = new Map<string, number[]>();
  for (const r of rows) {
    const k = key(r);
    if (k === null) continue;
    if (!m.has(k)) m.set(k, []);
    const v = num(r.markup_percentage);
    if (!Number.isNaN(v)) m.get(k)!.push(v);
  }
  return Object.fromEntries([...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1)).map(([k, v]) => [k, med(v)]));
}

export const foodModule: DexModule = {
  name: 'food',
  dex: ['idfooddeliverydex'],
  inputs: [20],
  requires: () => [CSV()],
  async build(): Promise<ModuleResult> {
    const df = readCsv(CSV());
    const markup = df.map((r) => num(r.markup_percentage));
    let maxDiff = 0;
    for (const r of df) {
      const d = Math.abs((num(r.online_price_idr) / num(r.estimated_dine_in_price_idr) - 1) * 100 - num(r.markup_percentage));
      if (d > maxDiff) maxDiff = d;
    }
    const golden = {
      rows: df.length,
      merchants: new Set(df.map((r) => str(r.merchant_name)).filter((v) => v !== null)).size,
      cities: Object.fromEntries(valueCounts(df.map((r) => str(r.merchant_city)))),
      cuisines: Object.fromEntries(valueCounts(df.map((r) => str(r.cuisine_category)))),
      cloud_kitchen_items: df.filter((r) => bool(r.is_cloud_kitchen) === true).length,
      median_markup_pct: med(markup),
      mean_markup_pct: fnum(mean(markup.filter((v) => !Number.isNaN(v)))),
      median_markup_by_city: medBy(df, (r) => str(r.merchant_city)),
      median_markup_by_cuisine: medBy(df, (r) => str(r.cuisine_category)),
      median_markup_cloud_vs_not: medBy(df, (r) => (bool(r.is_cloud_kitchen) === null ? null : bool(r.is_cloud_kitchen) ? 'True' : 'False')),
      median_online_price_idr: med(df.map((r) => num(r.online_price_idr))),
      median_packaging_fee_idr: med(df.map((r) => num(r.packaging_fee_idr))),
      median_promo_discount_pct: med(df.map((r) => num(r.promo_discount_pct))),
      markup_formula_max_abs_diff_pp: fnum(maxDiff),
      notes: {
        estimates: 'estimated_dine_in_price_idr is an ESTIMATE from the dataset author; tiers/bias/burden columns, evidence_span, cot_rationale, confidence_score are author-generated labels',
        parquet: 'indonesian_food_delivery_benchmark.parquet duplicates the CSV; CSV is primary',
      },
    };
    const items = df.map((r) => ({
      merchant: str(r.merchant_name),
      city: str(r.merchant_city),
      cuisine: str(r.cuisine_category),
      cloud_kitchen: bool(r.is_cloud_kitchen),
      item: str(r.item_name),
      online_price_idr: num(r.online_price_idr),
      est_dine_in_price_idr: num(r.estimated_dine_in_price_idr),
      markup_pct: num(r.markup_percentage),
      rating: num(r.merchant_rating),
      reviews: num(r.total_reviews_count),
      promo_discount_pct: num(r.promo_discount_pct),
      packaging_fee_idr: num(r.packaging_fee_idr),
      label_inflation_distortion_tier: str(r.inflation_distortion_tier),
      label_consumer_affordability_tier: str(r.consumer_affordability_tier),
      label_cloud_kitchen_premium_bias: str(r.cloud_kitchen_premium_bias),
      label_platform_take_rate_burden: str(r.platform_take_rate_burden),
      label_confidence_score: num(r.confidence_score),
    }));
    return {
      dex: ['idfooddeliverydex'],
      status: 'built',
      asOf: null,
      golden: { 'food/golden.json': golden },
      files: {
        'core/food/summary.json': { as_of: 'tidak dicantumkan penyedia', ...golden },
        'heavy/food/items.json': columnar(items, Object.keys(items[0]!), ['merchant', 'city', 'cuisine', 'label_inflation_distortion_tier', 'label_consumer_affordability_tier', 'label_cloud_kitchen_premium_bias', 'label_platform_take_rate_burden']),
        'core/food/quality.json': {
          rows: df.length,
          markup_formula_check_max_abs_diff_pp: fnum(maxDiff),
          provider_labels: FOOD_PROVIDER_LABELS,
          hidden_columns: ['evidence_span', 'cot_rationale'],
          estimate_note: 'estimated_dine_in_price_idr = provider ESTIMATE, not an official merchant price',
          as_of: 'tidak dicantumkan penyedia (collection date not stated by the provider)',
        },
      },
    };
  },
};
