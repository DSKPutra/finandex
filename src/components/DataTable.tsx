// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// DataTable (§10.4): sort, filter, virtualised rows, CSV export with watermark.
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { downloadCsv } from '../lib/export';
import { useLocale } from '../lib/locale';
import { normaliseKey } from '../shared/normalise';
import { formatValue } from './chart/format';
import { Button } from './ui';

type Cell = string | number | boolean | null;
export type TableColumn = { key: string; label: string; unit?: string | undefined };
type Row = Record<string, Cell>;

/** Stable sort; nulls always last regardless of direction. */
export function sortRows(rows: Row[], key: string | null, dir: 'asc' | 'desc'): Row[] {
  if (!key) return rows;
  const s = dir === 'asc' ? 1 : -1;
  return rows
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const x = a.r[key] ?? null;
      const y = b.r[key] ?? null;
      if (x === null && y === null) return a.i - b.i;
      if (x === null) return 1;
      if (y === null) return -1;
      const c = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
      return c === 0 ? a.i - b.i : c * s;
    })
    .map((x) => x.r);
}

export function filterRows(rows: Row[], columns: TableColumn[], q: string): Row[] {
  const k = normaliseKey(q);
  if (!k) return rows;
  return rows.filter((r) => columns.some((c) => r[c.key] !== null && r[c.key] !== undefined && normaliseKey(String(r[c.key])).includes(k)));
}

export function DataTable({ columns, rows, title, source, asOf, maxHeight = 420 }: { columns: TableColumn[]; rows: Row[]; title: string; source?: string | undefined; asOf?: string | undefined; maxHeight?: number }) {
  const locale = useLocale();
  const { t } = useTranslation();
  const [sort, setSort] = useState<{ key: string | null; dir: 'asc' | 'desc' }>({ key: null, dir: 'desc' });
  const [filter, setFilter] = useState('');
  const model = useMemo(() => sortRows(filterRows(rows, columns, filter), sort.key, sort.dir), [rows, columns, filter, sort]);
  const numeric = useMemo(() => new Set(columns.filter((c) => rows.some((r) => typeof r[c.key] === 'number')).map((c) => c.key)), [columns, rows]);
  const parent = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual returns non-memoizable functions by design
  const v = useVirtualizer({ count: model.length, getScrollElement: () => parent.current, estimateSize: () => 36, overscan: 12 });
  const items = v.getVirtualItems();
  const padTop = items[0]?.start ?? 0;
  const padBottom = v.getTotalSize() - (items.at(-1)?.end ?? 0);
  const toggle = (key: string) => setSort((s) => (s.key !== key ? { key, dir: numeric.has(key) ? 'desc' : 'asc' } : s.dir === 'desc' ? { key, dir: 'asc' } : { key: null, dir: 'desc' }));
  const cell = (c: TableColumn, val: Cell) => {
    if (typeof val === 'string' && /^https?:\/\//.test(val)) {
      let host = val;
      try {
        host = new URL(val).hostname;
      } catch {
        /* keep raw */
      }
      return (
        <a href={val} target="_blank" rel="noopener noreferrer nofollow" className="text-brand-text underline">
          {host}
        </a>
      );
    }
    return formatValue(val, c.unit, locale);
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {rows.length > 8 && (
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={locale === 'id' ? 'Saring tabel…' : 'Filter table…'}
            aria-label={locale === 'id' ? 'Saring tabel' : 'Filter table'}
            className="min-h-9 flex-1 rounded-xl border border-border bg-surface-2 px-3 text-sm"
          />
        )}
        <span className="text-xs text-muted">
          {model.length.toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')} {locale === 'id' ? 'baris' : 'rows'}
        </span>
        <Button size="sm" variant="ghost" onClick={() => downloadCsv(title, columns.map((c) => c.label), model.map((r) => columns.map((c) => r[c.key] ?? null)), { ...(source ? { source } : {}), ...(asOf ? { asOf } : {}) })}>
          {t('dex.exportCsv')}
        </Button>
      </div>
      <div ref={parent} className="overflow-auto rounded-xl border border-border" style={{ maxHeight }}>
        <table className="tabular w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-surface-2">
            <tr>
              {columns.map((c) => {
                const dir = sort.key === c.key ? sort.dir : null;
                return (
                  <th key={c.key} scope="col" aria-sort={dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'} className={`whitespace-nowrap px-3 py-2 font-medium ${numeric.has(c.key) ? 'text-right' : 'text-left'}`}>
                    <button type="button" className="inline-flex min-h-8 items-center gap-1" onClick={() => toggle(c.key)}>
                      {c.label}
                      <span aria-hidden className="text-muted">
                        {dir === 'asc' ? '▲' : dir === 'desc' ? '▼' : '↕'}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {padTop > 0 && (
              <tr aria-hidden>
                <td style={{ height: padTop }} />
              </tr>
            )}
            {items.map((vi) => {
              const r = model[vi.index]!;
              return (
                <tr key={vi.key} className="border-t border-border">
                  {columns.map((c) => {
                    const val = r[c.key] ?? null;
                    return (
                      <td key={c.key} className={`max-w-[28rem] truncate px-3 py-2 ${numeric.has(c.key) ? 'text-right' : ''}`} title={typeof val === 'string' ? val : undefined}>
                        {cell(c, val)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {padBottom > 0 && (
              <tr aria-hidden>
                <td style={{ height: padBottom }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
