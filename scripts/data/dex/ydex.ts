// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// IPODex #40, InflationDex #37, CostLivingDex #36, PovertyDex #41, PopulationDex #42, HomelessnessDex #38, HousingDex #39.
// Port of kit/reference/finandex_reference_y.py.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fnum, med, nlargest, nsmallest, sum, valueCounts } from '../../../src/shared/analytics/stats.ts';
import { sanitizeText, truncate } from '../../../src/shared/text.ts';
import { titleCase } from '../../../src/shared/format.ts';
import { num, readCsv, str, type Row } from '../lib/csv.ts';
import { columnar } from '../lib/frame.ts';
import { x } from '../lib/io.ts';
import type { DexModule, ModuleResult } from '../lib/module.ts';
import type { DexId } from '../../../src/config/dex-registry.ts';

const IPO = () => x('IPO_Data_2019-2026-_India_US_UK__Global_IPOs', 'ipo_tracker_2019_2026_sample.csv');
const INFL = () => x('Global_Inflation__Cost_of_Living_Dataset', 'inflation_cost_of_living_dataset.csv');
const COL = () => x('Global_City_Cost_of_Living__Quality_of_Life_Index', 'global_city_col_qol_index.csv');
const MPI = () => x('Multidimensional_Poverty_Index_MPI', 'MPI_193 countries_data.csv');

function rec(r: Row, cols: string[], numeric: string[]): Record<string, unknown> {
  return Object.fromEntries(cols.map((c) => [c, numeric.includes(c) ? fnum(num(r[c])) : str(r[c])]));
}

// ------------------------------------------------------------------------------------------------ IPODex
export const ipoModule: DexModule = {
  name: 'ipo',
  dex: ['ipodex'],
  inputs: [40],
  requires: () => [IPO()],
  async build(): Promise<ModuleResult> {
    const d = readCsv(IPO());
    const ver = d.filter((r) => r.amount_status === 'verified');
    const dates = d.map((r) => str(r.first_report_date)).filter((v): v is string => v !== null).sort();
    const golden = {
      rows: d.length,
      first_report_range: [dates[0], dates.at(-1)],
      countries: new Set(d.map((r) => str(r.country)).filter((v) => v !== null)).size,
      top6_countries: Object.fromEntries(valueCounts(d.map((r) => str(r.country))).slice(0, 6)),
      listing_status: Object.fromEntries(valueCounts(d.map((r) => str(r.listing_status)))),
      amount_status: Object.fromEntries(valueCounts(d.map((r) => str(r.amount_status)))),
      verified_total_usd: fnum(sum(ver.map((r) => num(r.issue_size_usd)).filter((v) => !Number.isNaN(v)))),
      verified_median_usd: med(ver.map((r) => num(r.issue_size_usd))),
      india_board_counts: Object.fromEntries(valueCounts(d.filter((r) => r.country === 'India').map((r) => str(r.board)))),
      indonesia_rows: d.filter((r) => r.country === 'Indonesia').length,
      notes: {
        sample: '38% sample (5,000 of 13,316 company IPOs); REPORT.md figures are on the FULL data',
        status: "Announced / filed rows are not listings; use listing_status='Completed' for listed IPOs",
        licence: 'CC BY-NC 4.0 (Fliar Research)',
      },
    };
    const rows = d.map((r) => ({
      ipo_id: r.ipo_id,
      company: str(r.company_name),
      domain: str(r.company_domain),
      ticker: str(r.ticker),
      exchange: str(r.exchange),
      board: str(r.board),
      country: str(r.country),
      sector: str(r.sector),
      ipo_type: str(r.ipo_type),
      listing_status: str(r.listing_status),
      listing_date: str(r.listing_date),
      first_report_date: str(r.first_report_date),
      year: num(r.year),
      issue_size_local: num(r.issue_size_local),
      currency: str(r.currency),
      issue_size_usd: num(r.issue_size_usd),
      amount_status: str(r.amount_status),
      issue_price: num(r.issue_price),
      news_source: str(r.news_source),
      news_url: str(r.news_url),
      news_excerpt: str(r.news_excerpt) ? truncate(sanitizeText(r.news_excerpt, 400), 300) : null,
      profile_url: str(r.fliar_profile_url),
    }));
    return {
      dex: ['ipodex'],
      status: 'built',
      asOf: dates.at(-1) ?? null,
      golden: { 'ipo/golden.json': golden },
      files: {
        'core/ipo/summary.json': { as_of: dates.at(-1), sample_share: 0.38, ...golden },
        'heavy/ipo/rows.json': columnar(rows, Object.keys(rows[0]!), ['exchange', 'board', 'country', 'sector', 'ipo_type', 'listing_status', 'currency', 'amount_status', 'news_source']),
        'core/ipo/quality.json': { rows: d.length, sample_share: 0.38, listing_status: golden.listing_status, amount_status: golden.amount_status, licence: golden.notes.licence },
      },
    };
  },
};

// ------------------------------------------------------------------------------------------------ InflationDex
const INFL_NUM = ['latitude', 'longitude', 'inflation_year', 'inflation_annual_pct', 'cost_living_index', 'rent_index', 'groceries_index', 'restaurants_index', 'purchasing_power_index', 'bread_price_usd', 'transport_oneway_usd', 'transport_monthly_pass_usd', 'rent_monthly_usd', 'utilities_monthly_usd'];
export const inflationModule: DexModule = {
  name: 'inflation',
  dex: ['inflationdex'],
  inputs: [37],
  requires: () => [INFL()],
  async build(): Promise<ModuleResult> {
    const d = readCsv(INFL()).map((r): Row => ({ ...r, region: String(str(r.region) ?? 'nan').trim() }));
    const v = d.filter((r) => !Number.isNaN(num(r.inflation_annual_pct)));
    const golden = {
      rows: d.length,
      rows_with_inflation: v.length,
      inflation_year_counts: Object.fromEntries(valueCounts(v.map((r) => String(Math.trunc(num(r.inflation_year)))))),
      rows_with_cost_living_index: d.filter((r) => !Number.isNaN(num(r.cost_living_index))).length,
      top5_inflation: nlargest(v, 5, (r) => num(r.inflation_annual_pct)).map((r) => rec(r, ['country', 'inflation_year', 'inflation_annual_pct'], INFL_NUM)),
      bottom5_inflation: nsmallest(v, 5, (r) => num(r.inflation_annual_pct)).map((r) => rec(r, ['country', 'inflation_year', 'inflation_annual_pct'], INFL_NUM)),
      median_inflation_latest: med(v.map((r) => num(r.inflation_annual_pct))),
      indonesia: d.filter((r) => r.country === 'Indonesia').map((r) => rec(r, ['inflation_year', 'inflation_annual_pct', 'cost_living_index', 'rent_monthly_usd'], INFL_NUM)),
      notes: {
        columns: 'country_code_x is always empty -> drop; use country_code_y as ISO3; region has trailing spaces -> trim',
        year: 'inflation_year differs per country (mostly 2024) -> always show the year next to the value',
        xlsx: 'inflation_cost_of_living_dataset.xlsx duplicates the CSV; CSV is primary',
      },
    };
    const rows = d.map((r) => ({ country: r.country, iso3: str(r.country_code_y), region: r.region === 'nan' ? null : r.region, income_level: str(r.income_level), capital: str(r.capital_city), ...Object.fromEntries(INFL_NUM.map((c) => [c, num(r[c])])) }));
    return {
      dex: ['inflationdex'],
      status: 'built',
      asOf: '2024',
      golden: { 'inflation/golden.json': golden },
      files: {
        'core/inflation/summary.json': { as_of: '2024', ...golden, rows_table: rows },
        'core/inflation/quality.json': { rows: d.length, rows_with_inflation: v.length, year_counts: golden.inflation_year_counts, notes: golden.notes },
      },
    };
  },
};

// ------------------------------------------------------------------------------------------------ CostLivingDex
const COL_NUM = ['city_id', 'development_tier', 'population_millions', 'cost_of_living_index', 'rent_index', 'groceries_index', 'restaurant_price_index', 'local_purchasing_power_index', 'avg_monthly_net_salary_usd', 'housing_price_to_income_ratio', 'health_care_index', 'safety_index', 'pollution_index', 'traffic_commute_index', 'climate_index', 'internet_speed_mbps', 'quality_of_life_index'];
export const costlivingModule: DexModule = {
  name: 'costliving',
  dex: ['costlivingdex'],
  inputs: [36],
  requires: () => [COL()],
  async build(): Promise<ModuleResult> {
    const d = readCsv(COL());
    const surveys = [...new Set(d.map((r) => r.survey_date!))].sort();
    const last = d.filter((r) => r.survey_date === surveys.at(-1));
    const golden = {
      rows: d.length,
      cities: new Set(d.map((r) => str(r.city)).filter((v) => v !== null)).size,
      countries: new Set(d.map((r) => str(r.country)).filter((v) => v !== null)).size,
      survey_dates: surveys,
      data_source_pattern: Object.fromEntries(valueCounts(d.map((r) => str(r.data_source_pattern)))),
      synthetic: d.every((r) => (r.data_source_pattern ?? '').startsWith('Synthetic')),
      latest_top5_cost_of_living: nlargest(last, 5, (r) => num(r.cost_of_living_index)).map((r) => rec(r, ['city', 'country', 'cost_of_living_index'], COL_NUM)),
      latest_top5_quality_of_life: nlargest(last, 5, (r) => num(r.quality_of_life_index)).map((r) => rec(r, ['city', 'country', 'quality_of_life_index'], COL_NUM)),
      indonesia_latest: last.filter((r) => r.country === 'Indonesia').map((r) => rec(r, ['city', 'cost_of_living_index', 'quality_of_life_index', 'avg_monthly_net_salary_usd'], COL_NUM)),
      notes: {
        synthetic: "Every row's data_source_pattern starts with 'Synthetic-' -> the values are SYNTHETIC (pattern-based), not real survey results; label everywhere",
        analyst_note: 'free text from the dataset author -> show as provider note',
      },
    };
    const rows = d.map((r) => ({
      city: r.city,
      country: r.country,
      region: str(r.region),
      subregion: str(r.subregion),
      currency: str(r.currency_code),
      survey_date: r.survey_date,
      ...Object.fromEntries(COL_NUM.map((c) => [c, num(r[c])])),
      qol_category: str(r.qol_category),
      pattern: str(r.data_source_pattern),
      analyst_note: str(r.analyst_note) ? sanitizeText(r.analyst_note, 300) : null,
    }));
    return {
      dex: ['costlivingdex'],
      status: 'built',
      asOf: surveys.at(-1)!,
      golden: { 'costliving/golden.json': golden },
      files: {
        'core/costliving/summary.json': { as_of: surveys.at(-1), synthetic_label: 'data sintetis (pola Numbeo/Mercer/EIU), bukan hasil survei nyata', ...golden, rows_table: rows },
        'core/costliving/quality.json': { rows: d.length, synthetic: golden.synthetic, patterns: golden.data_source_pattern, note: golden.notes.synthetic },
      },
    };
  },
};

// ------------------------------------------------------------------------------------------------ PovertyDex
export const povertyModule: DexModule = {
  name: 'poverty',
  dex: ['povertydex'],
  inputs: [41],
  requires: () => [MPI()],
  async build(): Promise<ModuleResult> {
    const d = readCsv(MPI());
    const mpi = d.filter((r) => r.indicatorCode === 'mpi_value' && !Number.isNaN(num(r.actualValue)));
    const seenInd = new Set<string>();
    const ind: { indicatorCode: string | null; indicator: string | null }[] = [];
    for (const r of d) {
      const k = `${r.indicatorCode}\u0001${r.indicator}`;
      if (seenInd.has(k)) continue;
      seenInd.add(k);
      ind.push({ indicatorCode: str(r.indicatorCode), indicator: str(r.indicator) });
    }
    const golden = {
      rows: d.length,
      countries: new Set(d.map((r) => str(r.countryIsoCode)).filter((v) => v !== null)).size,
      indicators: ind,
      mpi_countries_with_value: mpi.length,
      top5_mpi: nlargest(mpi, 5, (r) => num(r.actualValue)).map((r) => rec(r, ['country', 'yearStr', 'actualValue', 'note'], ['actualValue'])),
      indonesia: d.filter((r) => r.countryIsoCode === 'IDN').map((r) => rec(r, ['indicatorCode', 'yearStr', 'actualValue', 'note'], ['actualValue'])),
      notes: {
        year: 'each country has its own survey year (yearStr, e.g. 2022/2023) -> always show it; values not comparable as same-year',
        value_vs_actual: 'value = rounded display, actualValue = full precision (use actualValue)',
      },
    };
    const byC = new Map<string, { iso3: string; country: string; year: string | null; note: string | null; values: Record<string, number | null>; dimension: Record<string, string | null> }>();
    for (const r of d) {
      const k = r.countryIsoCode!;
      if (!byC.has(k)) byC.set(k, { iso3: k, country: r.country!, year: null, note: null, values: {}, dimension: {} });
      const e = byC.get(k)!;
      e.values[r.indicatorCode!] = fnum(num(r.actualValue));
      e.dimension[r.indicatorCode!] = str(r.dimension);
      if (r.indicatorCode === 'mpi_value') {
        e.year = str(r.yearStr);
        e.note = str(r.note);
      }
    }
    return {
      dex: ['povertydex'],
      status: 'built',
      asOf: null,
      golden: { 'poverty/golden.json': golden },
      files: {
        'core/poverty/summary.json': { as_of: 'tahun survei per negara', ...golden, countries_table: [...byC.values()] },
        'core/poverty/quality.json': { rows: d.length, countries: golden.countries, note_file_name: "File name says '193 countries' but it contains 108 countries.", notes: golden.notes },
      },
    };
  },
};

// ------------------------------------------------------------------------------------------------ News (3 Dex)
export interface Finding {
  id: string;
  grade: string | null;
  sentence: string;
  basis: string | null;
  limit: string | null;
}

/** Parse FINDINGS.md (third-party text = DATA). Rejected/other sections are skipped. */
export function parseFindings(md: string): Finding[] {
  const out: Finding[] = [];
  const parts = md.split(/^###\s+/m).slice(1);
  for (const p of parts) {
    const id = p.split('\n', 1)[0]!.trim();
    if (!/^F\d+/.test(id)) continue;
    const field = (name: string) => {
      const m = new RegExp(`\\*\\*${name}:\\*\\*\\s*([^\\n]+)`).exec(p);
      return m ? sanitizeText(m[1]!.trim(), 800) : null;
    };
    const sentence = field('Sentence');
    if (!sentence) continue;
    out.push({ id, grade: field('Grade'), sentence, basis: field('Basis'), limit: field('Limit') });
  }
  return out;
}

function newsModule(name: string, dex: DexId, input: number, dir: string, key: string, sampleFile: string): DexModule {
  const D = () => x(dir, 'data');
  return {
    name,
    dex: [dex],
    inputs: [input],
    requires: () => [D()],
    async build(): Promise<ModuleResult> {
      const s = readCsv(join(D(), sampleFile));
      const m = readCsv(join(D(), 'monthly.csv'));
      const c = readCsv(join(D(), 'countries.csv'));
      const tone = valueCounts(s.map((r) => str(r.tone)));
      const toneTotal = tone.reduce((a, [, n]) => a + n, 0);
      const sDates = s.map((r) => str(r.date)).filter((v): v is string => v !== null).sort();
      const months = m.map((r) => r.month!).sort();
      const mRec = (r: Row) => ({ month: str(r.month), articles: fnum(num(r.articles)), all_news_articles: fnum(num(r.all_news_articles)), per_10k_news: fnum(num(r.per_10k_news)) });
      const aggregateFiles = readdirSync(D())
        .filter((f) => f.endsWith('.csv'))
        .sort();
      const golden = {
        sample_rows: s.length,
        sample_date_range: [sDates[0], sDates.at(-1)],
        sample_tone_share: Object.fromEntries(tone.map(([k, v]) => [k, fnum(v / toneTotal)])),
        monthly_rows: m.length,
        monthly_range: [months[0], months.at(-1)],
        latest_month: m.slice(-1).map(mRec),
        peak_month_per_10k: nlargest(m, 1, (r) => num(r.per_10k_news)).map(mRec),
        top5_countries_2023_2026: nlargest(c, 5, (r) => num(r.articles_2023_2026)).map((r) => ({ country: str(r.country), articles_2023_2026: fnum(num(r.articles_2023_2026)), share_pct: fnum(num(r.share_pct)) })),
        aggregate_files: aggregateFiles,
        notes: {
          what: 'measures NEWS COVERAGE, not real-world counts (e.g. not the number of homeless people)',
          aggregates: 'data/*.csv aggregates and FINDINGS.md are provider-computed on the full news index; *-news-sample.csv is a sample of article records',
          findings_grades: 'FINDINGS.md grades A (exact count) / B (keyword rule, measured precision) / C (outlet-sensitive) -> show the grade with any finding',
          api_url: 'api_url points to the provider API -> do not fetch; no article text is included',
          licence: 'provider: Fliar BI (Prism News API) — licence per provider; confirm before commercial use',
        },
      };
      // app files: all aggregate tables (numbers parsed; place names title-cased for display)
      const tables: Record<string, unknown> = {};
      for (const f of aggregateFiles) {
        if (f === sampleFile) continue;
        const rows = readCsv(join(D(), f));
        tables[f.replace('.csv', '')] = rows.map((r) => {
          const o: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(r)) {
            const n = num(v);
            o[k] = !Number.isNaN(n) && !/^(country|city|state|continent|theme|organisation|office|cpc_class|title|venue|doi|first_author|tone|month)$/.test(k) ? n : str(v);
          }
          for (const k of ['country', 'city', 'state', 'continent']) if (typeof o[k] === 'string') o[`${k}_display`] = titleCase(o[k] as string);
          return o;
        });
      }
      const findingsPath = x(dir, 'FINDINGS.md');
      const findings = existsSync(findingsPath) ? parseFindings(readFileSync(findingsPath, 'utf8')) : [];
      const lastMonth = months.at(-1)!;
      const sample = s.map((r) => ({
        date: str(r.date),
        month: str(r.month),
        country: str(r.country),
        state: str(r.state),
        city: str(r.city),
        continent: str(r.continent),
        tone: str(r.tone),
        tone_label: str(r.tone_label),
        priority: num(r.priority),
        themes: str(r.themes) ? sanitizeText(r.themes, 300) : null,
        organisations: str(r.organisations) ? sanitizeText(r.organisations, 300) : null,
        matched_terms: str(r.matched_terms),
        // api_url intentionally dropped (never fetched)
      }));
      return {
        dex: [dex],
        status: 'built',
        asOf: sDates.at(-1) ?? null,
        golden: { [`${key}/golden.json`]: golden },
        files: {
          [`core/${key}/summary.json`]: { as_of: sDates.at(-1), partial_month: lastMonth, ...golden, tables, findings },
          [`heavy/${key}/sample.json`]: columnar(sample, Object.keys(sample[0]!), ['month', 'country', 'state', 'city', 'continent', 'tone', 'tone_label', 'matched_terms']),
          [`core/${key}/quality.json`]: { sample_rows: s.length, partial_month: lastMonth, note: golden.notes.what, aggregates: golden.notes.aggregates, grades: golden.notes.findings_grades },
        },
      };
    },
  };
}

export const populationModule = newsModule('population', 'populationdex', 42, 'Population_News_Dataset_2019-2026', 'population', 'population-news-sample.csv');
export const homelessnessModule = newsModule('homelessness', 'homelessnessdex', 38, 'Homelessness_News_Dataset_2019-2026', 'homelessness', 'homelessness-news-sample.csv');
export const housingnewsModule = newsModule('housingnews', 'housingdex', 39, 'Housing_News_Dataset_2019-2026', 'housingnews', 'housing-news-sample.csv');
