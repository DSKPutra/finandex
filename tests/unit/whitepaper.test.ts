// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Whitepaper: both locales have the same chapter structure, registry-driven Dex table, creator strings, and the
// committed PDFs were built from the current text (run `npm run whitepaper:pdf` after editing the content).
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEX_REGISTRY } from '../../src/config/dex-registry.ts';
import { headings, pdfPath, slugify, whitepaper } from '../../src/content/whitepaper.ts';
import { contentHash } from '../../scripts/build/whitepaper-hash.ts';

describe('whitepaper', () => {
  it('has parallel chapters in id and en with no unreplaced tokens', () => {
    const id = whitepaper('id');
    const en = whitepaper('en');
    expect(id.length).toBe(en.length);
    id.forEach((c, i) => expect(headings(c.body).length).toBe(headings(en[i]!.body).length));
    for (const c of [...id, ...en]) expect(c.body).not.toMatch(/\{\{/);
    expect(new Set(id.map((c) => c.slug)).size).toBe(id.length);
  });

  it('lists every Dex from the registry and credits the creator', () => {
    for (const l of ['id', 'en'] as const) {
      const all = whitepaper(l)
        .map((c) => c.body)
        .join('\n');
      for (const d of DEX_REGISTRY) expect(all).toContain(`| ${d.name} |`);
      expect(all).toContain('Dea Saka Kurnia Putra');
    }
  });

  it('slugifies headings', () => {
    expect(slugify('Alur sebuah pertanyaan')).toBe('alur-sebuah-pertanyaan');
    expect(slugify('Python ↔ TypeScript parity')).toBe('python-typescript-parity');
  });

  it('ships PDFs built from the current text', () => {
    for (const l of ['id', 'en'] as const) {
      const f = `public${pdfPath(l)}`;
      expect(existsSync(f)).toBe(true);
      expect(readFileSync(f).subarray(0, 5).toString()).toBe('%PDF-');
    }
    const stored = JSON.parse(readFileSync('public/whitepaper/content-hash.json', 'utf8')) as { sha256: string };
    expect(stored.sha256).toBe(contentHash());
  });
});
