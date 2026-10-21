// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// PovertyDex (§8.5): Multidimensional Poverty Index per country. Survey years differ per country → always shown.
import { z } from 'zod';
import { defineTool, t, ToolError, type Tool, type ToolContext } from '../../tools/types.ts';
import { barOutput, tableOutput } from '../helpers.ts';
import { appInfo, dataQualityTool, datasetInfo, openDex } from '../shared-tools.ts';
import { matches } from '../table.ts';

const DS = 'Multidimensional Poverty Index (MPI)';
const FLAGS = ['survey_year_varies'];
interface C {
  iso3: string;
  country: string;
  year: string | null;
  note: string | null;
  values: Record<string, number | null>;
  dimension: Record<string, string | null>;
}
const load = (ctx: ToolContext) =>
  ctx.store.json<{ countries_table: C[]; indicators: { indicatorCode: string; indicator: string }[] }>(
    'core/poverty/summary.json',
  );
const IND = [
  'mpi_value',
  'mpi_headcount',
  'mpi_intensity',
  'nutrition',
  'child_mortality',
  'years_of_schooling',
  'school_attendance',
  'cooking_fuel',
  'sanitation',
  'drinking_water',
  'electricity',
  'housing',
  'assets',
] as const;

const countryMpi = defineTool({
  name: 'country_mpi',
  description:
    'MPI value (0–1), headcount % (share of people multidimensionally poor), intensity % and indicator contributions % for a country, with survey year and survey source note (e.g. "Survey: DHS (2017)").',
  input: z.strictObject({ country: z.string().max(60) }),
  label: t('Mengambil MPI negara…', 'Fetching country MPI…'),
  numeric: true,
  async run(ctx, input) {
    const s = await load(ctx);
    const c =
      s.countries_table.find((x) => matches(x.country, input.country) || matches(x.iso3, input.country)) ??
      s.countries_table.find((x) => matches(x.country, input.country, 'includes'));
    if (!c)
      throw new ToolError(
        `Country "${input.country}" is not in this MPI dataset (108 countries). Use rank_mpi to list available countries.`,
      );
    const contrib = IND.slice(3).map((k) => ({ key: k, value: c.values[k] ?? null }));
    return barOutput(ctx, {
      tool: 'country_mpi',
      title: `${c.country} — ${ctx.locale === 'id' ? 'kontribusi indikator' : 'indicator contributions'} (${c.year ?? '?'})`,
      groups: contrib,
      format: 'pp',
      dataset: DS,
      tab: 'countries',
      formulas: [],
      inputs: input,
      rows: 1,
      flags: FLAGS,
      asOf: c.year,
      data: {
        country: c.country,
        iso3: c.iso3,
        survey_year: c.year,
        survey_note: c.note,
        mpi_value: c.values.mpi_value,
        headcount_pct: c.values.mpi_headcount,
        headcount_fraction: typeof c.values.mpi_headcount === 'number' ? c.values.mpi_headcount / 100 : null,
        intensity_pct: c.values.mpi_intensity,
      },
    });
  },
});

const rankMpi = defineTool({
  name: 'rank_mpi',
  description:
    'Rank countries by an MPI indicator (default mpi_value). Each row carries its own survey year — values are not same-year comparable.',
  input: z.strictObject({
    indicator: z.enum(IND).optional(),
    order: z.enum(['desc', 'asc']).optional(),
    limit: z.number().int().min(1).max(30).optional(),
  }),
  label: t('Mengurutkan MPI…', 'Ranking MPI…'),
  numeric: true,
  async run(ctx, input) {
    const k = input.indicator ?? 'mpi_value';
    const rows = (await load(ctx)).countries_table.filter((c) => typeof c.values[k] === 'number');
    const dir = input.order === 'asc' ? 1 : -1;
    const top = [...rows]
      .sort((a, b) => dir * (a.values[k]! - b.values[k]!) || a.country.localeCompare(b.country))
      .slice(0, input.limit ?? 10);
    return barOutput(ctx, {
      tool: 'rank_mpi',
      title: k,
      groups: top.map((c) => ({ key: `${c.country} (${c.year ?? '?'})`, value: c.values[k]! })),
      format: k === 'mpi_value' ? 'num' : 'pp',
      dataset: DS,
      tab: 'ranking',
      formulas: ['rank'],
      inputs: input,
      rows: rows.length,
      flags: FLAGS,
      data: {
        indicator: k,
        rows: top.map((c) => ({ country: c.country, survey_year: c.year, survey_note: c.note, value: c.values[k] })),
      },
    });
  },
});

const compareMpi = defineTool({
  name: 'compare_mpi',
  description: 'Side-by-side MPI value, headcount and intensity for up to 8 countries (with survey years).',
  input: z.strictObject({ countries: z.array(z.string().max(60)).min(2).max(8) }),
  label: t('Membandingkan MPI…', 'Comparing MPI…'),
  numeric: true,
  async run(ctx, input) {
    const s = await load(ctx);
    const rows = input.countries
      .map((q) => s.countries_table.find((x) => matches(x.country, q) || matches(x.iso3, q)))
      .filter((c): c is C => !!c)
      .map((c) => ({
        country: c.country,
        survey_year: c.year,
        survey_note: c.note,
        mpi_value: c.values.mpi_value,
        headcount_pct: c.values.mpi_headcount,
        intensity_pct: c.values.mpi_intensity,
      }));
    return tableOutput(ctx, {
      tool: 'compare_mpi',
      title: 'MPI',
      columns: [
        { key: 'country', label: 'Country', format: 'text' },
        { key: 'survey_year', label: 'Survey', format: 'text' },
        { key: 'mpi_value', label: 'MPI', format: 'num' },
        { key: 'headcount_pct', label: 'H %', format: 'pp' },
        { key: 'intensity_pct', label: 'A %', format: 'pp' },
      ],
      rows,
      dataset: DS,
      tab: 'countries',
      formulas: [],
      inputs: input,
      rowsUsed: rows.length,
      flags: FLAGS,
    });
  },
});

export const tools: Tool<never>[] = [
  datasetInfo,
  appInfo,
  openDex,
  ...([countryMpi, rankMpi, compareMpi] as unknown as Tool<never>[]),
  dataQualityTool(async (ctx) => ctx.store.json('core/poverty/quality.json')),
] as unknown as Tool<never>[];
