// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Orbit Rail (§10.1, desktop/tablet ≥ 768 px): 72 px rail with the core button (Finandex AI, an orbit ring), 8 category
// glyphs (small constellations), Watchlist and Settings. Hover / focus / click opens a 300 px panel with that category's
// Dex (icon, name, as-of). Esc closes the panel and returns focus to its glyph.
import { clsx } from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, NavLink } from 'react-router';
import { useAsOfLabel } from '../components/badges';
import { GROUP_HUES } from '../config/brand';
import { DEX_GROUPS } from '../config/dex-groups';
import type { DexGroupId } from '../config/dex-groups';
import { visibleDex } from '../config/dex-registry';
import { DISTRIBUTION } from '../config/runtime';
import { seed } from '../features/constellation/layout';
import { useManifest } from '../lib/data';
import { useLocale } from '../lib/locale';

/** A small constellation glyph per category (deterministic dots + lines, one per Dex in the category). */
export function GroupGlyph({ group, gi, n, size = 28 }: { group: DexGroupId; gi: number; n: number; size?: number }) {
  const pts = Array.from({ length: Math.max(2, n) }, (_, i) => {
    const a = (i / Math.max(2, n)) * Math.PI * 2 + seed(group) * 6;
    const r = 7 + seed(group, i + 1) * 4;
    return [14 + Math.cos(a) * r, 14 + Math.sin(a) * r] as const;
  });
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 28 28">
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={GROUP_HUES[gi]} strokeOpacity="0.6" strokeWidth="1" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={i === 0 ? 2.4 : 1.8} fill={GROUP_HUES[gi]} />
      ))}
    </svg>
  );
}

export function OrbitRail() {
  const { t } = useTranslation();
  const locale = useLocale();
  const m = useManifest();
  const fmt = useAsOfLabel();
  const dex = visibleDex(DISTRIBUTION);
  const [open, setOpen] = useState<DexGroupId | null>(null);
  const glyphs = useRef(new Map<string, HTMLButtonElement>());
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        glyphs.current.get(open)?.focus();
        setOpen(null);
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [open]);
  const keep = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const later = () => {
    keep();
    closeTimer.current = setTimeout(() => setOpen(null), 180);
  };
  const group = DEX_GROUPS.find((g) => g.id === open);
  const items = group ? dex.filter((d) => d.group === group.id) : [];
  const railItem = 'flex h-12 w-12 items-center justify-center rounded-xl transition-colors hover:bg-pane-2';
  return (
    <nav aria-label={t('nav.rail')} className="sticky top-0 z-40 hidden h-dvh w-[72px] shrink-0 flex-col items-center gap-1 border-r border-edge bg-field-0 py-3 md:flex" onMouseLeave={later}>
      <Link to="/" aria-label={t('nav.home')} className="mb-2 flex h-12 w-12 items-center justify-center">
        <img src="/icons/finandex.svg" alt="" width={36} height={36} className="rounded-xl" />
      </Link>
      <NavLink to="/ai" aria-label="Finandex AI" className={({ isActive }) => clsx('relative flex h-14 w-14 items-center justify-center rounded-full', isActive && 'text-primary')}>
        <span aria-hidden className="absolute inset-0 rounded-full border border-primary/70" />
        <span aria-hidden className="absolute inset-[5px] rounded-full border border-dashed border-edge-hi" />
        <img src="/icons/finandex-ai.svg" alt="" width={34} height={34} className="rounded-full" />
      </NavLink>
      <ul className="mt-2 flex flex-col gap-1">
        {DEX_GROUPS.map((g, gi) => (
          <li key={g.id}>
            <button
              ref={(el) => {
                if (el) glyphs.current.set(g.id, el);
              }}
              type="button"
              aria-expanded={open === g.id}
              aria-controls="rail-panel"
              aria-label={g.name[locale]}
              title={g.name[locale]}
              className={clsx(railItem, open === g.id && 'bg-pane-2')}
              onMouseEnter={() => {
                keep();
                setOpen(g.id);
              }}
              onFocus={() => setOpen(g.id)}
              onClick={() => setOpen(open === g.id ? null : g.id)}
            >
              <GroupGlyph group={g.id} gi={gi} n={dex.filter((d) => d.group === g.id).length} />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-col gap-1">
        <NavLink to="/agents" aria-label={t('nav.agents')} title={t('nav.agents')} className={({ isActive }) => clsx(railItem, isActive && 'text-primary')}>
          <span aria-hidden>◈</span>
        </NavLink>
        <NavLink to="/watchlist" aria-label={t('nav.watchlist')} title={t('nav.watchlist')} className={({ isActive }) => clsx(railItem, isActive && 'text-primary')}>
          <span aria-hidden>☆</span>
        </NavLink>
        <NavLink to="/settings" aria-label={t('nav.settings')} title={t('nav.settings')} className={({ isActive }) => clsx(railItem, isActive && 'text-primary')}>
          <span aria-hidden>⚙</span>
        </NavLink>
      </div>
      {group && (
        <div id="rail-panel" role="region" aria-label={group.name[locale]} className="pane absolute left-[76px] top-3 w-[300px] p-3" onMouseEnter={keep} onMouseLeave={later}>
          <p className="font-display text-sm">{group.name[locale]}</p>
          <p className="mb-2 text-xs text-ink-muted">{group.description[locale]}</p>
          <ul className="space-y-1">
            {items.map((d) => (
              <li key={d.id}>
                <Link to={d.id === 'finandex-ai' ? '/ai' : `/dex/${d.id}`} onClick={() => setOpen(null)} className="flex min-h-11 items-center gap-3 rounded-xl px-2 hover:bg-pane-2">
                  <img src={`/icons/${d.icon}.svg`} alt="" width={28} height={28} className="rounded-xl" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{d.name}</span>
                    <span className="block text-xs text-ink-muted">
                      {t('dex.asOf')} {fmt(m.data?.dex[d.id]?.as_of ?? d.asOf)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
