// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// RupiahDex (§8.5): USD/IDR on a date, historical conversion, yearly averages, changes, source cross-check, events.
import { z } from 'zod';
import { idxOnOrBefore, addDays } from '../../../src/shared/dates.ts';
import { fmtDate, fmtNum, fmtPct } from '../../../src/shared/format.ts';
import { artifact, defineTool, method, ToolError, t, type Tool } from '../../tools/types.ts';
import { appInfo, datasetInfo, openDex, dataQualityTool, timeSeriesTools } from '../shared-tools.ts';
import { RUPIAH_EVENTS, rupiahAdapter } from '../ts-adapters.ts';

const ad = rupiahAdapter();
const DS = ad.dataset;
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

async function onDate(ctx: Parameters<typeof ad.series>[0], d: string) {
  const s = await ad.series(ctx, 'USDIDR');
  const i = idxOnOrBefore(s.d, d);
  if (i < 0) throw new ToolError(`No USD/IDR close on/before ${d}; data starts ${s.d[0]}.`);
  return { s, i, date: s.d[i]!, close: s.p[i]! };
}

const fxOnDate = defineTool({
  name: 'fx_on_date',
  description:
    'USD/IDR close on the requested date (or the last trading day before it). Rising USD/IDR = rupiah weakening.',
  input: z.strictObject({ date }),
  label: t('Mencari kurs pada tanggal…', 'Looking up the rate on the date…'),
  numeric: true,
  async run(ctx, input) {
    const { s, i, date: d, close } = await onDate(ctx, input.date);
    const lo = Math.max(0, i - 30);
    const hi = Math.min(s.d.length, i + 31);
    return {
      data: {
        requested: input.date,
        date: d,
        close,
        note: d !== input.date ? 'last trading day on/before the requested date' : undefined,
      },
      ui: [
        artifact(ctx, {
          title: `USD/IDR ${fmtDate(d, ctx.locale)}`,
          summary: `USD/IDR ${fmtNum(close, ctx.locale, 2)} (${fmtDate(d, ctx.locale)}).`,
          dataset: DS,
          tab: 'converter',
          spec: {
            type: 'line',
            x: s.d.slice(lo, hi),
            series: [{ name: 'USD/IDR', y: s.p.slice(lo, hi) }],
            y_format: 'num',
            log_allowed: true,
            annotations: [{ x: d, label: fmtNum(close, ctx.locale, 2) }],
          },
        }),
      ],
      method: method(ctx, {
        tool: 'fx_on_date',
        formulas: [],
        extraSteps: [
          {
            id: 'Kurs = close USD/IDR pada tanggal yang diminta atau hari bursa terakhir sebelumnya.',
            en: 'Rate = USD/IDR close on the requested date or the last trading day before it.',
          },
        ],
        inputs: input,
        rows: 1,
        period: { start: d, end: d },
        dataset: DS,
        flags: ['rising_means_rupiah_weaker'],
      }),
    };
  },
});

const convert = defineTool({
  name: 'convert',
  description:
    'Historical conversion USD→IDR or IDR→USD with the USD/IDR close on/before the date. Informational, not a transaction rate.',
  input: z.strictObject({
    amount: z.number().positive().max(1e15),
    direction: z.enum(['USD_TO_IDR', 'IDR_TO_USD']),
    date,
  }),
  label: t('Mengonversi…', 'Converting…'),
  numeric: true,
  async run(ctx, input) {
    const { date: d, close } = await onDate(ctx, input.date);
    const result = input.direction === 'USD_TO_IDR' ? input.amount * close : input.amount / close;
    const from = input.direction === 'USD_TO_IDR' ? 'USD' : 'IDR';
    const to = input.direction === 'USD_TO_IDR' ? 'IDR' : 'USD';
    return {
      data: { amount: input.amount, from, to, rate_date: d, rate: close, result },
      ui: [
        artifact(ctx, {
          title: ctx.locale === 'id' ? 'Konversi historis' : 'Historical conversion',
          summary: `${fmtNum(input.amount, ctx.locale)} ${from} = ${fmtNum(result, ctx.locale, 2)} ${to}`,
          dataset: DS,
          tab: 'converter',
          spec: {
            type: 'table',
            columns: [
              { key: 'k', label: '', format: 'text' },
              { key: 'v', label: '', format: 'text' },
            ],
            rows: [
              { k: from, v: fmtNum(input.amount, ctx.locale) },
              { k: 'USD/IDR', v: `${fmtNum(close, ctx.locale, 2)} (${fmtDate(d, ctx.locale)})` },
              { k: to, v: fmtNum(result, ctx.locale, 2) },
            ],
          },
        }),
      ],
      method: method(ctx, {
        tool: 'convert',
        formulas: ['fx_conversion'],
        inputs: input,
        rows: 1,
        period: { start: d, end: d },
        dataset: DS,
      }),
    };
  },
});

const yearlyAverage = defineTool({
  name: 'yearly_average',
  description: 'Average USD/IDR per calendar year (all years, or one year), plus the calendar-year change.',
  input: z.strictObject({ year: z.number().int().min(2001).max(2100).optional() }),
  label: t('Menghitung rata-rata tahunan…', 'Computing yearly averages…'),
  numeric: true,
  async run(ctx, input) {
    const avg = await ctx.store.json<Record<string, number>>('core/rupiah/yearly_average.json');
    const cal = await ad.calendar(ctx, 'USDIDR');
    const years = Object.keys(avg)
      .filter((y) => !input.year || Number(y) === input.year)
      .sort();
    if (!years.length)
      throw new ToolError(`No data for ${input.year}; years ${Object.keys(avg)[0]}–${Object.keys(avg).at(-1)}.`);
    return {
      data: {
        years: years.map((y) => ({
          year: y,
          average: avg[y],
          change: cal[y]?.ret ?? null,
          partial: cal[y]?.partial ?? false,
        })),
      },
      ui: [
        artifact(ctx, {
          title: ctx.locale === 'id' ? 'Rata-rata USD/IDR per tahun' : 'Average USD/IDR per year',
          summary: years
            .slice(-3)
            .map((y) => `${y}: ${fmtNum(avg[y], ctx.locale, 0)}`)
            .join('; '),
          dataset: DS,
          tab: 'yearly',
          spec: {
            type: 'bar',
            categories: years,
            series: [{ name: 'USD/IDR', values: years.map((y) => avg[y]!) }],
            horizontal: false,
            value_format: 'num',
          },
        }),
      ],
      method: method(ctx, {
        tool: 'yearly_average',
        formulas: ['yearly_average', 'calendar_return'],
        inputs: input,
        rows: years.length,
        dataset: DS,
      }),
    };
  },
});

const change = defineTool({
  name: 'change',
  description: 'Change of USD/IDR between two dates (positive = rupiah weakened). Uses closes on/before each date.',
  input: z.strictObject({ start: date, end: date }),
  label: t('Menghitung perubahan kurs…', 'Computing the change…'),
  numeric: true,
  async run(ctx, input) {
    const a = await onDate(ctx, input.start);
    const b = await onDate(ctx, input.end);
    const ch = b.close / a.close - 1;
    return {
      data: {
        start: { date: a.date, close: a.close },
        end: { date: b.date, close: b.close },
        change: ch,
        rupiah: ch > 0 ? 'weakened' : ch < 0 ? 'strengthened' : 'unchanged',
      },
      ui: [
        artifact(ctx, {
          title: `USD/IDR ${a.date} → ${b.date}`,
          summary: `${fmtPct(ch, ctx.locale)}`,
          dataset: DS,
          tab: 'rate',
          spec: {
            type: 'line',
            x: a.s.d.slice(a.i, b.i + 1),
            series: [{ name: 'USD/IDR', y: a.s.p.slice(a.i, b.i + 1) }],
            y_format: 'num',
            log_allowed: true,
          },
        }),
      ],
      method: method(ctx, {
        tool: 'change',
        formulas: ['simple_return'],
        inputs: input,
        rows: b.i - a.i + 1,
        period: { start: a.date, end: b.date },
        dataset: DS,
        flags: ['rising_means_rupiah_weaker'],
      }),
    };
  },
});

const compareSources = defineTool({
  name: 'compare_sources',
  description:
    'Cross-check of this USD/IDR series against the USDIDR column of the IDFinanDex dataset (overlap days, max absolute difference).',
  input: z.strictObject({}),
  label: t('Membandingkan dua sumber…', 'Comparing two sources…'),
  numeric: true,
  async run(ctx) {
    const q = await ctx.store.json<{
      cross_check_vs_idfin: { overlap_days: number; max_abs_diff: number; days_diff_gt_1pct: number } | null;
    }>('core/rupiah/quality.json');
    const c = q.cross_check_vs_idfin;
    if (!c) throw new ToolError('Cross-check unavailable (IDFinanDex data not built).');
    return {
      data: c,
      ui: [
        artifact(ctx, {
          title: ctx.locale === 'id' ? 'Cross-check dua sumber USD/IDR' : 'USD/IDR source cross-check',
          summary: `${c.overlap_days} ${ctx.locale === 'id' ? 'hari tumpang tindih' : 'overlap days'}; max ${fmtPct(c.max_abs_diff, ctx.locale, 3)}`,
          dataset: DS,
          tab: 'data',
          spec: {
            type: 'table',
            columns: [
              { key: 'k', label: '', format: 'text' },
              { key: 'v', label: '', format: 'text' },
            ],
            rows: [
              { k: 'overlap_days', v: String(c.overlap_days) },
              { k: 'max_abs_diff', v: fmtPct(c.max_abs_diff, ctx.locale, 3) },
              { k: 'days_diff_gt_1pct', v: String(c.days_diff_gt_1pct) },
            ],
          },
        }),
      ],
      method: method(ctx, {
        tool: 'compare_sources',
        formulas: [],
        extraSteps: [
          {
            id: 'Selisih = |close IDFinanDex ÷ close RupiahDex − 1| pada tanggal yang sama (setelah pembersihan masing-masing).',
            en: 'Difference = |IDFinanDex close ÷ RupiahDex close − 1| on common dates (after each cleaning).',
          },
        ],
        inputs: {},
        rows: c.overlap_days,
        dataset: DS,
      }),
    };
  },
});

const eventWindow = defineTool({
  name: 'event_window',
  description:
    'USD/IDR around a curated event: ' +
    RUPIAH_EVENTS.map((e) => `${e.id} (${e.date})`).join(', ') +
    '. Window −5…+30 days.',
  input: z.strictObject({ event_id: z.enum(RUPIAH_EVENTS.map((e) => e.id) as [string, ...string[]]) }),
  label: t('Menganalisis peristiwa…', 'Analysing the event…'),
  numeric: true,
  async run(ctx, input) {
    const ev = RUPIAH_EVENTS.find((e) => e.id === input.event_id)!;
    const a = await onDate(ctx, addDays(ev.date, -1));
    const b = await onDate(ctx, addDays(ev.date, 30));
    const ch = b.close / a.close - 1;
    return {
      data: {
        event: { id: ev.id, date: ev.date, label: ev.label[ctx.locale] },
        before: { date: a.date, close: a.close },
        after_30d: { date: b.date, close: b.close },
        change: ch,
      },
      ui: [
        artifact(ctx, {
          title: `${ev.label[ctx.locale]} — USD/IDR`,
          summary: `${fmtPct(ch, ctx.locale)} (30 ${ctx.locale === 'id' ? 'hari' : 'days'})`,
          dataset: DS,
          tab: 'events',
          spec: {
            type: 'line',
            x: a.s.d.slice(Math.max(0, a.i - 5), b.i + 1),
            series: [{ name: 'USD/IDR', y: a.s.p.slice(Math.max(0, a.i - 5), b.i + 1) }],
            y_format: 'num',
            log_allowed: true,
            annotations: [{ x: ev.date, label: ev.label[ctx.locale] }],
          },
        }),
      ],
      method: method(ctx, {
        tool: 'event_window',
        formulas: ['simple_return'],
        inputs: input,
        rows: b.i - a.i + 1,
        period: { start: a.date, end: b.date },
        dataset: DS,
      }),
    };
  },
});

export const tools: Tool<never>[] = [
  ...([datasetInfo, appInfo, openDex] as unknown as Tool<never>[]),
  ...timeSeriesTools(ad).filter((x) => !['search_entities', 'correlation', 'rank', 'compare'].includes(x.name)),
  ...([fxOnDate, convert, yearlyAverage, change, compareSources, eventWindow] as unknown as Tool<never>[]),
  dataQualityTool(async (ctx) => ctx.store.json('core/rupiah/quality.json')) as unknown as Tool<never>,
];
export const adapter = ad;
