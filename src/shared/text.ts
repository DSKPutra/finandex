// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Text helpers: normalisation, sanitising untrusted dataset text (§13.1), handle redaction (§13.2),
// and the client-side sensitive-data detector (§13.2).

import { wordlist } from '@scure/bip39/wordlists/english.js';

const BIP39 = new Set(wordlist);

export { normaliseKey } from './normalise';

/** Remove control characters (except tab/newline) and truncate untrusted text before it reaches the LLM. */
export function sanitiseUntrusted(s: string | null | undefined, maxLen = 2000): string {
  if (!s) return '';
  // eslint-disable-next-line no-control-regex
  const clean = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, '');
  return clean.length > maxLen ? `${clean.slice(0, maxLen - 1)}…` : clean;
}

/** Social handles (@name, u/name) → '[pengguna]' (§13.2). */
export function redactHandles(s: string): string {
  return s
    .replace(/(^|[^\w@./])@[A-Za-z0-9_.]{2,30}(@[A-Za-z0-9.-]+\.[A-Za-z]{2,})?/g, '$1[pengguna]')
    .replace(/(^|[^\w/])\/?u\/[A-Za-z0-9_-]{3,20}/g, '$1[pengguna]');
}

/** Truncate quoted news excerpts (§12.4: ≤ 300 characters). */
export function clipExcerpt(s: string | null | undefined, max = 300): string {
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export type SensitiveKind = 'seed_phrase' | 'private_key' | 'card_number' | 'nik' | 'otp' | 'account_number';

export function luhnValid(digits: string): boolean {
  let sum = 0;
  let dbl = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits.charCodeAt(i) - 48;
    if (dbl) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    dbl = !dbl;
  }
  return digits.length > 0 && sum % 10 === 0;
}

/** Longest run of consecutive BIP-39 words. */
function longestBip39Run(s: string): number {
  let best = 0;
  let run = 0;
  for (const w of s.toLowerCase().split(/[^a-z]+/).filter(Boolean)) {
    if (BIP39.has(w)) {
      run++;
      best = Math.max(best, run);
    } else run = 0;
  }
  return best;
}

/**
 * Detects data that must never be sent (§13.2): BIP-39 seed phrases (12+ consecutive wordlist words),
 * 64-hex private keys, Luhn-valid card numbers (13–19 digits), 16-digit NIK, OTP/PIN (4–8 digits within a few
 * words of OTP/PIN/kode/verifikasi), and account numbers (10–16 digits within a few words of rekening/norek/account).
 */
export function detectSensitive(s: string): SensitiveKind[] {
  const found = new Set<SensitiveKind>();
  if (longestBip39Run(s) >= 12) found.add('seed_phrase');
  if (/(^|[^0-9a-fA-F])(0x)?[0-9a-fA-F]{64}([^0-9a-fA-F]|$)/.test(s)) found.add('private_key');
  for (const m of s.matchAll(/(?:\d[ -]?){12,18}\d/g)) {
    const digits = m[0].replace(/[ -]/g, '');
    if (digits.length === 16 && /^\d{6}(0[1-9]|[1-2]\d|3[01]|4[1-9]|[5-6]\d|7[01])(0[1-9]|1[0-2])\d{6}$/.test(digits) && !luhnValid(digits)) {
      found.add('nik');
    } else if (digits.length >= 13 && digits.length <= 19 && luhnValid(digits)) {
      found.add('card_number');
    } else if (digits.length === 16) {
      found.add('nik');
    }
  }
  const near = (words: string, digits: string) => new RegExp(`(?:${words})\\W+(?:\\w+\\W+){0,4}?(${digits})(?!\\d)|(?<!\\d)(${digits})\\W+(?:\\w+\\W+){0,3}?(?:${words})`, 'i');
  if (near('otp|pin|kode|code|verifikasi|verification|token', '\\d{4,8}').test(s)) found.add('otp');
  if (near('rekening|rek\\.?|norek|no\\.? rek|account|acct|a/n', '\\d[\\d -]{8,18}\\d').test(s)) {
    const m = /\d[\d -]{8,18}\d/.exec(s);
    const digits = (m?.[0] ?? '').replace(/[ -]/g, '');
    if (digits.length >= 10 && digits.length <= 16 && !found.has('nik') && !found.has('card_number')) found.add('account_number');
  }
  return [...found];
}
