// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Chat with the scripted mock model: streaming answer card (§8.8), method panel, stop, consent, sensitive data, offline.
import { expect, prime, test } from './fixtures.ts';

test('streams an answer with chart, justification and citation', async ({ primed: page }) => {
  await page.goto('/dex/rupiahdex/chat');
  await page.getByLabel('Tulis pertanyaan…').fill('[rupiahdex-04] Berapa kurs pada 23 Maret 2020?');
  await page.getByRole('button', { name: 'Kirim' }).click();
  await expect(page.getByText(/15\.766,2/).first()).toBeVisible();
  await expect(page.locator('section.card canvas').first()).toBeVisible();
  await page.getByText('Kenapa jawabannya begini?').click();
  await expect(page.getByText(/Baris dipakai/).first()).toBeVisible();
  await expect(page.getByText(/^Sumber:/).last()).toBeVisible();
});

test('home ask box opens Finandex AI with the question', async ({ primed: page }) => {
  await page.goto('/');
  await page.getByLabel('Tanya Finandex AI…').fill('[finandex-ai-12] Siapa pembuat aplikasi ini?');
  await page.getByRole('button', { name: 'Tanya' }).click();
  await expect(page).toHaveURL(/\/ai\?q=/);
  await expect(page.getByText('Dea Saka Kurnia Putra').first()).toBeVisible();
});

test('first use asks for consent', async ({ page }) => {
  await prime(page, { consent: false });
  await page.goto('/dex/rupiahdex/chat');
  await expect(page.getByRole('dialog', { name: 'Sebelum mulai' })).toBeVisible();
  await page.getByRole('button', { name: 'Saya mengerti' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('blocks seed phrases before sending', async ({ primed: page }) => {
  await page.goto('/dex/cryptdex/chat');
  await page
    .getByLabel('Tulis pertanyaan…')
    .fill('abandon ability able about above absent absorb abstract absurd abuse access accident');
  await page.getByRole('button', { name: 'Kirim' }).click();
  await expect(page.getByRole('alert')).toContainText('data sensitif');
});

test('stop aborts a streaming answer', async ({ primed: page }) => {
  await page.route('**/api/chat', async (route) => {
    await new Promise((r) => setTimeout(r, 3000));
    await route.continue().catch(() => undefined);
  });
  await page.goto('/dex/rupiahdex/chat');
  await page.getByLabel('Tulis pertanyaan…').fill('pertanyaan lambat');
  await page.getByRole('button', { name: 'Kirim' }).click();
  await page.getByRole('button', { name: 'Berhenti' }).click();
  await expect(page.getByRole('button', { name: 'Kirim' })).toBeVisible();
});

test('offline: chat shows a notice and disables sending', async ({ primed: page, context }) => {
  await page.goto('/dex/rupiahdex/chat');
  await expect(page.getByLabel('Tulis pertanyaan…')).toBeVisible();
  await context.setOffline(true);
  await expect(page.getByText('Butuh koneksi internet untuk chat.')).toBeVisible();
  await page.getByLabel('Tulis pertanyaan…').fill('halo');
  await expect(page.getByRole('button', { name: 'Kirim' })).toBeDisabled();
  await context.setOffline(false);
});
