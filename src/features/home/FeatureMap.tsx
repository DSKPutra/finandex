// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Feature map (§10.2.3–4): all Dex as cards grouped by function category, with text search, category
// chips, an "Indonesia" filter, and a "hide NC Dex" toggle (forced on in commercial builds).
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAsOfLabel } from '../../components/badges';
import { DexCard } from '../../components/DexCard';
import { Chip, EmptyState } from '../../components/ui';
import { DEX_GROUPS, groupStyle } from '../../config/dex-groups';
import type { DexGroupId } from '../../config/dex-groups';
import { visibleDex } from '../../config/dex-registry';
import type { DexEntry } from '../../config/dex-registry';
import { DISTRIBUTION } from '../../config/runtime';
import { useManifest } from '../../lib/data';
import { useLocale } from '../../lib/locale';
import { useApp } from '../../lib/store';
import { normaliseKey } from '../../shared/normalise';

export function filterDex(list: DexEntry[], o: { q: string; group: DexGroupId | null; indonesia: boolean; hideNc: boolean }): DexEntry[] {
  const k = normaliseKey(o.q);
  return list.filter(
    (d) =>
      (!o.group || d.group === o.group) &&
      (!o.indonesia || d.indonesia) &&
      (!o.hideNc || d.commercialUseAllowed !== false) &&
      (!k || normaliseKey([d.name, d.tagline.id, d.tagline.en, ...d.keywords].join(' ')).includes(k)),
  );
}

export type FeatureFilter = { q: string; group: DexGroupId | null; indonesia: boolean };

/** Filter state shared by the Feature Map and the Constellation (filters dim non-matching nodes, §10.2.5). */
export function useFeatureFilter() {
  const [f, setF] = useState<FeatureFilter>({ q: '', group: null, indonesia: false });
  const hideNcPref = useApp((s) => s.hideNc);
  const hideNc = DISTRIBUTION === 'commercial' || hideNcPref;
  const shown = useMemo(() => filterDex(visibleDex(DISTRIBUTION), { ...f, hideNc }), [f, hideNc]);
  const active = !!(f.q || f.group || f.indonesia || hideNcPref);
  const match = useMemo(() => (active ? new Set(shown.map((d) => d.id)) : null), [active, shown]);
  return { f, setF, shown, match, hideNc };
}

export function FeatureMap({ state }: { state?: ReturnType<typeof useFeatureFilter> }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const m = useManifest();
  const own = useFeatureFilter();
  const { f, setF, shown, hideNc } = state ?? own;
  const { q, group, indonesia } = f;
  const setQ = (v: string) => setF({ ...f, q: v });
  const setGroup = (v: DexGroupId | null) => setF({ ...f, group: v });
  const setIndonesia = (v: boolean) => setF({ ...f, indonesia: v });
  const setHideNc = useApp((s) => s.setHideNc);
  const commercial = DISTRIBUTION === 'commercial';

  return (
    <section aria-labelledby="feature-map">
      <h2 id="feature-map" tabIndex={-1} className="font-display text-2xl outline-none">
        {t('home.featureMap')}
      </h2>
      <p className="text-sm text-ink-muted">{t('home.featureMapIntro')}</p>
      <div className="mt-3 space-y-2">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('home.filterPlaceholder')} aria-label={t('home.filterPlaceholder')} className="min-h-11 w-full rounded-xl border border-edge bg-pane px-3 text-base sm:text-sm" />
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <Chip active={!group} onClick={() => setGroup(null)}>
            {t('home.allCategories')}
          </Chip>
          {DEX_GROUPS.map((g) => (
            <Chip key={g.id} active={group === g.id} onClick={() => setGroup(group === g.id ? null : g.id)} className="g-dot whitespace-nowrap" style={groupStyle(g.id)}>
              {g.name[locale]}
            </Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={indonesia} onClick={() => setIndonesia(!indonesia)}>
            {t('home.indonesia')}
          </Chip>
          <label className="inline-flex min-h-9 items-center gap-2 text-sm">
            <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" checked={hideNc} disabled={commercial} onChange={(e) => setHideNc(e.target.checked)} />
            {t('home.hideNc')}
          </label>
        </div>
      </div>
      {shown.length === 0 && (
        <div className="mt-4">
          <EmptyState message={t('home.noMatch')} />
        </div>
      )}
      {DEX_GROUPS.map((g, gi) => {
        const items = shown.filter((d) => d.group === g.id).sort((a, b) => a.order - b.order);
        if (!items.length) return null;
        return (
          <section key={g.id} className="mt-8 [contain-intrinsic-size:auto_640px] [content-visibility:auto]" style={groupStyle(g.id)} aria-labelledby={`grp-${g.id}`} data-gi={gi}>
            <h3 id={`grp-${g.id}`} className="g-dot font-display text-lg">
              {g.name[locale]}
            </h3>
            <p className="mb-3 text-sm text-ink-muted">{g.description[locale]}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {items.map((d) => (
                <DexCard key={d.id} dex={d} asOf={m.data?.dex[d.id]?.as_of} />
              ))}
            </div>
          </section>
        );
      })}
    </section>
  );
}

export function AsOfStrip() {
  const { t } = useTranslation();
  const m = useManifest();
  const fmt = useAsOfLabel();
  const dex = visibleDex(DISTRIBUTION);
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- horizontally scrollable region must be keyboard-focusable (axe scrollable-region-focusable)
    <section aria-label={t('home.asOfStrip')} tabIndex={0} className="no-scrollbar flex gap-2 overflow-x-auto py-1">
      <span className="shrink-0 text-xs font-semibold text-ink-muted">{t('home.asOfStrip')}:</span>
      {dex.map((d) => (
        <span key={d.id} className="shrink-0 whitespace-nowrap rounded-full border border-edge px-2 py-0.5 text-xs text-ink-muted">
          {d.name} <span className="text-data">{fmt(m.data?.dex[d.id]?.as_of ?? d.asOf)}</span>
        </span>
      ))}
    </section>
  );
}
