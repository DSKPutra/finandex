// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Accessibility (§18.8): no serious/critical axe violations on key pages in both themes.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { prime } from '../e2e/helpers';

const PAGES = ['/', '/dex', '/dex/finandex-ai/markets', '/dex/nasdaqdex/chat', '/dex/mylaiwyer/data', '/about', '/legal/privacy', '/settings', '/whitepaper'];
for (const theme of ['dark', 'light'] as const) {
  for (const path of PAGES) {
    test(`axe ${theme} ${path}`, async ({ page }) => {
      await prime(page, { theme });
      await page.goto(path);
      // Wait for the app (it boots after the first paint) and for theme transitions to settle before measuring contrast.
      await page.locator('main#main').waitFor();
      await page.waitForTimeout(300);
      await expect(page.locator('main [role="status"][aria-label]')).toHaveCount(0, { timeout: 30_000 });
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).exclude('canvas').analyze();
      const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(bad.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
    });
  }
}
