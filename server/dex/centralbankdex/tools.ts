// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// CentralBankDex (§8.5): G3 balance sheets, US rates & yield curve, country money indicators, provider regime labels.
import { z } from 'zod';
import { fmtDate, fmtNum, fmtPctPoints } from '../../../src/shared/format.ts';
import { fold } from '../../../src/shared/text.ts';
import { artifact, defineTool, method, ToolError, t, type Tool, type ToolContext } from '../../tools/types.ts';
import { barOutput } from '../helpers.ts';
import { appInfo, dataQualityTool, datasetInfo, openDex } from '../shared-tools.ts';

const DS = 'Central Bank Balance Sheets & Global Liquidity (enriched)';
type Daily = { as_of: string; d: string[]; changes: Record<string, { d: string[]; v: number[] }> } & Record<
  string,
  unknown
>;
const daily = (ctx: ToolContext) => ctx.store.json<Daily>('core/centralbank/us_daily.json');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const UNITS: Record<string, string> = {
  fed_total_assets_mil_usd: 'USD million',
  ecb_total_assets_mil_eur: 'EUR million',
  boj_total_assets_100mil_jpy: 'JPY 100 million',
  g3_combined_assets_tril_usd: 'USD trillion',
  us_m2_money_supply_bil_usd: 'USD billion',
  policy_rate_pct: '%',
  treasury_10y_yield_pct: '%',
  yield_curve_spread_10y_2y_pct: 'percentage points',
  cpi_inflation_rate_yoy_pct: '%',
};

function lastValid(dd: Daily, col: string, end?: string): { date: string; value: number } | null {
  const v = dd[col] as (number | null)[];
  for (let i = dd.d.length - 1; i >= 0; i--)
    if ((!end || dd.d[i]! <= end) && typeof v[i] === 'number') return { date: dd.d[i]!, value: v[i] as number };
  return null;
}

function seriesTool(name: string, description: string, map: Record<string, string>) {
  return defineTool({
    name,
    description,
    input: z.strictObject({
      series: z
        .array(z.enum(Object.keys(map) as [string, ...string[]]))
        .min(1)
        .max(4),
      start: date.optional(),
      end: date.optional(),
    }),
    label: t('Membaca seri bank sentral…', 'Reading central-bank series…'),
    numeric: true,
    async run(ctx, input) {
      const dd = await daily(ctx);
      const res = input.series.map((k) => {
        const col = map[k]!;
        const ch = dd.changes[col]!;
        const idx = ch.d
          .map((_, i) => i)
          .filter((i) => (!input.start || ch.d[i]! >= input.start) && (!input.end || ch.d[i]! <= input.end));
        let peak = { date: '', value: -Infinity };
        for (const i of idx) if (ch.v[i]! > peak.value) peak = { date: ch.d[i]!, value: ch.v[i]! };
        return {
          key: k,
          col,
          units: UNITS[col],
          latest: lastValid(dd, col, input.end),
          first: idx.length ? { date: ch.d[idx[0]!], value: ch.v[idx[0]!] } : null,
          peak: idx.length ? peak : null,
          x: idx.map((i) => ch.d[i]!),
          y: idx.map((i) => ch.v[i]!),
        };
      });
      const xs = [...new Set(res.flatMap((r) => r.x))].sort();
      return {
        data: {
          results: res.map(({ x: _x, y: _y, ...r }) => r),
          note: 'US/G10 values are carried daily between official releases; change points are used.',
        },
        ui: [
          artifact(ctx, {
            title: res.map((r) => `${r.key} (${r.units})`).join(' · '),
            summary: res
              .map(
                (r) =>
                  `${r.key}: ${r.latest ? fmtNum(r.latest.value, ctx.locale, 3) + ' ' + r.units + ' (' + fmtDate(r.latest.date, ctx.locale) + ')' : '–'}`,
              )
              .join('; '),
            dataset: DS,
            tab: name === 'balance_sheets' ? 'g3' : 'rates',
            spec: {
              type: 'line',
              x: xs,
              series: res.map((r) => {
                const m = new Map(r.x.map((d, i) => [d, r.y[i]!]));
                return { name: `${r.key} (${r.units})`, y: xs.map((d) => m.get(d) ?? null), step: true };
              }),
              y_format: name === 'balance_sheets' ? 'compact' : 'pct_points',
              log_allowed: false,
              zero_line: name !== 'balance_sheets',
            },
          }),
        ],
        method: method(ctx, {
          tool: name,
          formulas: [],
          extraSteps: [
            {
              id: 'Nilai FRED sebagaimana di dataset; titik perubahan dipakai karena nilai harian dibawa antar-rilis.',
              en: 'FRED values as provided; change points are used because daily values are carried between releases.',
            },
          ],
          inputs: input,
          rows: xs.length,
          dataset: DS,
          flags: ['carried_between_releases'],
        }),
      };
    },
  });
}

const balanceSheets = seriesTool(
  'balance_sheets',
  'Balance sheets of the Fed (USD million), ECB (EUR million), BoJ (JPY 100 million) and G3 combined (USD trillion): latest, peak, history. Units differ — never mix them.',
  {
    fed: 'fed_total_assets_mil_usd',
    ecb: 'ecb_total_assets_mil_eur',
    boj: 'boj_total_assets_100mil_jpy',
    g3: 'g3_combined_assets_tril_usd',
  },
);
const usRates = seriesTool(
  'us_rates',
  'US policy rate, 10Y Treasury yield, 10Y−2Y spread (pp), CPI inflation YoY (%) and M2 (USD billion): latest values and history.',
  {
    policy: 'policy_rate_pct',
    treasury_10y: 'treasury_10y_yield_pct',
    spread_10y_2y: 'yield_curve_spread_10y_2y_pct',
    cpi_yoy: 'cpi_inflation_rate_yoy_pct',
    m2: 'us_m2_money_supply_bil_usd',
  },
);

const inversions = defineTool({
  name: 'yield_curve_inversions',
  description: 'Periods when the US 10Y−2Y spread was negative (inverted yield curve), from the change-point series.',
  input: z.strictObject({ start: date.optional(), end: date.optional() }),
  label: t('Mencari inversi kurva imbal hasil…', 'Finding yield-curve inversions…'),
  numeric: true,
  async run(ctx, input) {
    const dd = await daily(ctx);
    const ch = dd.changes.yield_curve_spread_10y_2y_pct!;
    const eps: { start: string; end: string; min: number }[] = [];
    let cur: { start: string; end: string; min: number } | null = null;
    ch.d.forEach((d, i) => {
      if ((input.start && d < input.start) || (input.end && d > input.end)) return;
      const v = ch.v[i]!;
      if (v < 0) {
        if (!cur) cur = { start: d, end: d, min: v };
        cur.end = d;
        cur.min = Math.min(cur.min, v);
      } else if (cur) {
        cur.end = d;
        eps.push(cur);
        cur = null;
      }
    });
    if (cur) eps.push(cur);
    return {
      data: { episodes: eps.map((e) => ({ ...e, note: 'end = first change point back at ≥ 0' })), count: eps.length },
      ui: [
        artifact(ctx, {
          title: '10Y − 2Y spread (pp)',
          summary: `${eps.length} ${ctx.locale === 'id' ? 'episode inversi' : 'inversion episodes'}`,
          dataset: DS,
          tab: 'rates',
          spec: {
            type: 'line',
            x: ch.d,
            series: [{ name: '10Y−2Y', y: ch.v, step: true }],
            y_format: 'pp',
            log_allowed: false,
            zero_line: true,
            shaded: eps.map((e) => ({ from: e.start, to: e.end, label: 'inversion' })),
          },
        }),
      ],
      method: method(ctx, {
        tool: 'yield_curve_inversions',
        formulas: [],
        extraSteps: [
          { id: 'Inversi = periode ketika spread 10Y−2Y < 0.', en: 'Inversion = period with a 10Y−2Y spread < 0.' },
        ],
        inputs: input,
        rows: ch.d.length,
        dataset: DS,
      }),
    };
  },
});

interface Country {
  name: string;
  iso3: string;
  aggregate: boolean;
  years: number[];
  values: Record<string, (number | null)[]>;
}
const IND = {
  broad_money_growth: 'broad_money_growth_annual_pct',
  broad_money_pct_gdp: 'broad_money_pct_gdp',
  policy_rate: 'policy_rate_pct',
  cpi_yoy: 'cpi_inflation_rate_yoy_pct',
} as const;

const countryMoney = defineTool({
  name: 'country_money',
  description:
    'Annual World Bank money indicator of one country (or aggregate): broad_money_growth (%), broad_money_pct_gdp (%), policy_rate (%), cpi_yoy (%). Country by name or ISO3 (e.g. IDN).',
  input: z.strictObject({
    country: z.string().min(2).max(60),
    indicator: z.enum(Object.keys(IND) as [keyof typeof IND, ...(keyof typeof IND)[]]),
  }),
  label: t('Membaca indikator negara…', 'Reading the country indicator…'),
  numeric: true,
  async run(ctx, input) {
    const all = await ctx.store.json<Record<string, Country>>('heavy/centralbank/countries.json');
    const c =
      all[input.country.toUpperCase()] ??
      Object.values(all).find((x) => fold(x.name) === fold(input.country)) ??
      Object.values(all).find((x) => fold(x.name).includes(fold(input.country)));
    if (!c) throw new ToolError(`Country "${input.country}" not found (use ISO3, e.g. IDN, USA).`);
    const col = IND[input.indicator];
    const pts = c.years
      .map((y, i) => [y, c.values[col]![i] ?? null] as [number, number | null])
      .filter(([, v]) => typeof v === 'number');
    if (!pts.length) throw new ToolError(`No ${input.indicator} values for ${c.name}.`);
    return {
      data: {
        country: c.name,
        iso3: c.iso3,
        aggregate: c.aggregate,
        indicator: input.indicator,
        latest: { year: pts.at(-1)![0], value_pct: pts.at(-1)![1] },
        values: pts.slice(-25),
      },
      ui: [
        artifact(ctx, {
          title: `${c.name} — ${input.indicator} (%)`,
          summary: `${pts.at(-1)![0]}: ${fmtPctPoints(pts.at(-1)![1], ctx.locale)}`,
          dataset: DS,
          tab: 'money',
          spec: {
            type: 'line',
            x: pts.map(([y]) => String(y)),
            series: [{ name: input.indicator, y: pts.map(([, v]) => v) }],
            y_format: 'pct_points',
            log_allowed: false,
            zero_line: true,
          },
        }),
      ],
      method: method(ctx, {
        tool: 'country_money',
        formulas: [],
        extraSteps: [
          {
            id: 'Nilai tahunan World Bank (bertanggal YYYY-12-31) sebagaimana di dataset.',
            en: 'Annual World Bank values (dated YYYY-12-31) as provided.',
          },
        ],
        inputs: input,
        rows: pts.length,
        dataset: DS,
        flags: c.aggregate ? ['world_bank_aggregate_not_a_country'] : [],
      }),
    };
  },
});

const rankCountries = defineTool({
  name: 'rank_countries',
  description:
    'Rank countries by a money indicator in a given year (default: latest year 2025). World Bank aggregates (WLD, EAS, IDA, …) are excluded unless include_aggregates = true.',
  input: z.strictObject({
    indicator: z.enum(Object.keys(IND) as [keyof typeof IND, ...(keyof typeof IND)[]]),
    year: z.number().int().min(1960).max(2030).optional(),
    order: z.enum(['desc', 'asc']).optional(),
    limit: z.number().int().min(1).max(25).optional(),
    include_aggregates: z.boolean().optional(),
  }),
  label: t('Menyusun peringkat negara…', 'Ranking countries…'),
  numeric: true,
  async run(ctx, input) {
    const all = await ctx.store.json<Record<string, Country>>('heavy/centralbank/countries.json');
    const col = IND[input.indicator];
    const year = input.year ?? Math.max(...Object.values(all).flatMap((c) => c.years));
    const rows = Object.values(all)
      .filter((c) => input.include_aggregates || !c.aggregate)
      .map((c) => ({ key: c.name, iso3: c.iso3, value: c.values[col]![c.years.indexOf(year)] ?? null }))
      .filter((r) => typeof r.value === 'number');
    const dir = input.order === 'asc' ? 1 : -1;
    rows.sort((a, b) => dir * (a.value! - b.value!) || (a.key < b.key ? -1 : 1));
    return barOutput(ctx, {
      tool: 'rank_countries',
      title: `${input.indicator} ${year} (%)`,
      groups: rows.slice(0, input.limit ?? 10).map((r) => ({ key: r.key, value: r.value })),
      format: 'pct_points',
      dataset: DS,
      tab: 'countries',
      formulas: ['rank'],
      inputs: { ...input, year },
      rows: rows.length,
      flags: input.include_aggregates ? ['includes_world_bank_aggregates'] : ['world_bank_aggregates_excluded'],
      data: { year, candidates: rows.length },
    });
  },
});

const providerLabels = defineTool({
  name: 'provider_labels',
  description:
    'Regime labels GENERATED BY THE DATASET AUTHOR (monetary_policy_regime, yield_curve_regime, macro_financial_stress_tier, liquidity index, confidence) for a date range. Always present them as "label penyedia dataset", never as official data. Rationale text is never shown.',
  input: z.strictObject({ start: date.optional(), end: date.optional() }),
  label: t('Membaca label penyedia…', 'Reading provider labels…'),
  numeric: false,
  async run(ctx, input) {
    const dd = await daily(ctx);
    const idx = dd.d
      .map((_, i) => i)
      .filter((i) => (!input.start || dd.d[i]! >= input.start) && (!input.end || dd.d[i]! <= input.end));
    const pick = (k: string) => dd[`label_${k}`] as (string | number | null)[];
    const counts = (k: string) => {
      const m = new Map<string, number>();
      for (const i of idx) {
        const v = pick(k)[i];
        if (v !== null && v !== undefined) m.set(String(v), (m.get(String(v)) ?? 0) + 1);
      }
      return Object.fromEntries([...m.entries()].sort((a, b) => b[1] - a[1]));
    };
    const li = idx.at(-1)!;
    return {
      data: {
        warning: 'label penyedia dataset (provider-generated), not official data',
        latest: {
          date: dd.d[li],
          monetary_policy_regime: pick('monetary_policy_regime')[li],
          yield_curve_regime: pick('yield_curve_regime')[li],
          macro_financial_stress_tier: pick('macro_financial_stress_tier')[li],
          liquidity_index: pick('global_liquidity_expansion_index')[li],
          confidence: pick('confidence_score')[li],
        },
        days_by_monetary_regime: counts('monetary_policy_regime'),
        days_by_yield_curve_regime: counts('yield_curve_regime'),
      },
    };
  },
});

export const tools: Tool<never>[] = [
  datasetInfo,
  appInfo,
  openDex,
  ...([balanceSheets, usRates, inversions, countryMoney, rankCountries, providerLabels] as unknown as Tool<never>[]),
  dataQualityTool(async (ctx) => ctx.store.json('core/centralbank/quality.json')),
] as unknown as Tool<never>[];
