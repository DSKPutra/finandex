// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Local preferences (§13.2: device only): locale, theme, colour-blind mode, chat consent, watchlist.
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { deviceLocale, i18n, type Locale } from '../i18n/index.ts';

export const CONSENT_VERSION = 1;
export interface WatchItem {
  dex: string;
  entity: string;
  name: string;
}

interface Settings {
  locale: Locale;
  theme: 'dark' | 'light' | 'system';
  colorblind: boolean;
  consentVersion: number;
  sidebarCollapsed: boolean;
  watchlist: WatchItem[];
  set: (p: Partial<Omit<Settings, 'set' | 'toggleWatch'>>) => void;
  toggleWatch: (w: WatchItem) => void;
}

export const useSettings = create<Settings>()(
  persist(
    (set, get) => ({
      locale: deviceLocale(),
      theme: 'dark',
      colorblind: false,
      consentVersion: 0,
      sidebarCollapsed: false,
      watchlist: [],
      set: (p) => set(p),
      toggleWatch: (w) => {
        const has = get().watchlist.some((x) => x.dex === w.dex && x.entity === w.entity);
        set({
          watchlist: has
            ? get().watchlist.filter((x) => !(x.dex === w.dex && x.entity === w.entity))
            : [...get().watchlist, w].slice(-200),
        });
      },
    }),
    { name: 'finandex-settings', partialize: ({ set: _s, toggleWatch: _t, ...rest }) => rest },
  ),
);

/** Apply theme / locale / colour-blind attributes to <html>. */
export function applySettings(s: Pick<Settings, 'locale' | 'theme' | 'colorblind'>): void {
  const root = document.documentElement;
  const dark =
    s.theme === 'system' ? !window.matchMedia?.('(prefers-color-scheme: light)').matches : s.theme === 'dark';
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.colorblind = String(s.colorblind);
  root.lang = s.locale;
  if (i18n.language !== s.locale) void i18n.changeLanguage(s.locale);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0A0F0C' : '#F6F8F7');
}

export const isDarkTheme = () => document.documentElement.dataset.theme !== 'light';
