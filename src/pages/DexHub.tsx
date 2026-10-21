// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Dex Hub (/dex): the same grouped feature map as Home, without hero or market summary.
import { useTranslation } from '../i18n/index.ts';
import { useSettings } from '../lib/settings.ts';
import { FeatureMap } from '../components/FeatureMap.tsx';

export default function DexHub() {
  const { t } = useTranslation();
  const locale = useSettings((s) => s.locale);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl">{t('nav.dexHub')}</h1>
      <FeatureMap locale={locale} />
    </div>
  );
}
