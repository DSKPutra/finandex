// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Finandex AI "Pasar Global" (§9): 34 assets with sparklines, filters by category and region.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatTile } from '../../components/StatTile';
import { Chip, ErrorState, LoadingBlock } from '../../components/ui';
import { useJson } from '../../lib/data';
import { useLocale } from '../../lib/locale';
import { formatPercent, formatPrice } from '../../shared/format';

type Item = { symbol: string; slug: string; display_name: string; display_name_id: string; category: string; geo_region: string; quote_unit: string; metrics: Record<string, number | string | null>; quality: { low_precision: boolean } };
export type Spark = { as_of: string; assets: Record<string, { d: string[]; c: number[] }> };

/** Display precision (§10.5): FX 4 decimals, sub-1 prices 4, otherwise 2. */
export function decimalsFor(category: string, price: number | null | undefined): number {
  return category === 'Currency' || (typeof price === 'number' && Math.abs(price) < 1) ? 4 : 2;
}

export function GlobalMarkets() {
  const { t } = useTranslation();
  const locale = useLocale();
  const cat = useJson<{ as_of: string; items: Item[] }>('core/global/catalog.json');
  const spark = useJson<Spark>('core/global/spark.json');
  const [category, setCategory] = useState<string | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const items = useMemo(() => cat.data?.items ?? [], [cat.data]);
  const cats = useMemo(() => [...new Set(items.map((i) => i.category))], [items]);
  const regions = useMemo(() => [...new Set(items.map((i) => i.geo_region))], [items]);
  if (cat.isLoading) return <LoadingBlock />;
  if (cat.isError) return <ErrorState onRetry={() => void cat.refetch()} />;
  const shown = items.filter((i) => (!category || i.category === category) && (!region || i.geo_region === region));
  return (
    <div className="space-y-3">
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        <Chip active={!category} onClick={() => setCategory(null)}>
          {t('common.all')}
        </Chip>
        {cats.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
            {c}
          </Chip>
        ))}
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        <Chip active={!region} onClick={() => setRegion(null)}>
          {t('common.all')}
        </Chip>
        {regions.map((r) => (
          <Chip key={r} active={region === r} onClick={() => setRegion(r)}>
            {r}
          </Chip>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {shown.map((i) => {
          const m = i.metrics;
          const r1 = typeof m.ret_1D === 'number' ? m.ret_1D : null;
          const ytd = typeof m.ret_YTD === 'number' ? m.ret_YTD : null;
          return (
            <StatTile
              key={i.symbol}
              href={`/markets/${i.slug}`}
              label={`${locale === 'id' ? i.display_name_id : i.display_name} · ${i.symbol}`}
              value={formatPrice(m.last_close as number, locale, decimalsFor(i.category, m.last_close as number))}
              changes={[
                { label: '1D', value: r1, text: formatPercent(r1, locale, 2, true) },
                { label: 'YTD', value: ytd, text: formatPercent(ytd, locale, 2, true) },
              ]}
              spark={spark.data?.assets[i.symbol]?.c}
              footer={`${i.quote_unit}${i.quality.low_precision ? ` · ${t('dex.lowPrecision')}` : ''} · ${String(m.last_date)}`}
            />
          );
        })}
      </div>
    </div>
  );
}
