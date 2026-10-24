// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// /agents — "Ruang Agen" (AGENTIC_AI_PROMPT §7.4): the 3D Agent Office driven by a real question you ask here, the
// event stream, per-agent trace, agents per room (role, skills, data & as-of, tools) and evaluation statistics.
import { lazy, Suspense, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '../components/ui';
import { AGENTS } from '../config/agents';
import evalSummary from '../config/agents-eval.generated.json';
import { DEX_REGISTRY } from '../config/dex-registry';
import type { DexId } from '../config/dex-registry';
import { streamChat } from '../lib/chat-client';
import { useLocale } from '../lib/locale';
import { useApp } from '../lib/store';
import { formatPercent } from '../shared/format';
import { detectSensitive } from '../shared/text';
import { useAgentActivity } from '../features/agents/activity';
import { AgentTracePanel } from '../features/agents/AgentUi';
import { applyAgentEvent, emptyTrace, isAgentEvent } from '../features/agents/trace';
import { Md } from '../features/chat/AnswerCard';

const AgentOffice = lazy(() => import('../features/agents/office/AgentOffice'));

type EvalSummary = { generated: string; routing: { items: number; precision: number; recall: number }; skills: { items: number; pass_rate: number }; collaboration: { items: number; pass_rate: number }; latency: { median_ms_1_agent: number; median_ms_3_agents: number }; per_agent: Record<string, { items: number; pass_rate: number }> };
const EVAL = evalSummary as EvalSummary;

const SAMPLES: { dex: DexId; q: { id: string; en: string } }[] = [
  { dex: 'finlaiwyer', q: { id: 'Saya kena scam + kurs rupiah hari itu + pasal penipuan online', en: 'I got scammed + the rupiah rate that day + the online-fraud article' } },
  { dex: 'salarydex', q: { id: 'Gaji data scientist dan biaya hidup di Jakarta', en: 'Data scientist salary and the cost of living in Jakarta' } },
  { dex: 'rupiahdex', q: { id: 'Kurs USD/IDR tertinggi sepanjang data', en: 'Highest USD/IDR rate in the data' } },
];

export default function Agents() {
  const { t } = useTranslation();
  const locale = useLocale();
  const clientId = useApp((s) => s.clientId);
  const consented = useApp((s) => !!s.consentVersion);
  const [dex, setDex] = useState<DexId>('finandex-ai');
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trace = useAgentActivity((s) => s.trace);
  const abort = useRef<AbortController | null>(null);

  const ask = async (question: string, open: DexId) => {
    const text = question.trim();
    if (!text || busy) return;
    if (detectSensitive(text).length) return setError(t('chat.sensitive'));
    if (!consented) return setError(t('agents.needConsent'));
    setError(null);
    setAnswer('');
    setBusy(true);
    const ctrl = new AbortController();
    abort.current = ctrl;
    let tr = emptyTrace();
    const act = useAgentActivity.getState();
    act.begin(text, tr);
    try {
      await streamChat(
        { dex: open, locale, clientId, messages: [{ role: 'user', content: text }] },
        (e) => {
          if (isAgentEvent(e)) {
            tr = applyAgentEvent(tr, e, locale);
            act.push(e, tr);
          }
          if (e.event === 'text') setAnswer((a) => a + e.data.delta);
          if (e.event === 'error') setError(e.data.message);
        },
        ctrl.signal,
      );
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const skills = AGENTS.reduce((n, a) => n + a.skills.length, 0);
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl">{t('agents.title')}</h1>
        <p className="measure text-ink-muted">{t('agents.intro', { agents: AGENTS.length, skills })}</p>
      </header>
      <Card className="space-y-3">
        <form
          className="flex flex-col gap-2 md:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(q, dex);
          }}
        >
          <label className="sr-only" htmlFor="agents-dex">
            {t('agents.openDex')}
          </label>
          <select id="agents-dex" value={dex} onChange={(e) => setDex(e.target.value as DexId)} className="min-h-11 rounded-xl border border-edge bg-pane px-3 text-sm">
            {DEX_REGISTRY.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="agents-q">
            {t('agents.askLabel')}
          </label>
          <input id="agents-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('agents.askPlaceholder')} className="min-h-11 flex-1 rounded-xl border border-edge bg-pane px-3 text-base" maxLength={2000} />
          {busy ? (
            <Button type="button" variant="danger" onClick={() => abort.current?.abort()}>
              {t('chat.stop')}
            </Button>
          ) : (
            <Button type="submit" variant="primary" disabled={!q.trim()}>
              {t('agents.run')}
            </Button>
          )}
        </form>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLES.map((s) => (
            <button
              key={s.q.id}
              type="button"
              className="min-h-9 rounded-full border border-edge px-3 text-sm hover:bg-pane-2"
              onClick={() => {
                setDex(s.dex);
                setQ(s.q[locale]);
                void ask(s.q[locale], s.dex);
              }}
            >
              {s.q[locale]}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-sm text-negative">
            {error}
          </p>
        )}
      </Card>
      <Suspense fallback={<p className="text-sm text-ink-muted">{t('dex.loading')}</p>}>
        <AgentOffice />
      </Suspense>
      {(answer || trace?.order.length) && (
        <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
          <Card className="prov-ai">{answer ? <Md text={answer} /> : <p className="text-sm text-ink-muted">{t('agents.waiting')}</p>}</Card>
          {trace && <AgentTracePanel trace={trace} />}
        </div>
      )}
      <section aria-labelledby="agents-eval" className="space-y-2">
        <h2 id="agents-eval" className="font-display text-xl">
          {t('agents.evalTitle')}
        </h2>
        <p className="text-sm text-ink-muted">{t('agents.evalNote', { date: EVAL.generated })}</p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <li className="pane-2 p-3 text-sm">
            <p className="text-ink-muted">{t('agents.evalRouting')}</p>
            <p className="tabular font-display text-lg text-data">
              P {formatPercent(EVAL.routing.precision, locale, 1)} · R {formatPercent(EVAL.routing.recall, locale, 1)}
            </p>
            <p className="text-xs text-ink-muted">{t('agents.evalItems', { n: EVAL.routing.items })}</p>
          </li>
          <li className="pane-2 p-3 text-sm">
            <p className="text-ink-muted">{t('agents.evalSkills')}</p>
            <p className="tabular font-display text-lg text-data">{formatPercent(EVAL.skills.pass_rate, locale, 1)}</p>
            <p className="text-xs text-ink-muted">{t('agents.evalItems', { n: EVAL.skills.items })}</p>
          </li>
          <li className="pane-2 p-3 text-sm">
            <p className="text-ink-muted">{t('agents.evalCollab')}</p>
            <p className="tabular font-display text-lg text-data">{formatPercent(EVAL.collaboration.pass_rate, locale, 1)}</p>
            <p className="text-xs text-ink-muted">{t('agents.evalItems', { n: EVAL.collaboration.items })}</p>
          </li>
          <li className="pane-2 p-3 text-sm">
            <p className="text-ink-muted">{t('agents.evalLatency')}</p>
            <p className="tabular font-display text-lg text-data">
              {EVAL.latency.median_ms_1_agent} / {EVAL.latency.median_ms_3_agents} ms
            </p>
            <p className="text-xs text-ink-muted">{t('agents.evalLatencyNote')}</p>
          </li>
        </ul>
      </section>
    </div>
  );
}
