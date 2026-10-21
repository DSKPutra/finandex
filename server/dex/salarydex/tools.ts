// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// SalaryDex (§8.5): salary statistics with n ≥ 30, comparisons, skill premium, top skills, distribution.
import { z } from 'zod';
import { median } from '../../../src/shared/analytics/stats.ts';
import { fmtMoney } from '../../../src/shared/format.ts';
import { artifact, defineTool, method, ToolError, t, type Tool, type ToolContext } from '../../tools/types.ts';
import { barOutput, infoCard } from '../helpers.ts';
import { appInfo, dataQualityTool, datasetInfo, openDex } from '../shared-tools.ts';
import { groupStat, histogram, loadTable, matches, MIN_N, sortGroups, stat, type Row } from '../table.ts';

const DS = 'Global Salary Data by Skill & Role (16% sample, 100,060 postings)';
const FLAGS = ['sample_16pct', 'fixed_fx_not_ppp', 'cc_by_nc'];
const rowsOf = (ctx: ToolContext) => loadTable(ctx.store, 'heavy/salary/rows.f.json');

const Filters = z.strictObject({
  country: z.string().max(40).optional(),
  role_family: z.string().max(40).optional(),
  seniority: z.string().max(40).optional(),
  skill: z.string().max(60).optional(),
  industry: z.string().max(60).optional(),
});
type F = z.infer<typeof Filters>;

function filter(rows: Row[], f: F): Row[] {
  const cc = f.country?.trim();
  return rows.filter(
    (r) =>
      (!cc || matches(r.country, cc) || matches(r.country_name, cc)) &&
      matches(r.role_family, f.role_family) &&
      matches(r.seniority, f.seniority) &&
      matches(r.industry, f.industry) &&
      (!f.skill ||
        String(r.skills ?? '')
          .split('|')
          .some((s) => matches(s.trim(), f.skill))),
  );
}
const usd = (r: Row) => (typeof r.mid_usd === 'number' ? r.mid_usd : NaN);

const salaryStats = defineTool({
  name: 'salary_stats',
  description:
    'Salary statistic (p25/median/p75/mean/count, USD per year at a fixed FX table — not PPP) for postings matching filters (country ISO2 like US/IN/ID or name, role_family e.g. software-eng, seniority, skill, industry). Median only if n ≥ 30.',
  input: z.strictObject({ filters: Filters, stat: z.enum(['p25', 'median', 'p75', 'mean', 'count']).optional() }),
  label: t('Menghitung statistik gaji…', 'Computing salary statistics…'),
  numeric: true,
  async run(ctx, input) {
    const all = await rowsOf(ctx);
    const rows = filter(all, input.filters);
    const vals = rows.map(usd).filter(Number.isFinite);
    const s = input.stat ?? 'median';
    const enough = s === 'count' || vals.length >= MIN_N;
    const res = {
      n: vals.length,
      stat: s,
      value: enough ? stat(vals, s) : null,
      p25: enough ? stat(vals, 'p25') : null,
      median: enough ? stat(vals, 'median') : null,
      p75: enough ? stat(vals, 'p75') : null,
      insufficient: !enough,
      rows_in_dataset: all.length,
    };
    return {
      data: {
        filters: input.filters,
        ...res,
        unit: 'USD per year (fixed FX, not PPP)',
        note: enough ? undefined : `data tidak cukup (n < ${MIN_N})`,
      },
      ui: [
        enough
          ? artifact(ctx, {
              title: ctx.locale === 'id' ? 'Distribusi gaji (USD/tahun)' : 'Salary distribution (USD/yr)',
              summary: `median ${fmtMoney(res.median, 'USD', ctx.locale)} (n = ${vals.length})`,
              dataset: DS,
              tab: 'benchmark',
              spec: {
                type: 'histogram',
                bins: histogram(vals, 24),
                median: res.median,
                n: vals.length,
                value_format: 'money_usd',
              },
            })
          : infoCard(
              ctx,
              ctx.locale === 'id' ? 'Data tidak cukup' : 'Not enough data',
              ctx.locale === 'id'
                ? `Hanya ${vals.length} lowongan cocok (n < ${MIN_N}); statistik tidak ditampilkan.`
                : `Only ${vals.length} postings match (n < ${MIN_N}); statistics are not shown.`,
              DS,
              'warning',
            ),
      ],
      method: method(ctx, {
        tool: 'salary_stats',
        formulas: ['median', 'count'],
        extraSteps: [
          { id: `Statistik hanya ditampilkan bila n ≥ ${MIN_N}.`, en: `Statistics are shown only when n ≥ ${MIN_N}.` },
        ],
        inputs: input,
        rows: vals.length,
        dataset: DS,
        flags: [...FLAGS, ...(enough ? [] : ['insufficient_n'])],
      }),
    };
  },
});

const compareSalaries = defineTool({
  name: 'compare_salaries',
  description:
    'Compare median salaries (USD/yr, fixed FX — differences also reflect exchange rates) of 2–6 filter groups, e.g. software-eng in US vs IN.',
  input: z.strictObject({
    groups: z
      .array(z.strictObject({ label: z.string().max(40), filters: Filters }))
      .min(2)
      .max(6),
  }),
  label: t('Membandingkan gaji…', 'Comparing salaries…'),
  numeric: true,
  async run(ctx, input) {
    const all = await rowsOf(ctx);
    const gs = input.groups.map((g) => {
      const v = filter(all, g.filters).map(usd).filter(Number.isFinite);
      return { key: g.label, value: v.length >= MIN_N ? median(v) : null, n: v.length };
    });
    return barOutput(ctx, {
      tool: 'compare_salaries',
      title: ctx.locale === 'id' ? 'Median gaji (USD/tahun)' : 'Median salary (USD/yr)',
      groups: gs,
      format: 'money_usd',
      dataset: DS,
      tab: 'countries',
      formulas: ['median'],
      inputs: input,
      rows: gs.reduce((a, g) => a + g.n, 0),
      flags: FLAGS,
      data: { unit: 'USD per year (fixed FX, not PPP)' },
    });
  },
});

const skillPremium = defineTool({
  name: 'skill_premium',
  description:
    'Median salary of postings WITH a skill vs WITHOUT it (among postings that list skills), optionally in one country. Skills are listed in only ~17% of postings.',
  input: z.strictObject({ skill: z.string().min(1).max(60), country: z.string().max(40).optional() }),
  label: t('Menghitung premi skill…', 'Computing the skill premium…'),
  numeric: true,
  async run(ctx, input) {
    const base = filter(await rowsOf(ctx), { ...(input.country ? { country: input.country } : {}) }).filter(
      (r) => r.skills,
    );
    const has = base.filter((r) =>
      String(r.skills)
        .split('|')
        .some((s) => matches(s.trim(), input.skill)),
    );
    const not = base.filter((r) => !has.includes(r));
    const a = has.map(usd).filter(Number.isFinite);
    const b = not.map(usd).filter(Number.isFinite);
    const ma = a.length >= MIN_N ? median(a) : null;
    const mb = b.length >= MIN_N ? median(b) : null;
    return barOutput(ctx, {
      tool: 'skill_premium',
      title: `${input.skill}: ${ctx.locale === 'id' ? 'dengan vs tanpa' : 'with vs without'}`,
      groups: [
        { key: ctx.locale === 'id' ? 'dengan skill' : 'with skill', value: ma, n: a.length },
        { key: ctx.locale === 'id' ? 'tanpa skill' : 'without', value: mb, n: b.length },
      ],
      format: 'money_usd',
      dataset: DS,
      tab: 'skills',
      formulas: ['median'],
      inputs: input,
      rows: base.length,
      flags: [...FLAGS, 'skills_listed_in_minority_of_postings'],
      data: { premium: ma !== null && mb !== null ? ma / mb - 1 : null },
    });
  },
});

const topSkills = defineTool({
  name: 'top_skills',
  description: 'Most frequently listed skills (postings count), optionally for a country and/or role family.',
  input: z.strictObject({
    country: z.string().max(40).optional(),
    role_family: z.string().max(40).optional(),
    limit: z.number().int().min(1).max(25).optional(),
  }),
  label: t('Menghitung skill teratas…', 'Counting top skills…'),
  numeric: true,
  async run(ctx, input) {
    const rows = filter(await rowsOf(ctx), {
      ...(input.country ? { country: input.country } : {}),
      ...(input.role_family ? { role_family: input.role_family } : {}),
    });
    const m = new Map<string, number>();
    for (const r of rows)
      if (r.skills) for (const s of String(r.skills).split('|')) m.set(s.trim(), (m.get(s.trim()) ?? 0) + 1);
    const gs = [...m.entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, input.limit ?? 10)
      .map(([k, v]) => ({ key: k, value: v }));
    return barOutput(ctx, {
      tool: 'top_skills',
      title: ctx.locale === 'id' ? 'Skill paling sering muncul' : 'Most listed skills',
      groups: gs,
      format: 'int',
      dataset: DS,
      tab: 'skills',
      formulas: ['count'],
      inputs: input,
      rows: rows.length,
      flags: FLAGS,
    });
  },
});

const salaryDistribution = defineTool({
  name: 'salary_distribution',
  description:
    'Median salary per group (country, role_family or seniority) for postings matching optional filters; groups with n < 30 are hidden.',
  input: z.strictObject({
    group_by: z.enum(['country', 'role_family', 'seniority']),
    filters: Filters.optional(),
    limit: z.number().int().min(1).max(30).optional(),
  }),
  label: t('Menyusun distribusi gaji…', 'Building the salary distribution…'),
  numeric: true,
  async run(ctx, input) {
    const rows = filter(await rowsOf(ctx), input.filters ?? {}).filter((r) => Number.isFinite(usd(r)));
    const gs = sortGroups(
      groupStat(rows, (r) => r[input.group_by] as string | null, usd, 'median').filter((g) => g.n >= MIN_N),
    ).slice(0, input.limit ?? 15);
    return barOutput(ctx, {
      tool: 'salary_distribution',
      title: `${ctx.locale === 'id' ? 'Median gaji per' : 'Median salary by'} ${input.group_by}`,
      groups: gs,
      format: 'money_usd',
      dataset: DS,
      tab: input.group_by === 'country' ? 'countries' : 'roles',
      formulas: ['median'],
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
  ...([salaryStats, compareSalaries, skillPremium, topSkills, salaryDistribution] as unknown as Tool<never>[]),
  dataQualityTool(async (ctx) => ctx.store.json('core/salary/quality.json')),
] as unknown as Tool<never>[];
export { ToolError };
