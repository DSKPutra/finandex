// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Loading skeleton, empty, error (with retry), offline and pending-data states (§10.4).
import { useEffect, useState } from 'react';
import { useTranslation } from '../i18n/index.ts';

export function Skeleton({ h = 240 }: { h?: number }) {
  return <div className="skeleton" style={{ height: h }} aria-busy="true" aria-label="loading" />;
}
export function EmptyState({ text }: { text?: string }) {
  const { t } = useTranslation();
  return <p className="muted p-4 text-center">{text ?? t('common.empty')}</p>;
}
export function ErrorState({ text, onRetry }: { text?: string; onRetry?: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="card p-4 text-center" role="alert">
      <p className="m-0 mb-2">{text ?? t('common.error')}</p>
      {onRetry && (
        <button className="btn" onClick={onRetry}>
          {t('common.retry')}
        </button>
      )}
    </div>
  );
}
export function PendingState({ text }: { text?: string }) {
  const { t } = useTranslation();
  return (
    <div className="card p-4" style={{ borderLeft: '3px solid var(--negative)' }} role="status">
      {text ?? t('common.pendingData')}
    </div>
  );
}
export function useOnline(): boolean {
  const [on, setOn] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const a = () => setOn(true);
    const b = () => setOn(false);
    window.addEventListener('online', a);
    window.addEventListener('offline', b);
    return () => {
      window.removeEventListener('online', a);
      window.removeEventListener('offline', b);
    };
  }, []);
  return on;
}
export function OfflineBanner() {
  const { t } = useTranslation();
  const on = useOnline();
  if (on) return null;
  return (
    <div
      role="status"
      className="text-sm p-2 text-center"
      style={{ background: 'var(--surface-2)', color: 'var(--warning)' }}
    >
      {t('common.offline')}
    </div>
  );
}
