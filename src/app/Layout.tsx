// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// App shell (§10.1): Orbit Rail (≥ 768 px) + top bar (Index Search ⌘K, global "Data per", theme, language); on mobile a
// header + 5-item bottom bar (Beranda · Pasar · AI · Dex · Lainnya). Global keyboard shortcuts (§10.9): ? list,
// g h home, g d Dex Hub, / or ⌘K search, Esc closes panels. Offline banner, update prompt, compare tray, footer.
import { clsx } from 'clsx';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router';
import { useAsOfLabel } from '../components/badges';
import { APP_NAME } from '../config/brand';
import { useManifest } from '../lib/data';
import { useLocale } from '../lib/locale';
import { useOnline } from '../lib/online';
import { useApp } from '../lib/store';
import { Footer } from './Footer';
import { OrbitRail } from './OrbitRail';
import { UpdatePrompt } from './UpdatePrompt';

const IndexSearch = lazy(() => import('../components/IndexSearch'));
const CompareShell = lazy(() => import('../features/compare/CompareShell'));
const ShortcutsDialog = lazy(() => import('./ShortcutsDialog'));

function ThemeLangControls() {
  const { t } = useTranslation();
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);
  const locale = useLocale();
  const setLocale = useApp((s) => s.setLocale);
  const dark = theme !== 'light';
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => setTheme(dark ? 'light' : 'dark')}
        aria-label={dark ? t('settings.toLedger') : t('settings.toNocturne')}
        title={dark ? 'Ledger' : 'Nocturne'}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl hover:bg-pane-2"
      >
        <span aria-hidden>{dark ? '☾' : '☼'}</span>
      </button>
      <button
        type="button"
        onClick={() => setLocale(locale === 'id' ? 'en' : 'id')}
        aria-label={t('settings.switchLanguage')}
        className="inline-flex h-11 min-w-11 items-center justify-center rounded-xl px-2 text-sm font-medium hover:bg-pane-2"
      >
        {locale === 'id' ? 'ID' : 'EN'}
      </button>
    </div>
  );
}

/** Global "Data per" indicator: newest as-of among the Dex (each Dex shows its own). */
function GlobalAsOf() {
  const { t } = useTranslation();
  const m = useManifest();
  const fmt = useAsOfLabel();
  const newest = useMemo(
    () =>
      Object.values(m.data?.dex ?? {})
        .map((d) => d.as_of)
        .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x))
        .sort()
        .at(-1),
    [m.data],
  );
  if (!newest) return null;
  return (
    <Link
      to="/legal/data-sources"
      className="hidden items-center gap-2 rounded-full border border-edge px-3 py-1 text-xs text-ink-muted hover:text-ink lg:inline-flex"
      title={t('nav.asOfHint')}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
      {t('nav.dataAsOf', { date: fmt(newest) })}
    </Link>
  );
}

function BottomNav() {
  const { t } = useTranslation();
  const item = (to: string, label: string, glyph: string, end = false) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px]',
          isActive ? 'text-data' : 'text-ink-muted',
        )
      }
    >
      <span aria-hidden className="text-lg leading-none">
        {glyph}
      </span>
      {label}
    </NavLink>
  );
  return (
    <nav
      aria-label={t('nav.bottom')}
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex border-t border-edge bg-field-0 md:hidden"
    >
      {item('/', t('nav.home'), '⌂', true)}
      {item('/dex/finandex-ai/markets', t('nav.markets'), '◎')}
      <NavLink to="/ai" className="flex flex-1 items-center justify-center" aria-label="Finandex AI">
        <span className="relative -mt-6 inline-flex h-14 w-14 items-center justify-center rounded-full border border-primary bg-field-0">
          <span aria-hidden className="absolute inset-[4px] rounded-full border border-dashed border-edge" />
          <img src="/icons/finandex-ai.svg" alt="" width={38} height={38} className="rounded-full" />
        </span>
      </NavLink>
      {item('/dex', t('nav.dex'), '✦', true)}
      {item('/more', t('nav.more'), '☰')}
    </nav>
  );
}

export function Layout() {
  const { t } = useTranslation();
  const online = useOnline();
  const loc = useLocation();
  const nav = useNavigate();
  const [search, setSearch] = useState(false);
  const [help, setHelp] = useState(false);
  const openSearch = useCallback(() => setSearch(true), []);
  const gPressed = useRef(0);
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        !!el &&
        (el.tagName === 'INPUT' ||
          el.tagName === 'TEXTAREA' ||
          el.tagName === 'SELECT' ||
          el.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearch(true);
        return;
      }
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '/') {
        e.preventDefault();
        setSearch(true);
      } else if (e.key === '?') setHelp(true);
      else if (e.key === 'g') gPressed.current = Date.now();
      else if (Date.now() - gPressed.current < 1200 && (e.key === 'h' || e.key === 'd')) {
        gPressed.current = 0;
        void nav(e.key === 'h' ? '/' : '/dex');
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [nav]);
  useEffect(() => {
    document.getElementById('main')?.focus({ preventScroll: true });
  }, [loc.pathname]);
  const trayCount = useApp((s) => s.tray.length);
  const compare = trayCount > 0 || /^\/(dex|markets)\//.test(loc.pathname);
  const page = (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-xl focus:bg-pane focus:p-2"
      >
        {t('nav.skip')}
      </a>
      <OrbitRail />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-edge bg-field-1/90 px-4 py-2 backdrop-blur">
          <Link to="/" className="flex items-center gap-2 md:hidden" aria-label={APP_NAME}>
            <img src="/icons/finandex.svg" alt="" width={28} height={28} className="rounded-xl" />
            <span className="font-display text-base">{APP_NAME}</span>
          </Link>
          <button
            type="button"
            onClick={openSearch}
            aria-label={t('search.open')}
            aria-keyshortcuts="Control+K Meta+K /"
            className="ml-auto flex min-h-11 items-center gap-2 rounded-xl border border-edge bg-pane px-3 text-sm text-ink-muted hover:text-ink md:ml-0 md:w-[min(40rem,60%)]"
          >
            <span aria-hidden>⌕</span>
            <span className="hidden flex-1 text-left md:inline">{t('search.placeholder')}</span>
            <kbd className="hidden rounded-xl border border-edge px-1.5 text-xs md:inline">⌘K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-2">
            <GlobalAsOf />
            <ThemeLangControls />
          </div>
        </header>
        {!online && (
          <p role="status" className="prov-flag bg-pane-2 px-4 py-2 text-center text-sm">
            {t('common.offline')}
          </p>
        )}
        <UpdatePrompt />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[90rem] flex-1 px-4 pb-28 pt-4 outline-none md:px-6 md:pb-10"
        >
          <Outlet />
        </main>
        <div className="pb-20 md:pb-0">
          <Footer />
        </div>
      </div>
      <BottomNav />
      {search && (
        <Suspense fallback={null}>
          <IndexSearch open={search} onOpenChange={setSearch} />
        </Suspense>
      )}
      {help && (
        <Suspense fallback={null}>
          <ShortcutsDialog open={help} onOpenChange={setHelp} />
        </Suspense>
      )}
      <ScrollRestoration />
    </div>
  );
  // The compare layer (dnd-kit, charts, tables) loads only where it is used or once the tray holds something.
  return compare ? (
    <Suspense fallback={page}>
      <CompareShell>{page}</CompareShell>
    </Suspense>
  ) : (
    page
  );
}
