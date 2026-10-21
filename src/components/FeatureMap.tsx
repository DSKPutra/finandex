// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Feature map (§10.2): all 27 Dex grouped in the 8 fixed categories, with text search, category chips, an Indonesia
// filter and "hide NC Dex" (forced on in commercial builds). Shared by Home and Dex Hub.
import { useMemo, useState } from 'react';
import { DEX_GROUPS } from '../config/dex-groups.ts';
import { fold } from '../shared/text.ts';
import { useTranslation, type Locale } from '../i18n/index.ts';
import { useManifest } from '../lib/data.ts';
import { DISTRIBUTION, visibleDex } from '../config/visible-dex.ts';

export { visibleDex };
import { DexCard } from './DexCard.tsx';

export function FeatureMap({ locale }: { locale: Locale }) {
  const { t } = useTranslation();
  const manifest = useManifest();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string | null>(null);
  const [indo, setIndo] = useState(false);
  const [hideNc, setHideNc] = useState(DISTRIBUTION === 'commercial');
  const list = useMemo(() => {
    const f = fold(q);
    return visibleDex(hideNc).filter(
      (d) =>
        (!indo || d.indonesia) &&
        (!group || d.group === group) &&
        (!f || fold([d.name, d.tagline.id, d.tagline.en, ...d.keywords].join(' ')).includes(f)),
    );
  }, [q, group, indo, hideNc]);
  return (
    <section aria-labelledby="feature-map" className="flex flex-col gap-4">
      <h2 id="feature-map" className="text-xl">
        {t('home.featureMap')}
      </h2>
      <div className="flex flex-col gap-2">
        <input
          className="input"
          type="search"
          placeholder={t('home.searchDex')}
          aria-label={t('home.searchDex')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          <button className="chip" aria-pressed={group === null} onClick={() => setGroup(null)}>
            {t('common.all')}
          </button>
          {DEX_GROUPS.map((g) => (
            <button
              key={g.id}
              className="chip"
              aria-pressed={group === g.id}
              onClick={() => setGroup(group === g.id ? null : g.id)}
            >
              {g.name[locale]}
            </button>
          ))}
          <button className="chip" aria-pressed={indo} onClick={() => setIndo(!indo)}>
            🇮🇩 {t('home.indonesiaOnly')}
          </button>
          <label className="chip gap-2">
            <input
              type="checkbox"
              checked={hideNc}
              disabled={DISTRIBUTION === 'commercial'}
              onChange={(e) => setHideNc(e.target.checked)}
            />{' '}
            {t('home.hideNc')}
          </label>
        </div>
      </div>
      {DEX_GROUPS.map((g) => {
        const items = list.filter((d) => d.group === g.id).sort((a, b) => a.order - b.order);
        if (!items.length) return null;
        return (
          <section key={g.id} aria-labelledby={`g-${g.id}`} className="flex flex-col gap-2">
            <h3 id={`g-${g.id}`} className="text-lg">
              {g.order}. {g.name[locale]}
            </h3>
            <p className="muted m-0 text-sm">{g.description[locale]}</p>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {items.map((d) => (
                <DexCard key={d.id} dex={d} locale={locale} manifest={manifest.data} />
              ))}
            </div>
          </section>
        );
      })}
      {!list.length && <p className="muted">{t('home.noMatch')}</p>}
    </section>
  );
}
