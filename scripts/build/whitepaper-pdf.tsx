// © 2026 Dea Saka Kurnia Putra. All rights reserved.
/** @jsxRuntime automatic */
// Builds the downloadable whitepaper PDFs (public/whitepaper/finandex-whitepaper-{id,en}.pdf) from the same chapters
// the /whitepaper reader shows (src/content/whitepaper.ts), printed with Playwright Chromium. A content hash is
// written next to them; tests/unit/whitepaper.test.ts fails when the PDFs are older than the text.
// Usage: npm run whitepaper:pdf
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { renderToStaticMarkup } from 'react-dom/server';
import { WhitepaperMarkdown } from '../../src/components/WhitepaperMarkdown.tsx';
import { copyrightLine, CREDIT_EN, CREDIT_ID, PERSONAL_TAGLINE } from '../../src/config/brand.ts';
import {
  whitepaper,
  WHITEPAPER_DATE,
  WHITEPAPER_SUBTITLE,
  WHITEPAPER_TITLE,
  WHITEPAPER_VERSION,
} from '../../src/content/whitepaper.ts';
import { contentHash } from './whitepaper-hash.ts';
import { fmtAsOf } from '../../src/shared/format.ts';
import type { Locale } from '../../src/i18n/index.ts';

const ROOT = process.cwd();
const OUT = join(ROOT, 'public/whitepaper');
const font = (pkg: string, file: string) =>
  pathToFileURL(join(ROOT, 'node_modules/@fontsource', pkg, 'files', file)).href;

const CSS = `
@font-face { font-family: Inter; font-weight: 400; src: url(${font('inter', 'inter-latin-400-normal.woff2')}); }
@font-face { font-family: Inter; font-weight: 600; src: url(${font('inter', 'inter-latin-600-normal.woff2')}); }
@font-face { font-family: Inter; font-weight: 700; src: url(${font('inter', 'inter-latin-700-normal.woff2')}); }
@font-face { font-family: Montserrat; font-weight: 700; src: url(${font('montserrat', 'montserrat-latin-700-normal.woff2')}); }
@page { size: A4; margin: 22mm 18mm 20mm; }
* { box-sizing: border-box; }
body { font-family: Inter, sans-serif; color: #0a0f0c; font-size: 10.5pt; line-height: 1.6; margin: 0; }
h1, h2 { font-family: Montserrat, Inter, sans-serif; }
.cover { height: 245mm; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; }
.cover .brand { display: flex; align-items: center; gap: 14px; }
.cover .brand span { font-family: Montserrat; font-weight: 700; font-size: 20pt; letter-spacing: .12em; }
.cover h1 { font-size: 34pt; line-height: 1.15; margin: 0 0 10px; }
.cover .sub { font-size: 13pt; color: #4a5b51; margin: 0; }
.cover .bar { height: 6px; width: 80px; background: #19f23a; border-radius: 3px; margin: 22px 0; }
.cover .meta { color: #4a5b51; font-size: 10pt; }
.cover .meta p { margin: 2px 0; }
.toc { page-break-after: always; }
.toc h2 { font-size: 18pt; margin: 0 0 14px; }
.toc ol { padding: 0; margin: 0; list-style: none; }
.toc li { display: flex; gap: 10px; padding: 7px 0; border-bottom: 1px solid #e3e8e5; font-size: 11pt; }
.toc li b { color: #0a7d24; min-width: 24px; }
.chapter { page-break-before: always; }
.chapter:first-of-type { page-break-before: auto; }
.chapter .no { color: #0a7d24; font-weight: 700; font-size: 10pt; letter-spacing: .08em; margin: 0; }
.chapter h2 { font-size: 22pt; margin: 4px 0 6px; line-height: 1.2; }
.wp-prose h3 { font-size: 13pt; margin: 18px 0 6px; page-break-after: avoid; }
.wp-prose p { margin: 6px 0; }
.wp-prose ul, .wp-prose ol { margin: 6px 0; padding-left: 18px; }
.wp-prose li { margin: 3px 0; }
.wp-prose blockquote { margin: 12px 0; padding: 8px 12px; border-left: 3px solid #19f23a; background: #f3f7f4; }
.wp-prose blockquote p { margin: 0; }
.wp-prose code { font-size: 9.5pt; background: #f0f3f1; padding: 0 3px; border-radius: 3px; }
.wp-table table { width: 100%; border-collapse: collapse; font-size: 9pt; margin: 10px 0; }
.wp-table th, .wp-table td { text-align: left; padding: 5px 6px; border-bottom: 1px solid #dfe5e1; vertical-align: top; }
.wp-table th { background: #f3f7f4; color: #4a5b51; }
.wp-table tr { page-break-inside: avoid; }
`;

function Doc({ locale }: { locale: Locale }) {
  const chapters = whitepaper(locale);
  const L = (id: string, en: string) => (locale === 'id' ? id : en);
  const logo = `data:image/svg+xml;base64,${readFileSync(join(ROOT, 'public/icons/finandex.svg')).toString('base64')}`;
  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <title>{WHITEPAPER_TITLE[locale]}</title>
        <meta name="author" content="Dea Saka Kurnia Putra" />
        <style dangerouslySetInnerHTML={{ __html: CSS }} />
      </head>
      <body>
        <section className="cover">
          <div className="brand">
            <img src={logo} width={54} height={54} alt="" />
            <span>FINANDEX</span>
          </div>
          <div>
            <h1>{WHITEPAPER_TITLE[locale]}</h1>
            <p className="sub">{WHITEPAPER_SUBTITLE[locale]}</p>
            <div className="bar" />
            <div className="meta">
              <p>
                {L('Versi', 'Version')} {WHITEPAPER_VERSION} · {fmtAsOf(WHITEPAPER_DATE, locale)}
              </p>
              <p>{locale === 'id' ? CREDIT_ID : CREDIT_EN}</p>
            </div>
          </div>
          <div className="meta">
            <p>{PERSONAL_TAGLINE}</p>
            <p>{copyrightLine(locale, 2026)}</p>
            <p>{L('Bukan nasihat investasi, keuangan, atau hukum.', 'Not investment, financial or legal advice.')}</p>
          </div>
        </section>
        <section className="toc">
          <h2>{L('Daftar Isi', 'Contents')}</h2>
          <ol>
            {chapters.map((c, i) => (
              <li key={c.slug}>
                <b>{String(i + 1).padStart(2, '0')}</b> {c.title}
              </li>
            ))}
          </ol>
        </section>
        {chapters.map((c, i) => (
          <section key={c.slug} className="chapter">
            <p className="no">
              {L('BAB', 'CHAPTER')} {String(i + 1).padStart(2, '0')}
            </p>
            <h2>{c.title}</h2>
            <WhitepaperMarkdown body={c.body} />
          </section>
        ))}
      </body>
    </html>
  );
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const locale of ['id', 'en'] as const) {
    const htmlFile = join(OUT, `.tmp-${locale}.html`);
    writeFileSync(htmlFile, '<!doctype html>' + renderToStaticMarkup(<Doc locale={locale} />));
    const page = await browser.newPage();
    await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    const footer = `<div style="font-family:sans-serif;font-size:7pt;color:#6b7c72;width:100%;padding:0 18mm;display:flex;justify-content:space-between"><span>${WHITEPAPER_TITLE[locale]} · © 2026 Dea Saka Kurnia Putra</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
    const file = join(OUT, `finandex-whitepaper-${locale}.pdf`);
    await page.pdf({
      path: file,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<span></span>',
      footerTemplate: footer,
      tagged: true,
      outline: true,
    });
    await page.close();
    rmSync(htmlFile);
    console.log(`wrote ${resolve(file)} (${Math.round(readFileSync(file).length / 1024)} KB)`);
  }
  await browser.close();
  writeFileSync(join(OUT, 'content-hash.json'), JSON.stringify({ sha256: contentHash() }, null, 2) + '\n');
}

await main();
