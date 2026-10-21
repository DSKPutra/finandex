// © 2026 Dea Saka Kurnia Putra. All rights reserved.
import { describe, expect, it } from 'vitest';
import * as F from '../../src/shared/format.ts';
import * as T from '../../src/shared/text.ts';
import { wordlist } from '@scure/bip39/wordlists/english.js';

describe('format (§10.5)', () => {
  it('percent & numbers per locale', () => {
    expect(F.fmtPct(0.1235, 'id')).toBe('12,35%');
    expect(F.fmtPct(0.1235, 'en')).toBe('12.35%');
    expect(F.fmtPct(-0.05, 'id')).toBe('-5,00%');
    expect(F.fmtPct(0.05, 'en', 2, true)).toBe('+5.00%');
    expect(F.fmtPct(null, 'id')).toBe('–');
    expect(F.fmtPct(NaN, 'id')).toBe('–');
    expect(F.fmtPctPoints(4.34, 'id')).toBe('4,34%');
    expect(F.fmtPctPoints(undefined, 'id')).toBe('–');
    expect(F.fmtPP(1.62, 'en')).toBe('1.62 pp');
    expect(F.fmtPP(null, 'en')).toBe('–');
    expect(F.fmtNum(191321, 'id')).toBe('191.321');
    expect(F.fmtNum(191321, 'en')).toBe('191,321');
    expect(F.fmtInt(1234.6, 'id')).toBe('1.235');
    expect(F.fmtPrice(16668, 'id', 2)).toBe('16.668,00');
    expect(F.fmtNum(Infinity, 'id')).toBe('–');
  });
  it('money & compact magnitudes', () => {
    expect(F.fmtMoney(689.72e12, 'IDR', 'id')).toBe('Rp689,72 T');
    expect(F.fmtMoney(689.72e12, 'IDR', 'en')).toBe('IDR 689.72T');
    expect(F.fmtMoney(89.24e9, 'USD', 'id')).toBe('US$89,24 miliar');
    expect(F.fmtMoney(89.24e9, 'USD', 'en')).toBe('US$89.24B');
    expect(F.fmtMoney(-1.5e6, 'USD', 'en')).toBe('-US$1.50M');
    expect(F.fmtMoney(500, 'USD', 'en')).toBe('US$500.00');
    expect(F.fmtMoney(162e6, 'IDR', 'id')).toBe('Rp162,00 jt');
    expect(F.fmtMoney(1000, 'EUR', 'en')).toBe('EUR 1.00K');
    expect(F.fmtMoney(null, 'USD', 'en')).toBe('–');
    expect(F.fmtCompact(12, 'en')).toBe('12');
    expect(F.fmtCompact(3200000, 'id', 1)).toBe('3,2 jt');
    expect(F.fmtCompact(null, 'id')).toBe('–');
  });
  it('dates without time-zone conversion', () => {
    expect(F.fmtDate('2024-05-17', 'id')).toBe('17 Mei 2024');
    expect(F.fmtDate('2024-05-17', 'en')).toBe('17 May 2024');
    expect(F.fmtDate(null, 'en')).toBe('–');
    expect(F.fmtDateShort('2026-08-01', 'id')).toBe('1 Agu 2026');
    expect(F.fmtDateShort(undefined, 'id')).toBe('–');
    expect(F.fmtMonth('2026-07', 'id')).toBe('Juli 2026');
    expect(F.fmtMonth('x', 'id')).toBe('x');
    expect(F.fmtMonth(null, 'id')).toBe('–');
    expect(F.fmtRange(2010, 2026)).toBe('2010–2026');
    expect(F.fmtAsOf('2026-10-19', 'id')).toBe('19 Oktober 2026');
    expect(F.fmtAsOf('2026-06', 'en')).toBe('June 2026');
    expect(F.fmtAsOf('tidak dicantumkan', 'id')).toBe('tidak dicantumkan');
    expect(F.fmtAsOf(null, 'id')).toBe('–');
    expect(F.titleCase('united states')).toBe('United States');
    expect(F.isNum(1)).toBe(true);
    expect(F.isNum('1')).toBe(false);
  });
});

describe('text & privacy', () => {
  it('fold / sanitize / truncate / slug', () => {
    expect(T.fold('  Bänk  CENTRAL ')).toBe('bank central');
    expect(T.sanitizeText('a\u0000b‮c', 10)).toBe('abc');
    expect(T.sanitizeText(null)).toBe('');
    expect(T.sanitizeText('x'.repeat(20), 5)).toBe('xxxx…');
    expect(T.truncate('satu dua tiga empat lima', 15)).toBe('satu dua tiga…');
    expect(T.truncate('pendek', 15)).toBe('pendek');
    expect(T.truncate('abcdefghijklmnop', 6)).toBe('abcde…');
    expect(T.slugify('RD Saham Indonesia — Seri #1')).toBe('rd-saham-indonesia-seri-1');
  });
  it('scrubs social handles', () => {
    expect(T.scrubHandles('kata @budi_123 dan u/anon_x di /u/foo')).toBe('kata [pengguna] dan [pengguna] di [pengguna]');
    expect(T.scrubHandles('email me@example.com tetap')).toBe('email me@example.com tetap');
    expect(T.scrubHandles('@akun.mastodon@mastodon.social hi')).toBe('[pengguna] hi');
  });
  it('detects sensitive data (seed phrase, private key, card, NIK)', () => {
    const bip = new Set(wordlist);
    const seed = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    expect(T.detectSensitive(`ini seed phrase saya: ${seed}`, bip)).toContain('seed_phrase');
    expect(T.detectSensitive('Saya ingin tahu kurs rupiah hari ini dan besok kalau bisa ya terima kasih banyak', bip)).toEqual([]);
    expect(T.detectSensitive('0x' + 'a'.repeat(64), bip)).toContain('private_key');
    expect(T.detectSensitive('kartu 4111 1111 1111 1111', bip)).toContain('card_number');
    expect(T.detectSensitive('kartu 4111 1111 1111 1112', bip)).not.toContain('card_number');
    expect(T.detectSensitive('NIK 3174015506900001', bip)).toContain('nik');
    expect(T.detectSensitive('angka 9999999999999999', bip)).not.toContain('nik');
    expect(T.luhnValid('79927398713')).toBe(true);
    expect(T.luhnValid('7992739871x')).toBe(false);
  });
});
