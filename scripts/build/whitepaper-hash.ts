// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Hash of the whitepaper text (both locales + version/date); stored beside the PDFs to detect stale downloads.
import { createHash } from 'node:crypto';
import { whitepaper, WHITEPAPER_DATE, WHITEPAPER_VERSION } from '../../src/content/whitepaper.ts';

export function contentHash(): string {
  const h = createHash('sha256');
  for (const l of ['id', 'en'] as const) h.update(JSON.stringify(whitepaper(l)));
  h.update(WHITEPAPER_DATE + WHITEPAPER_VERSION);
  return h.digest('hex');
}
