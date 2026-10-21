// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Generic renderer for a declarative TabView: controls → tool calls (client-side, same tools as the chatbot) → artifacts.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { DexId } from '../config/dex-registry.ts';
import type { ColumnFormat } from './table-from-data.ts';
import { useTranslation } from '../i18n/index.ts';
import { useToolCalls } from '../lib/data.ts';
import { useSettings } from '../lib/settings.ts';
import { ArtifactCard } from '../components/ArtifactCard.tsx';
import { DataTable } from '../components/DataTable.tsx';
import { ErrorState, PendingState, Skeleton } from '../components/States.tsx';
import { tableFromData } from './table-from-data.ts';
import type { TabView as View, Values } from './views/types.ts';

export function TabView({
  dex,
  tab,
  view,
  entity,
}: {
  dex: DexId;
  tab: string;
  view: View;
  entity?: string | undefined;
}) {
  const { t } = useTranslation();
  const locale = useSettings((s) => s.locale);
  const nav = useNavigate();
  const init = useMemo(() => {
    const v: Values = Object.fromEntries((view.controls ?? []).map((c) => [c.key, c.default]));
    if (view.entityKey && entity) v[view.entityKey] = entity;
    return v;
  }, [view, entity]);
  const [draft, setDraft] = useState<Values>(init);
  const [vals, setVals] = useState<Values>(init);
  const calls = useMemo(() => view.calls(vals), [view, vals]);
  const q = useToolCalls(dex, calls, locale);
  const ask = (question: string, ent: string | null) =>
    nav(
      `/dex/${dex}/chat?q=${encodeURIComponent(question)}${ent ? `&entity=${encodeURIComponent(ent)}` : ''}&view=${tab}`,
    );

  return (
    <div className="flex flex-col gap-3">
      {view.intro && <p className="muted m-0">{view.intro[locale]}</p>}
      {view.controls && view.controls.length > 0 && (
        <form
          className="card p-3 flex flex-wrap gap-3 items-end"
          onSubmit={(e) => {
            e.preventDefault();
            setVals(draft);
          }}
        >
          {view.controls.map((c) => (
            <label
              key={c.key}
              className="flex flex-col gap-1 text-sm"
              style={{ minWidth: 160, flex: c.kind === 'text' ? '1 1 220px' : '0 1 200px' }}
            >
              <span className="muted">{c.label[locale]}</span>
              {c.kind === 'select' ? (
                <select
                  className="input"
                  value={draft[c.key]}
                  onChange={(e) => {
                    const d = { ...draft, [c.key]: e.target.value };
                    setDraft(d);
                    setVals(d);
                  }}
                >
                  {c.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {typeof o.label === 'string' ? o.label : o.label[locale]}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="input"
                  value={draft[c.key]}
                  placeholder={c.placeholder}
                  onChange={(e) => setDraft({ ...draft, [c.key]: e.target.value })}
                />
              )}
            </label>
          ))}
          {view.controls.some((c) => c.kind === 'text') && (
            <button type="submit" className="btn btn-primary">
              {t('common.apply')}
            </button>
          )}
        </form>
      )}
      {q.isLoading && <Skeleton />}
      {q.isError && <ErrorState onRetry={() => void q.refetch()} />}
      {q.data && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))' }}>
          {q.data.map((r, i) => {
            if (!r.ok) return r.pending ? <PendingState key={i} /> : <ErrorState key={i} text={r.error} />;
            const ui = r.out.ui ?? [];
            if (ui.length) return ui.map((a) => <ArtifactCard key={a.id} a={a} locale={locale} onAsk={ask} />);
            const tbl = tableFromData(r.out.data);
            return tbl ? (
              <section key={i} className="card p-3" style={{ gridColumn: '1 / -1' }}>
                <DataTable
                  columns={tbl.columns as { key: string; label: string; format: ColumnFormat }[]}
                  rows={tbl.rows}
                  locale={locale}
                />
              </section>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
