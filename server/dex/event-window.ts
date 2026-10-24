// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Event-window analysis shared by Finandex AI and RupiahDex.
import { z } from 'zod';
import type { DexId } from '../../src/config/dex-registry';
import { toDayNumber } from '../../src/shared/dates';
import type { TsAdapter } from './adapters';
import { searchEntities } from './adapters';
import type { MarketEvent } from './finandex-ai/events';
import { clean } from './shared-tools';
import { artifact, defineTool, method, ToolError, tr } from '../tools/kit';

export function eventWindowTool(dex: DexId, ad: TsAdapter, events: MarketEvent[], multi: boolean) {
  return defineTool({
    name: 'event_window',
    description: `Price behaviour around a dated event: return from the last close before the event to the window end (default −5 to +20 trading days), with the low point inside the window and a chart rebased to 100. Events: ${events.map((e) => `${e.id} (${e.date})`).join('; ')}. Or pass start+end dates.`,
    input: z
      .object({
        symbols: z.array(z.string()).max(5).nullable().describe(multi ? 'Asset ids (1–5)' : 'Ignored (single series)'),
        event_id: z.enum(events.map((e) => e.id) as [string, ...string[]]).nullable(),
        start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
        end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
      })
      .strict(),
    label: { id: 'Menganalisis jendela peristiwa…', en: 'Analysing event window…' },
    run: async ({ symbols, event_id, start, end }, ctx) => {
      const ev = event_id ? events.find((e) => e.id === event_id)! : null;
      if (!ev && !(start && end)) throw new ToolError('Give an event_id or both start and end dates.');
      const ents = await ad.entities();
      const ids = multi ? (symbols?.length ? symbols : []) : [ents[0]!.id];
      if (!ids.length) throw new ToolError('Give 1–5 symbols.');
      const rows = [];
      const lines: { name: string; x: string[]; y: number[] }[] = [];
      for (const raw of ids) {
        const e = ents.find((x) => x.id === raw) ?? searchEntities(ents, raw, 1)[0];
        if (!e) throw new ToolError(`Unknown id ${raw}; use search_entities.`);
        const c = clean(await ad.series(e.id));
        let i0: number;
        let i1: number;
        if (ev) {
          const t = toDayNumber(ev.date);
          const first = c.d.findIndex((x) => x >= t);
          if (first < 1) continue;
          i0 = Math.max(0, first - 5);
          i1 = Math.min(c.d.length - 1, first + 20);
        } else {
          i0 = Math.max(0, c.d.findLastIndex((x) => x <= toDayNumber(start!)));
          i1 = c.d.findLastIndex((x) => x <= toDayNumber(end!));
        }
        if (i1 <= i0) continue;
        const pre = ev ? c.d.findLastIndex((x) => x < toDayNumber(ev.date)) : i0;
        const base = c.p[pre]!;
        const seg = c.p.slice(i0, i1 + 1);
        const minI = seg.indexOf(Math.min(...seg)) + i0;
        rows.push({ id: e.id, name: e.name, base_date: c.iso[pre], base_close: base, end_date: c.iso[i1], end_close: c.p[i1], return: c.p[i1]! / base - 1, low_date: c.iso[minI], low_return: c.p[minI]! / base - 1 });
        lines.push({ name: e.name, x: c.iso.slice(i0, i1 + 1), y: seg.map((v) => (v / base) * 100) });
      }
      if (!rows.length) throw new ToolError('No data around that date for these series.');
      const x = [...new Set(lines.flatMap((l) => l.x))].sort();
      const as_of = rows.map((r) => r.end_date!).sort().at(-1)!;
      return {
        data: { event: ev ? { id: ev.id, date: ev.date, label: ev.label[ctx.locale] } : null, rows },
        ui: [
          artifact('line', ev ? ev.label[ctx.locale] : tr(ctx.locale, 'Jendela periode', 'Period window'), {
            type: 'line',
            x,
            series: lines.map((l) => {
              const m = new Map(l.x.map((d, i) => [d, l.y[i]!]));
              return { name: l.name, data: x.map((d) => m.get(d) ?? null) };
            }),
            yUnit: 'index',
            ...(ev ? { marks: [{ x: ev.date, label: ev.label[ctx.locale] }] } : {}),
          }, { dex, dataset: ad.dataset, as_of }),
        ],
        method: method('event_window', ['rebase_100', 'simple_return'], { inputs: { symbols: ids, event_id, start, end }, rows_used: lines.reduce((s, l) => s + l.y.length, 0), dataset: ad.dataset, as_of }),
        citations: [{ dex, dataset: ad.dataset, as_of }],
      };
    },
  });
}
