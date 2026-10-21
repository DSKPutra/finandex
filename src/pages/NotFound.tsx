// © 2026 Dea Saka Kurnia Putra. All rights reserved.
import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n/index.ts';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="card p-6 text-center">
      <p>{t('common.notFound')}</p>
      <Link className="btn" to="/">
        {t('nav.home')}
      </Link>
    </div>
  );
}
