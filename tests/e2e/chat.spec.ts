// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Chat (mock LLM): consent, streamed answer card with chart + "why" panel, stop/abort, sensitive guard, offline.
import { expect, test } from '@playwright/test';
import { prime } from './helpers';

test('consent is required on first use, then the answer card renders', async ({ page }) => {
  await prime(page, { consent: false });
  await page.goto('/dex/finandex-ai/chat');
  await page.getByLabel('Tulis pertanyaan…').fill('Bandingkan return 5 tahun Emas dan Bitcoin.');
  await page.getByRole('button', { name: 'Kirim' }).click();
  await expect(page.getByRole('dialog', { name: 'Sebelum memakai chat' })).toBeVisible();
  await page.getByRole('button', { name: 'Saya mengerti' }).click();
  await expect(page.getByText(/Emas \(GC=F\) memberi return/)).toBeVisible();
  // Below 1024 px the evidence opens as a bottom sheet only when the reader taps "Bukti" (it never covers the answer).
  const narrow = (page.viewportSize()?.width ?? 1280) < 1024;
  if (narrow) await page.getByRole('button', { name: /^Bukti:/ }).first().click();
  const evidence = narrow ? page.getByRole('dialog', { name: 'Bukti' }) : page;
  await expect(evidence.getByRole('img', { name: /Perbandingan/ })).toBeVisible();
  // The method panel opens by default in the Evidence Pane (§10.0.2); open it only if it is collapsed.
  const why = evidence.getByRole('button', { name: 'Kenapa jawabannya begini?' }).first();
  if ((await why.getAttribute('aria-expanded')) !== 'true') await why.click();
  await expect(evidence.getByText(/baris dipakai/).first()).toBeVisible();
  await expect(evidence.getByText(/Sumber: Global_Financial_Markets_Dataset_2000-Present\.zip/).first()).toBeVisible();
});

test('stop aborts a pending answer', async ({ page }) => {
  await prime(page);
  await page.route('**/api/chat', () => new Promise(() => undefined)); // never responds
  await page.goto('/dex/rupiahdex/chat');
  await page.getByLabel('Tulis pertanyaan…').fill('Kurs tertinggi?');
  await page.getByRole('button', { name: 'Kirim' }).click();
  await page.getByRole('button', { name: 'Berhenti' }).click();
  await expect(page.getByRole('button', { name: 'Kirim' })).toBeVisible();
});

test('sensitive data is blocked before sending', async ({ page }) => {
  await prime(page);
  let sent = false;
  await page.route('**/api/chat', (r) => {
    sent = true;
    return r.abort();
  });
  await page.goto('/dex/cryptdex/chat');
  await page.getByLabel('Tulis pertanyaan…').fill('abandon ability able about above absent absorb abstract absurd abuse access accident');
  await page.getByRole('button', { name: 'Kirim' }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'seed phrase' })).toBeVisible();
  expect(sent).toBe(false);
});

test.describe('offline', () => {
  test.use({ serviceWorkers: 'allow' });
  test('offline: banner shown, cached core data still renders, chat send disabled', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'service-worker offline replay is verified on Chromium');
    await prime(page);
    await page.goto('/');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await expect(page.getByText('Ringkasan pasar')).toBeVisible();
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText(/Anda sedang offline/)).toBeVisible();
    await expect(page.locator('section[aria-labelledby="mkt-summary"]').getByText('S&P 500')).toBeVisible();
    await page.goto('/dex/finandex-ai/chat').catch(() => undefined);
    await expect(page.getByRole('button', { name: 'Kirim' })).toBeDisabled();
    await context.setOffline(false);
  });
});
