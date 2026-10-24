// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Routes (incl. /install, /agents, /legal/sbom — REQ-app-007), deep links + refresh, home feature map (every Dex / 8 categories), copyright placement, i18n, theme.
import { expect, test } from '@playwright/test';
import { COPYRIGHT_ID, CREDIT_EN, CREDIT_ID, PERSONAL_TAGLINE } from '../../src/config/brand';
import { DEX_GROUPS } from '../../src/config/dex-groups';
import { DEX_REGISTRY } from '../../src/config/dex-registry';
import { isMobile, prime } from './helpers';

test.beforeEach(async ({ page }) => prime(page));

test('home shows every Dex in 8 categories with copyright', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Peta Fitur' })).toBeVisible();
  await expect(page.locator('#feature-map ~ * article, section[aria-labelledby="feature-map"] article')).toHaveCount(DEX_REGISTRY.length);
  for (const g of DEX_GROUPS) await expect(page.getByRole('heading', { level: 3, name: g.name.id, exact: true })).toBeVisible();
  await expect(page.getByText(COPYRIGHT_ID).first()).toBeAttached();
  await expect(page.getByText(/\d+,\d{2}%/).first()).toBeVisible(); // id-ID percent format
});

test('splash in index.html carries the byline', async ({ request }) => {
  const html = await (await request.get('/')).text();
  expect(html).toContain('by Dea Saka Kurnia Putra');
  expect(html).toContain('<meta name="author" content="Dea Saka Kurnia Putra"');
});

const DEEP = ['/', '/ai', '/dex', '/dex/nasdaqdex/screener', '/dex/rupiahdex/converter', '/dex/mylaiwyer/sources', '/markets/GSPC', '/dex/idxdex/stocks/BBCA', '/watchlist', '/settings', '/about', '/legal/privacy', '/legal/data-sources', '/legal/licenses', '/legal/sbom', '/legal/security', '/install', '/agents', '/more'];
for (const path of DEEP) {
  test(`deep link survives refresh: ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.reload();
    await expect(page.locator('main#main')).toBeVisible();
    await expect(page.getByText('404')).toHaveCount(0);
  });
}

test('about shows credit and personal tagline; English locale switches copy', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByText(CREDIT_ID)).toBeVisible();
  await expect(page.getByText(PERSONAL_TAGLINE)).toBeVisible();
  await page.goto('/settings');
  await page.getByLabel('English').check();
  await page.goto('/about');
  await expect(page.getByText(CREDIT_EN)).toBeVisible();
});

test('light theme applies tokens', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('radio', { name: 'Terang', exact: true }).check();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe('rgb(247, 247, 250)'); // Spektrum --field-1 #F7F7FA
});

test('navigation: sidebar on desktop, bottom tabs on mobile', async ({ page }) => {
  await page.goto('/');
  if (isMobile(page)) {
    await page.getByRole('link', { name: 'Dex', exact: true }).click();
    await expect(page).toHaveURL(/\/dex$/);
    await page.getByRole('link', { name: 'Lainnya' }).click();
    await expect(page.getByRole('heading', { name: 'Lainnya' })).toBeVisible();
  } else {
    await page.getByRole('link', { name: 'RupiahDex' }).first().click();
    await expect(page.getByRole('heading', { level: 1, name: 'RupiahDex' })).toBeVisible();
  }
});

test('global search opens a stock detail', async ({ page }) => {
  test.skip(isMobile(page), 'keyboard shortcut is desktop-only');
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await page.getByRole('combobox').fill('BBCA');
  await page.getByRole('option').filter({ hasText: '· BBCA' }).first().click();
  await expect(page).toHaveURL(/\/dex\/idxdex\/.+\/BBCA/);
});

for (const [id, name] of [
  ['mylaiwyer', 'My LAIwyer'],
  ['finlaiwyer', 'FinLAIwyer'],
] as const) {
  test(`stand-alone law app /apps/${id}/ has its own manifest and only its Dex`, async ({ page, request }) => {
    const html = await (await request.get(`/apps/${id}/`)).text();
    expect(html).toContain(`<link rel="manifest" href="/apps/${id}/manifest.webmanifest"`);
    expect(html).toContain(`<title>${name}</title>`);
    const manifest = (await (await request.get(`/apps/${id}/manifest.webmanifest`)).json()) as { name: string; scope: string; start_url: string };
    expect(manifest).toMatchObject({ name, scope: `/apps/${id}/`, start_url: `/apps/${id}/` });
    await page.goto(`/apps/${id}/`);
    await expect(page).toHaveURL(new RegExp(`/apps/${id}/dex/${id}`));
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await page.goto(`/apps/${id}/dex/rupiahdex`);
    await expect(page.getByRole('link', { name: /RupiahDex/ })).toHaveAttribute('href', '/dex/rupiahdex');
  });
}
