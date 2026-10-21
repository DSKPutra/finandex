// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Fliar Research samples (CC BY-NC 4.0): SalaryDex #18, StartupDex #19, OpenCompanyDex #21, VCNetworkDex #23, VCDex #24.
// Port of run_salary/run_startup/run_companies/run_vcnet/run_vcdir in kit/reference/finandex_reference_x.py.
import { fnum, med, nlargest, sum, valueCounts } from '../../../src/shared/analytics/stats.ts';
import { sanitizeText, truncate } from '../../../src/shared/text.ts';
import { bool, num, readCsv, str, type Row } from '../lib/csv.ts';
import { columnar } from '../lib/frame.ts';
import { x } from '../lib/io.ts';
import type { DexModule, ModuleResult } from '../lib/module.ts';

const SALARY = () => x('Global_Salary_Data_by_Skill__Role_620k_jobs', 'skill_salary_percentiles_global_sample.csv');
const STARTUP = () => x('Global_Startup_Funding_Rounds_2019_2026', 'global_startup_funding_sample.csv');
const COMPANIES = () => x('Open_Company_Database_5M_companies_2026', 'open_company_database_sample.csv');
const VCNET = () => x('VC_Co-Investment_Network-_303k_Investor_Pairs', 'investor_coinvestment_network_sample.csv');
const VCDIR = () => x('VC_Investor_Directory_2026-_35k_Startup_Investors', 'vc_investor_directory_sample.csv');
const LICENCE = 'CC BY-NC 4.0 (Fliar Research) — non-commercial only';

const head = <T,>(xs: [T, number][], n: number) => Object.fromEntries(xs.slice(0, n)) as Record<string, number>;
const groupVals = (rows: Row[], key: string, val: string) => {
  const m = new Map<string, number[]>();
  for (const r of rows) {
    const k = str(r[key]);
    if (k === null) continue;
    if (!m.has(k)) m.set(k, []);
    const v = num(r[val]);
    if (!Number.isNaN(v)) m.get(k)!.push(v);
  }
  return m;
};
const sortedEntries = <V,>(m: Map<string, V>) => [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));

// ------------------------------------------------------------------------------------------------ SalaryDex
export const salaryModule: DexModule = {
  name: 'salary',
  dex: ['salarydex'],
  inputs: [18],
  requires: () => [SALARY()],
  async build(): Promise<ModuleResult> {
    const df = readCsv(SALARY());
    const mid = (rows: Row[]) => med(rows.map((r) => num(r.salary_mid_usd)));
    const sw = df.filter((r) => r.role_family === 'software-eng');
    const skillRows: { skill: string; r: Row }[] = [];
    for (const r of df) {
      const s = str(r.skills);
      if (s === null) continue;
      for (const k of s.split('|')) skillRows.push({ skill: k.trim(), r });
    }
    const skCounts = valueCounts(skillRows.map((x) => x.skill));
    const topSk = skCounts.slice(0, 10).map(([s]) => s);
    const countryCounts = valueCounts(df.map((r) => str(r.country)));
    const months = df.map((r) => str(r.posted_month)).filter((v): v is string => v !== null).sort();
    const golden = {
      rows: df.length,
      posted_month_range: [months[0], months.at(-1)],
      countries: new Set(df.map((r) => str(r.country)).filter((v) => v !== null)).size,
      role_families: new Set(df.map((r) => str(r.role_family)).filter((v) => v !== null)).size,
      median_salary_mid_usd_all: mid(df),
      median_salary_mid_usd_by_country_top10: Object.fromEntries(countryCounts.slice(0, 10).map(([c]) => [c, mid(df.filter((r) => r.country === c))])),
      count_by_country_top10: head(countryCounts, 10),
      median_salary_mid_usd_by_role_family: Object.fromEntries(sortedEntries(groupVals(df, 'role_family', 'salary_mid_usd')).map(([k, v]) => [k, med(v)])),
      software_eng_median_usd: Object.fromEntries(['US', 'CA', 'IN', 'GB', 'DE', 'FR'].map((c) => [c, mid(sw.filter((r) => r.country === c))])),
      top10_skills_by_postings: Object.fromEntries(topSk.map((s) => [s, skCounts.find(([k]) => k === s)![1]])),
      median_by_top10_skill_usd: Object.fromEntries(topSk.map((s) => [s, med(skillRows.filter((x) => x.skill === s).map((x) => num(x.r.salary_mid_usd)))])),
      notes: {
        sample: '16% sample (100,060 of 620,752 postings); REPORT.md figures are computed on the FULL data and will differ',
        fx: "salary_*_usd use the dataset's fixed exchange-rate table (approx. 2025 averages); not PPP",
        licence: LICENCE,
      },
    };
    const rows = df.map((r) => ({
      month: str(r.posted_month),
      country: str(r.country),
      country_name: str(r.country_name),
      region_group: str(r.region_group),
      company: str(r.company),
      job_title: str(r.job_title),
      role_family: str(r.role_family),
      seniority: str(r.seniority),
      industry: str(r.industry_category),
      skills: str(r.skills),
      currency: str(r.currency),
      mid_local: num(r.salary_mid_local),
      min_usd: num(r.salary_min_usd),
      max_usd: num(r.salary_max_usd),
      mid_usd: num(r.salary_mid_usd),
    }));
    return {
      dex: ['salarydex'],
      status: 'built',
      asOf: months.at(-1) ?? null,
      golden: { 'salary/golden.json': golden },
      files: {
        'core/salary/summary.json': { as_of: months.at(-1), sample_share: 0.16, min_n: 30, ...golden, top_skills_50: skCounts.slice(0, 50) },
        'heavy/salary/rows.f.json': columnar(rows, Object.keys(rows[0]!), ['month', 'country', 'country_name', 'region_group', 'role_family', 'seniority', 'industry', 'currency', 'company']),
        'core/salary/quality.json': {
          rows: df.length,
          missing_share: Object.fromEntries(['skills', 'seniority', 'industry_category', 'salary_min_usd'].map((c) => [c, df.filter((r) => str(r[c]) === null).length / df.length])),
          min_n_for_median: 30,
          licence: LICENCE,
        },
      },
    };
  },
};

// ------------------------------------------------------------------------------------------------ StartupDex
export const startupModule: DexModule = {
  name: 'startup',
  dex: ['startupdex'],
  inputs: [19],
  requires: () => [STARTUP()],
  async build(): Promise<ModuleResult> {
    const df = readCsv(STARTUP());
    const dis = df.filter((r) => !Number.isNaN(num(r.amount_usd)));
    const mega = dis.filter((r) => num(r.amount_usd) >= 100_000_000);
    const disSum = sum(dis.map((r) => num(r.amount_usd)));
    const dates = df.map((r) => str(r.announced_date)).filter((v): v is string => v !== null).sort();
    const byYear = valueCounts(df.map((r) => (Number.isNaN(num(r.year)) ? null : String(num(r.year))))).sort((a, b) => (a[0] < b[0] ? -1 : 1));
    const countrySum = sortedEntries(groupVals(dis, 'country', 'amount_usd')).map(([k, v]) => ({ k, v: sum(v) }));
    const golden = {
      rows: df.length,
      announced_range: [dates[0], dates.at(-1)],
      companies: new Set(df.map((r) => str(r.company_domain)).filter((v) => v !== null)).size,
      rounds_with_amount: dis.length,
      total_disclosed_usd: fnum(disSum),
      rounds_by_year: Object.fromEntries(byYear),
      disclosed_usd_by_year: Object.fromEntries(sortedEntries(groupVals(dis, 'year', 'amount_usd')).map(([k, v]) => [String(Number(k)), fnum(sum(v))])),
      median_amount_by_stage_usd: Object.fromEntries(sortedEntries(groupVals(dis, 'stage', 'amount_usd')).map(([k, v]) => [k, med(v)])),
      top5_countries_by_disclosed_usd: Object.fromEntries(nlargest(countrySum, 5, (c) => c.v).map((c) => [c.k, fnum(c.v)])),
      top5_sectors_by_rounds: head(valueCounts(df.map((r) => str(r.sector))), 5),
      mega_round_share_of_rounds: fnum(mega.length / dis.length),
      mega_round_share_of_dollars: fnum(sum(mega.map((r) => num(r.amount_usd))) / disSum),
      amount_status_counts: Object.fromEntries(valueCounts(df.map((r) => str(r.amount_status)))),
      indonesia_rounds: df.filter((r) => r.country === 'Indonesia').length,
      notes: {
        sample: '25% sample (20,227 of 80,911 rounds); REPORT.md figures are on the FULL data',
        amount_status: 'use verified amounts by default; show unchecked/failed_check separately',
        licence: 'CC BY-NC 4.0 (Fliar Research) — non-commercial only; news_excerpt = short quotes, always show news_source/news_url',
      },
    };
    const rows = df.map((r) => ({
      round_id: r.round_id,
      date: str(r.announced_date),
      year: num(r.year),
      company: str(r.company_name),
      domain: str(r.company_domain),
      country: str(r.country),
      city: str(r.city),
      sector: str(r.sector),
      founded_year: num(r.founded_year),
      stage: str(r.stage),
      amount_usd: num(r.amount_usd),
      amount_status: str(r.amount_status),
      lead_investor: str(r.lead_investor),
      investor_count: num(r.investor_count),
      news_source: str(r.news_source),
      news_url: str(r.news_url),
      news_excerpt: str(r.news_excerpt) ? truncate(sanitizeText(r.news_excerpt, 400), 300) : null,
      profile_url: str(r.fliar_profile_url),
    }));
    return {
      dex: ['startupdex'],
      status: 'built',
      asOf: dates.at(-1) ?? null,
      golden: { 'startup/golden.json': golden },
      files: {
        'core/startup/summary.json': { as_of: dates.at(-1), sample_share: 0.25, ...golden },
        'heavy/startup/rounds.json': columnar(rows, Object.keys(rows[0]!), ['country', 'city', 'sector', 'stage', 'amount_status', 'news_source']),
        'core/startup/quality.json': { rows: df.length, amount_missing_share: (df.length - dis.length) / df.length, amount_status_counts: golden.amount_status_counts, licence: LICENCE },
      },
    };
  },
};

// ------------------------------------------------------------------------------------------------ OpenCompanyDex
export const opencompanyModule: DexModule = {
  name: 'opencompany',
  dex: ['opencompanydex'],
  inputs: [21],
  requires: () => [COMPANIES()],
  async build(): Promise<ModuleResult> {
    const df = readCsv(COMPANIES());
    const known = df.filter((r) => str(r.country) !== null).length;
    const fy = df.map((r) => num(r.founded_year));
    const dated = fy.filter((v) => !Number.isNaN(v));
    // pandas `.astype(bool)`: NaN → True; "False" → False
    const funded = df.filter((r) => {
      const b = bool(r.is_funded);
      return b === null ? true : b;
    }).length;
    const golden = {
      rows: df.length,
      with_country: known,
      countries: new Set(df.map((r) => str(r.country)).filter((v) => v !== null)).size,
      top10_countries: head(valueCounts(df.map((r) => str(r.country))), 10),
      share_us_of_known_country: fnum(df.filter((r) => r.country === 'United States').length / known),
      status_counts: Object.fromEntries(valueCounts(df.map((r) => str(r.status)))),
      funded_share: fnum(funded / df.length),
      median_founded_year: med(fy),
      share_founded_2015_plus_of_dated: fnum(dated.filter((v) => v >= 2015).length / dated.length),
      top10_sectors: head(valueCounts(df.map((r) => str(r.sector))), 10),
      indonesia_companies: df.filter((r) => r.country === 'Indonesia').length,
      notes: {
        sample: '2% sample (100,000 of 4,863,273 companies); REPORT.md figures are on the FULL data',
        licence: LICENCE,
        links: 'fliar_profile_url carries UTM parameters; show as an attribution link, never auto-fetch',
      },
    };
    const rows = df.map((r) => ({
      name: str(r.company_name),
      domain: str(r.company_domain),
      country: str(r.country),
      region: str(r.region),
      city: str(r.city),
      founded_year: num(r.founded_year),
      sector: str(r.sector),
      industry: str(r.industry),
      business_model: str(r.business_model),
      status: str(r.status),
      is_funded: bool(r.is_funded),
      employees_range: str(r.employees_range),
      profile_url: str(r.fliar_profile_url),
    }));
    return {
      dex: ['opencompanydex'],
      status: 'built',
      asOf: '2026-10',
      golden: { 'opencompany/golden.json': golden },
      files: {
        'core/opencompany/summary.json': { as_of: '2026-10', sample_share: 0.02, ...golden, all_countries: Object.fromEntries(valueCounts(df.map((r) => str(r.country)))), all_sectors: Object.fromEntries(valueCounts(df.map((r) => str(r.sector)))) },
        'heavy/opencompany/companies.json': columnar(rows, Object.keys(rows[0]!), ['country', 'region', 'city', 'sector', 'industry', 'status', 'employees_range']),
        'core/opencompany/quality.json': {
          rows: df.length,
          missing_share: Object.fromEntries(['country', 'sector', 'industry', 'founded_year', 'employees_range', 'status'].map((c) => [c, df.filter((r) => str(r[c]) === null).length / df.length])),
          licence: LICENCE,
        },
      },
    };
  },
};

// ------------------------------------------------------------------------------------------------ VCNetworkDex
export const vcnetModule: DexModule = {
  name: 'vcnetwork',
  dex: ['vcnetworkdex'],
  inputs: [23],
  requires: () => [VCNET()],
  async build(): Promise<ModuleResult> {
    const df = readCsv(VCNET());
    const inv = [...df.map((r) => str(r.investor_a)), ...df.map((r) => str(r.investor_b))];
    const deg = valueCounts(inv);
    const w = new Map<string, number>();
    for (const r of df) {
      for (const k of [str(r.investor_a), str(r.investor_b)]) if (k !== null) w.set(k, (w.get(k) ?? 0) + num(r.shared_deals));
    }
    const wArr = sortedEntries(w).map(([k, v]) => ({ k, v }));
    const pairRec = (r: Row) => ({
      investor_a: r.investor_a,
      investor_b: r.investor_b,
      shared_deals: num(r.shared_deals),
      first_year: num(r.first_year),
      last_year: num(r.last_year),
      top_shared_sector: str(r.top_shared_sector),
      top_shared_country: str(r.top_shared_country),
    });
    const golden = {
      rows: df.length,
      unique_investors: new Set(inv.filter((v) => v !== null)).size,
      year_range: [Math.min(...df.map((r) => num(r.first_year))), Math.max(...df.map((r) => num(r.last_year)))],
      top10_pairs_by_shared_deals: nlargest(df, 10, (r) => num(r.shared_deals)).map(pairRec),
      top10_investors_by_partners_in_sample: head(deg, 10),
      top10_investors_by_weighted_degree: Object.fromEntries(nlargest(wArr, 10, (x) => x.v).map((x) => [x.k, x.v])),
      pairs_shared_deals_1_share: fnum(df.filter((r) => num(r.shared_deals) === 1).length / df.length),
      top5_shared_sectors: head(valueCounts(df.map((r) => str(r.top_shared_sector))), 5),
      top5_shared_countries: head(valueCounts(df.map((r) => str(r.top_shared_country))), 5),
      investor_type_pairs_top5: head(valueCounts(df.map((r) => `${str(r.investor_a_type) ?? 'nan'} + ${str(r.investor_b_type) ?? 'nan'}`)), 5),
      notes: {
        sample: '25% sample (75,855 of 303,421 pairs) chosen by pair hash -> partner counts are sample counts, not full-network degrees',
        licence: LICENCE,
      },
    };
    const edges = df.map((r) => ({ ...pairRec(r), a_type: str(r.investor_a_type), b_type: str(r.investor_b_type), a_slug: str(r.investor_a_slug) }));
    return {
      dex: ['vcnetworkdex'],
      status: 'built',
      asOf: String(golden.year_range[1]),
      golden: { 'vcnetwork/golden.json': golden },
      files: {
        'core/vcnetwork/summary.json': { as_of: String(golden.year_range[1]), sample_share: 0.25, ...golden, top100_by_partners: deg.slice(0, 100) },
        'heavy/vcnetwork/edges.json': columnar(edges, Object.keys(edges[0]!), ['investor_a', 'investor_b', 'top_shared_sector', 'top_shared_country', 'a_type', 'b_type']),
        'core/vcnetwork/quality.json': { rows: df.length, sample_share: 0.25, note: golden.notes.sample, licence: LICENCE },
      },
    };
  },
};

// ------------------------------------------------------------------------------------------------ VCDex
export const vcdirModule: DexModule = {
  name: 'vcdirectory',
  dex: ['vcdex'],
  inputs: [24],
  requires: () => [VCDIR()],
  async build(): Promise<ModuleResult> {
    const df = readCsv(VCDIR());
    const golden = {
      rows: df.length,
      countries: new Set(df.map((r) => str(r.hq_country)).filter((v) => v !== null)).size,
      top10_hq_countries: head(valueCounts(df.map((r) => str(r.hq_country))), 10),
      investor_types: Object.fromEntries(valueCounts(df.map((r) => str(r.investor_type)))),
      top10_by_deals: nlargest(df, 10, (r) => num(r.deals)).map((r) => ({ investor_name: r.investor_name, investor_type: str(r.investor_type), hq_country: str(r.hq_country), deals: num(r.deals), lead_deals: num(r.lead_deals) })),
      median_deals: med(df.map((r) => num(r.deals))),
      median_round_usd_median: med(df.map((r) => num(r.median_round_usd))),
      active_2025_2026_share: fnum(df.filter((r) => num(r.deals_2025_2026) > 0).length / df.length),
      indonesia_hq_investors: df.filter((r) => r.hq_country === 'Indonesia').length,
      notes: { sample: '25% sample (8,827 of 35,310 investors); REPORT.md figures are on the FULL data', licence: LICENCE },
    };
    const rows = df.map((r) => ({
      slug: r.investor_slug,
      name: r.investor_name,
      domain: str(r.investor_domain),
      hq_country: str(r.hq_country),
      hq_city: str(r.hq_city),
      type: str(r.investor_type),
      deals: num(r.deals),
      lead_deals: num(r.lead_deals),
      portfolio_companies: num(r.portfolio_companies),
      first_deal_year: num(r.first_deal_year),
      last_deal_year: num(r.last_deal_year),
      deals_2025_2026: num(r.deals_2025_2026),
      top_sectors: str(r.top_sectors),
      top_countries: str(r.top_countries),
      seed_share: num(r.seed_share),
      early_share: num(r.early_share),
      growth_share: num(r.growth_share),
      median_round_usd: num(r.median_round_usd),
      profile_url: str(r.fliar_profile_url),
    }));
    return {
      dex: ['vcdex'],
      status: 'built',
      asOf: '2026',
      golden: { 'vcdirectory/golden.json': golden },
      files: {
        'core/vcdirectory/summary.json': { as_of: '2026', sample_share: 0.25, ...golden },
        'heavy/vcdirectory/investors.json': columnar(rows, Object.keys(rows[0]!), ['hq_country', 'hq_city', 'type']),
        'core/vcdirectory/quality.json': { rows: df.length, sample_share: 0.25, licence: LICENCE, note: 'No personal contacts are stored or shown; the chatbot never promises funding.' },
      },
    };
  },
};
