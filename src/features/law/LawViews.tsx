// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Feature tabs of the law Dex (§9 My LAIwyer & FinLAIwyer): Guided Consultation (situation cards → chips → steps),
// Legal Sources (available & pending), Browse Articles (table of contents per document with search highlight),
// Financial Regulation Map (graph of amend/revoke/penalty-adjusted relations), Status & Changes, Glossary.
import { clsx } from 'clsx';
import { lazy, Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { ChartCard } from '../../components/chart/ChartCard';
import { FlowChips } from '../../components/artifacts/LawArtifacts';
import { StatusBadges } from '../../components/QuoteCard';
import { Button, Card, Chip, EmptyState, ErrorState, LoadingBlock, Skeleton, Spinner } from '../../components/ui';
import type { DexEntry } from '../../config/dex-registry';
import { GLOSSARY, GLOSSARY_LABEL } from '../../config/law-glossary';
import type { Artifact } from '../../shared/chat-protocol';
import type { LawChunk } from '../../shared/law/analyse';
import { useJson } from '../../lib/data';
import { useLawCatalog } from '../../lib/law-client';
import type { CatalogEntry } from '../../lib/law-client';
import { useLocale } from '../../lib/locale';
import { hostOf, isOfficialUrl, openOfficial } from '../../lib/official-links';
import { useTool } from '../../lib/tools-client';
import { ToolPanel } from '../dex/ToolPanel';

const EChart = lazy(() => import('../../components/chart/EChart'));
const PdfPageDialog = lazy(() => import('./PdfPageDialog'));

type Corpus = 'umum' | 'keuangan';
const corpusOf = (dex: DexEntry): Corpus => (dex.corpus ?? 'umum');
type Flows = { flows: { id: string; dex: string; title: string; title_en?: string }[] };

/** Situation cards → first question (start_flow run on the device). */
export function GuidedConsultation({ dex }: { dex: DexEntry }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const flows = useJson<Flows>('core/law/flows.json');
  const [flowId, setFlowId] = useState<string | null>(null);
  const start = useTool(dex.id, flowId ? 'start_flow' : null, { flow_id: flowId, question: null }, locale);
  if (flows.isLoading) return <LoadingBlock rows={2} />;
  if (flows.isError) return <ErrorState onRetry={() => void flows.refetch()} />;
  const list = (flows.data?.flows ?? []).filter((f) => f.dex === dex.id);
  return (
    <div className="space-y-4">
      <p className="measure text-sm text-ink-muted">{t('law.guidedIntro')}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((f, i) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={flowId === f.id}
            onClick={() => setFlowId(f.id)}
            className={clsx('focus-ring min-h-24 rounded-pane border p-4 text-left transition-colors', flowId === f.id ? 'border-primary bg-pane-2' : 'border-edge bg-pane hover:bg-pane-2')}
          >
            <span className="tabular text-xs text-ink-muted">{t('law.situation', { n: i + 1 })}</span>
            <span className="mt-1 block text-base font-medium">{locale === 'en' && f.title_en ? f.title_en : f.title}</span>
          </button>
        ))}
      </div>
      {flowId && (
        <Card aria-live="polite">
          {start.isLoading && <Spinner label={t('dex.loading')} />}
          {start.isError && <ErrorState message={(start.error as Error).message} onRetry={() => void start.refetch()} />}
          {start.data?.ui?.[0] && <FlowChips key={flowId} artifact={start.data.ui[0]} />}
        </Card>
      )}
      <p className="text-xs text-ink-muted">{t(dex.id === 'finlaiwyer' ? 'disclaimer.finlaiwyer' : 'disclaimer.mylaiwyer')}</p>
    </div>
  );
}

type DocsJson = { corpus: Corpus; documents: (CatalogEntry & { doc_id: string; pages: number | null; lock_reason: string | null; chunks: number })[] };

export function LawSources({ dex }: { dex: DexEntry }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const q = useJson<DocsJson>(`core/law/${corpusOf(dex)}/documents.json`);
  const [preview, setPreview] = useState<{ id: string; title: string } | null>(null);
  const [filter, setFilter] = useState<'all' | 'available' | 'pending'>('all');
  if (q.isLoading) return <LoadingBlock rows={4} />;
  if (q.isError || !q.data) return <ErrorState onRetry={() => void q.refetch()} />;
  const docs = q.data.documents.filter((d) => filter === 'all' || (filter === 'available' ? d.available : !d.available));
  const n = q.data.documents.filter((d) => d.available).length;
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">{t('law.sourcesCount', { n, total: q.data.documents.length })}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('law.filter')}>
        {(['all', 'available', 'pending'] as const).map((f) => (
          <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
            {t(`law.f_${f}`)}
          </Chip>
        ))}
      </div>
      <ul className="grid gap-3 lg:grid-cols-2">
        {docs.map((d) => (
          <li key={d.doc_id} className={clsx('pane p-4', !d.available && 'prov-flag')}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{d.short}</p>
                <p className="text-sm text-ink-muted">{d.title}</p>
              </div>
              <StatusBadges badges={d.badges[locale]} />
            </div>
            <p className="mt-2 text-xs text-ink-muted">
              {d.available ? t('law.availableMeta', { pages: d.pages ?? 0 }) : d.source === 'catalog-only' ? t('law.catalogOnly') : t('law.pendingDoc')}
              {d.supplement && ` · ${t('law.supplement')}`}
            </p>
            {!d.available && d.lock_reason && <p className="mt-1 break-words text-xs text-flag">{d.lock_reason.slice(0, 200)}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {d.available && (
                <Button size="sm" onClick={() => setPreview({ id: d.doc_id, title: d.short })}>
                  {t('law.viewFirstPage')}
                </Button>
              )}
              {[d.url, ...d.official_pages].filter((u): u is string => !!u && isOfficialUrl(u)).slice(0, 1).map((u) => (
                <Button key={u} size="sm" variant="ghost" onClick={() => void openOfficial(u)}>
                  {t('law.officialSource')} · {hostOf(u)}
                </Button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {preview && (
        <Suspense fallback={<Spinner label={t('dex.loading')} />}>
          <PdfPageDialog docId={preview.id} page={1} title={preview.title} onClose={() => setPreview(null)} />
        </Suspense>
      )}
    </div>
  );
}

type ChunksJson = { doc_id: string; pages: number; chunks: LawChunk[] };

function highlight(text: string, q: string) {
  if (!q || q.length < 3) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded bg-flag/20 text-inherit">{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  );
}

/** Table of contents per document (body articles, explanation, annex pages) with search highlighting. */
export function LawArticles({ dex }: { dex: DexEntry }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const cat = useLawCatalog();
  const corpus = corpusOf(dex);
  const docs = (cat.data?.documents ?? []).filter((d) => d.corpus === corpus && d.available);
  const [docId, setDocId] = useState<string | null>(null);
  const id = docId ?? docs[0]?.id ?? null;
  const chunks = useJson<ChunksJson>(id ? `heavy/law/${corpus}/${id}/chunks.json` : null);
  const [q, setQ] = useState('');
  const [part, setPart] = useState<'batang_tubuh' | 'penjelasan' | 'halaman'>('batang_tubuh');
  const [open, setOpen] = useState<string | null>(null);
  const rows = useMemo(() => (chunks.data?.chunks ?? []).filter((c) => c.part === part && (!q || c.text.toLowerCase().includes(q.toLowerCase()))), [chunks.data, part, q]);
  if (cat.isLoading) return <LoadingBlock rows={3} />;
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr]">
        <label className="text-sm">
          <span className="mb-1 block text-xs text-ink-muted">{t('law.document')}</span>
          <select value={id ?? ''} onChange={(e) => setDocId(e.target.value)} className="min-h-11 w-full rounded-xl border border-edge bg-pane px-3">
            {docs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.short}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-xs text-ink-muted">{t('law.findInDoc')}</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className="min-h-11 w-full rounded-xl border border-edge bg-pane px-3" placeholder={t('law.findPlaceholder')} />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {(['batang_tubuh', 'penjelasan', 'halaman'] as const).map((p) => (
          <Chip key={p} active={part === p} onClick={() => setPart(p)}>
            {t(`law.part_${p}`)}
          </Chip>
        ))}
      </div>
      {chunks.isLoading && <LoadingBlock rows={4} />}
      {chunks.isError && <ErrorState onRetry={() => void chunks.refetch()} />}
      {chunks.data && (
        <>
          <p className="text-xs text-ink-muted">{t('law.tocCount', { n: rows.length })}</p>
          <ul className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
            {rows.slice(0, 400).map((c) => (
              <li key={c.id}>
                <button type="button" aria-expanded={open === c.id} onClick={() => setOpen(open === c.id ? null : c.id)} className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm hover:bg-pane-2">
                  <span>{c.pasal ?? `${locale === 'id' ? 'Halaman' : 'Page'} ${c.page}`}</span>
                  <span className="tabular text-xs text-ink-muted">
                    {locale === 'id' ? 'hal.' : 'p.'} {c.page}
                  </span>
                </button>
                {open === c.id && (
                  <figure className="paper-quote mx-1 mb-2 rounded-xl p-3">
                    <blockquote className="text-sm">{highlight(c.text.slice(0, 4000), q)}</blockquote>
                  </figure>
                )}
              </li>
            ))}
          </ul>
          {!rows.length && <EmptyState message={t('law.noMatch')} />}
        </>
      )}
    </div>
  );
}

/** FinLAIwyer "Peta Regulasi Keuangan": graph of the keuangan corpus with amend / revoke / penalty-adjustment edges. */
export function RegulationMap({ dex }: { dex: DexEntry }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const cat = useLawCatalog();
  const nav = useNavigate();
  const [sel, setSel] = useState<string | null>(null);
  const option = useMemo(() => {
    const docs = (cat.data?.documents ?? []).filter((d) => d.corpus === 'keuangan' || ['uu-1-2026-penyesuaian-pidana', 'uu-1-2023-kuhp'].includes(d.id));
    const ids = new Set(docs.map((d) => d.id));
    const cs = getComputedStyle(document.documentElement);
    const v = (n: string) => cs.getPropertyValue(n).trim();
    const color = (d: CatalogEntry) => (d.status === 'dicabut' ? v('--negative') : !d.available ? v('--flag') : d.type === 'UU' ? v('--data') : v('--ai'));
    const edges: { source: string; target: string; value: string; lineStyle: Record<string, unknown> }[] = [];
    for (const d of docs) {
      for (const r of d.amends) if (ids.has(r)) edges.push({ source: d.id, target: r, value: t('law.rel_amends'), lineStyle: { color: v('--ai'), width: 1.4 } });
      for (const r of d.revokes) if (ids.has(r)) edges.push({ source: d.id, target: r, value: t('law.rel_revokes'), lineStyle: { color: v('--negative'), width: 1.6, type: 'dashed' } });
      for (const r of d.penalty_adjusted_by) if (ids.has(r)) edges.push({ source: r, target: d.id, value: t('law.rel_adjusts'), lineStyle: { color: v('--flag'), width: 1, type: 'dotted' } });
    }
    return {
      backgroundColor: 'transparent',
      tooltip: { formatter: (p: { dataType: string; data: { name?: string; value?: string; label2?: string } }) => (p.dataType === 'edge' ? p.data.value : p.data.label2) },
      series: [
        {
          type: 'graph',
          layout: 'force',
          roam: true,
          draggable: true,
          force: { repulsion: 220, edgeLength: [60, 140] },
          label: { show: true, color: v('--ink'), fontSize: 11, formatter: (p: { data: { short: string } }) => p.data.short },
          edgeSymbol: ['none', 'arrow'],
          edgeSymbolSize: 7,
          emphasis: { focus: 'adjacency' },
          data: docs.map((d) => ({ id: d.id, name: d.id, short: d.short, label2: `${d.short} — ${d.badges[locale].join(' · ')}${d.available ? '' : ` · ${t('law.pendingDoc')}`}`, symbolSize: d.type === 'UU' ? 22 : 15, itemStyle: { color: color(d), borderColor: v('--edge-hi'), borderWidth: sel === d.id ? 3 : 1 } })),
          links: edges,
        },
      ],
    };
  }, [cat.data, locale, sel, t]);
  if (cat.isLoading) return <Skeleton className="h-96" />;
  if (cat.isError) return <ErrorState onRetry={() => void cat.refetch()} />;
  const d = cat.data?.documents.find((x) => x.id === sel);
  const legend: [string, string][] = [
    ['--data', t('law.lg_uu')],
    ['--ai', t('law.lg_reg')],
    ['--flag', t('law.lg_pending')],
    ['--negative', t('law.lg_revoked')],
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <Card className="min-w-0">
        <ul className="mb-2 flex flex-wrap gap-3 text-xs text-ink-muted">
          {legend.map(([c, l]) => (
            <li key={c} className="flex items-center gap-1">
              <span aria-hidden className="h-3 w-3 rounded-full" style={{ background: `var(${c})` }} />
              {l}
            </li>
          ))}
          <li>{t('law.lg_edges')}</li>
        </ul>
        <Suspense fallback={<Skeleton className="h-[460px]" />}>
          <EChart option={option} height={460} ariaLabel={t('law.mapAria')} onClick={(p) => p.dataType === 'node' && setSel((p.data as { id: string }).id)} />
        </Suspense>
        <label className="mt-3 block text-sm">
          <span className="mb-1 block text-xs text-ink-muted">{t('law.pickDoc')}</span>
          <select value={sel ?? ''} onChange={(e) => setSel(e.target.value || null)} className="min-h-11 w-full rounded-xl border border-edge bg-pane px-3">
            <option value="">—</option>
            {(cat.data?.documents ?? [])
              .filter((x) => x.corpus === 'keuangan')
              .map((x) => (
                <option key={x.id} value={x.id}>
                  {x.short}
                </option>
              ))}
          </select>
        </label>
      </Card>
      <div className="space-y-3" aria-live="polite">
        {!d && <EmptyState message={t('law.mapHint')} />}
        {d && (
          <>
            <Card>
              <p className="font-display text-lg">{d.short}</p>
              <p className="text-sm text-ink-muted">{d.title}</p>
              <div className="mt-2">
                <StatusBadges badges={d.badges[locale]} />
              </div>
              {d.key_provisions.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-flag">{t('law.catalogSummaryShort')}</p>
                  <ul className="mt-1 space-y-2 text-sm">
                    {d.key_provisions.map((k) => (
                      <li key={k.ref}>
                        <span className="font-medium">{k.ref}</span> — {k.summary}
                        {/Pasal\s+\d/.test(k.ref) && d.available && (
                          <Button size="sm" variant="ghost" className="ml-1" onClick={() => void nav(`/dex/${dex.id}/chat?q=${encodeURIComponent(`${k.ref} ${d.short}`)}`)}>
                            {t('law.askArticle')}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
            <ToolPanel key={d.id} dex={dex.id} panel={{ tool: 'regulation_status', input: { doc_id: d.id, query: null }, fixed: ['doc_id', 'query'] }} />
          </>
        )}
      </div>
    </div>
  );
}

/** "Status & Perubahan" (FinLAIwyer): pick a document → status timeline (amend/revoke/UU 1/2026 adjustment). */
export function LawStatus({ dex }: { dex: DexEntry }) {
  const { t } = useTranslation();
  const cat = useLawCatalog();
  const [id, setId] = useState('pbi-3-2023-pkbi');
  const docs = (cat.data?.documents ?? []).filter((d) => d.corpus === corpusOf(dex));
  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block text-xs text-ink-muted">{t('law.pickDoc')}</span>
        <select value={id} onChange={(e) => setId(e.target.value)} className="min-h-11 w-full max-w-xl rounded-xl border border-edge bg-pane px-3">
          {docs.map((d) => (
            <option key={d.id} value={d.id}>
              {d.short} — {d.status}
            </option>
          ))}
        </select>
      </label>
      <ToolPanel key={id} dex={dex.id} panel={{ tool: 'regulation_status', input: { doc_id: id, query: null }, fixed: ['doc_id', 'query'] }} />
    </div>
  );
}

/** Glossary: legal term ↔ plain language (official definition quoted + labelled Finandex explanation). */
export function LawGlossary({ dex }: { dex: DexEntry }) {
  const locale = useLocale();
  const terms = GLOSSARY.filter((g) => g.corpus === corpusOf(dex));
  const [term, setTerm] = useState(terms[0]?.term ?? '');
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-muted">{GLOSSARY_LABEL[locale]}</p>
      <div className="flex flex-wrap gap-2">
        {terms.map((g) => (
          <Chip key={g.term} active={g.term === term} onClick={() => setTerm(g.term)}>
            {g.term}
          </Chip>
        ))}
      </div>
      <ToolPanel key={term} dex={dex.id} panel={{ tool: 'glossary', input: { term }, fixed: ['term'] }} />
    </div>
  );
}

/** Renders a list of artifacts without the tool form (used by small embedded views). */
export function Artifacts({ list }: { list: Artifact[] }) {
  return (
    <div className="space-y-3">
      {list.map((a) => (
        <ChartCard key={a.id} artifact={a} />
      ))}
    </div>
  );
}
