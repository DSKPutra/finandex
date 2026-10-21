// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// "Why this answer?" panel (§8.8 step 4) generated deterministically from `method` events — never from the model.
import type { Method } from '../shared/chart-spec.ts';
import { fmtAsOf, fmtDate, fmtInt } from '../shared/format.ts';
import { useTranslation, type Locale } from '../i18n/index.ts';

function human(v: unknown): string {
  if (v === null || v === undefined) return '–';
  if (Array.isArray(v)) return v.map(human).join(', ');
  if (typeof v === 'object')
    return Object.entries(v as Record<string, unknown>)
      .map(([k, x]) => `${k}: ${human(x)}`)
      .join('; ');
  return String(v);
}

export function MethodPanel({ methods, locale }: { methods: Method[]; locale: Locale }) {
  const { t } = useTranslation();
  if (!methods.length) return null;
  return (
    <details
      className="mt-2 text-sm"
      style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '0.5rem 0.75rem' }}
    >
      <summary className="cursor-pointer font-semibold">{t('chat.why')}</summary>
      {methods.map((m, i) => (
        <div key={i} className="mt-2">
          <p className="m-0">
            <strong>{m.tool}</strong> · {t('chat.dataset')}: {m.dataset} ·{' '}
            {t('common.asOf', { date: fmtAsOf(m.as_of, locale) })}
          </p>
          <p className="m-0 muted">
            {t('chat.rows')}: {fmtInt(m.rows_used, locale)}
            {m.period && (m.period.start || m.period.end)
              ? ` · ${t('chat.period')}: ${fmtDate(m.period.start, locale)} – ${fmtDate(m.period.end, locale)}`
              : ''}
          </p>
          {Object.keys(m.inputs).length > 0 && (
            <p className="m-0 muted">
              {t('chat.inputs')}: {human(m.inputs)}
            </p>
          )}
          {m.steps.length > 0 && (
            <ol className="my-1 pl-5">
              {m.steps.map((s, k) => (
                <li key={k}>{s[locale]}</li>
              ))}
            </ol>
          )}
          {m.flags.length > 0 && (
            <p className="m-0" style={{ color: 'var(--warning)' }}>
              {t('chat.flags')}: {m.flags.join(', ')}
            </p>
          )}
        </div>
      ))}
    </details>
  );
}
