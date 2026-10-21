// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Declarative Dex tab views (§9): each feature tab = a few controls + deterministic tool calls whose `ui` artifacts are
// rendered by the generic TabView. The same tools power the chatbot, so tabs and answers always agree.
import type { Label } from '../../config/dex-registry.ts';
import type { Call } from '../../lib/data.ts';

export type Values = Record<string, string>;

export type Control =
  | { kind: 'select'; key: string; label: Label; options: { value: string; label: Label | string }[]; default: string }
  /** free text (entity ids, tickers, comma-separated lists, dates YYYY-MM-DD, numbers as text) */
  | { kind: 'text'; key: string; label: Label; default: string; placeholder?: string };

export interface TabView {
  /** short explanation shown above the tab content */
  intro?: Label;
  controls?: Control[];
  /** control key filled from the `:entity` route segment (deep links, "Open in tab") */
  entityKey?: string;
  calls: (v: Values) => Call[];
}

export type DexViews = Record<string, TabView>;

/** helpers for view authors */
export const L = (id: string, en: string): Label => ({ id, en });
export const list = (s: string | undefined) =>
  (s ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
export const int = (s: string | undefined, d: number) => {
  const n = Number(s);
  return Number.isFinite(n) && s !== '' ? Math.trunc(n) : d;
};
/** drop empty-string values so optional tool inputs stay absent */
export const clean = (o: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(o).filter(
      ([, v]) => v !== '' && v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0),
    ),
  );
