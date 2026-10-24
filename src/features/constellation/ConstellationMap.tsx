// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// ConstellationMap (§10.0.1, §10.9): the signature element of Finandex. Lines and ink dots are drawn by a Web Worker on an
// OffscreenCanvas (static SVG fallback); nodes are real buttons above it — Tab enters, arrow keys move between nodes,
// Enter opens the Dex, Esc leaves; hover/focus shows a summary card (icon, name, tagline, as-of, 2 suggestions); a long
// press on touch shows the preview instead of navigating. Filters dim non-matching nodes. The accessible equivalent is
// the Feature Map grid below it (same order).
import { clsx } from 'clsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { useAsOfLabel } from '../../components/badges';
import { GROUP_HUES } from '../../config/brand';
import { DEX_GROUP_IDS, DEX_GROUPS } from '../../config/dex-groups';
import { visibleDex } from '../../config/dex-registry';
import { DISTRIBUTION } from '../../config/runtime';
import { useManifest } from '../../lib/data';
import { useLocale } from '../../lib/locale';
import { useApp } from '../../lib/store';
import type { CNode } from './layout';
import { layout, neighbour, VIEW } from './layout';

function cssColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string) => cs.getPropertyValue(n).trim();
  return { data: v('--data'), primary: v('--primary'), edge: v('--edge'), muted: v('--ink-muted'), hues: GROUP_HUES.map((_, i) => v(`--group-${i + 1}`)), bg: v('--field-1') };
}

export function useReducedMotion(): boolean {
  const pref = useApp((s) => s.reduceMotion);
  const [sys, setSys] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const fn = () => setSys(mq.matches);
    mq?.addEventListener('change', fn);
    return () => mq?.removeEventListener('change', fn);
  }, []);
  return pref || sys;
}

export function ConstellationMap({ match, compact = false }: { match?: Set<string> | null; compact?: boolean }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const nav = useNavigate();
  const m = useManifest();
  const fmt = useAsOfLabel();
  const reduced = useReducedMotion();
  const themeKey = useApp((s) => `${s.theme}-${s.colorblind}`);
  const dex = useMemo(() => visibleDex(DISTRIBUTION), []);
  const asOf = useMemo(() => Object.fromEntries(dex.map((d) => [d.id, m.data?.dex[d.id]?.as_of ?? d.asOf])), [dex, m.data]);
  const { nodes, edges } = useMemo(() => layout(dex, DEX_GROUP_IDS, asOf), [dex, asOf]);
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const worker = useRef<Worker | null>(null);
  // Feature support is known up front; a failed worker start (rare) flips this from the catch handler below.
  const [offscreen, setOffscreen] = useState(() => typeof Worker !== 'undefined' && typeof HTMLCanvasElement !== 'undefined' && 'transferControlToOffscreen' in HTMLCanvasElement.prototype);
  const [active, setActive] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const press = useRef<{ id: string; at: number; timer: ReturnType<typeof setTimeout> | null } | null>(null);

  // Start the worker once per layout; transfer the canvas.
  useEffect(() => {
    const box = wrap.current;
    if (!box) return;
    // A fresh canvas per initialisation: transferControlToOffscreen() can be called only once per element
    // (React StrictMode runs effects twice in development).
    const el = document.createElement('canvas');
    el.setAttribute('aria-hidden', 'true');
    el.className = 'pointer-events-none absolute inset-0 h-full w-full';
    if (!offscreen) return;
    box.prepend(el);
    canvas.current = el;
    let w: Worker;
    try {
      w = new Worker(new URL('./constellation.worker.ts', import.meta.url), { type: 'module' });
      const off = el.transferControlToOffscreen();
      const r = box.getBoundingClientRect();
      w.postMessage({ type: 'init', canvas: off, nodes, edges, w: r.width, h: r.height, dpr: Math.min(2, window.devicePixelRatio || 1), reduced, colors: cssColors() }, [off]);
    } catch {
      el.remove();
      queueMicrotask(() => setOffscreen(false));
      return;
    }
    worker.current = w;
    const ro = new ResizeObserver(() => {
      const r = box.getBoundingClientRect();
      w.postMessage({ type: 'resize', w: r.width, h: r.height, dpr: Math.min(2, window.devicePixelRatio || 1) });
    });
    ro.observe(box);
    // Pause when hidden or off-screen (§10.0.1, §18 bug list: no animation in hidden tabs).
    let visible = true;
    let onScreen = true;
    const update = () => w.postMessage({ type: 'run', running: visible && onScreen });
    const io = new IntersectionObserver((es) => {
      onScreen = es.some((e) => e.isIntersecting);
      update();
    });
    io.observe(box);
    const vis = () => {
      visible = document.visibilityState === 'visible';
      update();
    };
    document.addEventListener('visibilitychange', vis);
    update();
    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', vis);
      w.terminate();
      worker.current = null;
      el.remove();
    };
  }, [nodes, edges, reduced, offscreen]);

  useEffect(() => worker.current?.postMessage({ type: 'colors', colors: cssColors() }), [themeKey]);
  const dimmed = useMemo(() => (match ? nodes.filter((n) => !match.has(n.id)).map((n) => n.id) : null), [match, nodes]);
  useEffect(() => worker.current?.postMessage({ type: 'dim', ids: dimmed }), [dimmed]);
  useEffect(() => worker.current?.postMessage({ type: 'focus', id: active ?? hover }), [active, hover]);

  const focusNode = (id: string) => {
    setActive(id);
    buttons.current.get(id)?.focus();
  };
  const onKey = (e: React.KeyboardEvent, n: CNode) => {
    const dir = ({ ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' } as const)[e.key as 'ArrowLeft'];
    if (dir) {
      e.preventDefault();
      focusNode(neighbour(nodes, n.id, dir));
    } else if (e.key === 'Escape') {
      setActive(null);
      (e.currentTarget as HTMLElement).blur();
      document.getElementById('feature-map')?.focus();
    }
  };
  const shown = hover ?? active;
  const card = shown ? nodes.find((n) => n.id === shown) : null;
  const entry = card ? dex.find((d) => d.id === card.id) : null;
  const chips = entry ? (t(`chips.${entry.id}`, { returnObjects: true }) as string[]).slice(0, 2) : [];
  const tabIndexFor = (id: string) => ((active ?? 'finandex-ai') === id ? 0 : -1);

  return (
    <div className="relative">
      <div ref={wrap} role="group" aria-label={t('home.constellation')} aria-describedby="constellation-help" className={clsx('relative w-full select-none', compact ? 'aspect-[1000/520]' : 'aspect-[1000/600]', 'min-h-[300px]')}>
        {!offscreen && (
          <svg aria-hidden data-fallback="static" viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
            {nodes.map((n) => (
              <g key={n.id} opacity={dimmed?.includes(n.id) ? 0.15 : 0.35 + n.brightness * 0.65}>
                <circle cx={n.x} cy={n.y} r={n.core ? 9 : 6} fill={n.id === (active ?? hover) || n.core ? 'var(--primary)' : GROUP_HUES[n.gi]} />
                {n.status !== 'pending-data' && <circle cx={n.x} cy={n.y} r={n.core ? 14 : 11} fill="none" stroke="var(--ink-muted)" strokeWidth={1.2} strokeDasharray={n.status === 'partial' ? '3 3' : undefined} />}
              </g>
            ))}
            {edges.map((e, i) => {
              const a = nodes.find((n) => n.id === e.a)!;
              const b = nodes.find((n) => n.id === e.b)!;
              return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={e.kind === 'group' && e.gi >= 0 ? GROUP_HUES[e.gi] : 'var(--edge)'} strokeWidth={1.5} strokeOpacity={dimmed && (dimmed.includes(a.id) || dimmed.includes(b.id)) ? 0.12 : 0.8} strokeDasharray={e.kind === 'relation' ? '3 4' : undefined} />;
            })}
          </svg>
        )}
        {nodes.map((n) => {
          const d = dex.find((x) => x.id === n.id)!;
          const off = dimmed?.includes(n.id);
          const size = n.core ? 44 : 32;
          return (
            <button
              key={n.id}
              ref={(el) => {
                if (el) buttons.current.set(n.id, el);
              }}
              type="button"
              tabIndex={tabIndexFor(n.id)}
              aria-label={`${d.name} — ${d.tagline[locale]} — ${t('dex.asOf')} ${fmt(asOf[n.id] ?? d.asOf)} — ${t(`status.${n.status}`)}`}
              onFocus={() => setActive(n.id)}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              onKeyDown={(e) => onKey(e, n)}
              onPointerDown={(e) => {
                if (e.pointerType !== 'touch') return;
                press.current = { id: n.id, at: Date.now(), timer: setTimeout(() => setHover(n.id), 500) };
              }}
              onPointerUp={() => {
                if (press.current?.timer) clearTimeout(press.current.timer);
              }}
              onClick={(e) => {
                const p = press.current;
                press.current = null;
                if (p && p.id === n.id && Date.now() - p.at >= 500) {
                  e.preventDefault();
                  return;
                }
                void nav(n.core ? '/ai' : `/dex/${n.id}`);
              }}
              className={clsx('group absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-opacity duration-200', off ? 'opacity-25' : 'opacity-100')}
              style={{ left: `${(n.x / VIEW.w) * 100}%`, top: `${(n.y / VIEW.h) * 100}%` }}
            >
              <span aria-hidden className="block rounded-full" style={{ width: size, height: size }} />
              <span className={clsx('pointer-events-none absolute left-1/2 top-[72%] mt-1 -translate-x-1/2 whitespace-nowrap leading-tight', n.core ? 'font-display text-sm text-ink' : 'text-xs text-ink-muted', !n.core && 'hidden sm:block', (active === n.id || hover === n.id) && 'text-primary')}>{d.name}</span>
            </button>
          );
        })}
      </div>
      <p id="constellation-help" className="sr-only">
        {t('home.constellationHelp')}
      </p>
      {card && entry && (
        <div role="status" aria-live="polite" className="pane pointer-events-auto absolute bottom-2 left-2 right-2 z-10 p-4 sm:left-auto sm:right-4 sm:w-80">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-pane-2 p-1">
              <img src={`/icons/${entry.icon}.svg`} alt="" width={32} height={32} className="rounded-xl" />
            </span>
            <div className="min-w-0">
              <p className="font-display text-base">{entry.name}</p>
              <p className="text-xs text-ink-muted">
                {t('dex.asOf')} {fmt(asOf[entry.id] ?? entry.asOf)} · {DEX_GROUPS.find((g) => g.id === entry.group)?.name[locale]}
              </p>
            </div>
          </div>
          <p className="mt-2 text-sm">{entry.tagline[locale]}</p>
          <ul className="mt-2 space-y-1">
            {chips.map((c) => (
              <li key={c}>
                <button type="button" className="min-h-11 w-full rounded-xl border border-edge px-3 text-left text-xs hover:bg-pane-2" onClick={() => void nav(`/dex/${entry.id}/chat?q=${encodeURIComponent(c)}`)}>
                  {c}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
