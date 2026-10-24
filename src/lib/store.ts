// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// UI state (zustand) persisted on the device only (§13.2): theme, locale, colour-blind mode, watchlist,
// consent (with policy version), client id. Chat history lives in IndexedDB (lib/history.ts).
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Locale } from '../config/brand';

export const POLICY_VERSION = '2026-10-23';

export type WatchItem = { dexId: string; entity: string; label: string };

type State = {
  theme: 'dark' | 'light' | 'system';
  locale: Locale;
  colorblind: boolean;
  hideNc: boolean;
  watchlist: WatchItem[];
  consentVersion: string | null;
  clientId: string;
  /** Accessibility & comfort (§10.3, §10.8, §10.9). */
  reduceMotion: boolean;
  highContrast: boolean;
  reduceHaptics: boolean;
  /** "Pasang Finandex" ribbon dismissed until (ISO date), remembered 30 days (§10.2.2a). */
  installRibbonUntil: string | null;
  /** Dex whose first-visit coach marks were seen (§9 Panduan Fitur). */
  coachSeen: string[];
  /** Compare tray (§10.9, max 5). */
  tray: { dexId: string; entity: string; label: string }[];
  setTheme: (t: State['theme']) => void;
  setLocale: (l: Locale) => void;
  setColorblind: (v: boolean) => void;
  setHideNc: (v: boolean) => void;
  toggleWatch: (w: WatchItem) => void;
  acceptConsent: () => void;
  resetAll: () => void;
  setReduceMotion: (v: boolean) => void;
  setHighContrast: (v: boolean) => void;
  setReduceHaptics: (v: boolean) => void;
  dismissInstallRibbon: (now?: Date) => void;
  markCoach: (dexId: string) => void;
  addToTray: (w: { dexId: string; entity: string; label: string }) => boolean;
  removeFromTray: (entity: string) => void;
  clearTray: () => void;
};

export const TRAY_MAX = 5;

const deviceLocale = (): Locale => (typeof navigator !== 'undefined' && /^en/i.test(navigator.language) ? 'en' : 'id');
const uuid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : '00000000-0000-4000-8000-000000000000');

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      theme: 'system',
      locale: deviceLocale(),
      colorblind: false,
      hideNc: false,
      watchlist: [],
      consentVersion: null,
      clientId: uuid(),
      reduceMotion: false,
      highContrast: false,
      reduceHaptics: false,
      installRibbonUntil: null,
      coachSeen: [],
      tray: [],
      setTheme: (theme) => set({ theme }),
      setLocale: (locale) => set({ locale }),
      setColorblind: (colorblind) => set({ colorblind }),
      setHideNc: (hideNc) => set({ hideNc }),
      toggleWatch: (w) => {
        const has = get().watchlist.some((x) => x.dexId === w.dexId && x.entity === w.entity);
        set({ watchlist: has ? get().watchlist.filter((x) => !(x.dexId === w.dexId && x.entity === w.entity)) : [...get().watchlist, w] });
      },
      acceptConsent: () => set({ consentVersion: POLICY_VERSION }),
      resetAll: () => set({ watchlist: [], consentVersion: null, clientId: uuid(), coachSeen: [], tray: [], installRibbonUntil: null }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setHighContrast: (highContrast) => set({ highContrast }),
      setReduceHaptics: (reduceHaptics) => set({ reduceHaptics }),
      dismissInstallRibbon: (now = new Date()) => set({ installRibbonUntil: new Date(now.getTime() + 30 * 86_400_000).toISOString().slice(0, 10) }),
      markCoach: (dexId) => set({ coachSeen: [...new Set([...get().coachSeen, dexId])] }),
      addToTray: (w) => {
        const tray = get().tray;
        if (tray.some((x) => x.dexId === w.dexId && x.entity === w.entity)) return true;
        if (tray.length >= TRAY_MAX || (tray.length && tray[0]!.dexId !== w.dexId)) return false;
        set({ tray: [...tray, w] });
        return true;
      },
      removeFromTray: (entity) => set({ tray: get().tray.filter((x) => x.entity !== entity) }),
      clearTray: () => set({ tray: [] }),
    }),
    { name: 'finandex-ui', version: 2, migrate: (s) => ({ reduceMotion: false, highContrast: false, reduceHaptics: false, installRibbonUntil: null, coachSeen: [], tray: [], ...(s as object) }) as unknown as State },
  ),
);
