// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Whitepaper: home card (PDF download is the first action), GitBook-style reader navigation, PDF files served.
import { whitepaper } from '../../src/content/whitepaper.ts';
import { expect, test } from './fixtures.ts';

const ID = whitepaper('id');

test('home whitepaper card: PDF download first, then read link', async ({ primed: page }) => {
  await page.goto('/');
  const card = page.locator('section[aria-labelledby="wp"]');
  await expect(card.getByRole('heading', { name: 'Whitepaper' })).toBeVisible();
  const actions = card.locator('.btn');
  await expect(actions.first()).toHaveText(/Unduh PDF/);
  await expect(actions.first()).toHaveAttribute('href', '/whitepaper/finandex-whitepaper-id.pdf');
  const [download] = await Promise.all([page.waitForEvent('download'), actions.first().click()]);
  expect(download.suggestedFilename()).toBe('finandex-whitepaper-id.pdf');
  await card.getByRole('link', { name: 'Baca whitepaper' }).click();
  await expect(page).toHaveURL(/\/whitepaper$/);
  await expect(page.getByRole('heading', { level: 1, name: ID[0]!.title })).toBeVisible();
});

test('reader: chapter list, on-this-page anchors, previous/next', async ({ primed: page }) => {
  await page.goto('/whitepaper/cara-kerja');
  await expect(page.getByRole('heading', { level: 1, name: 'Cara Kerja' })).toBeVisible();
  const header = page.locator('.wp header, header.card').first();
  await expect(header.locator('.btn').first()).toHaveText(/Unduh PDF/);
  if ((page.viewportSize()?.width ?? 0) >= 1280) {
    await expect(page.locator('.wp-left [aria-current="page"]')).toHaveText(/Cara Kerja/);
    await page.locator('.wp-right a', { hasText: 'Batasan yang disengaja' }).click();
    await expect(page).toHaveURL(/#batasan-yang-disengaja$/);
  } else {
    // phones: chapter list collapses into a dropdown; the "on this page" column is hidden
    await page.locator('.wp-mobile-nav summary').click();
    await expect(page.locator('.wp-mobile-nav [aria-current="page"]')).toHaveText(/Cara Kerja/);
  }
  await page.getByRole('link', { name: /Berikutnya/ }).click();
  await expect(page).toHaveURL(/\/whitepaper\/dex$/);
  await expect(page.locator('.wp-table tbody tr')).toHaveCount(27);
  await page.getByRole('link', { name: /Sebelumnya/ }).click();
  await expect(page).toHaveURL(/\/whitepaper\/cara-kerja$/);
});

test('PDF files are served', async ({ request }) => {
  for (const l of ['id', 'en']) {
    const r = await request.get(`/whitepaper/finandex-whitepaper-${l}.pdf`);
    expect(r.status()).toBe(200);
    expect((await r.body()).subarray(0, 5).toString()).toBe('%PDF-');
  }
});
