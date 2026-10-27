// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Search-key normalisation, kept apart from the sensitive-data detectors in text.ts (which bundle the BIP39 word list).
/** Lower-case, strip diacritics, collapse whitespace — for search keys. */
export function normaliseKey(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}
