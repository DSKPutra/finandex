// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Calendar-date helpers (§2.7). Dates are ALWAYS 'YYYY-MM-DD' strings; arithmetic is pure UTC day math.
// Never construct local-time Date objects from these strings (classic day-shift bug).

export type CalDate = string;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export function isCalDate(s: unknown): s is CalDate {
  if (typeof s !== 'string') return false;
  const m = ISO_RE.exec(s);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return mo >= 1 && mo <= 12 && d >= 1 && d <= daysInMonth(y, mo);
}

export function parts(d: CalDate): [number, number, number] {
  const m = ISO_RE.exec(d);
  if (!m) throw new Error(`invalid calendar date: ${d}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

export function make(y: number, m: number, d: number): CalDate {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function isLeap(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function daysInMonth(y: number, m: number): number {
  return [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1]!;
}

/** Days since 1970-01-01 (UTC). */
export function toDayNumber(d: CalDate): number {
  const [y, m, dd] = parts(d);
  return Math.round(Date.UTC(y, m - 1, dd) / MS_PER_DAY);
}

export function fromDayNumber(n: number): CalDate {
  const dt = new Date(n * MS_PER_DAY);
  return make(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function addDays(d: CalDate, n: number): CalDate {
  return fromDayNumber(toDayNumber(d) + n);
}

export function daysBetween(a: CalDate, b: CalDate): number {
  return toDayNumber(b) - toDayNumber(a);
}

/** Shift by N months; clamp the day to the last day of the target month (pandas DateOffset semantics). */
export function addMonths(d: CalDate, n: number): CalDate {
  const [y, m, dd] = parts(d);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return make(ny, nm, Math.min(dd, daysInMonth(ny, nm)));
}

export function addYears(d: CalDate, n: number): CalDate {
  return addMonths(d, 12 * n);
}

export function year(d: CalDate): number {
  return parts(d)[0];
}

export function monthKey(d: CalDate): string {
  return d.slice(0, 7);
}

/** year*12 + month — used for "consecutive month" checks (ReksaDex). */
export function ymIndex(d: CalDate): number {
  const [y, m] = parts(d);
  return y * 12 + m;
}

export function lastDayOfMonth(d: CalDate): CalDate {
  const [y, m] = parts(d);
  return make(y, m, daysInMonth(y, m));
}

export const PERIODS = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', '10Y', 'MAX'] as const;
export type Period = (typeof PERIODS)[number];

/** Anchor date for a trailing period ending at L (§4.0). 1D and MAX have no calendar anchor. */
export function anchorDate(L: CalDate, period: Exclude<Period, '1D' | 'MAX'>): CalDate {
  switch (period) {
    case '1W':
      return addDays(L, -7);
    case 'YTD':
      return make(year(L) - 1, 12, 31);
    case '1M':
      return addMonths(L, -1);
    case '3M':
      return addMonths(L, -3);
    case '6M':
      return addMonths(L, -6);
    case '1Y':
      return addYears(L, -1);
    case '3Y':
      return addYears(L, -3);
    case '5Y':
      return addYears(L, -5);
    case '10Y':
      return addYears(L, -10);
  }
}

/** Index of the last element <= anchor in a sorted date array (binary search); -1 if anchor < dates[0]. */
export function idxOnOrBefore(dates: readonly CalDate[], anchor: CalDate): number {
  let lo = 0;
  let hi = dates.length; // first index with dates[i] > anchor
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (dates[mid]! <= anchor) lo = mid + 1;
    else hi = mid;
  }
  return lo - 1;
}

/** Normalise source date strings to a calendar date WITHOUT any time-zone conversion (first 10 chars). */
export function calendarPrefix(s: string): CalDate {
  const d = s.trim().slice(0, 10);
  if (!isCalDate(d)) throw new Error(`not a calendar date prefix: ${s}`);
  return d;
}

/** 'M/D/YYYY' → 'YYYY-MM-DD' (ReksaDex `Tanggal Lengkap`). */
export function fromMDY(s: string): CalDate {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s.trim());
  if (!m) throw new Error(`not M/D/YYYY: ${s}`);
  const d = make(Number(m[3]), Number(m[1]), Number(m[2]));
  if (!isCalDate(d)) throw new Error(`invalid date: ${s}`);
  return d;
}

export const ID_MONTHS: Readonly<Record<string, number>> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  Mei: 5,
  Jun: 6,
  Jul: 7,
  Agt: 8,
  Sep: 9,
  Okt: 10,
  Nov: 11,
  Des: 12,
};

/** '09 Des 1997' → '1997-12-09' (IDX listing dates use Indonesian month abbreviations). */
export function fromIndonesianDate(s: string): CalDate {
  const [dd, mon, yy] = s.trim().split(/\s+/);
  const m = mon ? ID_MONTHS[mon] : undefined;
  if (!dd || !m || !yy) throw new Error(`not an Indonesian date: ${s}`);
  const d = make(Number(yy), m, Number(dd));
  if (!isCalDate(d)) throw new Error(`invalid date: ${s}`);
  return d;
}
