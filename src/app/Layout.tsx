// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// App shell (§10.1): collapsible sidebar with the 8 Dex categories on tablet/desktop; 5-item bottom tab bar on mobile
// (Home · Markets · AI (centre) · Dex · More). Ctrl/Cmd+K opens the command palette.
import {
  Bot,
  ChevronsLeft,
  ChevronsRight,
  Grid3x3,
  Home,
  LineChart,
  Menu,
  Search,
  Settings,
  Star,
  Info,
  BookOpen,
} from 'lucide-react';
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { DEX_GROUPS } from '../config/dex-groups.ts';
import { useTranslation } from '../i18n/index.ts';
import { useSettings } from '../lib/settings.ts';
import { DexIcon } from '../components/DexIcon.tsx';
import { visibleDex } from '../config/visible-dex.ts';
import { Footer } from '../components/Footer.tsx';
import { OfflineBanner } from '../components/States.tsx';
const CommandPalette = lazy(() => import('./CommandPalette.tsx').then((m) => ({ default: m.CommandPalette })));

function SideLink({ to, icon, label, collapsed }: { to: string; icon: ReactNode; label: string; collapsed: boolean }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-2 px-2 rounded-lg no-underline ${isActive ? 'font-semibold' : ''}`
      }
      style={({ isActive }) => ({
        minHeight: 40,
        color: isActive ? 'var(--brand-text)' : 'var(--text)',
        background: isActive ? 'var(--surface-2)' : undefined,
      })}
    >
      <span className="shrink-0 flex">{icon}</span>
      {!collapsed && <span className="truncate text-sm">{label}</span>}
    </NavLink>
  );
}

export function Layout() {
  const { t } = useTranslation();
  const locale = useSettings((s) => s.locale);
  const collapsed = useSettings((s) => s.sidebarCollapsed);
  const set = useSettings((s) => s.set);
  const [palette, setPalette] = useState(false);
  const [more, setMore] = useState(false);
  const loc = useLocation();
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPalette(true);
      }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, []);
  useEffect(() => {
    window.scrollTo?.(0, 0);
  }, [loc.pathname]);
  const dex = visibleDex(false);

  return (
    <div className="flex min-h-full">
      <a href="#main" className="sr-only">
        Skip to content
      </a>
      <aside
        className="hidden md:flex flex-col gap-1 p-2 sticky top-0 h-screen overflow-y-auto shrink-0"
        style={{ width: collapsed ? 64 : 264, borderRight: '1px solid var(--border)', background: 'var(--surface)' }}
        aria-label={t('nav.menu')}
      >
        <div className="flex items-center justify-between p-1 mb-2">
          {!collapsed && (
            <Link to="/" className="flex items-center gap-2 no-underline" style={{ color: 'var(--text)' }}>
              <img src="/icons/finandex.svg" width={28} height={28} alt="" />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.08em' }}>
                FINANDEX
              </span>
            </Link>
          )}
          <button
            className="btn btn-sm btn-ghost"
            aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
            onClick={() => set({ sidebarCollapsed: !collapsed })}
          >
            {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>
        </div>
        <button className="btn btn-sm justify-start mb-1" onClick={() => setPalette(true)} aria-label={t('nav.search')}>
          <Search size={16} />
          {!collapsed && <span className="muted">{t('nav.search')} · Ctrl K</span>}
        </button>
        <SideLink to="/" icon={<Home size={18} />} label={t('nav.home')} collapsed={collapsed} />
        <SideLink to="/markets" icon={<LineChart size={18} />} label={t('nav.marketsGlobal')} collapsed={collapsed} />
        <SideLink to="/ai" icon={<Bot size={18} />} label="Finandex AI" collapsed={collapsed} />
        {DEX_GROUPS.map((g) => (
          <div key={g.id} className="mt-2">
            {!collapsed && (
              <p className="text-xs muted uppercase m-0 px-2 mb-1" style={{ letterSpacing: '0.06em' }}>
                {g.name[locale]}
              </p>
            )}
            {dex
              .filter((d) => d.group === g.id)
              .sort((a, b) => a.order - b.order)
              .map((d) => (
                <SideLink
                  key={d.id}
                  to={`/dex/${d.id}`}
                  icon={<DexIcon id={d.icon} size={22} />}
                  label={d.name}
                  collapsed={collapsed}
                />
              ))}
          </div>
        ))}
        <div className="mt-3 flex flex-col gap-1">
          <SideLink to="/watchlist" icon={<Star size={18} />} label={t('nav.watchlist')} collapsed={collapsed} />
          <SideLink to="/settings" icon={<Settings size={18} />} label={t('nav.settings')} collapsed={collapsed} />
          <SideLink to="/whitepaper" icon={<BookOpen size={18} />} label={t('nav.whitepaper')} collapsed={collapsed} />
          <SideLink to="/about" icon={<Info size={18} />} label={t('nav.about')} collapsed={collapsed} />
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className="md:hidden flex items-center justify-between px-4 sticky top-0 z-20"
          style={{
            minHeight: 52,
            background: 'var(--bg)',
            borderBottom: '1px solid var(--border)',
            paddingTop: 'env(safe-area-inset-top)',
          }}
        >
          <Link to="/" className="flex items-center gap-2 no-underline" style={{ color: 'var(--text)' }}>
            <img src="/icons/finandex.svg" width={26} height={26} alt="" />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.08em' }}>
              FINANDEX
            </span>
          </Link>
          <button className="btn btn-sm btn-ghost" aria-label={t('nav.search')} onClick={() => setPalette(true)}>
            <Search size={20} />
          </button>
        </header>
        <OfflineBanner />
        <main id="main" className="flex-1 w-full mx-auto p-4 md:p-6" style={{ maxWidth: 1400, minHeight: '100vh' }}>
          <Outlet />
        </main>
        <Footer locale={locale} />
      </div>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 flex justify-around items-end"
        style={{
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
        aria-label={t('nav.menu')}
      >
        {[
          { to: '/', icon: <Home size={20} />, label: t('nav.home') },
          { to: '/markets', icon: <LineChart size={20} />, label: t('nav.markets') },
          { to: '/ai', icon: <Bot size={26} />, label: t('nav.ai'), center: true },
          { to: '/dex', icon: <Grid3x3 size={20} />, label: t('nav.dexHub') },
        ].map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.to === '/'}
            className="flex flex-col items-center no-underline text-xs py-1"
            style={({ isActive }) => ({
              minWidth: 64,
              minHeight: 52,
              color: isActive ? 'var(--brand-text)' : 'var(--text-muted)',
            })}
          >
            {i.center ? (
              <span
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 52,
                  height: 52,
                  marginTop: -18,
                  background: 'var(--brand)',
                  color: 'var(--on-brand)',
                  boxShadow: '0 0 18px rgba(25,242,58,.45)',
                }}
              >
                {i.icon}
              </span>
            ) : (
              i.icon
            )}
            <span>{i.label}</span>
          </NavLink>
        ))}
        <button
          className="flex flex-col items-center text-xs py-1 bg-transparent border-0"
          style={{ minWidth: 64, minHeight: 52, color: 'var(--text-muted)' }}
          aria-expanded={more}
          onClick={() => setMore(!more)}
        >
          <Menu size={20} />
          <span>{t('nav.more')}</span>
        </button>
        {more && (
          <div className="card absolute right-2 bottom-16 p-2 flex flex-col" style={{ minWidth: 200 }}>
            {[
              ['/watchlist', t('nav.watchlist')],
              ['/settings', t('nav.settings')],
              ['/whitepaper', t('nav.whitepaper')],
              ['/about', t('nav.about')],
              ['/legal/privacy', t('nav.legal')],
            ].map(([to, label]) => (
              <Link
                key={to}
                to={to!}
                onClick={() => setMore(false)}
                className="px-3 py-2 no-underline"
                style={{ color: 'var(--text)', minHeight: 44 }}
              >
                {label}
              </Link>
            ))}
          </div>
        )}
      </nav>
      {palette && (
        <Suspense fallback={null}>
          <CommandPalette open={palette} onOpenChange={setPalette} />
        </Suspense>
      )}
    </div>
  );
}
