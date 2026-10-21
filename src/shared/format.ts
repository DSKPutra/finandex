// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Locale formatting (§10.5). id-ID: "12,35%", "191.321", "Rp689,72 T", "US$89,24 miliar", "17 Mei 2024".
// en: "12.35%", "191,321", "IDR 689.72T", "US$89.24B", "17 May 2024". Minus sign: ASCII "-" everywhere (decision).

import { parts, type CalDate } from './dates.ts';

export type Locale = 'id' | 'en';
const TAG: Record<Locale, string> = { id: 'id-ID', en: 'en-US' };

const nfCache = new Map<string, Intl.NumberFormat>();
function nf(locale: Locale, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const k = locale + JSON.stringify(opts);
  let f = nfCache.get(k);
  if (!f) {
    f = new Intl.NumberFormat(TAG[locale], opts);
    nfCache.set(k, f);
  }
  return f;
}

function ascii(s: string): string {
  return s.replace(/−/g, '-').replace(/\u00a0|\u202f/g, ' ');
}

export const DASH = '–';

export function isNum(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

/** Fraction → percent with 2 decimals (0.1235 → "12,35%"). */
export function fmtPct(x: number | null | undefined, locale: Locale, digits = 2, signed = false): string {
  if (!isNum(x)) return DASH;
  const s = nf(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(x * 100);
  return ascii(s) + '%';
}

/** Value already in percent units (4.34 → "4,34%"). */
export function fmtPctPoints(x: number | null | undefined, locale: Locale, digits = 2): string {
  if (!isNum(x)) return DASH;
  return ascii(nf(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(x)) + '%';
}

/** Percentage points ("1,62 pp" / "1.62 pp"). */
export function fmtPP(x: number | null | undefined, locale: Locale, digits = 2): string {
  if (!isNum(x)) return DASH;
  return ascii(nf(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(x)) + ' pp';
}

export function fmtNum(x: number | null | undefined, locale: Locale, maxDigits = 2, minDigits = 0): string {
  if (!isNum(x)) return DASH;
  return ascii(nf(locale, { maximumFractionDigits: maxDigits, minimumFractionDigits: minDigits }).format(x));
}

export function fmtInt(x: number | null | undefined, locale: Locale): string {
  return fmtNum(x, locale, 0);
}

/** Price with source precision: FX ≥ 4 decimals, indices 2. */
export function fmtPrice(x: number | null | undefined, locale: Locale, decimals = 2): string {
  return fmtNum(x, locale, decimals, decimals);
}

const ABBR_ID: [number, string][] = [
  [1e12, ' T'],
  [1e9, ' M'],
  [1e6, ' jt'],
  [1e3, ' rb'],
];
const ABBR_ID_LONG: [number, string][] = [
  [1e12, ' triliun'],
  [1e9, ' miliar'],
  [1e6, ' juta'],
  [1e3, ' ribu'],
];
const ABBR_EN: [number, string][] = [
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

/** Compact magnitude: id "689,72 T" / en "689.72T". `long` = id "89,24 miliar". */
export function fmtCompact(x: number | null | undefined, locale: Locale, digits = 2, long = false): string {
  if (!isNum(x)) return DASH;
  const table = locale === 'id' ? (long ? ABBR_ID_LONG : ABBR_ID) : ABBR_EN;
  const a = Math.abs(x);
  for (const [v, s] of table) if (a >= v) return fmtNum(x / v, locale, digits, digits) + s;
  return fmtNum(x, locale, digits);
}

/** Currency with compact magnitude: IDR → "Rp689,72 T" / "IDR 689.72T"; USD → "US$89,24 miliar" / "US$89.24B". */
export function fmtMoney(
  x: number | null | undefined,
  ccy: string,
  locale: Locale,
  compact = true,
  digits = 2,
): string {
  if (!isNum(x)) return DASH;
  const neg = x < 0 ? '-' : '';
  const a = Math.abs(x);
  const body =
    compact && a >= 1e3
      ? fmtCompact(a, locale, digits, ccy !== 'IDR')
      : fmtNum(a, locale, digits, ccy === 'IDR' ? 0 : Math.min(digits, 2));
  if (ccy === 'IDR') return locale === 'id' ? `${neg}Rp${body}` : `${neg}IDR ${body}`;
  if (ccy === 'USD') return `${neg}US$${body}`;
  return `${neg}${ccy} ${body}`;
}

const MONTHS: Record<Locale, string[]> = {
  id: [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ],
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
};
const MONTHS_SHORT: Record<Locale, string[]> = {
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** "17 Mei 2024" / "17 May 2024" — computed from the calendar string (no Date / time zone). */
export function fmtDate(d: CalDate | null | undefined, locale: Locale): string {
  if (!d) return DASH;
  const [y, m, dd] = parts(d);
  return `${dd} ${MONTHS[locale][m - 1]} ${y}`;
}

export function fmtDateShort(d: CalDate | null | undefined, locale: Locale): string {
  if (!d) return DASH;
  const [y, m, dd] = parts(d);
  return `${dd} ${MONTHS_SHORT[locale][m - 1]} ${y}`;
}

/** 'YYYY-MM' → "Juli 2026" / "July 2026". */
export function fmtMonth(ym: string | null | undefined, locale: Locale): string {
  if (!ym) return DASH;
  const [y, m] = ym.split('-').map(Number);
  if (!y || !m) return ym;
  return `${MONTHS[locale][m - 1]} ${y}`;
}

/** Year range "2010–2026". */
export function fmtRange(a: string | number, b: string | number): string {
  return `${a}${DASH}${b}`;
}

/** As-of value may be a date, a month, a year or free text ("tidak dicantumkan"). */
export function fmtAsOf(asOf: string | null | undefined, locale: Locale): string {
  if (!asOf) return DASH;
  if (/^\d{4}-\d{2}-\d{2}$/.test(asOf)) return fmtDate(asOf, locale);
  if (/^\d{4}-\d{2}$/.test(asOf)) return fmtMonth(asOf, locale);
  return asOf;
}

export function titleCase(s: string): string {
  return s.replace(/\b([a-z])/g, (c) => c.toUpperCase());
}
