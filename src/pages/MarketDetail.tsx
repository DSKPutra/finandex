// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// /markets/:slug → Finandex AI entity detail for one of the 34 global assets.
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { DexHeader } from '../components/DexHeader';
import { EmptyState, LoadingBlock } from '../components/ui';
import { getDex } from '../config/dex-registry';
import { EntityDetail } from '../features/dex/EntityDetail';
import { useJson, useManifest } from '../lib/data';

export default function MarketDetail() {
  const { slug = '' } = useParams();
  const { t } = useTranslation();
  const m = useManifest();
  const cat = useJson<{ items: { slug: string; symbol: string }[] }>('core/global/catalog.json');
  const dex = getDex('finandex-ai')!;
  if (cat.isLoading) return <LoadingBlock />;
  const item = cat.data?.items.find((i) => i.slug === slug);
  if (!item) return <EmptyState message={t('dex.notFound')} />;
  return (
    <div className="space-y-4">
      <DexHeader dex={dex} asOf={m.data?.dex[dex.id]?.as_of} quality={m.data?.dex[dex.id]?.quality} />
      <EntityDetail dex={dex} entity={item.symbol} />
    </div>
  );
}
