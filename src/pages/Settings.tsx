// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Settings: language, theme, colour-blind mode, local data deletion (§13.2).
import { useState } from 'react';
import { useTranslation } from '../i18n/index.ts';
import { useSettings } from '../lib/settings.ts';
import { deleteAllConversations } from '../chat/history.ts';

export default function Settings() {
  const { t } = useTranslation();
  const s = useSettings();
  const [done, setDone] = useState<string | null>(null);
  const row = 'card p-4 flex flex-wrap items-center justify-between gap-3';
  return (
    <div className="flex flex-col gap-3" style={{ maxWidth: 720 }}>
      <h1 className="text-2xl">{t('settings.title')}</h1>
      <label className={row}>
        <span>{t('settings.language')}</span>
        <select
          className="input"
          style={{ width: 200 }}
          value={s.locale}
          onChange={(e) => s.set({ locale: e.target.value as 'id' | 'en' })}
        >
          <option value="id">Bahasa Indonesia</option>
          <option value="en">English</option>
        </select>
      </label>
      <label className={row}>
        <span>{t('settings.theme')}</span>
        <select
          className="input"
          style={{ width: 200 }}
          value={s.theme}
          onChange={(e) => s.set({ theme: e.target.value as 'dark' | 'light' | 'system' })}
        >
          <option value="dark">{t('settings.dark')}</option>
          <option value="light">{t('settings.light')}</option>
          <option value="system">{t('settings.system')}</option>
        </select>
      </label>
      <label className={row}>
        <span>{t('settings.colorblind')}</span>
        <input
          type="checkbox"
          style={{ width: 24, height: 24 }}
          checked={s.colorblind}
          onChange={(e) => s.set({ colorblind: e.target.checked })}
        />
      </label>
      <div className={row}>
        <button className="btn" onClick={() => void deleteAllConversations().then(() => setDone('history'))}>
          {t('settings.clearHistory')}
        </button>
        <button className="btn" onClick={() => (s.set({ watchlist: [] }), setDone('watch'))}>
          {t('settings.clearWatchlist')}
        </button>
        <button className="btn" onClick={() => (s.set({ consentVersion: 0 }), setDone('consent'))}>
          {t('settings.resetConsent')}
        </button>
        {done && (
          <span role="status" className="muted">
            {t('settings.cleared')}
          </span>
        )}
      </div>
    </div>
  );
}
