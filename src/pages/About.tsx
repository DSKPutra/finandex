// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// About (§11.3): wordmark (theme variant), credit, personal tagline, version & build, data sources & licenses,
// trademark notice, open-source licenses, copyright.
import { Link } from 'react-router-dom';
import {
  copyrightLine,
  CREDIT_EN,
  CREDIT_ID,
  DISCLAIMER_GENERAL_EN,
  DISCLAIMER_GENERAL_ID,
  PERSONAL_TAGLINE,
  TRADEMARK_NOTICE_EN,
  TRADEMARK_NOTICE_ID,
} from '../config/brand.ts';
import { APP_VERSION } from '../../server/dex/shared-tools.ts';
import { useTranslation } from '../i18n/index.ts';
import { useManifest } from '../lib/data.ts';
import { useSettings } from '../lib/settings.ts';

export default function About() {
  const { t } = useTranslation();
  const locale = useSettings((s) => s.locale);
  const theme = useSettings((s) => s.theme);
  const manifest = useManifest();
  const dark = typeof document !== 'undefined' ? document.documentElement.dataset.theme !== 'light' : theme !== 'light';
  return (
    <div className="flex flex-col gap-4" style={{ maxWidth: 860 }}>
      <h1 className="text-2xl">{t('about.title')}</h1>
      <section className="card p-6 flex flex-col items-center gap-3 text-center">
        <img
          src={dark ? '/brand/dskp-wordmark-on-dark.png' : '/brand/dskp-wordmark-on-light.png'}
          alt="Dea Saka Kurnia Putra"
          style={{ maxWidth: 'min(420px, 100%)', height: 'auto' }}
        />
        <p className="m-0 text-lg">{locale === 'id' ? CREDIT_ID : CREDIT_EN}</p>
        <p className="m-0 muted" style={{ letterSpacing: '0.12em', fontFamily: 'var(--font-display)' }}>
          {PERSONAL_TAGLINE}
        </p>
        <p className="m-0 text-sm muted num">
          {t('about.version')} {APP_VERSION} · {t('about.build')}{' '}
          {manifest.data?.build_id?.slice(0, 12) ?? (import.meta.env.VITE_BUILD_ID as string | undefined) ?? 'dev'}
        </p>
      </section>
      <section className="card p-4 text-sm flex flex-col gap-2">
        <p className="m-0">{locale === 'id' ? DISCLAIMER_GENERAL_ID : DISCLAIMER_GENERAL_EN}</p>
        <h2 className="text-base">{t('about.trademark')}</h2>
        <p className="m-0">{locale === 'id' ? TRADEMARK_NOTICE_ID : TRADEMARK_NOTICE_EN}</p>
        <p className="m-0 flex gap-3 flex-wrap">
          <Link to="/legal/data-sources">{t('about.sources')}</Link>
          <Link to="/legal/licenses">{t('about.oss')}</Link>
          <Link to="/legal/privacy">{t('legal.privacy')}</Link>
        </p>
        <p className="m-0 muted">{copyrightLine(locale)}</p>
      </section>
    </div>
  );
}
