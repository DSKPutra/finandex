// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Data tab (§9, last tab of every Dex): exact source files (§3.1), coverage, as-of, cleaning rules, quality report,
// license & attribution — generated from the registry, data-sources config and the tools.
import type { DexEntry } from '../config/dex-registry.ts';
import { inputsForDex } from '../config/data-sources.ts';
import { DATASET_NOTES } from '../../server/dex/dataset-notes.ts';
import { useTranslation } from '../i18n/index.ts';
import { useManifest } from '../lib/data.ts';
import { useSettings } from '../lib/settings.ts';
import { DexBadges } from '../components/Badges.tsx';
import { TabView } from '../dex/TabView.tsx';

const QUALITY = { calls: () => [{ tool: 'data_quality', input: {} }] };

export function DataTab({ dex }: { dex: DexEntry }) {
  const { t } = useTranslation();
  const locale = useSettings((s) => s.locale);
  const manifest = useManifest();
  const m = manifest.data?.dex[dex.id];
  const notes = DATASET_NOTES[dex.id];
  const files = inputsForDex(dex.id);
  return (
    <div className="flex flex-col gap-4">
      <section className="card p-4 flex flex-col gap-2">
        <h2 className="text-lg">{t('data.title')}</h2>
        <p className="m-0">{notes.dataset}</p>
        <p className="m-0 muted">{dex.scope[locale]}</p>
        <DexBadges dex={dex} status={m?.status ?? dex.status} asOf={m?.as_of ?? dex.asOf} locale={locale} />
        {dex.statusNote && (
          <p className="m-0" style={{ color: 'var(--warning)' }}>
            {dex.statusNote[locale]}
          </p>
        )}
      </section>
      <section className="card p-4">
        <h3 className="text-base mb-2">{t('data.files')}</h3>
        <ul className="m-0 pl-5 text-sm">
          {files.map((f) => (
            <li key={f.no}>
              #{f.no} <code>{f.file}</code> —{' '}
              {/tidak dicantumkan/.test(f.license) ? t('common.unknownLicense') : f.license}
              {f.provider ? ` · ${f.provider}` : ''}
              {m?.missing_inputs?.includes(f.no) ? (
                <strong style={{ color: 'var(--negative)' }}> · {t('common.status_pending-data')}</strong>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
      <section className="card p-4 grid gap-4 md:grid-cols-2">
        <div>
          <h3 className="text-base mb-2">{t('data.rules')}</h3>
          <ul className="m-0 pl-5 text-sm">
            {notes.rules.map((r, i) => (
              <li key={i}>{r[locale]}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-base mb-2">{t('data.limits')}</h3>
          <ul className="m-0 pl-5 text-sm">
            {notes.limits.map((r, i) => (
              <li key={i}>{r[locale]}</li>
            ))}
          </ul>
        </div>
      </section>
      <section className="flex flex-col gap-2">
        <h3 className="text-base">{t('data.report')}</h3>
        <TabView dex={dex.id} tab="data" view={QUALITY} />
      </section>
      <section className="card p-4 text-sm">
        <h3 className="text-base mb-2">{t('data.attribution')}</h3>
        <p className="m-0">
          {t('common.license')}: {dex.license === 'unknown' ? t('common.unknownLicense') : dex.license}
          {dex.commercialUseAllowed === false ? ` · ${t('common.nc')}` : ''}
        </p>
      </section>
    </div>
  );
}
