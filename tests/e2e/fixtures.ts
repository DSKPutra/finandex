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

export const test = base.extend<{ primed: Page; diagnostics: undefined }>({
  primed: async ({ page }, use) => {
    await prime(page);
    await use(page);
  },
  // On CI, a failing test prints console errors, failed/4xx-5xx requests and the visible page text as a GitHub
  // workflow annotation, so failures can be diagnosed without downloading the trace.
  diagnostics: [
    async ({ page }, use, info) => {
      const log: string[] = [];
      page.on('console', (m) => m.type() === 'error' && log.push(`console: ${m.text()}`));
      page.on('pageerror', (e) => log.push(`pageerror: ${e.message}`));
      page.on('requestfailed', (r) =>
        log.push(`requestfailed: ${r.method()} ${r.url()} ${r.failure()?.errorText ?? ''}`),
      );
      page.on(
        'response',
        (r) => r.status() >= 400 && log.push(`http ${r.status()}: ${r.request().method()} ${r.url()}`),
      );
      await use(undefined);
      if (!process.env.CI || info.status === info.expectedStatus) return;
      const text = await page
        .locator('main')
        .innerText({ timeout: 2000 })
        .catch(() => '(no main)');
      const body = [...log.slice(-30), `main: ${text.slice(0, 1500)}`]
        .join('\n')
        .replace(/%/g, '%25')
        .replace(/\r?\n/g, '%0A');
      console.log(`::error title=e2e diagnostics ${info.project.name} ${info.title}::${body}`);
    },
    { auto: true },
  ],
});
export { expect } from '@playwright/test';
