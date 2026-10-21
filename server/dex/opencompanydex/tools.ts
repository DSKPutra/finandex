// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// OpenCompanyDex (§8.5): company search, counts by group, funded share, business models (2% sample).
import { z } from 'zod';
import { median } from '../../../src/shared/analytics/stats.ts';
import { defineTool, t, type Tool, type ToolContext } from '../../tools/types.ts';
import { barOutput } from '../helpers.ts';
import { appInfo, dataQualityTool, datasetInfo, openDex } from '../shared-tools.ts';
import { loadTable, matches, textSearch, type Row } from '../table.ts';

const DS = 'Open Company Database 2026 (2% sample, 100,000 companies)';
const FLAGS = ['sample_2pct', 'many_empty_columns', 'cc_by_nc'];
const rowsOf = (ctx: ToolContext) => loadTable(ctx.store, 'heavy/opencompany/companies.json');
const Filt = z.strictObject({
  country: z.string().max(60).optional(),
  sector: z.string().max(60).optional(),
  status: z.string().max(40).optional(),
});
const filt = (rows: Row[], f: z.infer<typeof Filt> = {}) =>
  rows.filter((r) => matches(r.country, f.country) && matches(r.sector, f.sector) && matches(r.status, f.status));
const decade = (y: unknown) => (typeof y === 'number' ? `${Math.floor(y / 10) * 10}s` : null);

const companySearch = defineTool({
  name: 'company_search',
  description: 'Search companies by name/domain with optional country & sector filters.',
  input: z.strictObject({
    query: z.string().min(1).max(80),
    country: z.string().max(60).optional(),
    sector: z.string().max(60).optional(),
    limit: z.number().int().min(1).max(20).optional(),
  }),
  label: t('Mencari perusahaan…', 'Searching companies…'),
  numeric: false,
  async run(ctx, input) {
    const hits = textSearch(
      filt(await rowsOf(ctx), input),
      input.query,
      ['name', 'domain', 'industry'],
      input.limit ?? 10,
    );
    return {
      data: {
        results: hits.map((r) => ({
          name: r.name,
          domain: r.domain,
          country: r.country,
          founded_year: r.founded_year,
          sector: r.sector,
          industry: r.industry,
          status: r.status,
          is_funded: r.is_funded,
        })),
        flags: FLAGS,
      },
    };
  },
});

const companyCounts = defineTool({
  name: 'company_counts',
  description:
    'Number of companies grouped by country, sector, industry, status, founded_decade or employees_range (optionally filtered), or the total (group_by=none) — e.g. "how many Indonesian companies".',
  input: z.strictObject({
    group_by: z.enum(['none', 'country', 'sector', 'industry', 'status', 'founded_decade', 'employees_range']),
    filters: Filt.optional(),
    limit: z.number().int().min(1).max(30).optional(),
  }),
  label: t('Menghitung perusahaan…', 'Counting companies…'),
  numeric: true,
  async run(ctx, input) {
    const rows = filt(await rowsOf(ctx), input.filters);
    const m = new Map<string, number>();
    for (const r of rows) {
      const k =
        input.group_by === 'none'
          ? 'all'
          : input.group_by === 'founded_decade'
            ? decade(r.founded_year)
            : (r[input.group_by] as string | null);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    const gs = [...m.entries()]
      .sort((a, b) => (input.group_by === 'founded_decade' ? (a[0] < b[0] ? -1 : 1) : b[1] - a[1]))
      .slice(0, input.limit ?? 15)
      .map(([k, v]) => ({ key: k, value: v }));
    const fy = rows.map((r) => r.founded_year).filter((v): v is number => typeof v === 'number');
    return barOutput(ctx, {
      tool: 'company_counts',
      title: `${ctx.locale === 'id' ? 'Jumlah perusahaan' : 'Companies'} — ${input.group_by}`,
      groups: gs,
      format: 'int',
      dataset: DS,
      tab: 'map',
      formulas: ['count'],
      inputs: input,
      rows: rows.length,
      flags: FLAGS,
      data: { matched: rows.length, median_founded_year: fy.length ? median(fy) : null },
    });
  },
});

const fundedShare = defineTool({
  name: 'funded_share',
  description: 'Share of companies that were ever funded (is_funded), overall or per group (country, sector, status).',
  input: z.strictObject({
    group_by: z.enum(['none', 'country', 'sector', 'status']),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  label: t('Menghitung porsi didanai…', 'Computing funded share…'),
  numeric: true,
  async run(ctx, input) {
    const rows = await rowsOf(ctx);
    const m = new Map<string, { n: number; f: number }>();
    for (const r of rows) {
      const k = input.group_by === 'none' ? 'all' : (r[input.group_by] as string | null);
      if (!k) continue;
      if (!m.has(k)) m.set(k, { n: 0, f: 0 });
      const o = m.get(k)!;
      o.n++;
      if (r.is_funded !== false) o.f++;
    }
    const gs = [...m.entries()]
      .filter(([, o]) => o.n >= (input.group_by === 'none' ? 1 : 30))
      .map(([k, o]) => ({ key: k, value: o.f / o.n, n: o.n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, input.limit ?? 15);
    return barOutput(ctx, {
      tool: 'funded_share',
      title: ctx.locale === 'id' ? 'Porsi pernah didanai' : 'Ever-funded share',
      groups: gs,
      format: 'pct',
      dataset: DS,
      tab: 'status',
      formulas: ['share'],
      inputs: input,
      rows: rows.length,
      flags: FLAGS,
    });
  },
});

const businessModels = defineTool({
  name: 'business_models',
  description: 'Most common business-model tags (business_model split by "|").',
  input: z.strictObject({ limit: z.number().int().min(1).max(25).optional(), country: z.string().max(60).optional() }),
  label: t('Menghitung model bisnis…', 'Counting business models…'),
  numeric: true,
  async run(ctx, input) {
    const rows = filt(await rowsOf(ctx), input.country ? { country: input.country } : {});
    const m = new Map<string, number>();
    for (const r of rows)
      if (r.business_model)
        for (const b of String(r.business_model).split('|')) m.set(b.trim(), (m.get(b.trim()) ?? 0) + 1);
    const gs = [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, input.limit ?? 10)
      .map(([k, v]) => ({ key: k, value: v }));
    return barOutput(ctx, {
      tool: 'business_models',
      title: ctx.locale === 'id' ? 'Model bisnis' : 'Business models',
      groups: gs,
      format: 'int',
      dataset: DS,
      tab: 'sectors',
      formulas: ['count'],
      inputs: input,
      rows: rows.length,
      flags: FLAGS,
    });
  },
});

export const tools: Tool<never>[] = [
  datasetInfo,
  appInfo,
  openDex,
  ...([companySearch, companyCounts, fundedShare, businessModels] as unknown as Tool<never>[]),
  dataQualityTool(async (ctx) => ctx.store.json('core/opencompany/quality.json')),
] as unknown as Tool<never>[];
