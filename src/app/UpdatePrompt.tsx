// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// "New version available" prompt (§14) driven by the PWA service worker (registerType: prompt).
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useTranslation } from '../i18n/index.ts';

export function UpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [need, setNeed],
    updateServiceWorker,
  } = useRegisterSW();
  if (!need) return null;
  return (
    <div
      role="status"
      className="card fixed p-3 flex items-center gap-3"
      style={{ left: 16, right: 16, bottom: 88, zIndex: 90, maxWidth: 480, margin: '0 auto' }}
    >
      <span className="flex-1">{t('pwa.update')}</span>
      <button className="btn btn-primary btn-sm" onClick={() => void updateServiceWorker(true)}>
        {t('pwa.reload')}
      </button>
      <button className="btn btn-sm" onClick={() => setNeed(false)}>
        {t('common.close')}
      </button>
    </div>
  );
}
