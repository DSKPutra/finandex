// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// About (§11.3): personal wordmark (theme-aware), credit, personal tagline, version & build, data sources
// & licences (from the registry), trademark notice, open-source licences link.
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Card } from '../components/ui';
import { appTaglineFor, copyrightFor, creditFor, PERSONAL_TAGLINE } from '../config/brand';
import { visibleDex } from '../config/dex-registry';
import { APP_VERSION, BUILD_ID, DISTRIBUTION } from '../config/runtime';
import { useManifest } from '../lib/data';
import { useLocale } from '../lib/locale';

export default function About() {
  const { t } = useTranslation();
  const locale = useLocale();
  const m = useManifest();
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">{t('about.title')}</h1>
      <Card className="space-y-3 text-center">
        <img src="/brand/dskp-wordmark-on-dark.png" alt="Dea Saka Kurnia Putra" width={1375} height={436} className="only-dark mx-auto h-auto w-full max-w-sm" />
        <img src="/brand/dskp-wordmark-on-light.png" alt="Dea Saka Kurnia Putra" width={1375} height={436} className="only-light mx-auto h-auto w-full max-w-sm" />
        <p className="font-display text-xs tracking-[0.25em] text-muted">{PERSONAL_TAGLINE}</p>
        <p className="text-base">{creditFor(locale)}</p>
        <p className="text-sm text-muted">
          Finandex — {appTaglineFor(locale)}
        </p>
        <p className="text-xs text-muted">
          {t('about.version')} {APP_VERSION} · {t('about.build')} {BUILD_ID}
          {m.data ? ` · data ${m.data.build_id}` : ''} · {DISTRIBUTION}
        </p>
        <p className="text-xs text-muted">{copyrightFor(locale, new Date().getFullYear())}</p>
      </Card>
      <Card>
        <p className="text-sm">{t('disclaimer.general')}</p>
      </Card>
      <Card>
        <h2 className="mb-2 text-base font-semibold">{t('about.sources')}</h2>
        <ul className="divide-y divide-border text-sm">
          {visibleDex(DISTRIBUTION).map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <Link to={`/dex/${d.id}/data`} className="font-medium underline-offset-2 hover:underline">
                {d.name}
              </Link>
              <span className="text-xs text-muted">{d.license === 'unknown' ? (locale === 'id' ? 'lisensi menurut penyedia dataset' : 'licence per dataset provider') : d.license}</span>
            </li>
          ))}
        </ul>
        <Link to="/legal/data-sources" className="mt-2 inline-flex min-h-11 items-center text-sm text-brand-text underline">
          {t('legal.data-sources')} →
        </Link>
      </Card>
      <Card>
        <p className="text-xs text-muted">{t('disclaimer.trademark')}</p>
        <Link to="/legal/licenses" className="mt-2 inline-flex min-h-11 items-center text-sm text-brand-text underline">
          {t('about.oss')} →
        </Link>
      </Card>
    </div>
  );
}
