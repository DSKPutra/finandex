// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Accessibility (§10.8): axe WCAG 2.2 AA — no serious/critical violations on the main screens, both themes.
import AxeBuilder from '@axe-core/playwright';
import { expect, prime, test } from '../e2e/fixtures.ts';

for (const theme of ['dark', 'light'] as const)
  for (const path of [
    '/',
    '/dex',
    '/dex/rupiahdex/rate',
    '/dex/rupiahdex/chat',
    '/dex/mylaiwyer/browse',
    '/about',
    '/whitepaper/cara-kerja',
    '/settings',
    '/legal/data-sources',
  ]) {
    test(`axe ${theme} ${path}`, async ({ page }) => {
      await prime(page, { theme });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
      expect(
        bad.map(
          (v) =>
            `${v.id}: ${v.nodes
              .slice(0, 3)
              .map((n) => n.target.join(' '))
              .join(' | ')}`,
        ),
      ).toEqual([]);
    });
  }
