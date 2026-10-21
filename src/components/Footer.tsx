// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Web footer (§11.2): copyright for the locale, short disclaimer, legal links.
import { Link } from 'react-router-dom';
import { copyrightLine, DISCLAIMER_GENERAL_EN, DISCLAIMER_GENERAL_ID } from '../config/brand.ts';
import { useTranslation, type Locale } from '../i18n/index.ts';

export function Footer({ locale }: { locale: Locale }) {
  const { t } = useTranslation();
  return (
    <footer className="footer">
      <p className="m-0 mb-1">{locale === 'id' ? DISCLAIMER_GENERAL_ID : DISCLAIMER_GENERAL_EN}</p>
      <nav aria-label={t('nav.legal')} className="flex flex-wrap justify-center gap-3 my-2">
        {(['privacy', 'terms', 'disclaimer', 'data-sources', 'licenses'] as const).map((p) => (
          <Link key={p} to={`/legal/${p}`}>
            {t(`legal.${p === 'data-sources' ? 'dataSources' : p}`)}
          </Link>
        ))}
      </nav>
      <p className="m-0">{copyrightLine(locale)}</p>
    </footer>
  );
}
