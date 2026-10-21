// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// CostLivingDex (§8.5): city cost-of-living / quality-of-life indices. EVERY value is SYNTHETIC (pattern-based) → flagged.
import { z } from 'zod';
import { defineTool, t, type Tool, type ToolContext } from '../../tools/types.ts';
import { barOutput, tableOutput } from '../helpers.ts';
import { appInfo, dataQualityTool, datasetInfo, openDex } from '../shared-tools.ts';
import { matches, textSearch, type Row } from '../table.ts';

const DS = 'Global City Cost of Living & Quality of Life Index (synthetic)';
const FLAGS = ['synthetic'];
const NOTE = {
  synthetic: true,
  label_id: 'data sintetis (pola Numbeo/Mercer/EIU), bukan hasil survei nyata',
  label_en: 'synthetic data (Numbeo/Mercer/EIU-like patterns), not real survey results',
};
const summaryOf = (ctx: ToolContext) =>
  ctx.store.json<{ rows_table: Row[]; survey_dates: string[] }>('core/costliving/summary.json');
async function rowsAt(ctx: ToolContext, date?: string) {
  const s = await summaryOf(ctx);
  const d = date && s.survey_dates.includes(date) ? date : s.survey_dates.at(-1)!;
  return { rows: s.rows_table.filter((r) => r.survey_date === d), date: d, dates: s.survey_dates };
}
const METRICS = [
  'cost_of_living_index',
  'rent_index',
  'groceries_index',
  'restaurant_price_index',
  'local_purchasing_power_index',
  'avg_monthly_net_salary_usd',
  'housing_price_to_income_ratio',
  'health_care_index',
  'safety_index',
  'pollution_index',
  'traffic_commute_index',
  'climate_index',
  'internet_speed_mbps',
  'quality_of_life_index',
] as const;
const Metric = z.enum(METRICS);

const rankCities = defineTool({
  name: 'rank_cities',
  description:
    'Rank cities by an index (default cost_of_living_index) at a survey date (default latest), optional country/region filter. Values are SYNTHETIC — always say so.',
  input: z.strictObject({
    metric: Metric.optional(),
    order: z.enum(['desc', 'asc']).optional(),
    country: z.string().max(60).optional(),
    region: z.string().max(60).optional(),
    survey_date: z.string().max(10).optional(),
    limit: z.number().int().min(1).max(30).optional(),
  }),
  label: t('Mengurutkan kota…', 'Ranking cities…'),
  numeric: true,
  async run(ctx, input) {
    const m = input.metric ?? 'cost_of_living_index';
    const { rows: all, date } = await rowsAt(ctx, input.survey_date);
    const rows = all.filter(
      (r) =>
        typeof r[m] === 'number' && matches(r.country, input.country) && matches(r.region, input.region, 'includes'),
    );
    const dir = input.order === 'asc' ? 1 : -1;
    const top = [...rows]
      .sort((a, b) => dir * ((a[m] as number) - (b[m] as number)) || String(a.city).localeCompare(String(b.city)))
      .slice(0, input.limit ?? 10);
    return barOutput(ctx, {
      tool: 'rank_cities',
      title: `${m} (${date})`,
      groups: top.map((r) => ({ key: `${r.city as string}, ${r.country as string}`, value: r[m] as number })),
      format: m.endsWith('_usd') ? 'money_usd' : 'num',
      dataset: DS,
      tab: 'ranking',
      formulas: ['rank'],
      inputs: input,
      rows: rows.length,
      flags: FLAGS,
      asOf: date,
      data: {
        ...NOTE,
        survey_date: date,
        metric: m,
        rows: top.map((r) => ({ city: r.city, country: r.country, value: r[m] })),
      },
    });
  },
});

const cityProfile = defineTool({
  name: 'city_profile',
  description:
    'All indices for one or more cities across survey dates (synthetic values) plus the provider analyst note.',
  input: z.strictObject({ cities: z.array(z.string().max(60)).min(1).max(6) }),
  label: t('Mengambil profil kota…', 'Fetching city profile…'),
  numeric: true,
  async run(ctx, input) {
    const s = await summaryOf(ctx);
    const out: Row[] = [];
    for (const q of input.cities) {
      const name = (
        s.rows_table.find((r) => matches(r.city, q)) ?? textSearch(s.rows_table, q, ['city', 'country'], 1)[0]
      )?.city;
      if (!name) {
        out.push({ query: q, error: 'not_found' });
        continue;
      }
      for (const r of s.rows_table.filter((r) => r.city === name))
        out.push({
          city: r.city,
          country: r.country,
          survey_date: r.survey_date,
          cost_of_living_index: r.cost_of_living_index,
          rent_index: r.rent_index,
          quality_of_life_index: r.quality_of_life_index,
          safety_index: r.safety_index,
          avg_monthly_net_salary_usd: r.avg_monthly_net_salary_usd,
          qol_category: r.qol_category,
          provider_note: r.analyst_note,
        });
    }
    return tableOutput(ctx, {
      tool: 'city_profile',
      title: ctx.locale === 'id' ? 'Profil kota (sintetis)' : 'City profile (synthetic)',
      columns: [
        { key: 'city', label: 'City', format: 'text' },
        { key: 'survey_date', label: 'Survey', format: 'date' },
        { key: 'cost_of_living_index', label: 'CoL', format: 'num' },
        { key: 'quality_of_life_index', label: 'QoL', format: 'num' },
        { key: 'avg_monthly_net_salary_usd', label: 'Salary', format: 'money_usd' },
      ],
      rows: out,
      dataset: DS,
      tab: 'cities',
      formulas: [],
      inputs: input,
      rowsUsed: out.length,
      flags: FLAGS,
      data: NOTE,
    });
  },
});

const compareSurveys = defineTool({
  name: 'compare_surveys',
  description: 'Change of an index for a city between the two survey dates (synthetic values).',
  input: z.strictObject({ city: z.string().max(60), metric: Metric.optional() }),
  label: t('Membandingkan survei…', 'Comparing surveys…'),
  numeric: true,
  async run(ctx, input) {
    const m = input.metric ?? 'cost_of_living_index';
    const s = await summaryOf(ctx);
    const rows = s.rows_table
      .filter((r) => matches(r.city, input.city))
      .sort((a, b) => String(a.survey_date).localeCompare(String(b.survey_date)));
    const v = rows.map((r) => (typeof r[m] === 'number' ? (r[m] as number) : null));
    const change = v.length >= 2 && v[0] !== null && v.at(-1) !== null ? (v.at(-1) as number) - (v[0] as number) : null;
    return barOutput(ctx, {
      tool: 'compare_surveys',
      title: `${input.city}: ${m}`,
      groups: rows.map((r, i) => ({ key: String(r.survey_date), value: v[i] ?? null })),
      format: 'num',
      dataset: DS,
      tab: 'cities',
      formulas: [],
      inputs: input,
      rows: rows.length,
      flags: FLAGS,
      horizontal: false,
      data: { ...NOTE, change_points: change },
    });
  },
});

export const tools: Tool<never>[] = [
  datasetInfo,
  appInfo,
  openDex,
  ...([rankCities, cityProfile, compareSurveys] as unknown as Tool<never>[]),
  dataQualityTool(async (ctx) => ctx.store.json('core/costliving/quality.json')),
] as unknown as Tool<never>[];
