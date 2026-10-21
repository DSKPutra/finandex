// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// PDF text extraction with pdfjs-dist, reconstructing visual lines (comparable to `pdftotext -layout`).
import { readFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

interface Item {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

/** Returns one string per page; lines joined with "\n". */
export async function pdfPages(path: string): Promise<string[]> {
  const data = new Uint8Array(readFileSync(path));
  const task = getDocument({ data, useSystemFonts: false, disableFontFace: true, verbosity: 0 });
  const doc = await task.promise;
  const pages: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const items = (tc.items as Item[]).filter((i) => typeof i.str === 'string' && i.str.length);
    // group by baseline y (tolerance relative to font height)
    const rows: { y: number; h: number; parts: { x: number; w: number; s: string }[] }[] = [];
    for (const it of items) {
      const x = it.transform[4]!;
      const y = it.transform[5]!;
      const h = Math.abs(it.transform[3]!) || it.height || 10;
      let row = rows.find((r) => Math.abs(r.y - y) <= Math.max(2, 0.45 * Math.min(r.h, h)));
      if (!row) rows.push((row = { y, h, parts: [] }));
      row.parts.push({ x, w: it.width, s: it.str });
    }
    rows.sort((a, b) => b.y - a.y);
    const lines = rows.map((r) => {
      r.parts.sort((a, b) => a.x - b.x);
      let out = '';
      let end = -Infinity;
      for (const part of r.parts) {
        if (out && part.x - end > 1) out += ' ';
        out += part.s;
        end = part.x + part.w;
      }
      return out.replace(/\s+$/, '');
    });
    pages.push(lines.join('\n'));
    page.cleanup();
  }
  await task.destroy();
  return pages;
}
