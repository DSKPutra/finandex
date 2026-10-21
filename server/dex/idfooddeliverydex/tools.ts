// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// IDFoodDeliveryDex (§8.5): markup statistics (dine-in price = provider ESTIMATE), menu search, fees & promos, provider tiers.
import { z } from 'zod';
import { median } from '../../../src/shared/analytics/stats.ts';
import { artifact, defineTool, method, t, type Tool, type ToolContext } from '../../tools/types.ts';
import { barOutput } from '../helpers.ts';
import { appInfo, dataQualityTool, datasetInfo, openDex } from '../shared-tools.ts';
import { histogram, loadTable, matches, textSearch, type Row } from '../table.ts';

const DS = 'Indonesian Food Delivery Benchmark — 10k Menus';
const FLAGS = ['dine_in_price_is_provider_estimate', 'no_collection_date'];
const items = (ctx: ToolContext) => loadTable(ctx.store, 'heavy/food/items.json');
const Filt = z.strictObject({
  city: z.string().max(40).optional(),
  cuisine: z.string().max(40).optional(),
  cloud_kitchen: z.boolean().optional(),
  merchant: z.string().max(80).optional(),
});
const filt = (rows: Row[], f: z.infer<typeof Filt> = {}) =>
  rows.filter(
    (r) =>
      matches(r.city, f.city) &&
      matches(r.cuisine, f.cuisine) &&
      (f.cloud_kitchen === undefined || r.cloud_kitchen === f.cloud_kitchen) &&
      matches(r.merchant, f.merchant, 'includes'),
  );
const GROUP = { city: 'city', cuisine: 'cuisine', cloud_kitchen: 'cloud_kitchen', merchant: 'merchant' } as const;

const markupStats = defineTool({
  name: 'markup_stats',
  description:
    'Median online-vs-dine-in markup (%) overall or by city, cuisine, cloud_kitchen or merchant. Markup = (online ÷ ESTIMATED dine-in − 1) × 100; the dine-in price is a provider estimate.',
  input: z.strictObject({
    group_by: z.enum(['none', 'city', 'cuisine', 'cloud_kitchen', 'merchant']),
    filters: Filt.optional(),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  label: t('Menghitung markup…', 'Computing markups…'),
  numeric: true,
  async run(ctx, input) {
    const rows = filt(await items(ctx), input.filters);
    if (input.group_by === 'none') {
      const v = rows.map((r) => r.markup_pct as number).filter(Number.isFinite);
      return {
        data: { items: rows.length, median_markup_pct: v.length ? median(v) : null, flags: FLAGS },
        ui: [
          artifact(ctx, {
            title: ctx.locale === 'id' ? 'Distribusi markup (%)' : 'Markup distribution (%)',
            summary: `median ${v.length ? median(v).toFixed(2) : '–'}% (n = ${v.length})`,
            dataset: DS,
            tab: 'summary',
            spec: {
              type: 'histogram',
              bins: histogram(
                v.map((x) => x / 100),
                24,
              ),
              median: v.length ? median(v) / 100 : null,
              n: v.length,
              value_format: 'pct',
            },
          }),
        ],
        method: method(ctx, {
          tool: 'markup_stats',
          formulas: ['markup', 'median'],
          inputs: input,
          rows: v.length,
          dataset: DS,
          flags: FLAGS,
        }),
      };
    }
    const k = GROUP[input.group_by];
    const g = new Map<string, number[]>();
    for (const r of rows) {
      const key = r[k] === null || r[k] === undefined ? null : String(r[k]);
      if (key === null) continue;
      if (!g.has(key)) g.set(key, []);
      if (typeof r.markup_pct === 'number') g.get(key)!.push(r.markup_pct);
    }
    const gs = [...g.entries()]
      .filter(([, v]) => v.length >= (input.group_by === 'merchant' ? 10 : 1))
      .map(([key, v]) => ({
        key: input.group_by === 'cloud_kitchen' ? (key === 'true' ? 'cloud kitchen' : 'non-cloud') : key,
        value: median(v) / 100,
        n: v.length,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, input.limit ?? 15);
    return barOutput(ctx, {
      tool: 'markup_stats',
      title: `${ctx.locale === 'id' ? 'Median markup per' : 'Median markup by'} ${input.group_by}`,
      groups: gs,
      format: 'pct',
      dataset: DS,
      tab:
        input.group_by === 'city'
          ? 'cities'
          : input.group_by === 'cuisine'
            ? 'cuisines'
            : input.group_by === 'cloud_kitchen'
              ? 'cloud'
              : 'summary',
      formulas: ['markup', 'median'],
      inputs: input,
      rows: rows.length,
      flags: FLAGS,
      data: { note: 'values are fractions (0.2373 = 23.73%)' },
    });
  },
});

const itemSearch = defineTool({
  name: 'item_search',
  description:
    'Search menu items (e.g. "nasi goreng") with optional city/cuisine filters; returns merchant, online price, estimated dine-in price and markup.',
  input: z.strictObject({
    query: z.string().min(1).max(80),
    city: z.string().max(40).optional(),
    cuisine: z.string().max(40).optional(),
    limit: z.number().int().min(1).max(20).optional(),
  }),
  label: t('Mencari menu…', 'Searching menu items…'),
  numeric: false,
  async run(ctx, input) {
    const hits = textSearch(
      filt(await items(ctx), input),
      input.query,
      ['item', 'merchant', 'cuisine'],
      input.limit ?? 10,
    );
    return {
      data: {
        results: hits.map((r) => ({
          item: r.item,
          merchant: r.merchant,
          city: r.city,
          online_price_idr: r.online_price_idr,
          est_dine_in_price_idr: r.est_dine_in_price_idr,
          markup_pct: r.markup_pct,
          promo_discount_pct: r.promo_discount_pct,
        })),
        flags: FLAGS,
      },
    };
  },
});

const priceCompare = defineTool({
  name: 'price_compare',
  description: 'Compare online vs estimated dine-in prices for a merchant or an item name across cities.',
  input: z.strictObject({ merchant: z.string().max(80).optional(), item: z.string().max(80).optional() }),
  label: t('Membandingkan harga…', 'Comparing prices…'),
  numeric: true,
  async run(ctx, input) {
    let rows = await items(ctx);
    if (input.merchant) rows = rows.filter((r) => matches(r.merchant, input.merchant, 'includes'));
    if (input.item) rows = textSearch(rows, input.item, ['item'], 200);
    const g = new Map<string, { on: number[]; off: number[] }>();
    for (const r of rows) {
      const k = String(r.city);
      if (!g.has(k)) g.set(k, { on: [], off: [] });
      g.get(k)!.on.push(r.online_price_idr as number);
      g.get(k)!.off.push(r.est_dine_in_price_idr as number);
    }
    const cities = [...g.keys()].sort();
    return {
      data: {
        matched: rows.length,
        by_city: cities.map((c) => ({
          city: c,
          n: g.get(c)!.on.length,
          median_online_idr: median(g.get(c)!.on),
          median_est_dine_in_idr: median(g.get(c)!.off),
        })),
        flags: FLAGS,
      },
      ui: [
        artifact(ctx, {
          title:
            ctx.locale === 'id'
              ? 'Harga online vs estimasi dine-in (median)'
              : 'Online vs estimated dine-in price (median)',
          summary: `${rows.length} items`,
          dataset: DS,
          tab: 'search',
          spec: {
            type: 'bar',
            categories: cities,
            series: [
              { name: 'online', values: cities.map((c) => median(g.get(c)!.on)) },
              {
                name: ctx.locale === 'id' ? 'dine-in (estimasi)' : 'dine-in (estimate)',
                values: cities.map((c) => median(g.get(c)!.off)),
              },
            ],
            horizontal: false,
            value_format: 'money_idr',
          },
        }),
      ],
      method: method(ctx, {
        tool: 'price_compare',
        formulas: ['median', 'markup'],
        inputs: input,
        rows: rows.length,
        dataset: DS,
        flags: FLAGS,
      }),
    };
  },
});

const feePromoStats = defineTool({
  name: 'fee_promo_stats',
  description: 'Median packaging fee (IDR) and promo discount (%) overall or by city/cuisine/cloud_kitchen.',
  input: z.strictObject({
    group_by: z.enum(['none', 'city', 'cuisine', 'cloud_kitchen']).optional(),
    metric: z.enum(['packaging_fee_idr', 'promo_discount_pct']).optional(),
  }),
  label: t('Menghitung biaya & promo…', 'Computing fees & promos…'),
  numeric: true,
  async run(ctx, input) {
    const rows = await items(ctx);
    const metric = input.metric ?? 'packaging_fee_idr';
    const gb = input.group_by ?? 'none';
    const g = new Map<string, number[]>();
    for (const r of rows) {
      const k = gb === 'none' ? 'all' : String(r[gb]);
      if (!g.has(k)) g.set(k, []);
      if (typeof r[metric] === 'number') g.get(k)!.push(r[metric] as number);
    }
    const gs = [...g.entries()]
      .map(([k, v]) => ({
        key: k,
        value: v.length ? (metric === 'promo_discount_pct' ? median(v) / 100 : median(v)) : null,
        n: v.length,
      }))
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    return barOutput(ctx, {
      tool: 'fee_promo_stats',
      title: `median ${metric}`,
      groups: gs,
      format: metric === 'promo_discount_pct' ? 'pct' : 'money_idr',
      dataset: DS,
      tab: 'summary',
      formulas: ['median'],
      inputs: input,
      rows: rows.length,
      flags: FLAGS,
    });
  },
});

const providerTiers = defineTool({
  name: 'provider_tiers',
  description:
    'Distribution of a PROVIDER LABEL column (inflation_distortion_tier, consumer_affordability_tier, cloud_kitchen_premium_bias, platform_take_rate_burden) — labels generated by the dataset author, not facts.',
  input: z.strictObject({
    field: z.enum([
      'inflation_distortion_tier',
      'consumer_affordability_tier',
      'cloud_kitchen_premium_bias',
      'platform_take_rate_burden',
    ]),
  }),
  label: t('Membaca label penyedia…', 'Reading provider labels…'),
  numeric: true,
  async run(ctx, input) {
    const rows = await items(ctx);
    const m = new Map<string, number>();
    for (const r of rows) {
      const v = r[`label_${input.field}`];
      if (v) m.set(String(v), (m.get(String(v)) ?? 0) + 1);
    }
    return barOutput(ctx, {
      tool: 'provider_tiers',
      title: `${input.field} (label penyedia)`,
      groups: [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, value: v })),
      format: 'int',
      dataset: DS,
      tab: 'summary',
      formulas: ['count'],
      inputs: input,
      rows: rows.length,
      flags: [...FLAGS, 'provider_label'],
    });
  },
});

export const tools: Tool<never>[] = [
  datasetInfo,
  appInfo,
  openDex,
  ...([markupStats, itemSearch, priceCompare, feePromoStats, providerTiers] as unknown as Tool<never>[]),
  dataQualityTool(async (ctx) => ctx.store.json('core/food/quality.json')),
] as unknown as Tool<never>[];
