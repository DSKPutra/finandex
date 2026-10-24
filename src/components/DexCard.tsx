// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// DexCard (§10.2): icon, name, tagline, as-of, status, sample/NC badges, 2 suggestion chips, "Open".
import { Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { DEX_GROUPS, groupStyle } from '../config/dex-groups';
import type { DexEntry } from '../config/dex-registry';
import { useLocale } from '../lib/locale';
import { AsOfBadge, LicenseBadge, SampleBadge, StatusBadge } from './badges';

export function DexIcon({ dex, size = 40 }: { dex: Pick<DexEntry, 'icon'> & Partial<Pick<DexEntry, 'group'>>; size?: number }) {
  const img = <img src={`/icons/${dex.icon}.svg`} alt="" width={size} height={size} className="shrink-0 rounded-xl" loading="lazy" decoding="async" />;
  if (!dex.group) return img;
  // Icon on a tile tinted with its category colour.
  return (
    <span className="g-tint-strong inline-flex shrink-0 rounded-2xl p-1" style={groupStyle(dex.group)}>
      {img}
    </span>
  );
}

export function DexCard({ dex, asOf }: { dex: DexEntry; asOf: string | undefined }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const nav = useNavigate();
  const chips = (t(`chips.${dex.id}`, { returnObjects: true }) as string[]).slice(0, 2);
  return (
    <article className="g-stripe flex flex-col overflow-hidden rounded-pane border border-border bg-surface p-4 transition-transform hover:-translate-y-0.5" style={groupStyle(dex.group)}>
      <div className="flex items-start gap-3">
        <DexIcon dex={dex} />
        <div className="min-w-0 flex-1">
          <p className="g-text text-[11px] font-semibold uppercase tracking-wide">{DEX_GROUPS.find((g) => g.id === dex.group)?.name[locale]}</p>
          <h3 className="truncate text-base font-semibold">{dex.name}</h3>
          <p className="line-clamp-2 text-sm text-muted">{dex.tagline[locale]}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        <AsOfBadge asOf={asOf ?? dex.asOf} />
        <StatusBadge status={dex.status} />
        <SampleBadge dex={dex} />
        <LicenseBadge dex={dex} />
      </div>
      <div className="mt-3 flex flex-col gap-1">
        {chips.map((q) => (
          <button key={q} type="button" onClick={() => nav(`/dex/${dex.id}/chat?q=${encodeURIComponent(q)}`)} className="min-h-9 rounded-xl border border-border px-3 py-1 text-left text-xs hover:bg-surface-2">
            {q}
          </button>
        ))}
      </div>
      <Link to={`/dex/${dex.id}`} className="g-tint g-text mt-3 inline-flex min-h-11 items-center justify-center rounded-xl text-sm font-semibold hover:brightness-95" aria-label={`${t('dex.open')} ${dex.name}`}>
        {t('dex.open')}
      </Link>
    </article>
  );
}
