// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// IDHousingDex (§8.5): listing statistics (subsidi vs komersil), price per m², projects, developers, map points, specs.
import { z } from 'zod';
import { median } from '../../../src/shared/analytics/stats.ts';
import { artifact, defineTool, method, t, type Tool, type ToolContext } from '../../tools/types.ts';
import { barOutput } from '../helpers.ts';
import { appInfo, dataQualityTool, datasetInfo, openDex } from '../shared-tools.ts';
import { groupStat, loadTable, matches, sortGroups, stat, textSearch, type Row, type Stat } from '../table.ts';

const DS = 'Indonesia Affordable Housing (project listings)';
const FLAGS = ['duplicates_removed', 'invalid_prices_excluded', 'not_purchase_advice'];
const rowsOf = (ctx: ToolContext) => loadTable(ctx.store, 'heavy/housing/listings.json');
const Filt = z.strictObject({
  province: z.string().max(60).optional(),
  city: z.string().max(60).optional(),
  subsidy_status: z.enum(['subsidi', 'komersil']).optional(),
  developer_association: z.string().max(40).optional(),
});
const filt = (rows: Row[], f: z.infer<typeof Filt> = {}) =>
  rows.filter(
    (r) =>
      matches(r.province, f.province, 'includes') &&
      matches(r.city, f.city, 'includes') &&
      matches(r.subsidy, f.subsidy_status) &&
      matches(r.association, f.developer_association),
  );
const GB = {
  province: 'province',
  city_regency: 'city',
  subsidy_status: 'subsidy',
  developer_association: 'association',
} as const;

const housingStats = defineTool({
  name: 'housing_stats',
  description:
    'Listing statistics grouped by province, city_regency, subsidy_status or developer_association: count, median/mean/p25/p75 price (valid prices only, Rp50 jt–Rp100 M) or share of listings.',
  input: z.strictObject({
    group_by: z.enum(['province', 'city_regency', 'subsidy_status', 'developer_association']),
    stat: z.enum(['count', 'share', 'median', 'mean', 'p25', 'p75']).optional(),
    filters: Filt.optional(),
    limit: z.number().int().min(1).max(34).optional(),
  }),
  label: t('Menghitung statistik perumahan…', 'Computing housing statistics…'),
  numeric: true,
  async run(ctx, input) {
    const rows = filt(await rowsOf(ctx), input.filters);
    const s = input.stat ?? 'median';
    const key = (r: Row) => (r[GB[input.group_by]] as string | null) ?? null;
    let gs;
    if (s === 'count' || s === 'share')
      gs = sortGroups(groupStat(rows, key, () => 1, 'count')).map((g) => ({
        ...g,
        value: s === 'share' ? g.value! / rows.length : g.value,
      }));
    else
      gs = sortGroups(
        groupStat(
          rows.filter((r) => typeof r.price_idr === 'number'),
          key,
          (r) => r.price_idr as number,
          s as Stat,
        ),
      );
    return barOutput(ctx, {
      tool: 'housing_stats',
      title: `${s} — ${input.group_by}`,
      groups: gs.slice(0, input.limit ?? 15),
      format: s === 'count' ? 'int' : s === 'share' ? 'pct' : 'money_idr',
      dataset: DS,
      tab: input.group_by === 'province' || input.group_by === 'city_regency' ? 'regions' : 'summary',
      formulas: s === 'count' ? ['count'] : s === 'share' ? ['share'] : ['median', 'dedup'],
      inputs: input,
      rows: rows.length,
      flags: FLAGS,
      data: { rows_used: rows.length },
    });
  },
});

const pricePerM2 = defineTool({
  name: 'price_per_m2',
  description:
    'Median price per m² of BUILDING area (recomputed = price ÷ building area) by subsidy_status, province or city, valid prices only.',
  input: z.strictObject({
    group_by: z.enum(['subsidy_status', 'province', 'city_regency']),
    filters: Filt.optional(),
    basis: z.enum(['building', 'land']).optional(),
    limit: z.number().int().min(1).max(34).optional(),
  }),
  label: t('Menghitung harga per m²…', 'Computing price per m²…'),
  numeric: true,
  async run(ctx, input) {
    const rows = filt(await rowsOf(ctx), input.filters);
    const f = input.basis === 'land' ? 'price_per_m2_land' : 'price_per_m2_building';
    const gs = sortGroups(
      groupStat(
        rows.filter((r) => typeof r[f] === 'number'),
        (r) => r[GB[input.group_by]] as string | null,
        (r) => r[f] as number,
        'median',
      ),
    );
    return barOutput(ctx, {
      tool: 'price_per_m2',
      title: `${ctx.locale === 'id' ? 'Median harga/m²' : 'Median price/m²'} (${input.basis ?? 'building'})`,
      groups: gs.slice(0, input.limit ?? 15),
      format: 'money_idr',
      dataset: DS,
      tab: 'regions',
      formulas: ['price_per_m2', 'median'],
      inputs: input,
      rows: rows.length,
      flags: FLAGS,
    });
  },
});

const projectSearch = defineTool({
  name: 'project_search',
  description: 'Search housing projects by name/developer with optional province/city.',
  input: z.strictObject({
    query: z.string().min(1).max(80),
    province: z.string().max(60).optional(),
    city: z.string().max(60).optional(),
    limit: z.number().int().min(1).max(20).optional(),
  }),
  label: t('Mencari proyek…', 'Searching projects…'),
  numeric: false,
  async run(ctx, input) {
    const hits = textSearch(
      filt(await rowsOf(ctx), input),
      input.query,
      ['name', 'developer', 'city', 'district'],
      input.limit ?? 10,
    );
    return {
      data: {
        results: hits.map((r) => ({
          name: r.name,
          subsidy: r.subsidy,
          province: r.province,
          city: r.city,
          price_idr: r.price_idr,
          building_m2: r.building_m2,
          land_m2: r.land_m2,
          bedrooms: r.bedrooms,
          developer: r.developer,
          association: r.association,
        })),
        flags: FLAGS,
      },
    };
  },
});

const developerSummary = defineTool({
  name: 'developer_summary',
  description:
    'Summary of one developer (listings, projects, median price) or of one developer association (share of listings).',
  input: z.strictObject({ developer: z.string().max(80).optional(), association: z.string().max(40).optional() }),
  label: t('Meringkas pengembang…', 'Summarising the developer…'),
  numeric: true,
  async run(ctx, input) {
    const all = await rowsOf(ctx);
    const rows = all.filter(
      (r) => matches(r.developer, input.developer, 'includes') && matches(r.association, input.association),
    );
    const prices = rows.map((r) => r.price_idr).filter((v): v is number => typeof v === 'number');
    const assoc = sortGroups(
      groupStat(
        all,
        (r) => r.association as string | null,
        () => 1,
        'count',
      ),
    ).map((g) => ({ ...g, value: g.value! / all.length }));
    return barOutput(ctx, {
      tool: 'developer_summary',
      title: ctx.locale === 'id' ? 'Porsi listing per asosiasi pengembang' : 'Listing share by developer association',
      groups: assoc.slice(0, 8),
      format: 'pct',
      dataset: DS,
      tab: 'developers',
      formulas: ['share', 'median'],
      inputs: input,
      rows: all.length,
      flags: FLAGS,
      data: {
        matched_listings: rows.length,
        projects: new Set(rows.map((r) => r.name)).size,
        median_price_idr: prices.length ? median(prices) : null,
      },
    });
  },
});

const mapPoints = defineTool({
  name: 'map_points',
  description:
    'Project coordinates for a map (valid Indonesian coordinates only; ≤ 2,000 points, sampled evenly) for a province and/or subsidy status.',
  input: z.strictObject({
    province: z.string().max(60).optional(),
    subsidy_status: z.enum(['subsidi', 'komersil']).optional(),
  }),
  label: t('Menyiapkan peta proyek…', 'Preparing the project map…'),
  numeric: true,
  async run(ctx, input) {
    const rows = filt(await rowsOf(ctx), input).filter((r) => typeof r.lat === 'number' && typeof r.lon === 'number');
    const step = Math.max(1, Math.ceil(rows.length / 2000));
    const pts = rows
      .filter((_, i) => i % step === 0)
      .slice(0, 2000)
      .map((r) => ({
        lat: r.lat as number,
        lon: r.lon as number,
        value: (r.price_idr as number | null) ?? null,
        label: String(r.name),
        group: String(r.subsidy),
      }));
    return {
      data: {
        points_total: rows.length,
        points_shown: pts.length,
        median_price_idr: stat(
          rows.map((r) => (r.price_idr as number) ?? NaN),
          'median',
        ),
      },
      ui: [
        artifact(ctx, {
          title: ctx.locale === 'id' ? 'Peta proyek perumahan' : 'Housing project map',
          summary: `${rows.length} ${ctx.locale === 'id' ? 'titik' : 'points'}`,
          dataset: DS,
          tab: 'map',
          spec: { type: 'map', points: pts, value_format: 'money_idr' },
        }),
      ],
      method: method(ctx, {
        tool: 'map_points',
        formulas: ['count'],
        extraSteps: [
          {
            id: 'Koordinat di luar kotak Indonesia (lat −11,5…6,5; lon 94…141,5) atau kosong tidak dipetakan.',
            en: 'Coordinates outside the Indonesia box (lat −11.5…6.5; lon 94…141.5) or missing are not plotted.',
          },
        ],
        inputs: input,
        rows: rows.length,
        dataset: DS,
        flags: FLAGS,
      }),
    };
  },
});

const specsBreakdown = defineTool({
  name: 'specs_breakdown',
  description:
    'Distribution of a specification (bedrooms, bathrooms, floors, roof/wall/floor/foundation material), optionally for subsidi or komersil.',
  input: z.strictObject({
    field: z.enum([
      'bedrooms',
      'bathrooms',
      'floors',
      'roof_material',
      'wall_material',
      'floor_material',
      'foundation_material',
    ]),
    subsidy_status: z.enum(['subsidi', 'komersil']).optional(),
    limit: z.number().int().min(1).max(20).optional(),
  }),
  label: t('Menghitung spesifikasi…', 'Counting specifications…'),
  numeric: true,
  async run(ctx, input) {
    const col = {
      bedrooms: 'bedrooms',
      bathrooms: 'bathrooms',
      floors: 'floors',
      roof_material: 'roof',
      wall_material: 'wall',
      floor_material: 'floor',
      foundation_material: 'foundation',
    }[input.field];
    const rows = filt(await rowsOf(ctx), input.subsidy_status ? { subsidy_status: input.subsidy_status } : {});
    const gs = sortGroups(
      groupStat(
        rows,
        (r) => (r[col] === null || r[col] === undefined ? null : String(r[col])),
        () => 1,
        'count',
      ),
    ).map((g) => ({ ...g, value: g.value! / rows.length }));
    return barOutput(ctx, {
      tool: 'specs_breakdown',
      title: input.field,
      groups: gs.slice(0, input.limit ?? 10),
      format: 'pct',
      dataset: DS,
      tab: 'specs',
      formulas: ['share'],
      inputs: input,
      rows: rows.length,
      flags: [...FLAGS, ...(input.field === 'bedrooms' ? ['bedrooms_0_not_reported'] : [])],
    });
  },
});

export const tools: Tool<never>[] = [
  datasetInfo,
  appInfo,
  openDex,
  ...([
    housingStats,
    pricePerM2,
    projectSearch,
    developerSummary,
    mapPoints,
    specsBreakdown,
  ] as unknown as Tool<never>[]),
  dataQualityTool(async (ctx) => ctx.store.json('core/housing/quality.json')),
] as unknown as Tool<never>[];
