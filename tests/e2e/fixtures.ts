// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Shared E2E setup: skip the splash, accept chat consent, choose locale/theme.
import { test as base, type Page } from '@playwright/test';

export async function prime(
  page: Page,
  opts: { locale?: 'id' | 'en'; theme?: 'dark' | 'light'; consent?: boolean; splash?: boolean } = {},
) {
  await page.addInitScript((o) => {
    if (!o.splash) sessionStorage.setItem('finandex-splash', '1');
    localStorage.setItem(
      'finandex-settings',
      JSON.stringify({
        state: {
          locale: o.locale ?? 'id',
          theme: o.theme ?? 'dark',
          colorblind: false,
          consentVersion: o.consent === false ? 0 : 1,
          sidebarCollapsed: false,
          watchlist: [],
        },
        version: 0,
      }),
    );
  }, opts);
}

export const test = base.extend<{ primed: Page }>({
  primed: async ({ page }, use) => {
    await prime(page);
    await use(page);
  },
});
export { expect } from '@playwright/test';
