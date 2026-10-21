// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// ValueFormat → locale string (§10.5), shared by charts, tables and tooltips.
import type { ValueFormat } from '../../shared/chart-spec.ts';
import { DASH, fmtCompact, fmtDate, fmtInt, fmtMoney, fmtNum, fmtPct, fmtPP, fmtPrice } from '../../shared/format.ts';
import type { Locale } from '../../i18n/index.ts';

export function formatValue(v: unknown, f: ValueFormat, locale: Locale): string {
  if (v === null || v === undefined || v === '') return DASH;
  if (f === 'text') return String(v);
  if (f === 'date')
    return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? fmtDate(v.slice(0, 10), locale) : String(v);
  if (typeof v !== 'number') return String(v);
  switch (f) {
    case 'pct':
      return fmtPct(v, locale);
    case 'pp':
    case 'pct_points':
      return fmtPP(v, locale);
    case 'int':
      return fmtInt(v, locale);
    case 'price':
      return fmtPrice(v, locale, Math.abs(v) < 10 ? 4 : 2);
    case 'money_idr':
      return fmtMoney(v, 'IDR', locale);
    case 'money_usd':
      return fmtMoney(v, 'USD', locale);
    case 'compact':
      return fmtCompact(v, locale);
    default:
      return fmtNum(v, locale, Math.abs(v) < 1 ? 4 : 2);
  }
}

export function signClass(v: unknown, f: ValueFormat): string {
  return typeof v === 'number' && (f === 'pct' || f === 'pp' || f === 'pct_points')
    ? v > 0
      ? 'pos'
      : v < 0
        ? 'neg'
        : ''
    : '';
}
