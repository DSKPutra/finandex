// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Shared tools (§8.4). Universal tools (dataset_info, data_quality, app_info, open_dex) for every Dex, plus the
// time-series toolkit generated from a TsAdapter (search_entities, get_snapshot, get_history, compare, calendar_returns,
// rank, correlation, drawdowns, extreme_moves) for price-based Dex.
import { z } from 'zod';
import { APP_NAME, COPYRIGHT_EN, COPYRIGHT_ID, CREATOR, CREDIT_EN, CREDIT_ID } from '../../src/config/brand.ts';
import { DEX_BY_ID, DEX_IDS } from '../../src/config/dex-registry.ts';
import { inputsForDex } from '../../src/config/data-sources.ts';
import { anchorDate, idxOnOrBefore, PERIODS, daysBetween, type CalDate } from '../../src/shared/dates.ts';
import { corr, drawdownEpisodes, largestMoves, maxDrawdown, type Series } from '../../src/shared/analytics/series.ts';
import { std } from '../../src/shared/analytics/stats.ts';
import { fmtDate, fmtPct } from '../../src/shared/format.ts';
import { fold } from '../../src/shared/text.ts';
import { DATASET_NOTES } from './dataset-notes.ts';
import {
  artifact,
  asOf,
  defineTool,
  L,
  lttb,
  method,
  r6,
  t,
  ToolError,
  type Tool,
  type ToolContext,
} from '../tools/types.ts';

export const APP_VERSION = '1.0.0';

// ------------------------------------------------------------------------------------------------ universal tools
export const datasetInfo = defineTool({
  name: 'dataset_info',
  description:
    'Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules and limitations. Use when the user asks what data is available, where it comes from, how fresh it is, or why something is missing. Not for numbers about a specific entity.',
  input: z.strictObject({}),
  label: t('Membaca info dataset…', 'Reading dataset info…'),
  numeric: false,
  async run(ctx) {
    const notes = DATASET_NOTES[ctx.dex.id];
    const files = inputsForDex(ctx.dex.id);
    const m = ctx.manifest?.dex[ctx.dex.id];
    return {
      data: {
        dex: ctx.dex.name,
        dataset: notes.dataset,
        source_files: files.map((f) => ({ no: f.no, file: f.file, license: f.license, provider: f.provider })),
        status: m?.status ?? ctx.dex.status,
        missing_inputs: m?.missing_inputs ?? [],
        as_of: asOf(ctx),
        scope: L(ctx, ctx.dex.scope),
        sample_share: ctx.dex.sample ?? null,
        synthetic: ctx.dex.synthetic ?? false,
        license: ctx.dex.license,
        commercial_use_allowed: ctx.dex.commercialUseAllowed,
        cleaning_rules: notes.rules.map((r) => L(ctx, r)),
        limitations: notes.limits.map((r) => L(ctx, r)),
        realtime: false,
      },
      citations: [{ dex: ctx.dex.id, dataset: notes.dataset, as_of: asOf(ctx) }],
    };
  },
});

export const appInfo = defineTool({
  name: 'app_info',
  description:
    'Return information about the Finandex app and its creator. Use when the user asks who made/designed/developed this app or about the app itself.',
  input: z.strictObject({}),
  label: t('Membaca info aplikasi…', 'Reading app info…'),
  numeric: false,
  async run(ctx) {
    return {
      data: {
        app: APP_NAME,
        creator: CREATOR,
        credit: ctx.locale === 'id' ? CREDIT_ID : CREDIT_EN,
        copyright: ctx.locale === 'id' ? COPYRIGHT_ID : COPYRIGHT_EN,
        version: APP_VERSION,
        chatbots: DEX_IDS.length,
      },
    };
  },
});

export const openDex = defineTool({
  name: 'open_dex',
  description:
    'Suggest opening another Dex chatbot when the question is outside this Dex scope (rendered as a button). Use instead of answering from memory, e.g. IHSG → idfinandex, USD/IDR → rupiahdex, dividends → snp500dex, law → mylaiwyer.',
  input: z.strictObject({
    dexId: z.enum(DEX_IDS),
    entity: z.string().max(80).optional(),
    reason: z.string().max(200),
  }),
  label: t('Menyiapkan tautan Dex…', 'Preparing a Dex link…'),
  numeric: false,
  async run(ctx, input) {
    const target = DEX_BY_ID[input.dexId];
    const st = ctx.manifest?.dex[input.dexId]?.status ?? target.status;
    return {
      data: { dex: target.id, name: target.name, status: st, reason: input.reason, tagline: L(ctx, target.tagline) },
      ui: [
        artifact(ctx, {
          title: target.name,
          summary: input.reason,
          dataset: DATASET_NOTES[target.id].dataset,
          spec: {
            type: 'card',
            body: `${L(ctx, target.tagline)}${st !== 'live' ? (ctx.locale === 'id' ? ' (status: ' + st + ')' : ' (status: ' + st + ')') : ''}`,
            tone: st === 'pending-data' ? 'pending' : 'info',
            link: {
              dex: target.id,
              entity: input.entity ?? null,
              label: ctx.locale === 'id' ? `Buka ${target.name}` : `Open ${target.name}`,
            },
          },
        }),
      ],
    };
  },
});

export function dataQualityTool(
  load: (ctx: ToolContext, id?: string) => Promise<Record<string, unknown>>,
): Tool<{ id?: string | undefined }> {
  return defineTool({
    name: 'data_quality',
    description:
      'Data-quality report: removed spikes/bad prints, structural breaks (reliable_from), carry-forward rows, duplicates, OCR gaps, sample share, provider labels, synthetic flags. Use when the user asks why data looks odd, starts late, was removed, or whether it is reliable/real.',
    input: z.strictObject({ id: z.string().max(80).optional() }),
    label: t('Memeriksa kualitas data…', 'Checking data quality…'),
    numeric: true,
    async run(ctx, input) {
      const q = await load(ctx, input.id);
      const rules = DATASET_NOTES[ctx.dex.id].rules.map((r) => L(ctx, r));
      return {
        data: { dex: ctx.dex.id, as_of: asOf(ctx), ...(input.id ? { id: input.id } : {}), quality: q, rules },
        ui: [
          artifact(ctx, {
            title: ctx.locale === 'id' ? 'Laporan kualitas data' : 'Data-quality report',
            summary: rules[0] ?? '',
            dataset: DATASET_NOTES[ctx.dex.id].dataset,
            tab: 'data',
            spec: {
              type: 'table',
              columns: [
                { key: 'item', label: ctx.locale === 'id' ? 'Item' : 'Item', format: 'text' },
                { key: 'value', label: ctx.locale === 'id' ? 'Nilai' : 'Value', format: 'text' },
              ],
              rows: qualityRows(q),
            },
          }),
        ],
        method: method(ctx, {
          tool: 'data_quality',
          formulas: [],
          extraSteps: DATASET_NOTES[ctx.dex.id].rules,
          inputs: input,
          rows: 0,
          dataset: DATASET_NOTES[ctx.dex.id].dataset,
        }),
      };
    },
  });
}

/** Flatten scalar entries of a quality report (two levels deep) into table rows. */
function qualityRows(q: Record<string, unknown>, prefix = '', depth = 0): { item: string; value: string }[] {
  const out: { item: string; value: string }[] = [];
  for (const [k, v] of Object.entries(q)) {
    if (out.length >= 60) break;
    const key = prefix ? `${prefix}.${k}` : k;
    if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) out.push({ item: key, value: String(v) });
    else if (Array.isArray(v))
      out.push({
        item: key,
        value: v.length <= 5 && v.every((x) => typeof x !== 'object') ? v.join(', ') : `${v.length} items`,
      });
    else if (typeof v === 'object' && depth < 1) out.push(...qualityRows(v as Record<string, unknown>, key, depth + 1));
  }
  return out.slice(0, 60);
}

export const UNIVERSAL_TOOLS = [datasetInfo, appInfo, openDex] as const;

// ------------------------------------------------------------------------------------------------ time-series toolkit
export interface TsEntity {
  id: string;
  name: string;
  aliases: string[];
  type: string;
  as_of: string;
  ppy: number;
  currency?: string | null;
  unit?: string | null;
  group?: Record<string, string | null>;
}

export interface TsSeries {
  d: CalDate[];
  /** basis for returns & risk (adj close when available) */
  p: number[];
  /** display price (close) — defaults to p */
  c?: number[];
  ohlc_from?: number;
  o?: (number | null)[];
  h?: (number | null)[];
  l?: (number | null)[];
}

export interface TsAdapter {
  dataset: string;
  benchmark?: { id: string; label: string };
  entities(ctx: ToolContext): Promise<TsEntity[]>;
  series(ctx: ToolContext, id: string): Promise<TsSeries>;
  metrics(ctx: ToolContext, id: string): Promise<Record<string, unknown>>;
  /** calendar-year returns (golden) keyed by year */
  calendar(ctx: ToolContext, id: string): Promise<Record<string, { ret: number | null; partial: boolean }>>;
  /** metrics allowed for rank and their format */
  rankMetrics: Record<string, 'pct' | 'num' | 'price' | 'int' | 'money_idr' | 'money_usd'>;
  /** filter fields for rank (e.g. asset_type, geo_region) */
  filterFields?: string[];
  yFormat: 'price' | 'num';
  /** precomputed 3Y correlation matrix (golden) when available */
  corr3y?(ctx: ToolContext): Promise<Record<string, Record<string, number | null>> | null>;
  flagsFor?(ctx: ToolContext, id: string): Promise<string[]>;
  tab: string;
  events?: { id: string; date: CalDate; label: { id: string; en: string } }[];
}

export async function resolveEntity(ctx: ToolContext, ad: TsAdapter, raw: string): Promise<TsEntity> {
  const ents = await ad.entities(ctx);
  const q = fold(raw);
  const exact =
    ents.find((e) => e.id === raw) ??
    ents.find((e) => fold(e.id) === q) ??
    ents.find((e) => fold(e.name) === q || e.aliases.some((a) => fold(a) === q));
  if (exact) return exact;
  const partial = ents.filter(
    (e) => fold(e.name).includes(q) || fold(e.id).includes(q) || e.aliases.some((a) => fold(a).includes(q)),
  );
  if (partial.length === 1) return partial[0]!;
  const sugg = (partial.length ? partial : ents).slice(0, 8).map((e) => `${e.id} (${e.name})`);
  throw new ToolError(
    `Entity "${raw}" not found in ${ctx.dex.name}. ${partial.length > 1 ? 'Ambiguous; candidates' : 'Use search_entities first; examples'}: ${sugg.join(', ')}`,
  );
}

function sliceRange(s: TsSeries, start?: string, end?: string): { i0: number; i1: number } {
  // the close on/before `start` is the base of the window (same rule as period returns)
  const i0 = start ? Math.max(0, idxOnOrBefore(s.d, start)) : 0;
  const i1 = end ? idxOnOrBefore(s.d, end) : s.d.length - 1;
  if (i1 < i0 || i1 < 0)
    throw new ToolError(
      `No data between ${start ?? 'start'} and ${end ?? 'end'}. Available range: ${s.d[0]} → ${s.d.at(-1)}.`,
    );
  return { i0, i1 };
}

/** Resample for the model (≤ 400 points). */
function resample(
  d: CalDate[],
  p: number[],
  interval: 'auto' | 'daily' | 'weekly' | 'monthly',
): { d: CalDate[]; p: number[]; interval: string } {
  let iv = interval;
  if (iv === 'auto') iv = d.length <= 400 ? 'daily' : d.length <= 400 * 5 ? 'weekly' : 'monthly';
  if (iv === 'daily') return { d, p, interval: iv };
  const key = (x: CalDate) => (iv === 'monthly' ? x.slice(0, 7) : String(Math.floor(daysBetween('1970-01-05', x) / 7)));
  const od: CalDate[] = [];
  const op: number[] = [];
  for (let i = 0; i < d.length; i++) {
    if (i + 1 < d.length && key(d[i + 1]!) === key(d[i]!)) continue;
    od.push(d[i]!);
    op.push(p[i]!);
  }
  if (od.length > 400) {
    const step = Math.ceil(od.length / 400);
    const kd: CalDate[] = [];
    const kp: number[] = [];
    for (let i = 0; i < od.length; i += step) {
      kd.push(od[i]!);
      kp.push(op[i]!);
    }
    if (kd.at(-1) !== od.at(-1)) {
      kd.push(od.at(-1)!);
      kp.push(op.at(-1)!);
    }
    return { d: kd, p: kp, interval: iv };
  }
  return { d: od, p: op, interval: iv };
}

const periodEnum = z.enum(PERIODS);

export function timeSeriesTools(ad: TsAdapter): Tool<never>[] {
  const fmtY = ad.yFormat;
  const tools = [
    defineTool({
      name: 'search_entities',
      description: `Find entities (assets/stocks/companies/coins) in ${ad.dataset} by code or name (accent/case-insensitive). Use before other tools when unsure of the exact id.`,
      input: z.strictObject({ query: z.string().min(1).max(80), limit: z.number().int().min(1).max(10).optional() }),
      label: t('Mencari entitas…', 'Searching entities…'),
      numeric: false,
      async run(ctx, input) {
        const ents = await ad.entities(ctx);
        const q = fold(input.query);
        const scored = ents
          .map((e) => {
            const names = [e.id, e.name, ...e.aliases].map(fold);
            const s = names.some((n) => n === q)
              ? 3
              : names.some((n) => n.startsWith(q))
                ? 2
                : names.some((n) => n.includes(q))
                  ? 1
                  : 0;
            return { e, s };
          })
          .filter((x) => x.s > 0)
          .sort((a, b) => b.s - a.s || (a.e.id < b.e.id ? -1 : 1))
          .slice(0, input.limit ?? 10);
        return {
          data: {
            query: input.query,
            results: scored.map(({ e }) => ({ id: e.id, name: e.name, type: e.type, as_of: e.as_of })),
          },
        };
      },
    }),
    defineTool({
      name: 'get_snapshot',
      description:
        'Latest metrics for ONE entity: last close & date, returns 1D…MAX, CAGR, 1Y volatility, max drawdown, 52W high/low, ATH, SMA/RSI, quality flags. Use for "how is X doing / what is the price / return of X".',
      input: z.strictObject({ id: z.string().min(1).max(80) }),
      label: t('Membaca metrik terkini…', 'Reading latest metrics…'),
      numeric: true,
      async run(ctx, input) {
        const e = await resolveEntity(ctx, ad, input.id);
        const m = await ad.metrics(ctx, e.id);
        const flags = (await ad.flagsFor?.(ctx, e.id)) ?? [];
        const rows = PERIODS.map((p) => ({
          period: p,
          ret: (m[`ret_${p}`] as number | null) ?? null,
          cagr: (m[`cagr_${p}`] as number | null | undefined) ?? null,
        }));
        return {
          data: { id: e.id, name: e.name, currency: e.currency ?? null, unit: e.unit ?? null, metrics: m, flags },
          ui: [
            artifact(ctx, {
              title: `${e.name} — ${ctx.locale === 'id' ? 'return per periode' : 'returns by period'}`,
              summary: `${e.name}: ${ctx.locale === 'id' ? 'close terakhir' : 'last close'} ${String(m.last_close)} (${fmtDate(m.last_date as string, ctx.locale)}); 1Y ${fmtPct(m.ret_1Y as number | null, ctx.locale)}.`,
              dataset: ad.dataset,
              asOf: e.as_of,
              tab: ad.tab,
              entity: e.id,
              spec: {
                type: 'table',
                columns: [
                  { key: 'period', label: ctx.locale === 'id' ? 'Periode' : 'Period', format: 'text' },
                  { key: 'ret', label: 'Return', format: 'pct' },
                  { key: 'cagr', label: 'CAGR', format: 'pct' },
                ],
                rows,
              },
            }),
          ],
          method: method(ctx, {
            tool: 'get_snapshot',
            formulas: ['simple_return', 'period_anchor', 'cagr', 'vol_1y', 'max_drawdown', 'high_low_52w'],
            inputs: { id: e.id },
            rows: Number(m.rows ?? 0),
            period: { start: (m.first_date as string) ?? null, end: (m.last_date as string) ?? null },
            dataset: ad.dataset,
            asOf: e.as_of,
            flags,
          }),
        };
      },
    }),
    defineTool({
      name: 'get_history',
      description:
        'Price history of ONE entity over a date range (≤ 400 points returned; the chart is drawn automatically, with candlesticks for periods ≤ 2 years). Use for trends, "chart X", or values on past dates.',
      input: z.strictObject({
        id: z.string().min(1).max(80),
        start: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        end: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        interval: z.enum(['auto', 'daily', 'weekly', 'monthly']).optional(),
      }),
      label: t('Mengambil riwayat harga…', 'Fetching price history…'),
      numeric: true,
      async run(ctx, input) {
        const e = await resolveEntity(ctx, ad, input.id);
        const s = await ad.series(ctx, e.id);
        const { i0, i1 } = sliceRange(s, input.start, input.end);
        const d = s.d.slice(i0, i1 + 1);
        const c = (s.c ?? s.p).slice(i0, i1 + 1);
        const rs = resample(d, c, input.interval ?? 'auto');
        const ui = [];
        const ds = lttb(d, [c], 2000);
        const md = maxDrawdown(d, c);
        const allPos = c.every((v) => v > 0);
        const annotations = [
          ...(md.mdd_trough_date ? [{ x: md.mdd_trough_date, label: `MDD ${fmtPct(md.mdd, ctx.locale)}` }] : []),
          ...(ad.events ?? [])
            .filter((ev) => ev.date >= d[0]! && ev.date <= d.at(-1)!)
            .map((ev) => ({ x: ev.date, label: ev.label[ctx.locale] })),
        ];
        ui.push(
          artifact(ctx, {
            title: `${e.name} (${fmtDate(d[0], ctx.locale)} – ${fmtDate(d.at(-1), ctx.locale)})`,
            summary: `${e.name} ${ctx.locale === 'id' ? 'bergerak dari' : 'moved from'} ${r6(c[0])} ${ctx.locale === 'id' ? 'ke' : 'to'} ${r6(c.at(-1))} (${fmtPct(c.at(-1)! / c[0]! - 1, ctx.locale)}).`,
            dataset: ad.dataset,
            asOf: e.as_of,
            tab: ad.tab,
            entity: e.id,
            spec: {
              type: 'line',
              x: ds.x,
              series: [{ name: e.name, y: ds.ys[0]! }],
              y_format: fmtY,
              log_allowed: allPos,
              annotations,
            },
          }),
        );
        if (s.o && s.ohlc_from !== undefined && daysBetween(d[0]!, d.at(-1)!) <= 731 && i0 >= s.ohlc_from) {
          const a = i0 - s.ohlc_from;
          const b = i1 - s.ohlc_from + 1;
          ui.push(
            artifact(ctx, {
              title: `${e.name} — candlestick`,
              summary: `Candlestick ${e.name}.`,
              dataset: ad.dataset,
              asOf: e.as_of,
              tab: ad.tab,
              entity: e.id,
              spec: {
                type: 'candle',
                x: d,
                o: s.o.slice(a, b),
                h: s.h!.slice(a, b),
                l: s.l!.slice(a, b),
                c,
                y_format: fmtY,
              },
            }),
          );
        }
        const flags = (await ad.flagsFor?.(ctx, e.id)) ?? [];
        return {
          data: {
            id: e.id,
            name: e.name,
            interval: rs.interval,
            points: rs.d.map((dd, i) => [dd, r6(rs.p[i])]),
            first: { date: d[0], close: c[0] },
            last: { date: d.at(-1), close: c.at(-1) },
            change: c.at(-1)! / c[0]! - 1,
            max_drawdown_in_range: md,
            flags,
          },
          ui,
          method: method(ctx, {
            tool: 'get_history',
            formulas: ['simple_return', 'max_drawdown'],
            inputs: { id: e.id, start: input.start ?? null, end: input.end ?? null, interval: rs.interval },
            rows: d.length,
            period: { start: d[0]!, end: d.at(-1)! },
            dataset: ad.dataset,
            asOf: e.as_of,
            flags,
          }),
        };
      },
    }),
    defineTool({
      name: 'compare',
      description:
        'Compare 2–5 entities: line chart rebased to 100 plus a metric table. Give `period` (e.g. "5Y", "YTD") for the standard trailing-period returns, or start/end for a custom window. Use for "compare X and Y".',
      input: z.strictObject({
        ids: z.array(z.string().min(1).max(80)).min(2).max(5),
        period: periodEnum.optional(),
        start: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        end: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
      }),
      label: t('Membandingkan…', 'Comparing…'),
      numeric: true,
      async run(ctx, input) {
        const ents = await Promise.all(input.ids.map((id) => resolveEntity(ctx, ad, id)));
        const ser = await Promise.all(ents.map((e) => ad.series(ctx, e.id)));
        const mets = await Promise.all(ents.map((e) => ad.metrics(ctx, e.id)));
        const commonEnd = input.end ?? ser.map((s) => s.d.at(-1)!).sort()[0]!;
        let start = input.start;
        const period = input.period ?? (input.start ? undefined : '1Y');
        if (!start && period && period !== 'MAX' && period !== '1D') start = anchorDate(commonEnd, period);
        if (!start)
          start = ser
            .map((s) => s.d[0]!)
            .sort()
            .at(-1)!;
        const xs = new Set<string>();
        const cut = ser.map((s) => {
          const { i0, i1 } = sliceRange(s, start, commonEnd);
          return { d: s.d.slice(i0, i1 + 1), p: (s.c ?? s.p).slice(i0, i1 + 1), tr: s.p.slice(i0, i1 + 1) };
        });
        for (const c of cut) for (const d of c.d) xs.add(d);
        const x = [...xs].sort();
        const series = cut.map((c, k) => {
          const m = new Map(c.d.map((d, i) => [d, (c.tr[i]! / c.tr[0]!) * 100]));
          return { name: ents[k]!.name, y: x.map((d) => m.get(d) ?? null) };
        });
        const ds = lttb(
          x,
          series.map((s) => s.y),
          2000,
        );
        const table = ents.map((e, k) => {
          const c = cut[k]!;
          const custom = c.tr.at(-1)! / c.tr[0]! - 1;
          const rets: number[] = [];
          for (let i = 1; i < c.tr.length; i++) rets.push(c.tr[i]! / c.tr[i - 1]! - 1);
          const yrs = daysBetween(c.d[0]!, c.d.at(-1)!) / 365.25;
          return {
            id: e.id,
            name: e.name,
            ret:
              input.period && !input.start && !input.end
                ? ((mets[k]![`ret_${input.period}`] as number | null) ?? null)
                : custom,
            cagr: yrs >= 1 && c.tr[0]! > 0 && c.tr.at(-1)! > 0 ? (c.tr.at(-1)! / c.tr[0]!) ** (1 / yrs) - 1 : null,
            vol: rets.length >= 60 ? std(rets, 1) * Math.sqrt(e.ppy) : null,
            mdd: maxDrawdown(c.d, c.tr).mdd,
            start: c.d[0],
            end: c.d.at(-1),
          };
        });
        const periodLabel = input.period && !input.start && !input.end ? input.period : `${start} → ${commonEnd}`;
        return {
          data: {
            period: periodLabel,
            start,
            end: commonEnd,
            results: table.map((r) => ({ ...r, ret: r6(r.ret), cagr: r6(r.cagr), vol: r6(r.vol), mdd: r6(r.mdd) })),
            note: input.period
              ? `ret = standard trailing ${input.period} return (same as get_snapshot)`
              : 'ret = return over the custom window',
          },
          ui: [
            artifact(ctx, {
              title: `${ents.map((e) => e.name).join(' vs ')} (rebase 100)`,
              summary: table.map((r) => `${r.name} ${fmtPct(r.ret, ctx.locale)}`).join('; '),
              dataset: ad.dataset,
              tab: ad.tab,
              spec: {
                type: 'line',
                x: ds.x,
                series: ds.ys.map((y, k) => ({ name: series[k]!.name, y })),
                y_format: 'num',
                log_allowed: true,
                rebased: true,
              },
            }),
            artifact(ctx, {
              title: ctx.locale === 'id' ? 'Tabel metrik' : 'Metrics table',
              summary: periodLabel,
              dataset: ad.dataset,
              spec: {
                type: 'table',
                columns: [
                  { key: 'name', label: ctx.locale === 'id' ? 'Entitas' : 'Entity', format: 'text' },
                  { key: 'ret', label: `Return ${periodLabel}`, format: 'pct' },
                  { key: 'cagr', label: 'CAGR', format: 'pct' },
                  { key: 'vol', label: ctx.locale === 'id' ? 'Volatilitas' : 'Volatility', format: 'pct' },
                  { key: 'mdd', label: 'Max DD', format: 'pct' },
                ],
                rows: table,
              },
            }),
          ],
          method: method(ctx, {
            tool: 'compare',
            formulas: ['rebase_100', 'simple_return', 'period_anchor', 'cagr', 'max_drawdown'],
            inputs: {
              ids: ents.map((e) => e.id),
              period: input.period ?? null,
              start: input.start ?? null,
              end: input.end ?? null,
            },
            rows: cut.reduce((a, c) => a + c.d.length, 0),
            period: { start: start ?? null, end: commonEnd },
            dataset: ad.dataset,
          }),
        };
      },
    }),
    defineTool({
      name: 'calendar_returns',
      description:
        'Calendar-year returns of 1–8 entities (heatmap year × entity; partial years flagged). Use for "return in 2008", "best year", "performance per year".',
      input: z.strictObject({
        ids: z.array(z.string().min(1).max(80)).min(1).max(8),
        from_year: z.number().int().min(1960).max(2100).optional(),
        to_year: z.number().int().min(1960).max(2100).optional(),
      }),
      label: t('Menghitung return tahunan…', 'Computing calendar returns…'),
      numeric: true,
      async run(ctx, input) {
        const ents = await Promise.all(input.ids.map((id) => resolveEntity(ctx, ad, id)));
        const cals = await Promise.all(ents.map((e) => ad.calendar(ctx, e.id)));
        const years = [...new Set(cals.flatMap((c) => Object.keys(c)))]
          .filter(
            (y) => (!input.from_year || Number(y) >= input.from_year) && (!input.to_year || Number(y) <= input.to_year),
          )
          .sort();
        const partial = years.filter((y) => cals.some((c) => c[y]?.partial));
        const values = ents.map((_, k) => years.map((y) => cals[k]![y]?.ret ?? null));
        return {
          data: {
            entities: ents.map((e, k) => ({
              id: e.id,
              name: e.name,
              years: Object.fromEntries(
                years
                  .filter((y) => cals[k]![y])
                  .map((y) => [y, { ret: cals[k]![y]!.ret, partial: cals[k]![y]!.partial }]),
              ),
            })),
          },
          ui: [
            artifact(ctx, {
              title: ctx.locale === 'id' ? 'Return kalender' : 'Calendar returns',
              summary: ents.map((e) => e.name).join(', '),
              dataset: ad.dataset,
              tab: 'calendar',
              spec: {
                type: 'heatmap',
                x: years,
                y: ents.map((e) => e.name),
                values,
                value_format: 'pct',
                min: -0.5,
                max: 0.5,
                diverging: true,
                partial_x: partial,
              },
            }),
          ],
          method: method(ctx, {
            tool: 'calendar_returns',
            formulas: ['calendar_return'],
            inputs: { ids: ents.map((e) => e.id), from_year: input.from_year ?? null, to_year: input.to_year ?? null },
            rows: years.length * ents.length,
            period: { start: years[0] ?? null, end: years.at(-1) ?? null },
            dataset: ad.dataset,
            flags: partial.length ? ['partial_year'] : [],
          }),
        };
      },
    }),
    defineTool({
      name: 'rank',
      description: `Rank entities by a metric (${Object.keys(ad.rankMetrics).join(', ')}), descending or ascending, optional filter {field, value} with field in (${(ad.filterFields ?? []).join(', ') || 'none'}). Use for top/bottom-N, "which is the best/worst".`,
      input: z.strictObject({
        metric: z.enum(Object.keys(ad.rankMetrics) as [string, ...string[]]),
        order: z.enum(['desc', 'asc']).optional(),
        limit: z.number().int().min(1).max(25).optional(),
        filter: z.strictObject({ field: z.string().max(40), value: z.string().max(80) }).optional(),
      }),
      label: t('Menyusun peringkat…', 'Ranking…'),
      numeric: true,
      async run(ctx, input) {
        const ents = await ad.entities(ctx);
        const rows: { id: string; name: string; value: number; as_of: string }[] = [];
        for (const e of ents) {
          if (input.filter && fold(String(e.group?.[input.filter.field] ?? '')) !== fold(input.filter.value)) continue;
          const m = await ad.metrics(ctx, e.id);
          const v = m[input.metric];
          if (typeof v === 'number' && Number.isFinite(v))
            rows.push({ id: e.id, name: e.name, value: v, as_of: e.as_of });
        }
        const dir = input.order === 'asc' ? 1 : -1;
        rows.sort((a, b) => dir * (a.value - b.value) || (a.id < b.id ? -1 : 1));
        const top = rows.slice(0, input.limit ?? 10);
        const fmt = ad.rankMetrics[input.metric]!;
        return {
          data: {
            metric: input.metric,
            order: input.order ?? 'desc',
            candidates: rows.length,
            results: top.map((r, i) => ({ rank: i + 1, id: r.id, name: r.name, value: r.value, as_of: r.as_of })),
          },
          ui: [
            artifact(ctx, {
              title: `${ctx.locale === 'id' ? 'Peringkat' : 'Ranking'}: ${input.metric}`,
              summary: top
                .slice(0, 3)
                .map((r) => `${r.name} ${fmt === 'pct' ? fmtPct(r.value, ctx.locale) : r6(r.value)}`)
                .join('; '),
              dataset: ad.dataset,
              tab: ad.tab,
              spec: {
                type: 'bar',
                categories: top.map((r) => r.name),
                series: [{ name: input.metric, values: top.map((r) => r.value) }],
                horizontal: true,
                value_format: fmt,
              },
            }),
          ],
          method: method(ctx, {
            tool: 'rank',
            formulas: [
              'rank',
              ...(input.metric.startsWith('ret_') ? (['simple_return', 'period_anchor'] as const) : []),
            ],
            inputs: { metric: input.metric, order: input.order ?? 'desc', filter: input.filter ?? null },
            rows: rows.length,
            dataset: ad.dataset,
          }),
        };
      },
    }),
    defineTool({
      name: 'correlation',
      description:
        'Correlation matrix of daily returns for 2–8 entities over 1, 3 or 5 years (prices aligned on common dates first). Use for "how correlated are X and Y".',
      input: z.strictObject({
        ids: z.array(z.string().min(1).max(80)).min(2).max(8),
        years: z.union([z.literal(1), z.literal(3), z.literal(5)]).optional(),
      }),
      label: t('Menghitung korelasi…', 'Computing correlation…'),
      numeric: true,
      async run(ctx, input) {
        const years = input.years ?? 3;
        const ents = await Promise.all(input.ids.map((id) => resolveEntity(ctx, ad, id)));
        const ser = await Promise.all(
          ents.map(async (e): Promise<Series> => {
            const s = await ad.series(ctx, e.id);
            return { d: s.d, p: s.p };
          }),
        );
        const pre = years === 3 ? await ad.corr3y?.(ctx) : null;
        const mat = ents.map((a, i) =>
          ents.map((b, j) => (i === j ? 1 : (pre?.[a.id]?.[b.id] ?? corr(ser[i]!, ser[j]!, years)))),
        );
        const names = ents.map((e) => e.name);
        const pairs = [];
        for (let i = 0; i < ents.length; i++)
          for (let j = i + 1; j < ents.length; j++) pairs.push({ a: ents[i]!.id, b: ents[j]!.id, corr: mat[i]![j] });
        const flags = [
          ...new Set(
            (await Promise.all(ents.map((e) => ad.flagsFor?.(ctx, e.id) ?? Promise.resolve([] as string[])))).flat(),
          ),
        ];
        return {
          data: {
            years,
            pairs,
            note: mat.some((r) => r.some((v) => v === null)) ? 'null = fewer than 60 aligned returns' : undefined,
            flags,
          },
          ui: [
            artifact(ctx, {
              title: `${ctx.locale === 'id' ? 'Korelasi' : 'Correlation'} ${years}Y`,
              summary: pairs
                .map((p) => `${p.a}–${p.b}: ${p.corr === null || p.corr === undefined ? '–' : p.corr.toFixed(2)}`)
                .join('; '),
              dataset: ad.dataset,
              tab: 'correlation',
              spec: {
                type: 'heatmap',
                x: names,
                y: names,
                values: mat,
                value_format: 'num',
                min: -1,
                max: 1,
                diverging: true,
              },
            }),
          ],
          method: method(ctx, {
            tool: 'correlation',
            formulas: ['correlation'],
            inputs: { ids: ents.map((e) => e.id), years },
            rows: ser.reduce((a, s) => a + s.d.length, 0),
            dataset: ad.dataset,
            flags,
          }),
        };
      },
    }),
    defineTool({
      name: 'drawdowns',
      description:
        'Maximum drawdown and the largest drawdown episodes (peak, trough, recovery) of ONE entity. Use for "largest fall", "worst crash", "when did it recover".',
      input: z.strictObject({ id: z.string().min(1).max(80), top_n: z.number().int().min(1).max(5).optional() }),
      label: t('Menghitung drawdown…', 'Computing drawdowns…'),
      numeric: true,
      async run(ctx, input) {
        const e = await resolveEntity(ctx, ad, input.id);
        const s = await ad.series(ctx, e.id);
        const m = await ad.metrics(ctx, e.id);
        const eps = drawdownEpisodes(s.d, s.p, input.top_n ?? 3);
        let peak = -Infinity;
        const under = s.p.map((v) => {
          if (v > peak) peak = v;
          return v / peak - 1;
        });
        const ds = lttb(s.d, [under], 2000);
        const flags = (await ad.flagsFor?.(ctx, e.id)) ?? [];
        return {
          data: {
            id: e.id,
            name: e.name,
            max_drawdown: {
              mdd: m.mdd,
              peak: m.mdd_peak_date,
              trough: m.mdd_trough_date,
              recovery: m.mdd_recovery_date,
            },
            episodes: eps,
            flags,
          },
          ui: [
            artifact(ctx, {
              title: `${e.name} — drawdown (underwater)`,
              summary: `Max drawdown ${fmtPct(m.mdd as number, ctx.locale)}: ${fmtDate(m.mdd_peak_date as string, ctx.locale)} → ${fmtDate(m.mdd_trough_date as string, ctx.locale)}.`,
              dataset: ad.dataset,
              asOf: e.as_of,
              tab: ad.tab,
              entity: e.id,
              spec: {
                type: 'line',
                x: ds.x,
                series: [{ name: 'Drawdown', y: ds.ys[0]!, area: true }],
                y_format: 'pct',
                log_allowed: false,
                zero_line: true,
                annotations: m.mdd_trough_date ? [{ x: m.mdd_trough_date as string, label: 'MDD' }] : [],
              },
            }),
          ],
          method: method(ctx, {
            tool: 'drawdowns',
            formulas: ['max_drawdown'],
            inputs: { id: e.id, top_n: input.top_n ?? 3 },
            rows: s.d.length,
            period: { start: s.d[0]!, end: s.d.at(-1)! },
            dataset: ad.dataset,
            asOf: e.as_of,
            flags,
          }),
        };
      },
    }),
    defineTool({
      name: 'extreme_moves',
      description:
        'Largest single-day moves of ONE entity (up, down or both) in an optional date range. Use for "biggest daily jump/drop", "what happened on <date>".',
      input: z.strictObject({
        id: z.string().min(1).max(80),
        start: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        end: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        direction: z.enum(['up', 'down', 'both']).optional(),
        top_n: z.number().int().min(1).max(10).optional(),
      }),
      label: t('Mencari pergerakan terbesar…', 'Finding largest moves…'),
      numeric: true,
      async run(ctx, input) {
        const e = await resolveEntity(ctx, ad, input.id);
        const s = await ad.series(ctx, e.id);
        const { i0, i1 } = sliceRange(s, input.start, input.end);
        const d = s.d.slice(i0, i1 + 1);
        const p = s.p.slice(i0, i1 + 1);
        const mv = largestMoves(d, p, input.direction ?? 'both', input.top_n ?? 5);
        const flags = (await ad.flagsFor?.(ctx, e.id)) ?? [];
        return {
          data: {
            id: e.id,
            name: e.name,
            moves: mv.map((m) => ({ date: m.date, ret: m.ret, prev_close: r6(m.prev_close), close: r6(m.close) })),
            flags,
          },
          ui: [
            artifact(ctx, {
              title: `${e.name} — ${ctx.locale === 'id' ? 'pergerakan harian terbesar' : 'largest daily moves'}`,
              summary: mv
                .slice(0, 3)
                .map((m) => `${fmtDate(m.date, ctx.locale)} ${fmtPct(m.ret, ctx.locale)}`)
                .join('; '),
              dataset: ad.dataset,
              asOf: e.as_of,
              tab: ad.tab,
              entity: e.id,
              spec: {
                type: 'bar',
                categories: mv.map((m) => m.date),
                series: [{ name: e.name, values: mv.map((m) => m.ret) }],
                horizontal: true,
                value_format: 'pct',
              },
            }),
          ],
          method: method(ctx, {
            tool: 'extreme_moves',
            formulas: ['daily_move'],
            inputs: {
              id: e.id,
              direction: input.direction ?? 'both',
              start: input.start ?? null,
              end: input.end ?? null,
            },
            rows: d.length,
            period: { start: d[0]!, end: d.at(-1)! },
            dataset: ad.dataset,
            asOf: e.as_of,
            flags,
          }),
        };
      },
    }),
  ];
  return tools as unknown as Tool<never>[];
}
