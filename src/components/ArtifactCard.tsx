// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// ChartCard (§10.4): title, chart, as-of & source, export PNG/CSV with watermark, "Ask about this", "Open in tab",
// full screen, and a screen-reader summary + hidden data table (§8.8 accessibility).
import * as Dialog from '@radix-ui/react-dialog';
import { Download, Expand, MessageCircle, SquareArrowOutUpRight } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Artifact } from '../shared/chart-spec.ts';
import { fmtAsOf } from '../shared/format.ts';
import { useTranslation, type Locale } from '../i18n/index.ts';
import { exportCsv, exportPng } from '../lib/export.ts';
import { ChartView, type ChartHandle } from './charts/ChartView.tsx';
import { specTable } from './charts/options.ts';

export function ArtifactCard({
  a,
  locale,
  onAsk,
  compact = false,
}: {
  a: Artifact;
  locale: Locale;
  onAsk?: (q: string, entity: string | null) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const chart = useRef<ChartHandle>(null);
  const [log, setLog] = useState(false);
  const plot = !['table', 'quote', 'card'].includes(a.kind);
  const src = `${t('common.source')}: ${a.source.dataset} · ${t('common.asOf', { date: fmtAsOf(a.source.as_of, locale) })}`;
  const tbl = specTable(a.spec);
  const canLog = a.spec.type === 'line' && a.spec.log_allowed;
  const body = (h: number) => <ChartView ref={chart} spec={a.spec} locale={locale} height={h} log={log} />;
  return (
    <section className="card p-3 min-w-0" aria-label={a.title}>
      <header className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold" style={{ fontFamily: 'var(--font-sans)', letterSpacing: 0 }}>
            {a.title}
          </h3>
          {!compact && a.summary && a.kind !== 'card' && <p className="text-sm muted m-0 truncate">{a.summary}</p>}
        </div>
        <div className="flex gap-1 shrink-0">
          {canLog && (
            <button className="btn btn-sm" aria-pressed={log} onClick={() => setLog((v) => !v)} title="log">
              log
            </button>
          )}
          {plot && (
            <Dialog.Root>
              <Dialog.Trigger asChild>
                <button className="btn btn-sm" aria-label={t('common.fullscreen')}>
                  <Expand size={16} />
                </button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0" style={{ background: 'rgba(0,0,0,.6)', zIndex: 60 }} />
                <Dialog.Content className="card fixed p-4" style={{ inset: '4vh 4vw', zIndex: 61, overflow: 'auto' }}>
                  <Dialog.Title className="text-lg mb-2">{a.title}</Dialog.Title>
                  <Dialog.Description className="text-sm muted">{src}</Dialog.Description>
                  <ChartView spec={a.spec} locale={locale} height={Math.round(window.innerHeight * 0.7)} log={log} />
                  <Dialog.Close asChild>
                    <button className="btn mt-2">{t('common.close')}</button>
                  </Dialog.Close>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          )}
          <button
            className="btn btn-sm"
            aria-label={t('common.exportCsv')}
            title={t('common.exportCsv')}
            onClick={() => exportCsv(a.title, tbl.columns, tbl.rows, src)}
          >
            <Download size={16} />
            <span className="sr-only">CSV</span>
          </button>
          {plot && (
            <button
              className="btn btn-sm"
              title={t('common.exportPng')}
              onClick={() => {
                const url = chart.current?.toDataUrl();
                if (url) void exportPng(url, a.title, src);
              }}
            >
              PNG
            </button>
          )}
        </div>
      </header>
      {body(compact ? 240 : 300)}
      <p className="sr-only">{a.summary}</p>
      {plot && (
        <table className="sr-only">
          <caption>{a.title}</caption>
          <thead>
            <tr>
              {tbl.columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tbl.rows.slice(0, 200).map((r, i) => (
              <tr key={i}>
                {r.map((v, j) => (
                  <td key={j}>{v === null || v === undefined ? '' : String(v)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <footer className="flex flex-wrap items-center justify-between gap-2 mt-2">
        <span className="text-xs muted">{src}</span>
        <span className="flex gap-1">
          {onAsk && (
            <button
              className="btn btn-sm"
              onClick={() => onAsk(`${t('common.askAbout')}: ${a.title}`, a.open_tab?.entity ?? null)}
            >
              <MessageCircle size={14} /> {t('common.askAbout')}
            </button>
          )}
          {a.open_tab && (
            <Link
              className="btn btn-sm"
              to={`/dex/${a.source.dex}/${a.open_tab.tab}${a.open_tab.entity ? `/${encodeURIComponent(a.open_tab.entity)}` : ''}`}
            >
              <SquareArrowOutUpRight size={14} /> {t('common.openTab')}
            </Link>
          )}
        </span>
      </footer>
    </section>
  );
}
