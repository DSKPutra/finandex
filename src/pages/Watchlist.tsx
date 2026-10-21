// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Cross-Dex watchlist stored on the device (§9).
import { Link } from 'react-router-dom';
import { DEX_BY_ID, isDexId } from '../config/dex-registry.ts';
import { useTranslation } from '../i18n/index.ts';
import { useSettings } from '../lib/settings.ts';
import { DexIcon } from '../components/DexCard.tsx';

export default function Watchlist() {
  const { t } = useTranslation();
  const list = useSettings((s) => s.watchlist);
  const toggle = useSettings((s) => s.toggleWatch);
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-2xl">{t('watchlist.title')}</h1>
      {!list.length && <p className="muted">{t('watchlist.empty')}</p>}
      <ul className="list-none p-0 m-0 flex flex-col gap-2">
        {list.map((w) =>
          isDexId(w.dex) ? (
            <li key={`${w.dex}:${w.entity}`} className="card p-3 flex items-center gap-3">
              <DexIcon id={DEX_BY_ID[w.dex].icon} size={28} />
              <Link
                to={`/dex/${w.dex}/${DEX_BY_ID[w.dex].tabs[1]?.id ?? 'chat'}/${encodeURIComponent(w.entity)}`}
                className="flex-1"
              >
                {w.name} <span className="muted text-sm">· {DEX_BY_ID[w.dex].name}</span>
              </Link>
              <button className="btn btn-sm" onClick={() => toggle(w)}>
                {t('common.removeWatch')}
              </button>
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}
