// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// QuoteCard (law citation with "view original page") and InfoCard (info / warning / pending, optional Dex link).
import { Link } from 'react-router-dom';
import type { ChartSpec } from '../shared/chart-spec.ts';
import { useTranslation, type Locale } from '../i18n/index.ts';

type Quote = Extract<ChartSpec, { type: 'quote' }>;
type Card = Extract<ChartSpec, { type: 'card' }>;

export function QuoteCard({ spec, locale }: { spec: Quote; locale: Locale }) {
  return (
    <figure className="m-0">
      <figcaption className="text-sm muted mb-1">
        {spec.doc_title} · {spec.label} · {locale === 'id' ? 'hal.' : 'p.'} {spec.page}
      </figcaption>
      <blockquote
        className="m-0 p-3"
        style={{
          borderLeft: '3px solid var(--brand)',
          background: 'var(--surface-2)',
          borderRadius: 8,
          whiteSpace: 'pre-wrap',
        }}
      >
        {spec.text}
      </blockquote>
      {spec.note && (
        <p className="text-sm mt-2" style={{ color: 'var(--warning)' }}>
          {spec.note}
        </p>
      )}
      <Link
        className="btn btn-sm mt-2"
        to={`/dex/mylaiwyer/browse/${encodeURIComponent(`${spec.doc_id}@${spec.page}`)}`}
      >
        {locale === 'id' ? 'Lihat halaman asli' : 'View original page'}
      </Link>
    </figure>
  );
}

export function InfoCard({ spec }: { spec: Card }) {
  const { t } = useTranslation();
  const color =
    spec.tone === 'warning' ? 'var(--warning)' : spec.tone === 'pending' ? 'var(--negative)' : 'var(--info)';
  return (
    <div className="p-3" style={{ borderLeft: `3px solid ${color}`, background: 'var(--surface-2)', borderRadius: 8 }}>
      <p className="m-0">{spec.body}</p>
      {spec.items && spec.items.length > 0 && (
        <ul className="mt-2 mb-0 pl-5 text-sm">
          {spec.items.map((i, k) => (
            <li key={k}>{i}</li>
          ))}
        </ul>
      )}
      {spec.link && (
        <Link
          className="btn btn-sm mt-2"
          to={`/dex/${spec.link.dex}${spec.link.entity ? `/chat?entity=${encodeURIComponent(spec.link.entity)}` : ''}`}
        >
          {spec.link.label || t('common.open')}
        </Link>
      )}
    </div>
  );
}
