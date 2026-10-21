// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Every Dex and every tab loads (charts or a pending/data state), data tab lists exact source files, exports.
import { DEX_REGISTRY } from '../../src/config/dex-registry.ts';
import { INPUT_FILES } from '../../src/config/data-sources.ts';
import { expect, test } from './fixtures.ts';

for (const dex of DEX_REGISTRY) {
  test(`${dex.id}: all tabs load`, async ({ primed: page }, info) => {
    test.skip(info.project.name !== 'chromium-desktop', 'full tab sweep on one project');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    for (const tab of dex.tabs) {
      await page.goto(`/dex/${dex.id}/${tab.id}`);
      await expect(page.getByRole('tab', { name: tab.label.id })).toHaveAttribute('aria-selected', 'true');
      if (tab.id === 'chat') await expect(page.getByLabel('Tulis pertanyaan…')).toBeVisible();
      else if (tab.id === 'data')
        for (const f of INPUT_FILES.filter((x) => x.dex === dex.id))
          await expect(page.getByText(f.file).first()).toBeVisible();
      else await expect(page.locator('section.card, [role="status"], [role="alert"]').first()).toBeVisible();
      await expect(page.locator('[role="alert"]:has-text("Gagal memuat data")')).toHaveCount(0);
    }
    expect(errors).toEqual([]);
  });
}

test('pending-data Dex explains that the dataset is missing', async ({ primed: page }) => {
  await page.goto('/dex/nasdaqdex/pulse');
  await expect(page.getByText(/belum/i).first()).toBeVisible();
});

test('CSV export carries the watermark', async ({ primed: page }) => {
  await page.goto('/dex/rupiahdex/yearly');
  const btn = page.getByRole('button', { name: 'Unduh CSV' }).first();
  await expect(btn).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent('download'), btn.click()]);
  const txt = await (await dl.createReadStream()).toArray();
  expect(Buffer.concat(txt).toString('utf8')).toContain('Finandex · © Dea Saka Kurnia Putra');
});

test('My LAIwyer: quote card, fixed UUD note, original page view', async ({ primed: page }) => {
  await page.goto('/dex/mylaiwyer/browse');
  await expect(page.getByText('Negara Indonesia ialah Negara kesatuan yang berbentuk Republik').first()).toBeVisible();
  await expect(page.getByText(/naskah asli sebelum perubahan/).first()).toBeVisible();
  await page.getByRole('link', { name: 'Lihat halaman asli' }).first().click();
  await expect(page.getByText(/UNDANG-UNDANG DASAR/).first()).toBeVisible();
});

test('command palette finds Dex and entities', async ({ primed: page }, info) => {
  test.skip(
    info.project.name.includes('pixel') || info.project.name.includes('iphone'),
    'keyboard shortcut on desktop',
  );
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await page.getByPlaceholder(/Cari Dex, aset/).fill('bitcoin');
  await expect(page.getByRole('button', { name: /Bitcoin/ }).first()).toBeVisible();
});
