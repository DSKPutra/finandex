// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Shared tools (§8.4). Time-series tools are registered only for Dex that have an entity adapter.
import { z } from 'zod';
import { COPYRIGHT_EN, CREDIT_EN, CREDIT_ID, OWNER_NAME } from '../../src/config/brand';
import { DEX_IDS, DEX_REGISTRY, getDex } from '../../src/config/dex-registry';
import type { DexId } from '../../src/config/dex-registry';
import { INPUT_FILES } from '../../src/config/inputs';
import { calendarYearReturns, corr } from '../../src/shared/analytics/series';
import { anchorDay, fromDayNumber, PERIODS, toDayNumber } from '../../src/shared/dates';
import type { Entity, Series, TsAdapter } from './adapters';
import { searchEntities } from './adapters';
import { artifact, defineTool, downsample, method, ToolError, tr } from '../tools/kit';
import type { ToolCtx, ToolDef } from '../tools/kit';

const nullableIso = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().describe('Calendar date YYYY-MM-DD, or null');

export function datasetLabel(dex: DexId): string {
  const d = getDex(dex)!;
  return [...d.inputs.map((n) => INPUT_FILES[n]), ...(d.kitDatasets ?? [])].join(', ');
}

type FeatureGuide = {
  app: { name: string; creator: string; dex_count: number; groups: { id: string; name: string; name_en: string; what: string; dex: string[] }[]; app_functions: { name: string; what: string }[] };
  dex: { id: string; name: string; group_name: string; purpose: string; ask_examples: string[]; functions: { tab: string; what: string }[]; limitations: string; data_as_of: string; related: string[] }[];
};

export async function asOfFor(ctx: ToolCtx): Promise<string> {
  const m = await ctx.manifest();
  return m.dex[ctx.dex]?.as_of ?? getDex(ctx.dex)!.asOf;
}

/** Series restricted to non-null values as day numbers + numbers. */
export function clean(s: Series, field: 'ret' | 'price' = 'ret'): { d: number[]; p: number[]; iso: string[] } {
  const d: number[] = [];
  const p: number[] = [];
  const iso: string[] = [];
  const src = s[field];
  s.d.forEach((x, i) => {
    const v = src[i];
    if (v === null || v === undefined || !Number.isFinite(v)) return;
    d.push(toDayNumber(x));
    p.push(v);
    iso.push(x);
  });
  return { d, p, iso };
}

function window(s: { d: number[]; p: number[]; iso: string[] }, start: string | null, end: string | null) {
  const a = start ? toDayNumber(start) : -Infinity;
  const b = end ? toDayNumber(end) : Infinity;
  const idx: number[] = [];
  s.d.forEach((x, i) => {
    if (x >= a && x <= b) idx.push(i);
  });
  return { d: idx.map((i) => s.d[i]!), p: idx.map((i) => s.p[i]!), iso: idx.map((i) => s.iso[i]!) };
}

async function resolve(ad: TsAdapter, id: string): Promise<Entity> {
  const ents = await ad.entities();
  const exact = ents.find((e) => e.id === id);
  if (exact) return exact;
  const hit = searchEntities(ents, id, 1)[0];
  if (!hit) throw new ToolError(`Unknown ${ad.entityLabel.en} "${id}". Call search_entities first to find a valid id.`);
  return hit;
}

export type Episode = { peak: string; trough: string; recovery: string | null; depth: number };

/** Non-overlapping drawdown episodes (peak → trough → recovery), deepest first. */
export function drawdownEpisodes(iso: string[], p: number[]): Episode[] {
  const out: Episode[] = [];
  let peakI = 0;
  let troughI = -1;
  for (let i = 1; i < p.length; i++) {
    if (p[i]! >= p[peakI]!) {
      if (troughI >= 0) out.push({ peak: iso[peakI]!, trough: iso[troughI]!, recovery: iso[i]!, depth: p[troughI]! / p[peakI]! - 1 });
      if (p[i]! > p[peakI]! || troughI >= 0) peakI = i;
      troughI = -1;
    } else if (troughI < 0 || p[i]! < p[troughI]!) troughI = i;
  }
  if (troughI >= 0) out.push({ peak: iso[peakI]!, trough: iso[troughI]!, recovery: null, depth: p[troughI]! / p[peakI]! - 1 });
  return out.sort((a, b) => a.depth - b.depth);
}

export function sharedTools(dex: DexId, ad: TsAdapter | undefined): ToolDef[] {
  const src = async (ctx: ToolCtx) => ({ dex, dataset: ad?.dataset ?? datasetLabel(dex), as_of: await asOfFor(ctx) });
  const tools: ToolDef[] = [
    defineTool({
      name: 'dataset_info',
      description:
        'Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what data is available or how up to date it is. Not for numbers about entities.',
      input: z.object({}).strict(),
      label: { id: 'Membaca info dataset…', en: 'Reading dataset info…' },
      run: async (_i, ctx) => {
        const d = getDex(dex)!;
        const m = await ctx.manifest();
        const entities = ad ? (await ad.entities()).length : null;
        return {
          data: {
            dex: d.name,
            source_files: d.inputs.map((n) => ({ no: n, file: INPUT_FILES[n] })),
            kit_datasets: d.kitDatasets ?? [],
            as_of: m.dex[dex]?.as_of ?? d.asOf,
            quality: m.dex[dex]?.quality ?? {},
            entities,
            licence: d.license,
            commercial_use_allowed: d.commercialUseAllowed,
            sample: d.sample ? d.sample.en : null,
            realtime: false,
          },
          citations: [{ dex, dataset: datasetLabel(dex), as_of: m.dex[dex]?.as_of ?? d.asOf }],
        };
      },
    }),
    defineTool({
      name: 'data_quality',
      description:
        'Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synthetic data, provider labels. Use when the user asks why data looks odd, starts late, or was removed.',
      input: z.object({ id: z.string().nullable().describe('Entity id, or null for the whole dataset') }).strict(),
      label: { id: 'Memeriksa kualitas data…', en: 'Checking data quality…' },
      run: async ({ id }, ctx) => {
        const m = await ctx.manifest();
        let entity: unknown = null;
        if (ad) entity = await ad.quality(id ? (await resolve(ad, id)).id : undefined);
        else entity = await extraQuality(dex, ctx);
        const s = await src(ctx);
        const flat = (o: unknown, prefix = ''): [string, string][] =>
          o && typeof o === 'object' && !Array.isArray(o)
            ? Object.entries(o as Record<string, unknown>).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) && prefix.split('.').length < 3 ? flat(v, `${prefix}${k}.`) : [[`${prefix}${k}`, Array.isArray(v) ? (v.length > 6 ? `${v.slice(0, 6).map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ')} … (${v.length})` : v.map((x) => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ')) : String(v)] as [string, string]]))
            : [];
        const rows = [...flat(m.dex[dex]?.quality ?? {}, 'dex.'), ...flat(entity, '')].slice(0, 40).map(([k, v]) => ({ field: k, value: v.slice(0, 300) }));
        return {
          data: { dex_quality: m.dex[dex]?.quality ?? {}, report: entity },
          ui: [artifact('table', tr(ctx.locale, 'Laporan kualitas data', 'Data-quality report'), { type: 'table', columns: [{ key: 'field', label: tr(ctx.locale, 'Aspek', 'Field') }, { key: 'value', label: tr(ctx.locale, 'Nilai', 'Value') }], rows }, s)],
          method: method('data_quality', ['count'], { inputs: { id }, rows_used: rows.length, dataset: s.dataset, as_of: s.as_of, flags: ['quality_report'] }),
          citations: [s],
        };
      },
    }),
    defineTool({
      name: 'app_info',
      description: 'Information about the Finandex app and its creator. Use when asked who made the app.',
      input: z.object({}).strict(),
      label: { id: 'Info aplikasi…', en: 'App info…' },
      run: async (_i, ctx) => ({
        data: { app: 'Finandex', creator: OWNER_NAME, copyright: COPYRIGHT_EN, credit: ctx.locale === 'id' ? CREDIT_ID : CREDIT_EN, version: ctx.appVersion },
      }),
    }),
    defineTool({
      name: 'feature_guide',
      description:
        'Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use for "fitur ini untuk apa?", "bisa tanya apa?", "ada fitur apa saja?", "cara pakainya?". dexId "all" = the whole app (all categories + general app functions). Never invent features beyond the result.',
      input: z.object({ dexId: z.enum([...DEX_IDS, 'all']).nullable(), function: z.string().max(60).nullable() }).strict(),
      label: { id: 'Membuka panduan fitur…', en: 'Opening feature guide…' },
      run: async ({ dexId, function: fn }, ctx) => {
        const L = ctx.locale;
        const g = await ctx.store.json<FeatureGuide>('core/app/feature_guide.json');
        const source = { dex, dataset: 'feature_guide.json (Finandex)', as_of: String((g as unknown as { meta?: { version?: string } }).meta?.version ?? '') };
        const id = dexId ?? dex;
        if (id === 'all') {
          return {
            data: { app: g.app.name, creator: g.app.creator, dex_count: g.app.dex_count, groups: g.app.groups.map((x) => ({ name: L === 'en' ? x.name_en : x.name, what: x.what, dex: x.dex.map((d) => getDex(d)?.name ?? d) })), app_functions: g.app.app_functions },
            ui: [
              artifact('card', tr(L, `Finandex — ${g.app.dex_count} Dex dalam ${g.app.groups.length} kategori`, `Finandex — ${g.app.dex_count} Dex in ${g.app.groups.length} categories`), { type: 'card', tone: 'info', body: tr(L, 'Fungsi aplikasi', 'App functions'), functions: g.app.app_functions.map((f) => ({ tab: f.name, tabId: null, what: f.what })), items: g.app.groups.map((x) => `${L === 'en' ? x.name_en : x.name}: ${x.dex.map((d) => getDex(d)?.name ?? d).join(', ')}`) }, source),
              artifact('bar', tr(L, 'Jumlah Dex per kategori', 'Dex per category'), { type: 'bar', categories: g.app.groups.map((x) => (L === 'en' ? x.name_en : x.name)), series: [{ name: 'Dex', data: g.app.groups.map((x) => x.dex.length) }], horizontal: true, yUnit: 'number' }, source),
            ],
            method: method('feature_guide', ['count'], { inputs: { dexId: 'all' }, rows_used: g.app.dex_count, dataset: 'feature_guide.json', as_of: source.as_of }),
            citations: [source],
          };
        }
        const e = g.dex.find((x) => x.id === id);
        const reg = getDex(id);
        if (!e || !reg) throw new ToolError(`No feature guide for ${id}.`);
        const funcs = e.functions.filter((f) => !fn || f.tab.toLowerCase().includes(fn.toLowerCase()));
        const tabId = (label: string) => reg.tabs.find((t) => t.label.id === label)?.id ?? null;
        const m = await ctx.manifest();
        return {
          data: { dex: e.name, purpose: e.purpose, ask_examples: e.ask_examples, functions: funcs.map((f) => ({ tab: f.tab, what: f.what })), data_as_of: m.dex[id]?.as_of ?? e.data_as_of, limitations: e.limitations, related: e.related.map((r) => ({ dexId: r, name: getDex(r)?.name ?? r })) },
          ui: [artifact('card', tr(L, `${e.name} — panduan fitur`, `${e.name} — feature guide`), { type: 'card', tone: 'info', body: e.purpose, functions: funcs.map((f) => ({ tab: L === 'en' ? (reg.tabs.find((t) => t.label.id === f.tab)?.label.en ?? f.tab) : f.tab, tabId: tabId(f.tab), what: f.what })), chips: e.ask_examples, items: [`${tr(L, 'Data per', 'Data as of')} ${m.dex[id]?.as_of ?? e.data_as_of}`, `${tr(L, 'Keterbatasan', 'Limitations')}: ${e.limitations}`] }, source)],
          citations: [source],
        };
      },
    }),
    defineTool({
      name: 'open_dex',
      description:
        'Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numbers that this Dex does not have.',
      input: z
        .object({
          dexId: z.enum(DEX_IDS),
          entity: z.string().nullable(),
          reason: z.string().describe('One short sentence in the user language'),
        })
        .strict(),
      label: { id: 'Menyiapkan tautan Dex…', en: 'Preparing Dex link…' },
      run: async ({ dexId, entity, reason }, ctx) => {
        const target = getDex(dexId)!;
        const label = tr(ctx.locale, `Buka ${target.name}`, `Open ${target.name}`);
        return {
          data: { dex: target.name, dexId, entity, reason },
          ui: [
            artifact('card', target.name, { type: 'card', tone: 'link', body: reason, link: { dexId, ...(entity ? { entity } : {}), label } }, { dex: dexId, dataset: datasetLabel(dexId), as_of: (await ctx.manifest()).dex[dexId]?.as_of ?? target.asOf }),
          ],
        };
      },
    }),
  ];
  if (!ad) return tools;

  tools.push(
    defineTool({
      name: 'search_entities',
      description: `Find ${ad.entityLabel.en} ids in this dataset by code or name (accent/case-insensitive). Use before other tools when you are unsure of the exact id.`,
      input: z.object({ query: z.string().min(1).max(80), limit: z.number().int().min(1).max(10).nullable() }).strict(),
      label: { id: 'Mencari entitas…', en: 'Searching entities…' },
      run: async ({ query, limit }, ctx) => {
        const as_of = await asOfFor(ctx);
        const hits = searchEntities(await ad.entities(), query, limit ?? 10);
        return { data: { results: hits.map((e) => ({ id: e.id, name: e.name, type: e.type, as_of: (e.metrics.last_date as string) ?? as_of })) } };
      },
    }),
    defineTool({
      name: 'get_snapshot',
      description: `Latest metrics of one ${ad.entityLabel.en}: last value and date, returns 1D–MAX, CAGR, volatility, max drawdown, 52W high/low, ATH, quality flags, and descriptors. Use for "how much / what is the latest" questions.`,
      input: z.object({ id: z.string().min(1) }).strict(),
      label: { id: 'Mengambil metrik terkini…', en: 'Fetching latest metrics…' },
      run: async ({ id }, ctx) => {
        const e = await resolve(ad, id);
        const s = await ad.series(e.id);
        const c = clean(s, 'price');
        const tail = downsample(c.iso.slice(-260), [c.p.slice(-260)], 260);
        const as_of = (e.metrics.last_date as string | undefined) ?? (await asOfFor(ctx));
        return {
          data: { id: e.id, name: e.name, type: e.type, metrics: e.metrics, basis: ad.basisNote?.[ctx.locale] ?? null },
          ui: [artifact('line', `${e.name}`, { type: 'line', x: tail.x, series: [{ name: e.name, data: tail.ys[0]! }], yUnit: 'number', logAllowed: c.p.every((v) => v > 0) }, { dex, dataset: ad.dataset, as_of })],
          method: method('get_snapshot', ['simple_return', 'cagr', 'vol_1y', 'max_drawdown', 'hi_lo_52w', 'ath'], {
            inputs: { id: e.id },
            rows_used: (e.metrics.rows as number | undefined) ?? c.p.length,
            dataset: ad.dataset,
            as_of,
            flags: [...((e.metrics.quality_flags as string[] | undefined) ?? []), ...(e.metrics.low_precision ? ['low_precision'] : [])],
          }),
          citations: [{ dex, dataset: ad.dataset, as_of }],
        };
      },
    }),
    defineTool({
      name: 'get_history',
      description: `Price history of one ${ad.entityLabel.en} between optional dates (≤ 400 points, with chart). Use for trends over time and "what happened on/around a date".`,
      input: z
        .object({
          id: z.string().min(1),
          start: nullableIso,
          end: nullableIso,
          interval: z.enum(['auto', 'daily', 'weekly', 'monthly']).nullable(),
        })
        .strict(),
      label: { id: 'Mengambil riwayat harga…', en: 'Fetching price history…' },
      run: async ({ id, start, end, interval }, _ctx) => {
        const e = await resolve(ad, id);
        const s = await ad.series(e.id);
        const w = window(clean(s, 'price'), start, end);
        if (!w.p.length) throw new ToolError('No data in that period. Use dataset_info for the covered date range.');
        let x = w.iso;
        let y: (number | null)[] = w.p;
        if (interval === 'weekly' || interval === 'monthly') {
          const key = (iso: string) => (interval === 'monthly' ? iso.slice(0, 7) : String(Math.floor((toDayNumber(iso) + 3) / 7)));
          const lastIdx = new Map<string, number>();
          x.forEach((v, i) => lastIdx.set(key(v), i));
          const idx = [...lastIdx.values()];
          x = idx.map((i) => w.iso[i]!);
          y = idx.map((i) => w.p[i]!);
        }
        const ds = downsample(x, [y], 400);
        const first = w.p[0]!;
        const last = w.p.at(-1)!;
        const minI = w.p.indexOf(Math.min(...w.p));
        const maxI = w.p.indexOf(Math.max(...w.p));
        const as_of = w.iso.at(-1)!;
        const ui = [artifact('line', e.name, { type: 'line', x: ds.x, series: [{ name: e.name, data: ds.ys[0]! }], yUnit: 'number', logAllowed: w.p.every((v) => v > 0), marks: [{ x: w.iso[maxI]!, label: 'max' }, { x: w.iso[minI]!, label: 'min' }] }, { dex, dataset: ad.dataset, as_of })];
        const span = toDayNumber(w.iso.at(-1)!) - toDayNumber(w.iso[0]!);
        if (s.ohlc && span <= 731) {
          const full = s.d.map((dd, i) => ({ dd, i })).filter(({ dd }) => (!start || dd >= start) && (!end || dd <= end));
          const ohlc = full.map(({ i }) => {
            const o = s.ohlc!.o[i];
            const h = s.ohlc!.h[i];
            const l = s.ohlc!.l[i];
            const c = s.price[i];
            return o !== null && o !== undefined && h !== null && h !== undefined && l !== null && l !== undefined && c !== null && c !== undefined ? ([o, c, l, h] as [number, number, number, number]) : null;
          });
          ui.push(artifact('candle', `${e.name} (OHLC)`, { type: 'candle', x: full.map(({ dd }) => dd), ohlc, name: e.name }, { dex, dataset: ad.dataset, as_of }));
        }
        return {
          data: {
            id: e.id,
            name: e.name,
            start: w.iso[0],
            end: as_of,
            first_close: first,
            last_close: last,
            change: last / first - 1,
            min: { date: w.iso[minI], close: w.p[minI] },
            max: { date: w.iso[maxI], close: w.p[maxI] },
            points: ds.x.length,
          },
          ui,
          method: method('get_history', ['simple_return'], { inputs: { id: e.id, start, end, interval }, rows_used: w.p.length, dataset: ad.dataset, as_of, period: { start: w.iso[0]!, end: as_of } }),
          citations: [{ dex, dataset: ad.dataset, as_of }],
        };
      },
    }),
    defineTool({
      name: 'compare',
      description: `Compare 2–5 ${ad.entityLabel.en}s: rebased-to-100 chart over a common window plus a metric table (period return, CAGR, volatility, max drawdown). Period defaults to the dataset metrics; or give start/end dates.`,
      input: z
        .object({
          ids: z.array(z.string()).min(2).max(5),
          period: z.enum(PERIODS).nullable(),
          start: nullableIso,
          end: nullableIso,
        })
        .strict(),
      label: { id: 'Membandingkan…', en: 'Comparing…' },
      run: async ({ ids, period, start, end }, ctx) => {
        const ents = await Promise.all(ids.map((i) => resolve(ad, i)));
        const ser = await Promise.all(ents.map(async (e) => clean(await ad.series(e.id))));
        const lastCommon = Math.min(...ser.map((s) => s.d.at(-1)!));
        const p = period ?? '1Y';
        let a: number;
        if (start) a = toDayNumber(start);
        else if (p === 'MAX') a = Math.max(...ser.map((s) => s.d[0]!));
        else a = p === '1D' ? lastCommon - 1 : anchorDay(lastCommon, p);
        const b = end ? toDayNumber(end) : lastCommon;
        const rows = ents.map((e, k) => {
          const s = ser[k]!;
          const w = window(s, fromDayNumber(a), fromDayNumber(b));
          const baseIdx = s.d.findLastIndex((x) => x <= a);
          const base = baseIdx >= 0 ? s.p[baseIdx]! : w.p[0]!;
          const endV = w.p.at(-1)!;
          const fieldRet = !start && !end && period ? (e.metrics[`ret_${period}`] as number | null | undefined) ?? null : null;
          return {
            id: e.id,
            name: e.name,
            [`ret_${start || end ? 'window' : p}`]: fieldRet ?? (base ? endV / base - 1 : null),
            cagr_5Y: (e.metrics.cagr_5Y as number | null | undefined) ?? null,
            vol_1Y: (e.metrics.vol_1Y as number | null | undefined) ?? null,
            mdd: (e.metrics.mdd as number | null | undefined) ?? null,
            last_date: (e.metrics.last_date as string | undefined) ?? fromDayNumber(s.d.at(-1)!),
            base,
          };
        });
        const days = [...new Set(ser.flatMap((s) => window(s, fromDayNumber(a), fromDayNumber(b)).d))].sort((x, y) => x - y);
        const x = days.map(fromDayNumber);
        const series = ser.map((s, k) => {
          const map = new Map(s.d.map((dd, i) => [dd, s.p[i]!]));
          let lastV: number | null = null;
          const base = rows[k]!.base;
          return {
            name: ents[k]!.name,
            data: days.map((dd) => {
              const v = map.get(dd);
              if (v !== undefined) lastV = v;
              return lastV === null || !base ? null : (lastV / base) * 100;
            }),
          };
        });
        const ds = downsample(x, series.map((s) => s.data), 400);
        const as_of = fromDayNumber(b);
        const retKey = `ret_${start || end ? 'window' : p}`;
        return {
          data: { period: start || end ? { start: fromDayNumber(a), end: as_of } : p, rows: rows.map(({ base: _b, ...r }) => r) },
          ui: [
            artifact('line', tr(ctx.locale, 'Perbandingan (rebase 100)', 'Comparison (rebased to 100)'), { type: 'line', x: ds.x, series: series.map((s, k) => ({ name: s.name, data: ds.ys[k]! })), yUnit: 'index' }, { dex, dataset: ad.dataset, as_of }),
            artifact('table', tr(ctx.locale, 'Metrik', 'Metrics'), {
              type: 'table',
              columns: [
                { key: 'name', label: tr(ctx.locale, 'Nama', 'Name') },
                { key: retKey, label: `Return ${start || end ? '' : p}`.trim(), unit: 'pct' },
                { key: 'cagr_5Y', label: 'CAGR 5Y', unit: 'pct' },
                { key: 'vol_1Y', label: tr(ctx.locale, 'Volatilitas 1Y', 'Volatility 1Y'), unit: 'pct' },
                { key: 'mdd', label: 'Max drawdown', unit: 'pct' },
              ],
              rows: rows.map(({ base: _b, ...r }) => r as Record<string, string | number | null>),
            }, { dex, dataset: ad.dataset, as_of }),
          ],
          method: method('compare', ['rebase_100', 'simple_return', 'cagr', 'vol_1y', 'max_drawdown'], {
            inputs: { ids: ents.map((e) => e.id), period, start, end },
            rows_used: days.length,
            dataset: ad.dataset,
            as_of,
            period: { start: fromDayNumber(a), end: as_of },
            flags: ents.flatMap((e) => (e.metrics.low_precision ? [`low_precision:${e.id}`] : [])),
          }),
          citations: [{ dex, dataset: ad.dataset, as_of }],
        };
      },
    }),
    defineTool({
      name: 'calendar_returns',
      description: `Calendar-year returns of one ${ad.entityLabel.en} (first and current years flagged partial), with heatmap. Use for "return in year X" or year-by-year questions.`,
      input: z.object({ id: z.string().min(1), from_year: z.number().int().nullable(), to_year: z.number().int().nullable() }).strict(),
      label: { id: 'Menghitung return tahunan…', en: 'Computing calendar returns…' },
      run: async ({ id, from_year, to_year }, ctx) => {
        const e = await resolve(ad, id);
        let cal = await ad.calendar(e.id);
        if (!cal) {
          const c = clean(await ad.series(e.id));
          cal = calendarYearReturns(c.d, c.p);
        }
        const years = Object.keys(cal)
          .filter((y) => (!from_year || Number(y) >= from_year) && (!to_year || Number(y) <= to_year))
          .sort();
        const as_of = (e.metrics.last_date as string | undefined) ?? (await asOfFor(ctx));
        return {
          data: { id: e.id, name: e.name, returns: Object.fromEntries(years.map((y) => [y, cal![y]])) },
          ui: [
            artifact('heatmap', tr(ctx.locale, `Return tahunan ${e.name}`, `${e.name} calendar returns`), {
              type: 'heatmap',
              x: years,
              y: [e.name],
              values: [years.map((y) => cal![y]!.ret)],
              range: [-0.5, 0.5],
              unit: 'pct',
              partial: years.filter((y) => cal![y]!.partial),
            }, { dex, dataset: ad.dataset, as_of }),
          ],
          method: method('calendar_returns', ['calendar_return'], { inputs: { id: e.id, from_year, to_year }, rows_used: years.length, dataset: ad.dataset, as_of, flags: years.filter((y) => cal![y]!.partial).map((y) => `partial:${y}`) }),
          citations: [{ dex, dataset: ad.dataset, as_of }],
        };
      },
    }),
    defineTool({
      name: 'rank',
      description: `Rank ${ad.entityLabel.en}s by a metric from the catalogue (e.g. ret_1D…ret_MAX, cagr_5Y, vol_1Y, mdd, pct_from_ath, plus Dex-specific fields). Optional filter on one categorical field. Ties sorted by id A→Z.`,
      input: z
        .object({
          metric: z.string().min(1).describe('Catalogue field, e.g. ret_YTD, ret_1Y, vol_1Y, mdd, pct_from_ath, cagr_5Y'),
          order: z.enum(['desc', 'asc']),
          limit: z.number().int().min(1).max(25).nullable(),
          filter_field: z.string().nullable(),
          filter_value: z.string().nullable(),
        })
        .strict(),
      label: { id: 'Menyusun peringkat…', en: 'Ranking…' },
      run: async ({ metric, order, limit, filter_field, filter_value }, ctx) => {
        let ents = await ad.entities();
        if (filter_field && filter_value) {
          if (!ad.filterFields.includes(filter_field)) throw new ToolError(`Filter field must be one of: ${ad.filterFields.join(', ') || '(none for this Dex)'}`);
          const fv = filter_value.toLowerCase();
          ents = ents.filter((e) => String(e.metrics[filter_field] ?? e.type ?? '').toLowerCase() === fv);
        }
        const val = (e: Entity) => e.metrics[metric];
        const numeric = ents.filter((e) => typeof val(e) === 'number' && Number.isFinite(val(e) as number));
        if (!numeric.length) throw new ToolError(`Metric "${metric}" is not available. Try one of: ret_1D, ret_YTD, ret_1Y, ret_5Y, cagr_5Y, vol_1Y, mdd, pct_from_ath.`);
        const sorted = numeric.sort((a, b) => (order === 'desc' ? (val(b) as number) - (val(a) as number) : (val(a) as number) - (val(b) as number)) || (a.id < b.id ? -1 : 1)).slice(0, limit ?? 10);
        const as_of = await asOfFor(ctx);
        const isPct = /^(ret_|cagr_|vol_|mdd|pct_|ttm_yield|price_ret_|dividend_cagr)/.test(metric);
        return {
          data: { metric, order, results: sorted.map((e, i) => ({ rank: i + 1, id: e.id, name: e.name, value: val(e), last_date: e.metrics.last_date ?? null })) },
          ui: [
            artifact('bar', `${metric}`, { type: 'bar', categories: sorted.map((e) => e.name), series: [{ name: metric, data: sorted.map((e) => val(e) as number) }], horizontal: true, yUnit: isPct ? 'pct' : 'number' }, { dex, dataset: ad.dataset, as_of }),
          ],
          method: method('rank', ['rank_sort'], { inputs: { metric, order, limit, filter_field, filter_value }, rows_used: numeric.length, dataset: ad.dataset, as_of }),
          citations: [{ dex, dataset: ad.dataset, as_of }],
        };
      },
    }),
    defineTool({
      name: 'correlation',
      description: `Correlation matrix of daily returns for 2–8 ${ad.entityLabel.en}s over 1, 3, or 5 years (prices aligned on common dates first), with heatmap.`,
      input: z.object({ ids: z.array(z.string()).min(2).max(8), years: z.union([z.literal(1), z.literal(3), z.literal(5)]) }).strict(),
      label: { id: 'Menghitung korelasi…', en: 'Computing correlation…' },
      run: async ({ ids, years }, ctx) => {
        const ents = await Promise.all(ids.map((i) => resolve(ad, i)));
        const ser = await Promise.all(ents.map(async (e) => clean(await ad.series(e.id))));
        const m = ents.map((_, i) => ents.map((__, j) => (i === j ? 1 : corr(ser[i]!.d, ser[i]!.p, ser[j]!.d, ser[j]!.p, years))));
        const as_of = fromDayNumber(Math.min(...ser.map((s) => s.d.at(-1)!)));
        const names = ents.map((e) => e.name);
        return {
          data: { years, ids: ents.map((e) => e.id), names, matrix: m },
          ui: [artifact('heatmap', tr(ctx.locale, `Korelasi ${years} tahun`, `${years}-year correlation`), { type: 'heatmap', x: names, y: names, values: m, range: [-1, 1], unit: 'number' }, { dex, dataset: ad.dataset, as_of })],
          method: method('correlation', ['correlation'], { inputs: { ids: ents.map((e) => e.id), years }, rows_used: Math.min(...ser.map((s) => s.p.length)), dataset: ad.dataset, as_of, flags: ents.flatMap((e) => (e.metrics.low_precision ? [`low_precision:${e.id}`] : [])) }),
          citations: [{ dex, dataset: ad.dataset, as_of }],
        };
      },
    }),
    defineTool({
      name: 'drawdowns',
      description: `Largest drawdown episodes (peak, trough, recovery date or null) of one ${ad.entityLabel.en}, with underwater chart.`,
      input: z.object({ id: z.string().min(1), top_n: z.number().int().min(1).max(5).nullable() }).strict(),
      label: { id: 'Mencari drawdown…', en: 'Finding drawdowns…' },
      run: async ({ id, top_n }, ctx) => {
        const e = await resolve(ad, id);
        const c = clean(await ad.series(e.id));
        const eps = drawdownEpisodes(c.iso, c.p).slice(0, top_n ?? 3);
        let peak = -Infinity;
        const under = c.p.map((v) => {
          peak = Math.max(peak, v);
          return v / peak - 1;
        });
        const ds = downsample(c.iso, [under], 400);
        const as_of = c.iso.at(-1)!;
        return {
          data: { id: e.id, name: e.name, episodes: eps, note: c.p.some((v) => v <= 0) ? 'series contains non-positive values; drawdown below -100% is possible' : null },
          ui: [artifact('line', tr(ctx.locale, `Drawdown ${e.name}`, `${e.name} drawdown`), { type: 'line', x: ds.x, series: [{ name: 'drawdown', data: ds.ys[0]!, area: true }], yUnit: 'pct', zeroLine: true, marks: eps.slice(0, 1).flatMap((x) => [{ x: x.peak, label: 'peak' }, { x: x.trough, label: 'trough' }]) }, { dex, dataset: ad.dataset, as_of })],
          method: method('drawdowns', ['max_drawdown'], { inputs: { id: e.id, top_n }, rows_used: c.p.length, dataset: ad.dataset, as_of, period: { start: c.iso[0]!, end: as_of } }),
          citations: [{ dex, dataset: ad.dataset, as_of }],
        };
      },
    }),
    defineTool({
      name: 'extreme_moves',
      description: `Largest daily moves (close-to-close) of one ${ad.entityLabel.en}, optionally within dates and by direction. Dates are as recorded in the dataset.`,
      input: z
        .object({
          id: z.string().min(1),
          start: nullableIso,
          end: nullableIso,
          direction: z.enum(['up', 'down', 'both']),
          top_n: z.number().int().min(1).max(10).nullable(),
        })
        .strict(),
      label: { id: 'Mencari pergerakan terbesar…', en: 'Finding biggest moves…' },
      run: async ({ id, start, end, direction, top_n }, ctx) => {
        const e = await resolve(ad, id);
        const c = clean(await ad.series(e.id));
        const moves: { date: string; ret: number; close: number }[] = [];
        for (let i = 1; i < c.p.length; i++) {
          const day = c.iso[i]!;
          if ((start && day < start) || (end && day > end)) continue;
          const r = c.p[i]! / c.p[i - 1]! - 1;
          if (!Number.isFinite(r)) continue;
          if ((direction === 'up' && r <= 0) || (direction === 'down' && r >= 0)) continue;
          moves.push({ date: day, ret: r, close: c.p[i]! });
        }
        const top = moves.sort((a, b) => Math.abs(b.ret) - Math.abs(a.ret)).slice(0, top_n ?? 5);
        const as_of = c.iso.at(-1)!;
        return {
          data: { id: e.id, name: e.name, moves: top },
          ui: [artifact('bar', tr(ctx.locale, `Pergerakan harian terbesar ${e.name}`, `${e.name} largest daily moves`), { type: 'bar', categories: top.map((m) => m.date), series: [{ name: '1D', data: top.map((m) => m.ret) }], horizontal: true, yUnit: 'pct' }, { dex, dataset: ad.dataset, as_of })],
          method: method('extreme_moves', ['extreme_move'], { inputs: { id: e.id, start, end, direction, top_n }, rows_used: c.p.length, dataset: ad.dataset, as_of, flags: e.metrics.low_precision ? ['low_precision'] : [] }),
          citations: [{ dex, dataset: ad.dataset, as_of }],
        };
      },
    }),
  );
  return tools;
}

/** Quality reports for Dex without an entity adapter. */
async function extraQuality(dex: DexId, ctx: ToolCtx): Promise<unknown> {
  const path: Partial<Record<DexId, string>> = {
    centralbankdex: 'core/centralbank/quality.json',
    fintechdex: 'core/fintech/quality.json',
    personalfinandex: 'core/personalfinance/quality.json',
    salarydex: 'core/salary/quality.json',
    startupdex: 'core/startup/quality.json',
    vcdex: 'core/vcdirectory/quality.json',
    vcnetworkdex: 'core/vcnetwork/quality.json',
    opencompanydex: 'core/opencompany/quality.json',
    idfooddeliverydex: 'core/food/quality.json',
    idhousingdex: 'core/housing/quality.json',
    mylaiwyer: 'core/law/documents.json',
    finlaiwyer: 'core/law/keuangan/documents.json',
    antiscamdex: 'core/antiscam/stats.json',
    costlivingdex: 'core/costliving/summary.json',
    inflationdex: 'core/inflation/summary.json',
    povertydex: 'core/poverty/summary.json',
    ipodex: 'core/ipo/summary.json',
    populationdex: 'core/population/findings.json',
    homelessnessdex: 'core/homelessness/findings.json',
    housingdex: 'core/housingnews/findings.json',
  };
  const p = path[dex];
  if (!p) return null;
  const q = await ctx.store.json<Record<string, unknown>>(p);
  if (dex === 'costlivingdex') return { synthetic: q.synthetic, data_source_pattern: q.data_source_pattern, notes: q.notes };
  if (dex === 'inflationdex' || dex === 'povertydex' || dex === 'ipodex') return { notes: q.notes };
  return q;
}

export { DEX_REGISTRY };
