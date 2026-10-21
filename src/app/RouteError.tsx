// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Route error boundary: friendly error / offline state with retry instead of the router's developer screen.
import { useRouteError } from 'react-router-dom';
import { useTranslation } from '../i18n/index.ts';
import { ErrorState, useOnline } from '../components/States.tsx';

export function RouteError() {
  const { t } = useTranslation();
  const err = useRouteError();
  const online = useOnline();
  const chunk =
    err instanceof Error &&
    /dynamically imported module|Importing a module script failed|Loading chunk/i.test(err.message);
  return (
    <div className="p-6" style={{ maxWidth: 640, margin: '10vh auto' }}>
      <ErrorState text={!online || chunk ? t('common.offline') : t('common.error')} onRetry={() => location.reload()} />
    </div>
  );
}
