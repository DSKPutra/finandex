// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// DexHeader (§9): icon, name (Unbounded), tagline, "Data per …", quality, status, licence (NC), sample badges,
// "Tentang fitur ini" (feature guide sheet), the emergency button for FinLAIwyer / AntiScamDex, and the fixed
// banners of the law Dex (§9, §12.2).
import { useTranslation } from 'react-i18next';
import { DEX_GROUPS, groupStyle } from '../config/dex-groups';
import type { DexEntry } from '../config/dex-registry';
import { FeatureGuideButton } from '../features/guide/FeatureGuide';
import { useLocale } from '../lib/locale';
import { AsOfBadge, LicenseBadge, LiveBadge, QualityBadge, SampleBadge, StatusBadge } from './badges';
import { DexIcon } from './DexCard';
import { EmergencyScamButton } from './EmergencyScamButton';

export function DexHeader({ dex, asOf, quality }: { dex: DexEntry; asOf: string | undefined; quality: Record<string, unknown> | undefined }) {
  const locale = useLocale();
  const { t } = useTranslation();
  const banner = dex.id === 'mylaiwyer' ? 'banner.mylaiwyer' : dex.id === 'finlaiwyer' ? 'banner.finlaiwyer' : dex.id === 'antiscamdex' ? 'banner.antiscamdex' : null;
  return (
    <header className="space-y-3">
      <div className="g-tint g-rule flex flex-wrap items-start gap-3 rounded-pane p-4" style={groupStyle(dex.group)}>
        <DexIcon dex={dex} size={56} />
        <div className="min-w-0 flex-1">
          <p className="g-text text-xs font-semibold uppercase tracking-wide">{DEX_GROUPS.find((g) => g.id === dex.group)?.name[locale]}</p>
          <h1 className="font-display text-2xl sm:text-3xl">{dex.name}</h1>
          <p className="measure text-sm text-ink-muted">{dex.tagline[locale]}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            <AsOfBadge asOf={asOf ?? dex.asOf} />
            <LiveBadge dexId={dex.id} />
            <QualityBadge quality={quality} />
            <StatusBadge status={dex.status} />
            <LicenseBadge dex={dex} />
            <SampleBadge dex={dex} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(dex.id === 'finlaiwyer' || dex.id === 'antiscamdex') && <EmergencyScamButton size="sm" />}
          <FeatureGuideButton dex={dex} />
        </div>
      </div>
      {banner && (
        <p role="note" className="prov-flag rounded-xl bg-pane-2 px-3 py-2 text-sm">
          {t(banner)}
        </p>
      )}
    </header>
  );
}
