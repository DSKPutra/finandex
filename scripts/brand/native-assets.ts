// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Native icons & splash (§14) rendered from the kit artwork with headless Chromium (no redrawing of the logo):
// launcher icons from icons/finandex-1024.png; splash 2732×2732 on #0A0F0C with the Finandex icon, the personal
// "P" mark and "by Dea Saka Kurnia Putra". Every existing PNG in the Android/iOS resource folders is overwritten
// at its own pixel size.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const ROOT = join(import.meta.dirname, '../..');
const ICON = `data:image/png;base64,${readFileSync(join(ROOT, 'public/icons/finandex-1024.png')).toString('base64')}`;
const MARK = `data:image/png;base64,${readFileSync(join(ROOT, 'public/brand/dskp-mark-on-dark-192.png')).toString('base64')}`;

function pngSize(p: string): [number, number] {
  const b = readFileSync(p);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.png') ? [p] : [];
  });
}

const iconHtml = (w: number, h: number, round: boolean, pad: number) =>
  `<html><body style="margin:0;width:${w}px;height:${h}px;background:${pad ? '#0A0F0C' : 'transparent'};display:flex;align-items:center;justify-content:center;overflow:hidden">
   <img src="${ICON}" style="width:${w - 2 * pad}px;height:${h - 2 * pad}px;${round ? 'border-radius:50%;' : ''}"></body></html>`;
const splashHtml = (w: number, h: number) => {
  const s = Math.min(w, h);
  return `<html><body style="margin:0;width:${w}px;height:${h}px;background:#0A0F0C;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${s * 0.04}px;font-family:Inter,Arial,sans-serif">
   <img src="${ICON}" style="width:${s * 0.22}px;height:${s * 0.22}px;border-radius:${s * 0.05}px">
   <div style="display:flex;align-items:center;gap:${s * 0.012}px;color:#9DB0A4;font-size:${s * 0.022}px"><img src="${MARK}" style="width:${s * 0.03}px;height:${s * 0.03}px">by Dea Saka Kurnia Putra</div></body></html>`;
};

const browser = await chromium.launch({
  ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
});
const page = await browser.newPage();
const targets = [...walk(join(ROOT, 'android/app/src/main/res')), ...walk(join(ROOT, 'ios/App/App/Assets.xcassets'))];
for (const t of targets) {
  const [w, h] = pngSize(t);
  const name = t.split('/').at(-1)!;
  const html = name.startsWith('splash')
    ? splashHtml(w, h)
    : name.includes('foreground')
      ? iconHtml(w, h, false, Math.round(w * 0.18)).replace('background:#0A0F0C', 'background:transparent')
      : iconHtml(w, h, name.includes('round'), 0);
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html, { waitUntil: 'load' });
  await page.screenshot({
    path: t,
    omitBackground: name.includes('foreground'),
    clip: { x: 0, y: 0, width: w, height: h },
  });
}
await browser.close();
console.log(`assets: ${targets.length} native images regenerated`);
