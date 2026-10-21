// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// IDFinanDex (§8.5): BI rate & macro, rate differentials, regime returns, normalised trends.
import { z } from 'zod';
import { idxOnOrBefore } from '../../../src/shared/dates.ts';
import { mean } from '../../../src/shared/analytics/stats.ts';
import { fmtDate, fmtPctPoints } from '../../../src/shared/format.ts';
import { artifact, defineTool, method, ToolError, t, type Tool, type ToolContext } from '../../tools/types.ts';
import { appInfo, datasetInfo, openDex, dataQualityTool, resolveEntity, timeSeriesTools } from '../shared-tools.ts';
import { idfinAdapter } from '../ts-adapters.ts';

const ad = idfinAdapter();
const DS = ad.dataset;
interface Macro {
  series: Record<
    'CPI' | 'BI_rate' | 'US_rate',
    { latest: number; latest_date: string; changes: { date: string; value: number }[] }
  >;
  derived_latest: { bi_minus_us_rate: number; bi_real_rate_vs_cpi: number };
  daily: { d: string[]; CPI: (number | null)[]; BI_rate: (number | null)[]; US_rate: (number | null)[] };
}
const macro = (ctx: ToolContext) => ctx.store.json<Macro>('core/idfin/macro.json');
const UNITS = {
  CPI: 'annual inflation, % (one value per calendar year — NOT a price index)',
  BI_rate: 'Bank Indonesia policy rate, %',
  US_rate: 'US policy/short rate, %',
};

const macroSeries = defineTool({
  name: 'macro_series',
  description:
    'Indonesian macro series as in the dataset: CPI = ANNUAL INFLATION RATE in % (one value per year, not an index), BI_rate = Bank Indonesia policy rate %, US_rate = US rate %. Use for "inflasi tahun X menurut dataset", BI rate history.',
  input: z.strictObject({
    indicator: z.enum(['CPI', 'BI_rate', 'US_rate']),
    start: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    end: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  label: t('Membaca seri makro…', 'Reading macro series…'),
  numeric: true,
  async run(ctx, input) {
    const m = await macro(ctx);
    const ch = m.series[input.indicator].changes.filter(
      (c) => (!input.start || c.date >= input.start) && (!input.end || c.date <= input.end),
    );
    const yearly =
      input.indicator === 'CPI'
        ? Object.fromEntries(m.series.CPI.changes.map((c) => [c.date.slice(0, 4), c.value]))
        : null;
    return {
      data: {
        indicator: input.indicator,
        units: UNITS[input.indicator],
        latest: m.series[input.indicator].latest,
        latest_date: m.series[input.indicator].latest_date,
        values_by_year: yearly,
        changes: ch.slice(-60),
      },
      ui: [
        artifact(ctx, {
          title: `${input.indicator} (${UNITS[input.indicator]})`,
          summary: `${input.indicator} ${ctx.locale === 'id' ? 'terakhir' : 'latest'} ${fmtPctPoints(m.series[input.indicator].latest, ctx.locale)}.`,
          dataset: DS,
          tab: 'macro',
          spec: {
            type: 'line',
            x: ch.map((c) => c.date),
            series: [{ name: input.indicator, y: ch.map((c) => c.value), step: true }],
            y_format: 'pct_points',
            log_allowed: false,
          },
        }),
      ],
      method: method(ctx, {
        tool: 'macro_series',
        formulas: [],
        extraSteps: [
          {
            id: 'Nilai sebagaimana di dataset; ditampilkan titik perubahan nilai (seri bertangga).',
            en: 'Values as provided; change points of the step series are shown.',
          },
        ],
        inputs: input,
        rows: ch.length,
        dataset: DS,
      }),
    };
  },
});

const rateDecisions = defineTool({
  name: 'rate_decisions',
  description:
    'BI rate decisions (change points of the step series) in an optional date range, including the latest rate and since when it applies.',
  input: z.strictObject({
    start: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    end: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  label: t('Membaca keputusan BI rate…', 'Reading BI rate decisions…'),
  numeric: true,
  async run(ctx, input) {
    const m = await macro(ctx);
    const all = m.series.BI_rate.changes;
    const ch = all.filter((c) => (!input.start || c.date >= input.start) && (!input.end || c.date <= input.end));
    const decisions = ch.map((c) => {
      const i = all.indexOf(c);
      return {
        effective_date: c.date,
        rate_pct: c.value,
        change_pp: i > 0 ? Number((c.value - all[i - 1]!.value).toFixed(4)) : null,
      };
    });
    const last = all.at(-1)!;
    return {
      data: {
        latest: { rate_pct: last.value, since: last.date, as_of: m.series.BI_rate.latest_date },
        total_changes_in_dataset: all.length - 1,
        decisions,
      },
      ui: [
        artifact(ctx, {
          title: 'BI rate',
          summary: `BI rate ${fmtPctPoints(last.value, ctx.locale)} ${ctx.locale === 'id' ? 'sejak' : 'since'} ${fmtDate(last.date, ctx.locale)}.`,
          dataset: DS,
          tab: 'regime',
          spec: {
            type: 'line',
            x: ch.map((c) => c.date),
            series: [{ name: 'BI rate', y: ch.map((c) => c.value), step: true }],
            y_format: 'pct_points',
            log_allowed: false,
          },
        }),
      ],
      method: method(ctx, {
        tool: 'rate_decisions',
        formulas: [],
        extraSteps: [
          {
            id: 'Keputusan = tanggal ketika nilai BI rate berubah dari baris sebelumnya.',
            en: 'Decision = date where the BI rate differs from the previous row.',
          },
        ],
        inputs: input,
        rows: all.length,
        dataset: DS,
      }),
    };
  },
});

const rateDifferential = defineTool({
  name: 'rate_differential',
  description:
    'Latest BI rate − US rate and BI rate − annual CPI inflation (percentage points), with the history of the BI−US spread.',
  input: z.strictObject({}),
  label: t('Menghitung selisih suku bunga…', 'Computing the rate differential…'),
  numeric: true,
  async run(ctx) {
    const m = await macro(ctx);
    const x: string[] = [];
    const y: number[] = [];
    m.daily.d.forEach((d, i) => {
      const a = m.daily.BI_rate[i];
      const b = m.daily.US_rate[i];
      if (
        typeof a === 'number' &&
        typeof b === 'number' &&
        (i === 0 || d.slice(0, 7) !== m.daily.d[i - 1]!.slice(0, 7))
      ) {
        x.push(d);
        y.push(a - b);
      }
    });
    return {
      data: {
        bi_rate: m.series.BI_rate.latest,
        us_rate: m.series.US_rate.latest,
        bi_minus_us_pp: m.derived_latest.bi_minus_us_rate,
        cpi_latest: m.series.CPI.latest,
        bi_minus_cpi_pp: m.derived_latest.bi_real_rate_vs_cpi,
        as_of: m.series.BI_rate.latest_date,
      },
      ui: [
        artifact(ctx, {
          title: 'BI rate − US rate (pp)',
          summary: `${m.derived_latest.bi_minus_us_rate.toFixed(2)} pp`,
          dataset: DS,
          tab: 'regime',
          spec: {
            type: 'line',
            x,
            series: [{ name: 'BI − US (pp)', y, step: true }],
            y_format: 'pp',
            log_allowed: false,
            zero_line: true,
          },
        }),
      ],
      method: method(ctx, {
        tool: 'rate_differential',
        formulas: ['rate_diff'],
        inputs: {},
        rows: m.daily.d.length,
        dataset: DS,
      }),
    };
  },
});

const regimeReturns = defineTool({
  name: 'regime_returns',
  description:
    'Average daily and annualised return of an asset (IHSG, USDIDR, GOLD, OIL, SP500) grouped by BI-rate direction (hiking / cutting / hold — since the last change) or VIX bucket (<15, 15–25, >25). Historical description only.',
  input: z.strictObject({
    asset: z.enum(['IHSG', 'USDIDR', 'GOLD', 'OIL', 'SP500']),
    by: z.enum(['bi_rate_direction', 'vix_bucket']),
  }),
  label: t('Menghitung return per rezim…', 'Computing regime returns…'),
  numeric: true,
  async run(ctx, input) {
    const s = await ad.series(ctx, input.asset);
    const m = await macro(ctx);
    const groups = new Map<string, number[]>();
    if (input.by === 'bi_rate_direction') {
      const ch = m.series.BI_rate.changes;
      const regimeAt = (d: string) => {
        let k = -1;
        for (let i = 0; i < ch.length; i++) if (ch[i]!.date <= d) k = i;
        if (k <= 0) return 'hold';
        return ch[k]!.value > ch[k - 1]!.value ? 'hiking' : ch[k]!.value < ch[k - 1]!.value ? 'cutting' : 'hold';
      };
      for (let i = 1; i < s.d.length; i++) {
        const g = regimeAt(s.d[i]!);
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g)!.push(s.p[i]! / s.p[i - 1]! - 1);
      }
    } else {
      const vix = await ad.series(ctx, 'VIX');
      for (let i = 1; i < s.d.length; i++) {
        const k = idxOnOrBefore(vix.d, s.d[i - 1]!);
        if (k < 0) continue;
        const v = vix.p[k]!;
        const g = v < 15 ? 'VIX < 15' : v <= 25 ? 'VIX 15–25' : 'VIX > 25';
        if (!groups.has(g)) groups.set(g, []);
        groups.get(g)!.push(s.p[i]! / s.p[i - 1]! - 1);
      }
    }
    const res = [...groups.entries()]
      .map(([key, rs]) => ({ key, n: rs.length, mean_daily: mean(rs), annualised: (1 + mean(rs)) ** 252 - 1 }))
      .sort((a, b) => (a.key < b.key ? -1 : 1));
    return {
      data: { asset: input.asset, by: input.by, groups: res, note: 'historical description; not a forecast' },
      ui: [
        artifact(ctx, {
          title: `${input.asset} — return per ${input.by}`,
          summary: res.map((r) => `${r.key}: ${(r.annualised * 100).toFixed(2)}%`).join('; '),
          dataset: DS,
          tab: 'regime',
          spec: {
            type: 'bar',
            categories: res.map((r) => r.key),
            series: [
              {
                name: ctx.locale === 'id' ? 'Return tahunan (rata-rata harian ×252)' : 'Annualised (mean daily ×252)',
                values: res.map((r) => r.annualised),
              },
            ],
            horizontal: false,
            value_format: 'pct',
          },
        }),
      ],
      method: method(ctx, {
        tool: 'regime_returns',
        formulas: ['daily_move'],
        extraSteps: [
          {
            id: 'Rezim BI rate = arah perubahan terakhir sebelum tanggal return; tahunan = (1 + rata-rata harian)^252 − 1.',
            en: 'BI-rate regime = direction of the latest change before the return date; annualised = (1 + mean daily)^252 − 1.',
          },
        ],
        inputs: input,
        rows: s.d.length,
        dataset: DS,
        flags: ['carry_forward_excluded'],
      }),
    };
  },
});

const normalizedTrend = defineTool({
  name: 'normalized_trend',
  description:
    'Normalised trend (base 100 at `start`) of 2–6 market series (IHSG, USDIDR, GOLD, OIL, SP500, VIX). Rates & CPI are percentages and are never normalised.',
  input: z.strictObject({
    assets: z
      .array(z.enum(['IHSG', 'USDIDR', 'GOLD', 'OIL', 'SP500', 'VIX']))
      .min(2)
      .max(6),
    start: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  label: t('Menyusun tren ter-normalisasi…', 'Building normalised trends…'),
  numeric: true,
  async run(ctx, input) {
    const start = input.start ?? '2010-01-04';
    const ser = await Promise.all(input.assets.map((a) => ad.series(ctx, a)));
    const xs = new Set<string>();
    const lines = ser.map((s, k) => {
      const i0 = Math.max(0, idxOnOrBefore(s.d, start));
      const base = s.p[i0]!;
      if (!(base > 0))
        throw new ToolError(`${input.assets[k]} has a non-positive value at ${start}; choose another start`);
      const m = new Map<string, number>();
      for (let i = i0; i < s.d.length; i++) {
        m.set(s.d[i]!, (s.p[i]! / base) * 100);
        xs.add(s.d[i]!);
      }
      return m;
    });
    const x = [...xs].sort();
    const last = lines.map((m) => [...m.values()].at(-1)!);
    return {
      data: {
        start,
        results: input.assets.map((a, k) => ({ asset: a, last_index: last[k], change: last[k]! / 100 - 1 })),
      },
      ui: [
        artifact(ctx, {
          title: `${ctx.locale === 'id' ? 'Tren ter-normalisasi' : 'Normalised trend'} (100 = ${start})`,
          summary: input.assets.map((a, k) => `${a} ${last[k]!.toFixed(1)}`).join('; '),
          dataset: DS,
          tab: 'normalized',
          spec: {
            type: 'line',
            x,
            series: lines.map((m, k) => ({ name: input.assets[k]!, y: x.map((d) => m.get(d) ?? null) })),
            y_format: 'num',
            log_allowed: true,
            rebased: true,
          },
        }),
      ],
      method: method(ctx, {
        tool: 'normalized_trend',
        formulas: ['rebase_100'],
        inputs: input,
        rows: ser.reduce((a, s) => a + s.d.length, 0),
        dataset: DS,
        flags: ['carry_forward_excluded'],
      }),
    };
  },
});

export const tools: Tool<never>[] = [
  ...([datasetInfo, appInfo, openDex] as unknown as Tool<never>[]),
  ...timeSeriesTools(ad),
  ...([macroSeries, rateDecisions, rateDifferential, regimeReturns, normalizedTrend] as unknown as Tool<never>[]),
  dataQualityTool(async (ctx, id) => {
    const q = await ctx.store.json<Record<string, unknown>>('core/idfin/quality.json');
    if (id) {
      const e = await resolveEntity(ctx, ad, id);
      return { series: e.id, ...((q[e.id] as object) ?? {}) };
    }
    return q;
  }) as unknown as Tool<never>,
];
export const adapter = ad;
