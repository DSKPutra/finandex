// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Legal pages (§12.1): privacy (UU No. 27/2022 PDP), terms, disclaimer, data sources (generated from registry +
// manifest) and open-source licenses (generated at build into /oss-licenses.json).
import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import {
  copyrightLine,
  DISCLAIMER_CRYPTO_EN,
  DISCLAIMER_CRYPTO_ID,
  DISCLAIMER_GENERAL_EN,
  DISCLAIMER_GENERAL_ID,
  DISCLAIMER_LAW_EN,
  DISCLAIMER_LAW_ID,
  DISCLAIMER_SAMPLE_EN,
  DISCLAIMER_SAMPLE_ID,
  TRADEMARK_NOTICE_EN,
  TRADEMARK_NOTICE_ID,
} from '../config/brand.ts';
import { INPUT_FILES } from '../config/data-sources.ts';
import { DEX_BY_ID } from '../config/dex-registry.ts';
import { useTranslation, type Locale } from '../i18n/index.ts';
import { DISTRIBUTION, useManifest } from '../lib/data.ts';
import { useSettings } from '../lib/settings.ts';
import NotFound from './NotFound.tsx';

const SUPPORT = (import.meta.env.VITE_SUPPORT_EMAIL as string | undefined) || null;

const TEXT: Record<'privacy' | 'terms', Record<Locale, string[]>> = {
  privacy: {
    id: [
      'Kebijakan ini disusun dengan mengacu pada Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi.',
      'Finandex tidak memerlukan akun. Aplikasi membuat pengenal acak (clientId) di perangkat Anda untuk pembatasan laju permintaan; pengenal ini bukan data pribadi dan dapat dihapus dengan menghapus data situs.',
      'Riwayat chat, watchlist, dan preferensi hanya disimpan di perangkat Anda (IndexedDB/penyimpanan lokal) dan dapat dihapus kapan saja dari Pengaturan.',
      'Saat Anda memakai chat, isi pesan dikirim ke server Finandex dan diproses oleh penyedia AI (Anthropic) untuk menghasilkan jawaban. Jangan memasukkan data pribadi. Pesan yang memuat pola data sensitif (seed phrase, private key, nomor kartu, NIK) diblokir sebelum dikirim.',
      'Server mencatat metadata teknis tanpa isi pesan (id permintaan, Dex, nama tool, latensi, jumlah token, kode galat) untuk keamanan dan keandalan.',
      'Finandex tidak memakai analitik pihak ketiga, iklan, atau pelacakan lintas situs.',
      'Hak Anda sebagai subjek data (akses, koreksi, penghapusan, penarikan persetujuan) dapat dilaksanakan langsung di perangkat atau dengan menghubungi kontak di bawah.',
    ],
    en: [
      'This policy is written with reference to Indonesian Law No. 27 of 2022 on Personal Data Protection.',
      'Finandex requires no account. The app creates a random identifier (clientId) on your device for rate limiting; it is not personal data and is removed when you clear site data.',
      'Chat history, watchlist and preferences are stored only on your device (IndexedDB/local storage) and can be deleted at any time in Settings.',
      'When you use chat, your message is sent to the Finandex server and processed by an AI provider (Anthropic) to generate an answer. Do not enter personal data. Messages matching sensitive-data patterns (seed phrase, private key, card number, national ID) are blocked before sending.',
      'The server logs technical metadata without message content (request id, Dex, tool names, latency, token counts, error codes) for security and reliability.',
      'Finandex uses no third-party analytics, advertising or cross-site tracking.',
      'Your data-subject rights (access, correction, deletion, withdrawal of consent) can be exercised directly on your device or via the contact below.',
    ],
  },
  terms: {
    id: [
      'Finandex menyajikan data historis untuk informasi dan edukasi. Dengan memakai aplikasi, Anda setuju untuk tidak menjadikannya dasar tunggal keputusan keuangan atau hukum.',
      'Data berasal dari dataset pihak ketiga sebagaimana tercantum di halaman Sumber Data, dengan lisensi masing-masing. Dataset berlisensi non-komersial (CC BY-NC 4.0) hanya untuk penggunaan non-komersial.',
      'Dilarang menyalin, memodifikasi, atau mendistribusikan perangkat lunak Finandex tanpa izin tertulis dari pemegang hak cipta.',
      'Layanan disediakan "sebagaimana adanya" tanpa jaminan ketersediaan, kelengkapan, atau ketepatan data.',
    ],
    en: [
      'Finandex presents historical data for information and education. By using the app you agree not to rely on it as the sole basis for financial or legal decisions.',
      'Data comes from third-party datasets listed on the Data Sources page, under their respective licenses. Non-commercial (CC BY-NC 4.0) datasets are for non-commercial use only.',
      'You may not copy, modify or distribute the Finandex software without the written permission of the copyright holder.',
      'The service is provided "as is" without warranty of availability, completeness or accuracy of the data.',
    ],
  },
};

function Contact({ locale }: { locale: Locale }) {
  return (
    <p className="muted">
      {SUPPORT ? (
        <a href={`mailto:${SUPPORT}`}>{SUPPORT}</a>
      ) : locale === 'id' ? (
        'Alamat email dukungan belum ditetapkan.'
      ) : (
        'The support email address has not been set yet.'
      )}
    </p>
  );
}

function DataSources({ locale }: { locale: Locale }) {
  const { t } = useTranslation();
  const manifest = useManifest();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left muted">
            <th className="p-2">#</th>
            <th className="p-2">File</th>
            <th className="p-2">Dex</th>
            <th className="p-2">{t('common.license')}</th>
            <th className="p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {INPUT_FILES.map((f) => {
            const st = manifest.data?.dex[f.dex];
            const missing = st?.missing_inputs?.includes(f.no);
            return (
              <tr key={f.no} style={{ borderTop: '1px solid var(--border)' }}>
                <td className="p-2 num">{f.no}</td>
                <td className="p-2">
                  <code style={{ wordBreak: 'break-all' }}>{f.file}</code>
                  {f.provider ? <span className="muted"> · {f.provider}</span> : null}
                </td>
                <td className="p-2">
                  <Link to={`/dex/${f.dex}/data`}>{DEX_BY_ID[f.dex].name}</Link>
                </td>
                <td className="p-2">{/tidak dicantumkan/.test(f.license) ? t('common.unknownLicense') : f.license}</td>
                <td className="p-2">{missing ? t('common.status_pending-data') : t('common.status_live')}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-sm muted mt-2">
        {locale === 'id' ? 'Distribusi build' : 'Build distribution'}: {DISTRIBUTION}
      </p>
    </div>
  );
}

function OssLicenses() {
  const q = useQuery({
    queryKey: ['oss'],
    queryFn: () =>
      fetch('/oss-licenses.json').then((r) =>
        r.ok ? (r.json() as Promise<{ name: string; version: string; license: string }[]>) : [],
      ),
  });
  return (
    <ul className="text-sm pl-5">
      {(q.data ?? []).map((p) => (
        <li key={p.name}>
          {p.name}@{p.version} — {p.license}
        </li>
      ))}
    </ul>
  );
}

export default function Legal() {
  const { t } = useTranslation();
  const locale = useSettings((s) => s.locale);
  const { page } = useParams();
  const titles: Record<string, string> = {
    privacy: t('legal.privacy'),
    terms: t('legal.terms'),
    disclaimer: t('legal.disclaimer'),
    'data-sources': t('legal.dataSources'),
    licenses: t('legal.licenses'),
  };
  if (!page || !titles[page]) return <NotFound />;
  const L = (id: string, en: string) => (locale === 'id' ? id : en);
  return (
    <article className="card p-5 flex flex-col gap-3" style={{ maxWidth: 960 }}>
      <h1 className="text-2xl">{titles[page]}</h1>
      {(page === 'privacy' || page === 'terms') &&
        TEXT[page][locale].map((p, i) => (
          <p key={i} className="m-0">
            {p}
          </p>
        ))}
      {page === 'disclaimer' && (
        <>
          <p className="m-0">{L(DISCLAIMER_GENERAL_ID, DISCLAIMER_GENERAL_EN)}</p>
          <p className="m-0">
            <strong>My LAIwyer:</strong> {L(DISCLAIMER_LAW_ID, DISCLAIMER_LAW_EN)}
          </p>
          <p className="m-0">
            <strong>CryptDex:</strong> {L(DISCLAIMER_CRYPTO_ID, DISCLAIMER_CRYPTO_EN)}
          </p>
          <p className="m-0">
            <strong>SalaryDex / IDHousingDex / PersonalFinanDex:</strong>{' '}
            {L(DISCLAIMER_SAMPLE_ID, DISCLAIMER_SAMPLE_EN)}
          </p>
          <p className="m-0">{L(TRADEMARK_NOTICE_ID, TRADEMARK_NOTICE_EN)}</p>
        </>
      )}
      {page === 'data-sources' && <DataSources locale={locale} />}
      {page === 'licenses' && <OssLicenses />}
      {(page === 'privacy' || page === 'terms') && <Contact locale={locale} />}
      <p className="text-sm muted m-0">{copyrightLine(locale)}</p>
    </article>
  );
}
