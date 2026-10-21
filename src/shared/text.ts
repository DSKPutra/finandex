// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Text normalisation, privacy scrubbing and sensitive-data detection (§13).

/** Lower-case, strip diacritics, collapse whitespace — for accent/case-insensitive matching. */
export function fold(s: string): string {
  return s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Remove control characters (except \n and \t) and cap length — applied to untrusted dataset text. */
export function sanitizeText(s: string | null | undefined, maxLen = 500): string {
  if (!s) return '';
  // eslint-disable-next-line no-control-regex
  const clean = s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, '');
  return clean.length > maxLen ? clean.slice(0, maxLen - 1) + '…' : clean;
}

/** Replace user handles (@name, u/name, /u/name) with a placeholder (§13.2). */
export function scrubHandles(s: string, placeholder = '[pengguna]'): string {
  return s
    .replace(/(^|[^\w/])\/?u\/[A-Za-z0-9_-]{2,}/g, `$1${placeholder}`)
    .replace(
      /(^|[^\w@.])@[A-Za-z0-9_](?:[A-Za-z0-9_.-]*[A-Za-z0-9_])?(?:@[A-Za-z0-9.-]+\.[a-z]{2,})?/g,
      `$1${placeholder}`,
    );
}

/** Truncate to n chars on a word boundary. */
export function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  const sp = cut.lastIndexOf(' ');
  return (sp > n * 0.6 ? cut.slice(0, sp) : cut) + '…';
}

export function slugify(s: string): string {
  return fold(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

// ---------------------------------------------------------------------------------------------- sensitive data
export type SensitiveKind = 'seed_phrase' | 'private_key' | 'card_number' | 'nik';

/** Luhn checksum for card numbers. */
export function luhnValid(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (n < 0 || n > 9) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

/**
 * Detect secrets the user must not send (§13.2). `bip39` is the BIP-39 English word set (from @scure/bip39); a seed phrase is
 * a run of ≥ 12 consecutive BIP-39 words.
 */
export function detectSensitive(text: string, bip39: ReadonlySet<string>): SensitiveKind[] {
  const found = new Set<SensitiveKind>();
  if (/\b(?:0x)?[0-9a-fA-F]{64}\b/.test(text)) found.add('private_key');
  for (const m of text.matchAll(/\b(?:\d[ -]?){13,19}\b/g)) {
    const digits = m[0].replace(/[ -]/g, '');
    if (digits.length >= 13 && digits.length <= 19 && luhnValid(digits)) found.add('card_number');
  }
  for (const m of text.matchAll(/(?<!\d)\d{16}(?!\d)/g)) {
    const d = m[0];
    // NIK: 2-digit province 11–94, date part DDMMYY (women add 40 to DD)
    const prov = Number(d.slice(0, 2));
    const dd = Number(d.slice(6, 8));
    const mm = Number(d.slice(8, 10));
    if (prov >= 11 && prov <= 94 && ((dd >= 1 && dd <= 31) || (dd >= 41 && dd <= 71)) && mm >= 1 && mm <= 12)
      found.add('nik');
  }
  const words = text.toLowerCase().match(/[a-z]+/g) ?? [];
  let run = 0;
  for (const w of words) {
    run = bip39.has(w) ? run + 1 : 0;
    if (run >= 12) {
      found.add('seed_phrase');
      break;
    }
  }
  return [...found];
}
