// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Finandex AI — global markets assistant & router (§8.5).
import { z } from 'zod';
import { DEX_BY_ID } from '../../../src/config/dex-registry.ts';
import { idxOnOrBefore, addDays } from '../../../src/shared/dates.ts';
import { fmtDate, fmtPct } from '../../../src/shared/format.ts';
import { fold } from '../../../src/shared/text.ts';
import { artifact, defineTool, method, ToolError, t, type Tool } from '../../tools/types.ts';
import { appInfo, datasetInfo, openDex, dataQualityTool, resolveEntity, timeSeriesTools } from '../shared-tools.ts';
import { GLOBAL_EVENTS, globalAdapter } from '../ts-adapters.ts';

const ad = globalAdapter();

const eventWindow = defineTool({
  name: 'event_window',
  description:
    'Returns of 1–6 global assets around a curated event (window −5…+20 trading days) or a custom start/end. Events: ' +
    GLOBAL_EVENTS.map((e) => `${e.id} (${e.date})`).join(', ') +
    '. Use for "what happened to X when <event>". Only these events have verified dates.',
  input: z.strictObject({
    symbols: z.array(z.string().min(1).max(40)).min(1).max(6),
    event_id: z.enum(GLOBAL_EVENTS.map((e) => e.id) as [string, ...string[]]).optional(),
    start: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    end: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  }),
  label: t('Menganalisis jendela peristiwa…', 'Analysing the event window…'),
  numeric: true,
  async run(ctx, input) {
    const ev = input.event_id ? GLOBAL_EVENTS.find((e) => e.id === input.event_id)! : null;
    if (!ev && !(input.start && input.end)) throw new ToolError('Give event_id or both start and end.');
    const start = ev ? addDays(ev.date, -8) : input.start!;
    const end = ev ? addDays(ev.date, 30) : input.end!;
    const ents = await Promise.all(input.symbols.map((s) => resolveEntity(ctx, ad, s)));
    const res = [];
    const xs = new Set<string>();
    const lines: { name: string; m: Map<string, number> }[] = [];
    for (const e of ents) {
      const s = await ad.series(ctx, e.id);
      const i0 = Math.max(0, idxOnOrBefore(s.d, start));
      const i1 = idxOnOrBefore(s.d, end);
      if (i1 <= i0) continue;
      const base = s.p[i0]!;
      const m = new Map<string, number>();
      for (let i = i0; i <= i1; i++) {
        m.set(s.d[i]!, (s.p[i]! / base) * 100);
        xs.add(s.d[i]!);
      }
      lines.push({ name: e.name, m });
      res.push({
        id: e.id,
        name: e.name,
        start: { date: s.d[i0], close: s.p[i0] },
        end: { date: s.d[i1], close: s.p[i1] },
        ret: s.p[i1]! / base - 1,
      });
    }
    const x = [...xs].sort();
    return {
      data: {
        event: ev ? { id: ev.id, date: ev.date, label: ev.label[ctx.locale] } : null,
        window: { start, end },
        results: res,
      },
      ui: [
        artifact(ctx, {
          title: ev ? `${ev.label[ctx.locale]} (${fmtDate(ev.date, ctx.locale)})` : `${start} → ${end}`,
          summary: res.map((r) => `${r.name} ${fmtPct(r.ret, ctx.locale)}`).join('; '),
          dataset: ad.dataset,
          tab: 'events',
          spec: {
            type: 'line',
            x,
            series: lines.map((l) => ({ name: l.name, y: x.map((d) => l.m.get(d) ?? null) })),
            y_format: 'num',
            log_allowed: true,
            rebased: true,
            annotations: ev ? [{ x: ev.date, label: ev.label[ctx.locale] }] : [],
          },
        }),
      ],
      method: method(ctx, {
        tool: 'event_window',
        formulas: ['rebase_100', 'simple_return'],
        inputs: { symbols: ents.map((e) => e.id), event_id: input.event_id ?? null, start, end },
        rows: x.length,
        period: { start, end },
        dataset: ad.dataset,
        flags: ['fx_bar_may_shift_one_day'],
      }),
    };
  },
});

const ROUTES: { re: RegExp; dex: keyof typeof DEX_BY_ID; why: { id: string; en: string } }[] = [
  {
    re: /ihsg|jci|bi rate|suku bunga bi|inflasi indonesia|makro indonesia/,
    dex: 'idfinandex',
    why: { id: 'IHSG & makro Indonesia ada di IDFinanDex.', en: 'IHSG & Indonesian macro are in IDFinanDex.' },
  },
  {
    re: /rupiah|usd\/?idr|kurs/,
    dex: 'rupiahdex',
    why: { id: 'Kurs USD/IDR harian ada di RupiahDex.', en: 'Daily USD/IDR is in RupiahDex.' },
  },
  {
    re: /saham (bei|idx|indonesia)|bbca|bbri|tlkm|goto|emiten/,
    dex: 'idxdex',
    why: { id: 'Saham BEI ada di IDXDex.', en: 'IDX stocks are in IDXDex.' },
  },
  {
    re: /reksa ?dana|mutual fund|manajer investasi/,
    dex: 'reksadex',
    why: { id: 'Reksa dana Indonesia ada di ReksaDex.', en: 'Indonesian mutual funds are in ReksaDex.' },
  },
  {
    re: /dividen|dividend|s&p 500 stock|drip/,
    dex: 'snp500dex',
    why: {
      id: 'Dividen & total return saham S&P 500 ada di SnP500Dex.',
      en: 'S&P 500 dividends & total return are in SnP500Dex.',
    },
  },
  {
    re: /nasdaq stock|aapl|nvda|msft|tsla|saham nasdaq/,
    dex: 'nasdaqdex',
    why: { id: 'Saham NASDAQ ada di NASDAQDex.', en: 'NASDAQ stocks are in NASDAQDex.' },
  },
  {
    re: /e-?commerce|amazon|alibaba|shopee|sea ltd|mercadolibre/,
    dex: 'commercedex',
    why: { id: 'Raksasa e-commerce ada di CommerceDex.', en: 'E-commerce giants are in CommerceDex.' },
  },
  {
    re: /defi|tvl|stablecoin|coingecko|altcoin|bot trading/,
    dex: 'cryptdex',
    why: { id: 'Kripto mendalam & DeFi ada di CryptDex.', en: 'In-depth crypto & DeFi are in CryptDex.' },
  },
  {
    re: /the fed|fed balance|bank sentral|central bank|m2|yield curve/,
    dex: 'centralbankdex',
    why: { id: 'Neraca bank sentral ada di CentralBankDex.', en: 'Central-bank balance sheets are in CentralBankDex.' },
  },
  {
    re: /hukum|pasal|uud|kuhap|kuhp|undang/,
    dex: 'mylaiwyer',
    why: { id: 'Informasi hukum ada di My LAIwyer.', en: 'Legal information is in My LAIwyer.' },
  },
  { re: /ipo/, dex: 'ipodex', why: { id: 'IPO global ada di IPODex.', en: 'Global IPOs are in IPODex.' } },
  {
    re: /inflasi|inflation/,
    dex: 'inflationdex',
    why: { id: 'Inflasi antarnegara ada di InflationDex.', en: 'Cross-country inflation is in InflationDex.' },
  },
];

const crossDexLookup = defineTool({
  name: 'cross_dex_lookup',
  description:
    'Suggest which other Dex chatbot covers a topic that is not in the 34-asset global dataset (IHSG, rupiah, IDX stocks, mutual funds, dividends, DeFi, central banks, law, IPOs, inflation…). Returns open_dex suggestions.',
  input: z.strictObject({ query: z.string().min(1).max(200) }),
  label: t('Mencari Dex yang tepat…', 'Finding the right Dex…'),
  numeric: false,
  async run(ctx, input) {
    const q = fold(input.query);
    const hits = ROUTES.filter((r) => r.re.test(q));
    return {
      data: {
        query: input.query,
        suggestions: hits.map((h) => ({
          dexId: h.dex,
          name: DEX_BY_ID[h.dex].name,
          reason: h.why[ctx.locale],
          status: ctx.manifest?.dex[h.dex]?.status ?? DEX_BY_ID[h.dex].status,
        })),
      },
      ui: hits.slice(0, 3).map((h) =>
        artifact(ctx, {
          title: DEX_BY_ID[h.dex].name,
          summary: h.why[ctx.locale],
          dataset: 'registry',
          spec: {
            type: 'card',
            body: h.why[ctx.locale],
            tone: 'info',
            link: {
              dex: h.dex,
              entity: null,
              label: ctx.locale === 'id' ? `Buka ${DEX_BY_ID[h.dex].name}` : `Open ${DEX_BY_ID[h.dex].name}`,
            },
          },
        }),
      ),
    };
  },
});

export const tools: Tool<never>[] = [
  ...([datasetInfo, appInfo, openDex] as unknown as Tool<never>[]),
  ...timeSeriesTools(ad),
  eventWindow as unknown as Tool<never>,
  crossDexLookup as unknown as Tool<never>,
  dataQualityTool(async (ctx, id) => {
    const q = await ctx.store.json<{ assets: Record<string, unknown>; notes: Record<string, string> }>(
      'core/global/quality.json',
    );
    if (id) {
      const e = await resolveEntity(ctx, ad, id);
      return { asset: e.id, ...((q.assets[e.id] as object) ?? {}), notes: q.notes };
    }
    return q;
  }) as unknown as Tool<never>,
];
export const adapter = ad;
