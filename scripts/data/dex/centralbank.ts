// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// CentralBankDex — file #16 (§4.10). Port of run_cb() in kit/reference/finandex_reference_x.py.
import { fnum, nlargest } from '../../../src/shared/analytics/stats.ts';
import { num, readCsv, str, type Row } from '../lib/csv.ts';
import { x } from '../lib/io.ts';
import type { DexModule, ModuleResult } from '../lib/module.ts';

const CSV = () => x('Central_Bank_Balance_Sheets__Global_Liquidity', 'central_bank_balance_sheets_global_liquidity_enriched.csv');
export const WB_AGGREGATES = new Set(
  'AFE AFW ARB CEB CSS EAP EAR EAS ECA ECS EMU EUU FCS HIC HPC IBD IBT IDA IDB IDX INX LAC LCN LDC LIC LMC LMY LTE MEA MIC MNA NAC OED OSS PRE PSS PST SAS SSA SSF SST TEA TEC TLA TMN TSA TSS UMC WLD'.split(' '),
);
export const US_COLS = [
  'fed_total_assets_mil_usd',
  'ecb_total_assets_mil_eur',
  'boj_total_assets_100mil_jpy',
  'g3_combined_assets_tril_usd',
  'us_m2_money_supply_bil_usd',
  'policy_rate_pct',
  'treasury_10y_yield_pct',
  'yield_curve_spread_10y_2y_pct',
  'cpi_index_value',
  'cpi_inflation_rate_yoy_pct',
];
export const COUNTRY_COLS = ['broad_money_growth_annual_pct', 'broad_money_pct_gdp', 'policy_rate_pct', 'cpi_inflation_rate_yoy_pct'];
/** provider-generated label columns (shown as "label penyedia dataset"; cot_rationale & evidence_span never shown) */
export const PROVIDER_LABEL_COLS = ['monetary_policy_regime', 'yield_curve_regime', 'macro_financial_stress_tier', 'global_liquidity_expansion_index', 'real_policy_rate_spread', 'confidence_score', 'inversion_signal'];

export const centralbankModule: DexModule = {
  name: 'centralbank',
  dex: ['centralbankdex'],
  inputs: [16],
  requires: () => [CSV()],
  async build(): Promise<ModuleResult> {
    const df = readCsv(CSV());
    const us = df.filter((r) => r.entity_type === 'Central_Bank_System').sort((a, b) => (a.observation_date! < b.observation_date! ? -1 : a.observation_date! > b.observation_date! ? 1 : 0));
    const cy = df.filter((r) => r.entity_type === 'Country_Jurisdiction');
    const isAgg = (r: Row) => WB_AGGREGATES.has(r.country_iso3 ?? '');
    const lastValid = (col: string) => {
      for (let i = us.length - 1; i >= 0; i--) {
        const v = num(us[i]![col]);
        if (!Number.isNaN(v)) return { date: us[i]!.observation_date!, value: fnum(v) };
      }
      return null;
    };
    const fed = us.filter((r) => !Number.isNaN(num(r.fed_total_assets_mil_usd)));
    let imax = 0;
    fed.forEach((r, i) => {
      if (num(r.fed_total_assets_mil_usd) > num(fed[imax]!.fed_total_assets_mil_usd)) imax = i;
    });
    const years = cy.map((r) => num(r.year));
    const latestYear = Math.max(...years);
    const ly = cy.filter((r) => num(r.year) === latestYear && !isAgg(r));
    const bm = ly.filter((r) => str(r.entity_name) !== null && str(r.country_iso3) !== null && !Number.isNaN(num(r.broad_money_growth_annual_pct)));
    const idn = cy.filter((r) => r.country_iso3 === 'IDN').sort((a, b) => num(a.year) - num(b.year));
    const idnLast = idn.filter((r) => !Number.isNaN(num(r.broad_money_growth_annual_pct))).slice(-1);
    const usDates = us.map((r) => r.observation_date!);
    const golden = {
      rows: df.length,
      rows_us_system: us.length,
      rows_country: cy.length,
      us_date_range: [usDates[0], usDates.at(-1)],
      country_year_range: [Math.min(...years), latestYear],
      country_entities: new Set(cy.filter((r) => !isAgg(r)).map((r) => r.country_iso3)).size,
      aggregate_entities: new Set(cy.filter(isAgg).map((r) => r.country_iso3)).size,
      us_latest: Object.fromEntries(US_COLS.map((c) => [c, lastValid(c)])),
      fed_assets_first_date: fed.map((r) => r.observation_date!).sort()[0],
      fed_assets_peak: { date: fed[imax]!.observation_date, value_mil_usd: fnum(num(fed[imax]!.fed_total_assets_mil_usd)) },
      latest_country_year: latestYear,
      broad_money_growth_top5_latest_year: nlargest(bm, 5, (r) => num(r.broad_money_growth_annual_pct)).map((r) => ({
        entity_name: r.entity_name,
        country_iso3: r.country_iso3,
        broad_money_growth_annual_pct: fnum(num(r.broad_money_growth_annual_pct)),
      })),
      indonesia_latest_broad_money_growth: idnLast.map((r) => ({
        year: num(r.year),
        broad_money_growth_annual_pct: fnum(num(r.broad_money_growth_annual_pct)),
        broad_money_pct_gdp: fnum(num(r.broad_money_pct_gdp)),
      })),
      notes: {
        units: 'fed_total_assets_mil_usd = USD million; ecb_total_assets_mil_eur = EUR million; boj_total_assets_100mil_jpy = JPY 100 million; g3_combined_assets_tril_usd = USD trillion; us_m2_money_supply_bil_usd = USD billion',
        frequency: 'US/G10 rows are daily (FRED, values carried between releases); country rows are annual (World Bank, dated YYYY-12-31)',
        enriched_columns:
          "monetary_policy_regime, yield_curve_regime, macro_financial_stress_tier, global_liquidity_expansion_index, real_policy_rate_spread, evidence_span, cot_rationale, confidence_score are labels/text generated by the dataset author -> show as 'label penyedia dataset', never as official data; do not display cot_rationale",
        aggregates: 'World Bank aggregate codes (e.g. WLD, EAS, IDA) are regions/groups, not countries',
      },
    };

    // ---- app files (cot_rationale & evidence_span are NEVER exported)
    const usDaily: Record<string, unknown> = { d: usDates };
    for (const c of US_COLS) usDaily[c] = us.map((r) => num(r[c]));
    for (const c of PROVIDER_LABEL_COLS) usDaily[`label_${c}`] = us.map((r) => (['global_liquidity_expansion_index', 'real_policy_rate_spread', 'confidence_score'].includes(c) ? num(r[c]) : str(r[c])));
    // "change points": rows where the carried value actually changes (for change statistics)
    const changes: Record<string, { d: string[]; v: number[] }> = {};
    for (const c of US_COLS) {
      const d: string[] = [];
      const v: number[] = [];
      let prev = NaN;
      for (const r of us) {
        const val = num(r[c]);
        if (Number.isNaN(val)) continue;
        if (val !== prev) {
          d.push(r.observation_date!);
          v.push(val);
        }
        prev = val;
      }
      changes[c] = { d, v };
    }
    const countries = new Map<string, { name: string; iso3: string; aggregate: boolean; years: number[]; values: Record<string, number[]> }>();
    for (const r of cy.slice().sort((a, b) => num(a.year) - num(b.year))) {
      const k = r.country_iso3 ?? r.entity_name!;
      if (!countries.has(k)) countries.set(k, { name: r.entity_name!, iso3: k, aggregate: isAgg(r), years: [], values: Object.fromEntries(COUNTRY_COLS.map((c) => [c, []])) });
      const e = countries.get(k)!;
      e.years.push(num(r.year));
      for (const c of COUNTRY_COLS) e.values[c]!.push(num(r[c]));
    }
    const latestOf = (e: { years: number[]; values: Record<string, number[]> }, c: string) => {
      for (let i = e.years.length - 1; i >= 0; i--) if (!Number.isNaN(e.values[c]![i]!)) return { year: e.years[i]!, value: e.values[c]![i]! };
      return null;
    };
    const asOf = (golden.us_latest.fed_total_assets_mil_usd as { date: string } | null)?.date ?? usDates.at(-1)!;
    return {
      dex: ['centralbankdex'],
      status: 'built',
      asOf,
      golden: { 'centralbank/golden.json': golden },
      files: {
        'core/centralbank/us_daily.json': { as_of: usDates.at(-1), units: golden.notes.units, ...usDaily, changes },
        'core/centralbank/g3.json': {
          as_of: asOf,
          peak: golden.fed_assets_peak,
          fed_first_date: golden.fed_assets_first_date,
          latest: Object.fromEntries(['fed_total_assets_mil_usd', 'ecb_total_assets_mil_eur', 'boj_total_assets_100mil_jpy', 'g3_combined_assets_tril_usd'].map((c) => [c, golden.us_latest[c as keyof typeof golden.us_latest]])),
        },
        'core/centralbank/countries_latest.json': {
          latest_year: latestYear,
          rows: [...countries.values()].map((e) => ({ name: e.name, iso3: e.iso3, aggregate: e.aggregate, latest: Object.fromEntries(COUNTRY_COLS.map((c) => [c, latestOf(e, c)])) })),
        },
        'heavy/centralbank/countries.json': Object.fromEntries([...countries.entries()]),
        'core/centralbank/quality.json': {
          rows: df.length,
          us_rows: us.length,
          country_rows: cy.length,
          aggregates_excluded_by_default: [...WB_AGGREGATES].sort(),
          change_points: Object.fromEntries(US_COLS.map((c) => [c, changes[c]!.d.length])),
          provider_labels: PROVIDER_LABEL_COLS,
          hidden_columns: ['cot_rationale', 'evidence_span'],
          notes: golden.notes,
        },
      },
    };
  },
};
