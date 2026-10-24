// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Cross-Dex watchlist (§9), stored on the device only.
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { DexIcon } from '../components/DexCard';
import { Button, EmptyState } from '../components/ui';
import { getDex, isDexId } from '../config/dex-registry';
import { entityHref } from '../lib/links';
import { useApp } from '../lib/store';

export default function Watchlist() {
  const { t } = useTranslation();
  const items = useApp((s) => s.watchlist);
  const toggle = useApp((s) => s.toggleWatch);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('nav.watchlist')}</h1>
      {items.length === 0 ? (
        <EmptyState message={t('common.empty')} />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((w) => {
            const d = getDex(w.dexId);
            if (!d || !isDexId(w.dexId)) return null;
            return (
              <li key={`${w.dexId}:${w.entity}`} className="flex items-center gap-3 rounded-pane border border-border bg-surface p-3">
                <DexIcon dex={d} size={32} />
                <Link to={entityHref(w.dexId, w.entity)} className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{w.label}</span>
                  <span className="text-xs text-muted">{d.name}</span>
                </Link>
                <Button size="sm" variant="ghost" onClick={() => toggle(w)} aria-label={`${t('dex.unwatch')} ${w.label}`}>
                  ✕
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
