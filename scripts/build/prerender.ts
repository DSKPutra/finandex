// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Inject the prerendered Home shell (src/prerender.tsx, via Vite SSR) into dist/index.html, under the static splash.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';

const ROOT = join(import.meta.dirname, '../..');
const vite = await createServer({
  root: ROOT,
  server: { middlewareMode: true, hmr: false },
  appType: 'custom',
  logLevel: 'error',
});
try {
  const mod = (await vite.ssrLoadModule('/src/prerender.tsx')) as { render: (l: 'id' | 'en') => Promise<string> };
  // one shell per locale; public/boot.js sets <html lang> before paint and CSS shows the matching one
  const html = `<div data-pre="id">${await mod.render('id')}</div><div data-pre="en">${await mod.render('en')}</div>`;
  const file = join(ROOT, 'dist/index.html');
  const page = readFileSync(file, 'utf8');
  const marker = '<!--prerender-->';
  if (!page.includes(marker)) throw new Error('dist/index.html has no <!--prerender--> marker');
  writeFileSync(file, page.replace(marker, html));
  console.log(`prerendered Home shell (${Math.round(html.length / 1024)} KB)`);
} finally {
  await vite.close();
}
