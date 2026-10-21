// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// DataTable (§10.4): sortable, filterable, virtualised for long tables, locale number formatting.
import { useVirtualizer } from '@tanstack/react-virtual';
import { useMemo, useRef, useState } from 'react';
import type { ValueFormat } from '../shared/chart-spec.ts';
import { useTranslation, type Locale } from '../i18n/index.ts';
import { fold } from '../shared/text.ts';
import { formatValue, signClass } from './charts/format-value.ts';

export interface Column {
  key: string;
  label: string;
  format: ValueFormat;
}

export function DataTable({
  columns,
  rows,
  locale,
  filterable = rows.length > 12,
}: {
  columns: Column[];
  rows: Record<string, unknown>[];
  locale: Locale;
  filterable?: boolean;
}) {
  const { t } = useTranslation();
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null);
  const [q, setQ] = useState('');
  const data = useMemo(() => {
    let r = rows;
    if (q) {
      const f = fold(q);
      r = r.filter((x) => columns.some((c) => fold(String(x[c.key] ?? '')).includes(f)));
    }
    if (sort) {
      r = [...r].sort((a, b) => {
        const va = a[sort.key];
        const vb = b[sort.key];
        if (va === vb) return 0;
        if (va === null || va === undefined) return 1;
        if (vb === null || vb === undefined) return -1;
        return (
          (typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb))) * sort.dir
        );
      });
    }
    return r;
  }, [rows, columns, q, sort]);
  const parent = useRef<HTMLDivElement>(null);
  const virtual = data.length > 60;
  // eslint-disable-next-line react-hooks/incompatible-library
  const v = useVirtualizer({
    count: data.length,
    getScrollElement: () => parent.current,
    estimateSize: () => 36,
    overscan: 12,
    enabled: virtual,
  });
  const items = virtual ? v.getVirtualItems() : data.map((_, i) => ({ index: i, start: i * 36, key: i }));
  return (
    <div>
      {filterable && (
        <input
          className="input mb-2"
          placeholder={t('common.all') + '…'}
          aria-label="filter"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      )}
      <div ref={parent} className="overflow-auto" style={{ maxHeight: virtual ? 480 : undefined }}>
        <table className="w-full text-sm num" style={{ borderCollapse: 'collapse' }}>
          <thead className="sticky top-0" style={{ background: 'var(--surface)' }}>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  aria-sort={sort?.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
                  className="text-left p-2 font-semibold muted"
                  style={{ borderBottom: '1px solid var(--border)' }}
                >
                  <button
                    className="btn-ghost"
                    style={{ background: 'none', border: 0, color: 'inherit', font: 'inherit', cursor: 'pointer' }}

                    onClick={() =>
                      setSort((s) =>
                        s?.key === c.key
                          ? { key: c.key, dir: s.dir === 1 ? -1 : 1 }
                          : { key: c.key, dir: c.format === 'text' ? 1 : -1 },
                      )
                    }
                  >
                    {c.label || c.key}
                    {sort?.key === c.key ? (sort.dir === 1 ? ' ▲' : ' ▼') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {virtual && <tr style={{ height: items[0]?.start ?? 0 }} aria-hidden="true" />}
            {items.map((it) => {
              const r = data[it.index]!;
              return (
                <tr key={it.key} style={{ height: 36, borderBottom: '1px solid var(--border)' }}>
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`p-2 ${c.format === 'text' ? '' : 'text-right'} ${signClass(r[c.key], c.format)}`}
                    >
                      {formatValue(r[c.key], c.format, locale)}
                    </td>
                  ))}
                </tr>
              );
            })}
            {virtual && (
              <tr
                style={{ height: Math.max(0, v.getTotalSize() - ((items.at(-1)?.start ?? 0) + 36)) }}
                aria-hidden="true"
              />
            )}
          </tbody>
        </table>
        {!data.length && <p className="muted p-2">{t('common.empty')}</p>}
      </div>
    </div>
  );
}
