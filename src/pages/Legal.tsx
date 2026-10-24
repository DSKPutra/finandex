// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// /legal/:page (§12.1): privacy (UU PDP), terms, disclaimer, data sources (registry + manifest),
// open-source licences (generated at build time into /licenses.json).
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, NavLink, useParams } from 'react-router';
import { useAsOfLabel } from '../components/badges';
import { Card, EmptyState, LoadingBlock } from '../components/ui';
import { DATA_NOTES } from '../config/data-notes';
import { visibleDex } from '../config/dex-registry';
import { INPUT_FILES } from '../config/inputs';
import { DISTRIBUTION, SUPPORT_EMAIL } from '../config/runtime';
import type { LegalSection } from '../content/legal';
import { LEGAL_UPDATED, PRIVACY, SECURITY, TERMS } from '../content/legal';
import { LEGAL_PAGES } from '../app/Footer';
import { useManifest } from '../lib/data';
import { useLocale } from '../lib/locale';
import { formatDate } from '../shared/format';

function Sections({ sections }: { sections: LegalSection[] }) {
  const locale = useLocale();
  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <section key={s.title.en}>
          <h2 className="mb-1 text-base font-semibold">{s.title[locale]}</h2>
          {s.body.map((p) => (
            <p key={p.en} className="mb-2 text-sm leading-relaxed">
              {p[locale]}
            </p>
          ))}
        </section>
      ))}
    </div>
  );
}

function DataSources() {
  const locale = useLocale();
  const { t } = useTranslation();
  const m = useManifest();
  const fmt = useAsOfLabel();
  return (
    <div className="space-y-3">
      {visibleDex(DISTRIBUTION).map((d) => (
        <Card key={d.id} as="article">
          <h2 className="text-base font-semibold">
            <Link to={`/dex/${d.id}/data`} className="underline-offset-2 hover:underline">
              {d.name}
            </Link>
          </h2>
          <ul className="mt-1 space-y-0.5 text-xs">
            {d.inputs.map((n) => (
              <li key={n} className="break-all">
                #{n} <code>{INPUT_FILES[n]}</code>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-sm">
            {t('dex.license')}: {d.license === 'unknown' ? (locale === 'id' ? 'tidak dicantumkan dalam file (menurut penyedia dataset)' : 'not stated in the file (per dataset provider)') : d.license}
            {d.commercialUseAllowed === false ? ` · ${locale === 'id' ? 'non-komersial' : 'non-commercial'}` : ''} · {t('dex.asOf')} {fmt(m.data?.dex[d.id]?.as_of ?? d.asOf)}
          </p>
          {DATA_NOTES[d.id].attribution?.map((a) => (
            <p key={a.en} className="text-xs text-muted">
              {a[locale]}
            </p>
          ))}
          <p className="mt-1 text-xs text-muted">{locale === 'id' ? 'Perubahan: pembersihan sesuai aturan di tab Data.' : 'Changes: cleaning per the rules in the Data tab.'}</p>
        </Card>
      ))}
      <p className="text-xs text-muted">{t('disclaimer.trademark')}</p>
    </div>
  );
}

type SbomIndex = { generated: string; commit: string; versions: { version: string; files: { name: string; bytes: number; sha256: string }[] }[] };
const kb = (b: number, locale: 'id' | 'en') => `${(b / 1024).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US', { maximumFractionDigits: 0 })} KB`;

/** /legal/sbom — SBOMs per version with size & SHA-256, plus how to verify (TECHNICAL_DOCS_PROMPT §4, B01/B02). */
function Sbom() {
  const locale = useLocale();
  const q = useQuery({ queryKey: ['sbom-index'], queryFn: async () => (await fetch('/sbom/index.json')).json() as Promise<SbomIndex>, staleTime: 600_000 });
  const L = (id: string, en: string) => (locale === 'id' ? id : en);
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <p>
        {L(
          'Software Bill of Materials (SBOM) adalah daftar semua komponen perangkat lunak dan data di dalam Finandex — nama, versi, pemasok, lisensi, hash, dan relasi dependensi. Setiap rilis menyertakan SBOM per artefak (web/PWA & server, Android, iOS, desktop, data & aset, referensi Python, alat build) dan satu SBOM induk yang juga mencantumkan layanan eksternal dan model AI.',
          'A Software Bill of Materials (SBOM) lists every software and data component in Finandex — name, version, supplier, licence, hash and dependency relationships. Each release ships one SBOM per artefact (web/PWA & server, Android, iOS, desktop, data & assets, Python reference, build tooling) and a master SBOM that also lists external services and AI models.',
        )}
      </p>
      <ul className="list-disc space-y-1 pl-5">
        <li>{L('Format utama CycloneDX 1.7 (ECMA-424), sekunder SPDX 2.3; elemen minimum CISA 2026 diperiksa otomatis.', 'Primary format CycloneDX 1.7 (ECMA-424), secondary SPDX 2.3; CISA 2026 minimum elements are checked automatically.')}</li>
        <li>{L('Setiap temuan pemindai kerentanan punya pernyataan VEX (file .vex.cdx.json).', 'Every vulnerability-scanner finding has a VEX statement (.vex.cdx.json).')}</li>
        <li>{L('Rilis bertag ditandatangani dengan Sigstore (keyless) dan diberi atestasi GitHub.', 'Tagged releases are signed with Sigstore (keyless) and attested with GitHub attestations.')}</li>
      </ul>
      {q.isLoading && <LoadingBlock />}
      {q.isError && <EmptyState />}
      {q.data?.versions.map((v) => (
        <Card key={v.version} as="section" className="space-y-2">
          <h2 className="text-base font-semibold">
            {L('Versi', 'Version')} {v.version} <span className="font-normal text-muted">· commit {q.data.commit}</span>
          </h2>
          <ul className="space-y-1.5">
            {v.files.map((file) => (
              <li key={file.name} className="break-all">
                <a href={`/sbom/${v.version}/${file.name}`} download className="font-medium text-primary underline">
                  {file.name}
                </a>{' '}
                <span className="text-muted">· {kb(file.bytes, locale)}</span>
                <span className="block font-mono text-[11px] text-muted">SHA-256 {file.sha256}</span>
              </li>
            ))}
          </ul>
        </Card>
      ))}
      <section className="space-y-2">
        <h2 className="text-base font-semibold">{L('Cara memverifikasi', 'How to verify')}</h2>
        <pre className="overflow-x-auto rounded-xl bg-pane-2 p-3 font-mono text-xs">{`shasum -a 256 -c SHA256SUMS
cosign verify-blob <file> --bundle <file>.sigstore.json \\
  --certificate-identity-regexp 'https://github.com/DSKPutra/finandex/.github/workflows/compliance.yml@.*' \\
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
gh attestation verify <file> -R DSKPutra/finandex`}</pre>
        <p className="text-xs text-muted">{L('Tanda tangan & atestasi dibuat oleh workflow rilis (tag v*). Panduan lengkap: docs/compliance/sbom/B02 di repo.', 'Signatures & attestations are produced by the release workflow (tag v*). Full guide: docs/compliance/sbom/B02 in the repository.')}</p>
      </section>
    </div>
  );
}

type Lic = { name: string; version: string; license: string; repository?: string };
function Licenses() {
  const locale = useLocale();
  const q = useQuery({ queryKey: ['licenses'], queryFn: async () => (await fetch('/licenses.json')).json() as Promise<Lic[]>, staleTime: Infinity });
  if (q.isLoading) return <LoadingBlock />;
  if (!q.data?.length) return <EmptyState />;
  return (
    <div>
      <p className="mb-2 text-sm text-muted">{locale === 'id' ? `${q.data.length} paket open-source dipakai dalam aplikasi ini.` : `${q.data.length} open-source packages are used in this app.`}</p>
      <ul className="divide-y divide-border text-sm">
        {q.data.map((l) => (
          <li key={`${l.name}@${l.version}`} className="flex flex-wrap justify-between gap-2 py-1.5">
            <span>
              {l.name} <span className="text-muted">{l.version}</span>
            </span>
            <span className="text-muted">{l.license}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Legal() {
  const { page = 'privacy' } = useParams();
  const { t } = useTranslation();
  const locale = useLocale();
  const known = (LEGAL_PAGES as readonly string[]).includes(page);
  return (
    <div className="max-w-3xl space-y-4">
      <nav aria-label={t('nav.legal')} className="no-scrollbar flex gap-2 overflow-x-auto">
        {LEGAL_PAGES.map((p) => (
          <NavLink key={p} to={`/legal/${p}`} className={({ isActive }) => `inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-sm ${isActive ? 'border-brand text-brand-text' : 'border-border'}`}>
            {t(`legal.${p}`)}
          </NavLink>
        ))}
      </nav>
      {!known ? (
        <EmptyState />
      ) : (
        <>
          <h1 className="text-2xl font-bold">{t(`legal.${page}`)}</h1>
          {(page === 'privacy' || page === 'terms') && (
            <p className="text-xs text-muted">
              {locale === 'id' ? 'Terakhir diperbarui' : 'Last updated'}: {formatDate(LEGAL_UPDATED, locale)}
            </p>
          )}
          {page === 'privacy' && <Sections sections={PRIVACY} />}
          {page === 'terms' && <Sections sections={TERMS} />}
          {page === 'security' && <Sections sections={SECURITY} />}
          {page === 'sbom' && <Sbom />}
          {page === 'disclaimer' && (
            <div className="space-y-3 text-sm leading-relaxed">
              <p>{t('disclaimer.general')}</p>
              <p>
                <strong>My LAIwyer.</strong> {t('disclaimer.law')}
              </p>
              <p>
                <strong>CryptDex.</strong> {t('disclaimer.cryptoBot')}
              </p>
              <p>
                <strong>SalaryDex · IDHousingDex · PersonalFinanDex.</strong> {t('disclaimer.sample')}
              </p>
              <p className="text-muted">{t('disclaimer.trademark')}</p>
            </div>
          )}
          {page === 'data-sources' && <DataSources />}
          {page === 'licenses' && <Licenses />}
          {(page === 'privacy' || page === 'terms') && (
            <p className="text-sm">
              {locale === 'id' ? 'Kontak' : 'Contact'}: {SUPPORT_EMAIL ? <a href={`mailto:${SUPPORT_EMAIL}`} className="text-brand-text underline">{SUPPORT_EMAIL}</a> : locale === 'id' ? '(alamat kontak akan diumumkan)' : '(contact address to be announced)'}
            </p>
          )}
        </>
      )}
    </div>
  );
}
