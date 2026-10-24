// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Stand-alone law apps (§14): My LAIwyer and FinLAIwyer are installable on their own from /apps/mylaiwyer/ and
// /apps/finlaiwyer/ (separate manifest.webmanifest, scope and start_url). The router runs under that basename and only
// serves that Dex, the emergency screen, legal pages, About and Settings; links to other Dex open the full Finandex.
import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { createBrowserRouter, Link, Navigate, Outlet, ScrollRestoration, useParams } from 'react-router';
import { DexIcon } from '../components/DexCard';
import { LoadingBlock } from '../components/ui';
import { DEX_REGISTRY } from '../config/dex-registry';
import { useLocale } from '../lib/locale';
import { Footer } from './Footer';
import { RouteError } from './RouteError';
import { UpdatePrompt } from './UpdatePrompt';

export const LAW_APPS = ['mylaiwyer', 'finlaiwyer'] as const;
export type LawApp = (typeof LAW_APPS)[number];

export function lawAppFromPath(pathname: string): LawApp | null {
  const m = /^\/apps\/(mylaiwyer|finlaiwyer)(\/|$)/.exec(pathname);
  return (m?.[1] as LawApp | undefined) ?? null;
}

const DexPage = lazy(() => import('../pages/DexPage'));
const Legal = lazy(() => import('../pages/Legal'));
const About = lazy(() => import('../pages/About'));
const Settings = lazy(() => import('../pages/Settings'));
const DaruratScam = lazy(() => import('../pages/DaruratScam'));
const page = (el: ReactNode) => <Suspense fallback={<LoadingBlock />}>{el}</Suspense>;

function LawLayout({ app }: { app: LawApp }) {
  const { t } = useTranslation();
  const dex = DEX_REGISTRY.find((d) => d.id === app)!;
  return (
    <div className="min-h-dvh bg-field-1 text-ink">
      <a href="#main" className="sr-only focus:not-sr-only">
        {t('nav.skip')}
      </a>
      <header className="safe-top flex flex-wrap items-center gap-3 border-b border-edge bg-field-0 px-4 py-2">
        <Link to={`/dex/${app}`} className="flex items-center gap-2">
          <DexIcon dex={dex} size={32} />
          <span className="font-display text-lg">{dex.name}</span>
        </Link>
        <nav aria-label={t('nav.rail')} className="ml-auto flex flex-wrap items-center gap-1 text-sm">
          <Link to="/legal/privacy" className="inline-flex min-h-11 items-center rounded-xl px-2 hover:bg-pane-2">
            {t('legal.privacy')}
          </Link>
          <Link to="/settings" className="inline-flex min-h-11 items-center rounded-xl px-2 hover:bg-pane-2">
            {t('nav.settings')}
          </Link>
          <a href="/" className="inline-flex min-h-11 items-center rounded-xl px-2 hover:bg-pane-2">
            Finandex ↗
          </a>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-6xl px-4 py-4">
        <Outlet />
      </main>
      <Footer />
      <UpdatePrompt />
      <ScrollRestoration />
    </div>
  );
}

/** Inside a law app only its own Dex is served; any other Dex link opens the full Finandex. */
function LawDex({ app }: { app: LawApp }) {
  const { dexId } = useParams();
  const locale = useLocale();
  if (dexId === app) return page(<DexPage />);
  const other = DEX_REGISTRY.find((d) => d.id === dexId);
  return (
    <p className="pane p-4 text-sm">
      {locale === 'id' ? 'Fitur ini ada di aplikasi Finandex lengkap: ' : 'This feature lives in the full Finandex app: '}
      <a className="underline" href={other ? `/dex/${other.id}` : '/'}>
        {other?.name ?? 'Finandex'} ↗
      </a>
    </p>
  );
}

export function createLawRouter(app: LawApp) {
  return createBrowserRouter(
    [
      {
        path: '/',
        element: <LawLayout app={app} />,
        errorElement: <RouteError />,
        children: [
          { index: true, element: <Navigate to={`/dex/${app}`} replace /> },
          { path: 'dex/:dexId/:tab?/:entity?', element: <LawDex app={app} /> },
          { path: 'legal/:page', element: page(<Legal />) },
          { path: 'about', element: page(<About />) },
          { path: 'settings', element: page(<Settings />) },
          { path: 'darurat-scam', element: page(<DaruratScam />) },
          { path: '*', element: <Navigate to={`/dex/${app}`} replace /> },
        ],
      },
    ],
    { basename: `/apps/${app}` },
  );
}
