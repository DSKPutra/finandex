// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Routes, deep links + refresh, home feature map, branding, i18n, theme, number formats.
import { DEX_GROUPS } from '../../src/config/dex-groups.ts';
import { DEX_REGISTRY } from '../../src/config/dex-registry.ts';
import { expect, prime, test } from './fixtures.ts';

test('home shows 27 Dex cards in 8 categories, in order', async ({ primed: page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Peta Fitur' })).toBeVisible();
  for (const g of DEX_GROUPS)
    await expect(page.getByRole('heading', { name: `${g.order}. ${g.name.id}` })).toBeVisible();
  await expect(page.locator('#feature-map ~ section article')).toHaveCount(27);
  const headings = await page.locator('section[aria-labelledby^="g-"] h3').allTextContents();
  expect(headings.filter((h) => /^\d\./.test(h))).toEqual(DEX_GROUPS.map((g) => `${g.order}. ${g.name.id}`));
});

test('feature map filters by text, category and Indonesia', async ({ primed: page }) => {
  await page.goto('/');
  await page.getByRole('searchbox', { name: /Cari Dex/ }).fill('rupiah');
  await expect(page.locator('#feature-map ~ section article')).toHaveCount(1);
  await page.getByRole('searchbox', { name: /Cari Dex/ }).fill('');
  await page.getByRole('button', { name: '🇮🇩 Indonesia', exact: true }).click();
  await expect(page.locator('#feature-map ~ section article')).toHaveCount(
    DEX_REGISTRY.filter((d) => d.indonesia).length,
  );
});

test('market summary uses id-ID number format and as-of dates', async ({ primed: page }) => {
  await page.goto('/');
  const tile = page.getByRole('link', { name: /S&P 500/ }).first();
  await expect(tile).toContainText(/\d{1,3}(\.\d{3})*,\d{2}/);
  await expect(tile).toContainText(/Data per \d{1,2} \w+ 20\d\d/);
});

for (const path of [
  '/',
  '/ai',
  '/dex',
  '/dex/rupiahdex/rate',
  '/dex/mylaiwyer/sources',
  '/markets/%5EGSPC',
  '/watchlist',
  '/settings',
  '/about',
  '/legal/privacy',
  '/legal/data-sources',
]) {
  test(`deep link + refresh ${path}`, async ({ primed: page }) => {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    await page.reload();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByText(/© 2026(–\d{4})? Dea Saka Kurnia Putra/).first()).toBeVisible();
  });
}

test('unknown route shows not-found', async ({ primed: page }) => {
  await page.goto('/nope/nothing');
  await expect(page.getByText('Halaman tidak ditemukan.')).toBeVisible();
});

test('splash shows the creator mark', async ({ page, request }) => {
  // web: static splash in index.html until the app mounts
  const html = await (await request.get('/')).text();
  expect(html).toContain('by Dea Saka Kurnia Putra');
  expect(html).toContain('dskp-mark-on-dark-64.png');
  // timed in-app splash (native and when requested)
  await page.addInitScript(() => sessionStorage.setItem('finandex-splash', 'show'));
  await page.goto('/');
  await expect(page.getByRole('status', { name: 'Finandex' })).toContainText('by Dea Saka Kurnia Putra');
});

test('about page: wordmark, credit, tagline', async ({ primed: page }) => {
  await page.goto('/about');
  await expect(page.getByAltText('Dea Saka Kurnia Putra')).toBeVisible();
  await expect(page.getByText('Finandex dirancang dan dikembangkan oleh Dea Saka Kurnia Putra.')).toBeVisible();
  await expect(page.getByText('A BRIGHTER TOMORROW THROUGH MEANINGFUL WORK')).toBeVisible();
});

test('English locale and light theme', async ({ page }) => {
  await prime(page, { locale: 'en', theme: 'light' });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Feature Map' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByText('© 2026 Dea Saka Kurnia Putra. All rights reserved.').first()).toBeVisible();
});

test('settings switch language and theme', async ({ primed: page }) => {
  await page.goto('/settings');
  await page.getByLabel('Bahasa').selectOption('en');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await page.getByLabel('Theme').selectOption('light');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});
