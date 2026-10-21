// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// AsOfBadge, StatusBadge, SampleBadge, LicenseBadge, QualityBadge (§10.4).
import { fmtAsOf } from '../shared/format.ts';
import type { DexEntry, DexStatus } from '../config/dex-registry.ts';
import { useTranslation, type Locale } from '../i18n/index.ts';

export function AsOfBadge({ asOf, locale }: { asOf: string | null | undefined; locale: Locale }) {
  const { t } = useTranslation();
  return <span className="badge num">{t('common.asOf', { date: fmtAsOf(asOf, locale) })}</span>;
}
export function StatusBadge({ status }: { status: DexStatus }) {
  const { t } = useTranslation();
  const cls = status === 'live' ? 'badge-live' : status === 'partial' ? 'badge-partial' : 'badge-pending';
  return <span className={`badge ${cls}`}>{t(`common.status_${status}`)}</span>;
}
export function DexBadges({
  dex,
  status,
  asOf,
  locale,
}: {
  dex: DexEntry;
  status: DexStatus;
  asOf: string | null | undefined;
  locale: Locale;
}) {
  const { t } = useTranslation();
  return (
    <span className="flex flex-wrap gap-1">
      <AsOfBadge asOf={asOf} locale={locale} />
      <StatusBadge status={status} />
      {dex.sample ? <span className="badge">{t('common.sample', { pct: Math.round(dex.sample * 100) })}</span> : null}
      {dex.license === 'CC BY-NC 4.0' ? (
        <span className="badge" title={dex.license}>
          {t('common.nc')}
        </span>
      ) : null}
      {dex.synthetic ? (
        <span className="badge" style={{ color: 'var(--warning)', borderColor: 'currentColor' }}>
          {t('common.synthetic')}
        </span>
      ) : null}
    </span>
  );
}
