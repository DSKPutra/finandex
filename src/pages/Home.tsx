// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Beranda (§10.2): (1) hero = Index Constellation + "Tanya Finandex AI…" + 4 cross-category chips; (2) quick actions —
// emergency (--negative) "Baru kena scam?", ask law, ask financial law, download whitepaper, install app, feature guide; (2a) "Pasang
// Finandex" ribbon; (3) market summary; (4–5) Feature Map with filters that also dim the constellation; (6) as-of strip.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { EmergencyScamButton } from '../components/EmergencyScamButton';
import { Guilloche } from '../components/Guilloche';
import { Button, Chip } from '../components/ui';
import { appTaglineFor } from '../config/brand';
import { ConstellationMap } from '../features/constellation/ConstellationMap';
import { AsOfStrip, FeatureMap, useFeatureFilter } from '../features/home/FeatureMap';
import { MarketSummary } from '../features/home/MarketSummary';
import { InstallRibbon } from '../features/install/InstallCenter';
import { useLocale } from '../lib/locale';

/** Cross-category suggestions → the Dex that answers them. */
const HERO_TARGETS = ['finandex-ai', 'mylaiwyer', 'rupiahdex', 'salarydex'] as const;

export default function Home() {
  const { t } = useTranslation();
  const locale = useLocale();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const filter = useFeatureFilter();
  const suggestions = t('home.suggest', { returnObjects: true }) as string[];
  const ask = (text: string, dex = 'finandex-ai') => void nav(`/dex/${dex}/chat?q=${encodeURIComponent(text)}`);
  const quick: { to: string; label: string }[] = [
    { to: '/dex/mylaiwyer/chat', label: t('home.qa_law') },
    { to: '/dex/finlaiwyer/chat', label: t('home.qa_finlaw') },
    { to: '/agents', label: t('home.qa_agents') },
    { to: '/whitepaper', label: t('home.qa_whitepaper') },
    { to: '/install', label: t('home.qa_install') },
    { to: '/panduan', label: t('home.qa_guide') },
  ];
  return (
    <div className="space-y-10">
      <section aria-labelledby="hero-title" className="relative isolate overflow-hidden rounded-pane">
        <Guilloche className="pointer-events-none absolute inset-0 -z-10 h-full w-full" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 id="hero-title" className="font-display text-3xl sm:text-4xl">
              Finandex
            </h1>
            <p className="text-ink-muted">{appTaglineFor(locale)}</p>
          </div>
          <p className="max-w-md text-sm text-ink-muted">{t('home.constellationLegend')}</p>
        </div>
        <div className="mt-4">
          <ConstellationMap match={filter.match} />
        </div>
        <form
          className="mx-auto mt-4 flex max-w-3xl gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) ask(q.trim());
          }}
        >
          <label htmlFor="hero-ask" className="sr-only">
            {t('home.askPlaceholder')}
          </label>
          <input id="hero-ask" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('home.askPlaceholder')} className="min-h-14 flex-1 rounded-xl border border-edge bg-pane px-4 text-base focus:border-primary" />
          <Button type="submit" variant="primary" size="lg">
            {t('home.ask')}
          </Button>
        </form>
        <div className="mx-auto mt-3 flex max-w-3xl flex-wrap justify-center gap-2">
          {suggestions.map((s, i) => (
            <Chip key={s} onClick={() => ask(s, HERO_TARGETS[i] ?? 'finandex-ai')}>
              {s}
            </Chip>
          ))}
        </div>
      </section>

      <section aria-label={t('home.quick')} className="flex flex-wrap items-center gap-2">
        <EmergencyScamButton />
        {quick.map((x) => (
          <Link key={x.to} to={x.to} className="inline-flex min-h-12 items-center rounded-xl border border-edge bg-pane px-4 text-sm hover:bg-pane-2">
            {x.label}
          </Link>
        ))}
      </section>

      <InstallRibbon />
      <MarketSummary />
      <FeatureMap state={filter} />
      <AsOfStrip />
    </div>
  );
}
