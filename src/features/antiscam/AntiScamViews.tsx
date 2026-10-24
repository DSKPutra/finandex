// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// AntiScamDex views (§4.29, §9): "Baru kena scam" emergency screen (two questions → numbered steps with official-channel
// buttons, no free text), "Siapkan Laporan" (offline 4-step wizard mirroring the IASC form groups; device-only,
// encrypted; never sent anywhere; no ID or account-number fields), and "Kenali Modus" (library + self-check quiz).
import { clsx } from 'clsx';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { StepList } from '../../components/artifacts/LawArtifacts';
import { ChartCard } from '../../components/chart/ChartCard';
import { Button, Card, Chip, ErrorState, LoadingBlock, Spinner } from '../../components/ui';
import { EXPORT_WATERMARK, copyrightFor } from '../../config/brand';
import type { Artifact } from '../../shared/chat-protocol';
import { detectSensitive } from '../../shared/text';
import { downloadBlob, slugFile } from '../../lib/export';
import { useJson } from '../../lib/data';
import { useLocale } from '../../lib/locale';
import { deleteSecure, loadSecure, RETENTION_DAYS, saveSecure } from '../../lib/secure-store';
import { runClientTool, useTool } from '../../lib/tools-client';
import { ToolPanel } from '../dex/ToolPanel';

export const NON_AFFILIATION = { id: 'Finandex tidak berafiliasi dengan IASC, OJK, BI, atau Satgas PASTI. Laporan resmi hanya di iasc.ojk.go.id.', en: 'Finandex is not affiliated with IASC, OJK, BI, or Satgas PASTI. Official reports only at iasc.ojk.go.id.' } as const;

export function NonAffiliationBanner() {
  const locale = useLocale();
  return (
    <p role="note" className="prov-flag rounded-xl bg-pane-2 px-3 py-2 text-sm">
      {NON_AFFILIATION[locale]}
    </p>
  );
}

type Elapsed = 'lt24h' | 'gt24h' | 'unknown';
type Method = 'bank' | 'pjp' | 'crypto' | 'other';

function Q({ label, value, current, onPick }: { label: string; value: string; current: string | null; onPick: () => void }) {
  return (
    <button type="button" aria-pressed={current === value} onClick={onPick} className={clsx('focus-ring min-h-14 rounded-pane border px-5 text-left text-base transition-colors', current === value ? 'border-primary bg-pane-2' : 'border-edge bg-pane hover:bg-pane-2')}>
      {label}
    </button>
  );
}

/** Calm emergency screen: two questions, then steps. No free-text input on this screen (§9). */
export function EmergencyScam({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const [elapsed, setElapsed] = useState<Elapsed | null>(null);
  const [method, setMethod] = useState<Method | null>(null);
  const q = useTool('antiscamdex', elapsed && method ? 'emergency_steps' : null, { elapsed, method }, locale);
  const art = q.data?.ui?.[0];
  const reset = () => {
    setElapsed(null);
    setMethod(null);
  };
  return (
    <section aria-labelledby="emergency-title" className={clsx('space-y-5', !embedded && 'mx-auto max-w-3xl')}>
      <header className="space-y-2">
        <h1 id="emergency-title" className="font-display text-2xl">
          {t('scam.title')}
        </h1>
        <p className="measure text-ink-muted">{t('scam.calm')}</p>
      </header>
      <NonAffiliationBanner />
      <fieldset className="space-y-3">
        <legend className="mb-2 font-medium">1. {t('scam.qWhen')}</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          <Q label={t('scam.lt24h')} value="lt24h" current={elapsed} onPick={() => setElapsed('lt24h')} />
          <Q label={t('scam.gt24h')} value="gt24h" current={elapsed} onPick={() => setElapsed('gt24h')} />
          <Q label={t('scam.unknown')} value="unknown" current={elapsed} onPick={() => setElapsed('unknown')} />
        </div>
      </fieldset>
      {elapsed && (
        <fieldset className="space-y-3">
          <legend className="mb-2 font-medium">2. {t('scam.qHow')}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            <Q label={t('scam.bank')} value="bank" current={method} onPick={() => setMethod('bank')} />
            <Q label={t('scam.pjp')} value="pjp" current={method} onPick={() => setMethod('pjp')} />
            <Q label={t('scam.crypto')} value="crypto" current={method} onPick={() => setMethod('crypto')} />
            <Q label={t('scam.other')} value="other" current={method} onPick={() => setMethod('other')} />
          </div>
        </fieldset>
      )}
      {q.isLoading && <Spinner label={t('dex.loading')} />}
      {q.isError && <ErrorState message={(q.error as Error).message} onRetry={() => void q.refetch()} />}
      {art && art.spec.type === 'steps' && (
        <Card aria-live="polite">
          <h2 className="mb-3 font-display text-lg">{art.title}</h2>
          <StepList title={art.title} spec={art.spec} dex="finlaiwyer" />
          <div className="mt-4 flex flex-wrap gap-2">
            <Link to="/dex/antiscamdex/report" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 font-medium text-on-primary">
              {t('scam.prepareReport')}
            </Link>
            <Link to="/dex/finlaiwyer/guided" className="inline-flex min-h-11 items-center rounded-xl border border-edge px-4 hover:bg-pane-2">
              {t('scam.legalBasis')}
            </Link>
            <Button variant="ghost" onClick={reset}>
              {t('scam.restart')}
            </Button>
          </div>
        </Card>
      )}
      <p className="text-xs text-ink-muted">{t('disclaimer.antiscamdex')}</p>
    </section>
  );
}

// ----------------------------------------------------------------------------- Siapkan Laporan (offline wizard)

type Kb = { iasc: { required_data: Record<string, string[] | string[]> & { source_ids?: string[] }; rules: { text: string }[]; reporting_steps: { n: number; label: string }[] }; evidence_checklist: { items: string[] } };
type Draft = { checks: Record<string, boolean>; chronology: { when: string; what: string }[]; perpetrator: { source: string; account_type: string; notes: string }; reportNo: string };
const EMPTY: Draft = { checks: {}, chronology: [{ when: '', what: '' }], perpetrator: { source: '', account_type: '', notes: '' }, reportNo: '' };
const DRAFT_ID = 'report-prep-draft';
const GROUPS = ['pelapor', 'terlapor', 'transaksi', 'dokumen'] as const;
/** Items that ask for identity or account numbers are checklist-only ("sudah disiapkan"), never typed in (§4.29). */
const SENSITIVE_ITEM = /identitas|ktp|kitas|paspor|npwp|nomor rekening|account number|telepon & email|pindaian/i;

export function ReportPrepWizard() {
  const { t } = useTranslation();
  const locale = useLocale();
  const kb = useJson<Kb>('core/antiscam/kb.json');
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(EMPTY);
  const [keep, setKeep] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    void loadSecure<Draft>(DRAFT_ID)
      .then((r) => {
        if (r) {
          setD(r.value);
          setKeep(r.keep);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);
  const sensitive = useMemo(() => detectSensitive([...d.chronology.map((c) => `${c.when} ${c.what}`), d.perpetrator.notes, d.perpetrator.source, d.reportNo.replace(/\D/g, '').length > 15 ? d.reportNo : ''].join('\n')), [d]);
  useEffect(() => {
    if (!loaded || sensitive.length) return;
    const h = setTimeout(() => void saveSecure(DRAFT_ID, d, keep).then(() => setStatus(t('report.savedLocal'))), 600);
    return () => clearTimeout(h);
  }, [d, keep, loaded, sensitive.length, t]);
  if (kb.isLoading) return <LoadingBlock rows={4} />;
  if (kb.isError || !kb.data) return <ErrorState onRetry={() => void kb.refetch()} />;
  const req = kb.data.iasc.required_data as unknown as Record<string, string[]>;
  const group = GROUPS[step]!;
  const text = () => {
    const lines = [t('report.title'), ''];
    for (const g of GROUPS) {
      lines.push(`${t(`report.g_${g}`)}:`);
      for (const it of req[g] ?? []) lines.push(`  [${d.checks[`${g}|${it}`] ? 'x' : ' '}] ${it}`);
    }
    lines.push('', `${t('report.chronology')}:`);
    for (const c of d.chronology) if (c.when || c.what) lines.push(`  - ${c.when} ${c.what}`);
    if (d.perpetrator.source || d.perpetrator.notes) lines.push('', `${t('report.perpetrator')}: ${d.perpetrator.source} ${d.perpetrator.account_type} ${d.perpetrator.notes}`.trim());
    if (d.reportNo) lines.push('', `${t('report.reportNo')}: ${d.reportNo}`);
    lines.push('', NON_AFFILIATION[locale], '', EXPORT_WATERMARK, copyrightFor(locale, new Date().getFullYear()));
    return lines.join('\n');
  };
  return (
    <div className="space-y-4">
      <NonAffiliationBanner />
      <p className="measure text-sm text-ink-muted">{t('report.privacy', { days: RETENTION_DAYS })}</p>
      <ol className="flex flex-wrap gap-2" aria-label={t('report.progress')}>
        {GROUPS.map((g, i) => (
          <li key={g}>
            <button type="button" aria-current={i === step ? 'step' : undefined} onClick={() => setStep(i)} className={clsx('min-h-11 rounded-full border px-4 text-sm', i === step ? 'border-primary text-primary' : 'border-edge text-ink-muted')}>
              {i + 1}. {t(`report.g_${g}`)}
            </button>
          </li>
        ))}
      </ol>
      <Card>
        <h2 className="mb-3 font-display text-lg">{t(`report.g_${group}`)}</h2>
        <ul className="space-y-2">
          {(req[group] ?? []).map((it) => {
            const k = `${group}|${it}`;
            return (
              <li key={k}>
                <label className="flex min-h-11 items-start gap-3 text-sm">
                  <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--primary)]" checked={!!d.checks[k]} onChange={(e) => setD({ ...d, checks: { ...d.checks, [k]: e.target.checked } })} />
                  <span>
                    {it}
                    {SENSITIVE_ITEM.test(it) && <span className="block text-xs text-ink-muted">{t('report.checkOnly')}</span>}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
        {group === 'terlapor' && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-ink-muted">{t('report.scamSource')}</span>
              <input value={d.perpetrator.source} onChange={(e) => setD({ ...d, perpetrator: { ...d.perpetrator, source: e.target.value } })} className="min-h-11 w-full rounded-xl border border-edge bg-pane-2 px-3" placeholder={t('report.scamSourcePh')} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-ink-muted">{t('report.accountType')}</span>
              <input value={d.perpetrator.account_type} onChange={(e) => setD({ ...d, perpetrator: { ...d.perpetrator, account_type: e.target.value } })} className="min-h-11 w-full rounded-xl border border-edge bg-pane-2 px-3" placeholder={t('report.accountTypePh')} />
            </label>
          </div>
        )}
        {group === 'transaksi' && (
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium">{t('report.chronology')}</p>
            {d.chronology.map((c, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[12rem_1fr_auto]">
                <input aria-label={t('report.when')} value={c.when} onChange={(e) => setD({ ...d, chronology: d.chronology.map((x, j) => (j === i ? { ...x, when: e.target.value } : x)) })} className="min-h-11 rounded-xl border border-edge bg-pane-2 px-3" placeholder={t('report.whenPh')} />
                <input aria-label={t('report.what')} value={c.what} onChange={(e) => setD({ ...d, chronology: d.chronology.map((x, j) => (j === i ? { ...x, what: e.target.value } : x)) })} className="min-h-11 rounded-xl border border-edge bg-pane-2 px-3" placeholder={t('report.whatPh')} />
                <Button size="sm" variant="ghost" aria-label={t('report.removeRow')} onClick={() => setD({ ...d, chronology: d.chronology.filter((_, j) => j !== i) })}>
                  ✕
                </Button>
              </div>
            ))}
            <Button size="sm" onClick={() => setD({ ...d, chronology: [...d.chronology, { when: '', what: '' }] })}>
              {t('report.addRow')}
            </Button>
          </div>
        )}
        {group === 'dokumen' && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">{t('report.evidence')}</p>
            <ul className="list-disc pl-5 text-sm text-ink-muted">
              {kb.data.evidence_checklist.items.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-ink-muted">{t('report.reportNo')}</span>
              <input value={d.reportNo} onChange={(e) => setD({ ...d, reportNo: e.target.value })} className="min-h-11 w-full max-w-sm rounded-xl border border-edge bg-pane-2 px-3" placeholder={t('report.reportNoPh')} />
            </label>
          </div>
        )}
        {sensitive.length > 0 && (
          <p role="alert" className="mt-3 rounded-xl border border-negative p-3 text-sm text-negative">
            {t('report.sensitive')}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={step === 0} onClick={() => setStep(step - 1)}>
            {t('report.prev')}
          </Button>
          {step < GROUPS.length - 1 ? (
            <Button variant="primary" onClick={() => setStep(step + 1)}>
              {t('report.next')}
            </Button>
          ) : (
            <>
              <Button variant="primary" disabled={sensitive.length > 0} onClick={() => void navigator.clipboard?.writeText(text()).then(() => setStatus(t('chat.copied')))}>
                {t('report.copy')}
              </Button>
              <Button disabled={sensitive.length > 0} onClick={() => downloadBlob(new Blob([text()], { type: 'text/plain;charset=utf-8' }), slugFile(t('report.title'), 'txt'))}>
                {t('report.export')}
              </Button>
            </>
          )}
        </div>
      </Card>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex min-h-11 items-center gap-2">
          <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
          {t('report.keep', { days: RETENTION_DAYS })}
        </label>
        <Button
          variant="danger"
          size="sm"
          onClick={() =>
            void deleteSecure(DRAFT_ID).then(() => {
              setD(EMPTY);
              setStep(0);
              setStatus(t('report.deleted'));
            })
          }
        >
          {t('report.delete')}
        </Button>
        {status && (
          <span role="status" className="text-xs text-ink-muted">
            {status}
          </span>
        )}
      </div>
      <p className="text-sm">
        {t('report.then')}{' '}
        <a className="text-primary underline" href="https://iasc.ojk.go.id" target="_blank" rel="noopener noreferrer">
          iasc.ojk.go.id
        </a>
      </p>
    </div>
  );
}

// ----------------------------------------------------------------------------- Kenali Modus + kuis

export function ScamLibrary() {
  const { t } = useTranslation();
  const locale = useLocale();
  const [qs, setQs] = useState<string[] | null>(null);
  const [answers, setAnswers] = useState<(boolean | null)[]>([]);
  const [result, setResult] = useState<Artifact[] | null>(null);
  useEffect(() => {
    void runClientTool('antiscamdex', 'scam_selfcheck', { answers: null }, locale).then((r) => {
      const list = ((r.data as { questions: { question: string }[] }).questions ?? []).map((x) => x.question);
      setQs(list);
      setAnswers(list.map(() => null));
      setResult(null);
    });
  }, [locale]);
  const done = answers.length > 0 && answers.every((a) => a !== null);
  return (
    <div className="space-y-6">
      <ToolPanel dex="antiscamdex" panel={{ tool: 'modus_library', input: { query: null } }} />
      <Card>
        <h2 className="font-display text-lg">{t('quiz.title')}</h2>
        <p className="mt-1 text-sm text-ink-muted">{t('quiz.intro')}</p>
        {!qs && <Spinner label={t('dex.loading')} />}
        <ol className="mt-3 space-y-3">
          {(qs ?? []).map((q, i) => (
            <li key={q} className="rounded-xl border border-edge p-3">
              <p className="text-sm">
                {i + 1}. {q}
              </p>
              <div className="mt-2 flex gap-2" role="group" aria-label={q}>
                <Chip active={answers[i] === true} onClick={() => setAnswers(answers.map((a, j) => (j === i ? true : a)))}>
                  {t('quiz.yes')}
                </Chip>
                <Chip active={answers[i] === false} onClick={() => setAnswers(answers.map((a, j) => (j === i ? false : a)))}>
                  {t('quiz.no')}
                </Chip>
              </div>
            </li>
          ))}
        </ol>
        <Button className="mt-4" variant="primary" disabled={!done} onClick={() => void runClientTool('antiscamdex', 'scam_selfcheck', { answers }, locale).then((r) => setResult(r.ui ?? []))}>
          {t('quiz.check')}
        </Button>
        {result && (
          <div className="mt-4 space-y-3" aria-live="polite">
            {result.map((a) => (
              <ChartCard key={a.id} artifact={a} />
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-ink-muted">{t('quiz.private')}</p>
      </Card>
    </div>
  );
}
