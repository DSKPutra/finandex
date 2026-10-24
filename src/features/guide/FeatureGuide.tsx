// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Feature guide (§9): "Tentang fitur ini" sheet in every Dex header, the /panduan page (all Dex per category + general
// app functions), and first-visit coach marks (Chat → main tab → Data; skippable, never shown again). Everything comes
// from kit/datasets/app/feature_guide.json (public/data/core/app/feature_guide.json), the same file the chatbot's
// feature_guide tool reads — so the guide never differs from the UI (tested against the registry tabs).
import * as Dialog from '@radix-ui/react-dialog';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button, Card, ErrorState, LoadingBlock } from '../../components/ui';
import { DEX_GROUPS } from '../../config/dex-groups';
import type { DexEntry } from '../../config/dex-registry';
import { getDex } from '../../config/dex-registry';
import { useJson } from '../../lib/data';
import { useLocale } from '../../lib/locale';
import { useApp } from '../../lib/store';

export type GuideDex = { id: string; name: string; group: string; purpose: string; ask_examples: string[]; functions: { tab: string; what: string }[]; limitations: string; data_as_of: string; related: string[] };
export type Guide = { app: { name: string; creator: string; dex_count: number; app_functions: { name: string; what: string }[] }; dex: GuideDex[] };

export const useGuide = () => useJson<Guide>('core/app/feature_guide.json');

function GuideBody({ g, dex, onNavigate }: { g: GuideDex; dex: DexEntry; onNavigate?: () => void }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const tabId = (label: string) => dex.tabs.find((x) => x.label.id === label);
  return (
    <div className="space-y-4 text-sm">
      <p>{g.purpose}</p>
      <div>
        <p className="font-medium">{t('guide.youCanAsk')}</p>
        <ul className="mt-1 space-y-1">
          {g.ask_examples.slice(0, 6).map((q) => (
            <li key={q}>
              <Link to={`/dex/${dex.id}/chat?q=${encodeURIComponent(q)}`} onClick={onNavigate} className="inline-flex min-h-9 items-center text-primary underline">
                {q}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="font-medium">{t('guide.functions')}</p>
        <ul className="mt-1 space-y-2">
          {g.functions.map((f) => {
            const tab = tabId(f.tab);
            return (
              <li key={f.tab} className="flex items-start justify-between gap-3 rounded-xl border border-edge p-3">
                <span>
                  <span className="font-medium">{tab ? tab.label[locale] : f.tab}</span>
                  <span className="block text-ink-muted">{f.what}</span>
                </span>
                {tab && (
                  <Link to={`/dex/${dex.id}/${tab.id}`} onClick={onNavigate} className="inline-flex min-h-11 shrink-0 items-center rounded-xl border border-edge px-3 hover:bg-pane-2">
                    {t('guide.openShort')}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <p>
        <span className="font-medium">{t('guide.data')}:</span> {g.data_as_of}
      </p>
      <p className="prov-flag rounded-xl bg-pane-2 p-3">
        <span className="font-medium">{t('guide.limits')}:</span> {g.limitations}
      </p>
      {g.related.length > 0 && (
        <p>
          <span className="font-medium">{t('guide.related')}:</span>{' '}
          {g.related.map((r, i) => (
            <span key={r}>
              {i > 0 && ', '}
              <Link to={`/dex/${r}`} onClick={onNavigate} className="text-primary underline">
                {getDex(r)?.name ?? r}
              </Link>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

/** "Tentang fitur ini" button + sheet (header of every Dex). */
export function FeatureGuideButton({ dex }: { dex: DexEntry }) {
  const { t } = useTranslation();
  const guide = useGuide();
  const [open, setOpen] = useState(false);
  const g = guide.data?.dex.find((x) => x.id === dex.id);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button size="sm" variant="ghost">
          {t('guide.about')}
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-field-0/80" />
        <Dialog.Content className="pane fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto rounded-b-none p-5 md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[30rem] md:rounded-none" aria-describedby={undefined}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <Dialog.Title className="font-display text-lg">
              {t('guide.about')} · {dex.name}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button size="sm">{t('dex.close')}</Button>
            </Dialog.Close>
          </div>
          {guide.isLoading && <LoadingBlock rows={3} />}
          {guide.isError && <ErrorState onRetry={() => void guide.refetch()} />}
          {g && <GuideBody g={g} dex={dex} onNavigate={() => setOpen(false)} />}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** First-visit coach marks for a Dex: 3 steps (Chat → main tab → Data), skippable, remembered on the device. */
export function CoachMarks({ dex }: { dex: DexEntry }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const seen = useApp((s) => s.coachSeen.includes(dex.id));
  const mark = useApp((s) => s.markCoach);
  const [step, setStep] = useState(0);
  if (seen) return null;
  const main = dex.tabs[1];
  const steps = [t('coach.chat'), t('coach.main', { tab: main?.label[locale] ?? '' }), t('coach.data')];
  return (
    <div role="dialog" aria-label={t('coach.title')} aria-live="polite" className="pane prov-ai flex flex-wrap items-center gap-3 p-3 text-sm">
      <span className="tabular rounded-full border border-edge px-2 py-0.5 text-xs">
        {step + 1}/3
      </span>
      <p className="min-w-[14rem] flex-1">{steps[step]}</p>
      <Button size="sm" variant="primary" onClick={() => (step < 2 ? setStep(step + 1) : mark(dex.id))}>
        {step < 2 ? t('coach.next') : t('coach.done')}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => mark(dex.id)}>
        {t('coach.skip')}
      </Button>
    </div>
  );
}

/** /panduan — guide of all Dex per category + general app functions. */
export function GuidePage() {
  const { t } = useTranslation();
  const locale = useLocale();
  const guide = useGuide();
  if (guide.isLoading) return <LoadingBlock rows={6} />;
  if (guide.isError || !guide.data) return <ErrorState onRetry={() => void guide.refetch()} />;
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-3xl">{t('guide.title')}</h1>
        <p className="measure mt-2 text-ink-muted">{t('guide.intro', { n: guide.data.app.dex_count })}</p>
      </header>
      <Card>
        <h2 className="mb-3 font-display text-lg">{t('guide.appFunctions')}</h2>
        <ul className="grid gap-2 md:grid-cols-2">
          {guide.data.app.app_functions.map((f) => (
            <li key={f.name} className="rounded-xl border border-edge p-3 text-sm">
              <p className="font-medium">{f.name}</p>
              <p className="text-ink-muted">{f.what}</p>
            </li>
          ))}
        </ul>
      </Card>
      {DEX_GROUPS.map((grp) => {
        const list = guide.data!.dex.filter((d) => d.group === grp.id);
        if (!list.length) return null;
        return (
          <section key={grp.id} aria-labelledby={`g-${grp.id}`}>
            <h2 id={`g-${grp.id}`} className="font-display text-xl">
              {grp.name[locale]}
            </h2>
            <p className="mb-3 text-sm text-ink-muted">{grp.description[locale]}</p>
            <div className="grid gap-3 lg:grid-cols-2">
              {list.map((g) => {
                const d = getDex(g.id);
                if (!d) return null;
                return (
                  <details key={g.id} className="pane p-4">
                    <summary className="flex min-h-11 cursor-pointer items-center gap-3">
                      <img src={`/icons/${d.icon}.svg`} alt="" width={32} height={32} className="rounded-xl" />
                      <span className="font-medium">{d.name}</span>
                    </summary>
                    <div className="mt-3">
                      <GuideBody g={g} dex={d} />
                    </div>
                  </details>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
