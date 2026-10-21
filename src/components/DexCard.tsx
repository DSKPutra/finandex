// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// DexCard (§10.2): icon, name, tagline, as-of / status / sample / NC badges, 2 suggestion chips, "Open".
import { Link, useNavigate } from 'react-router-dom';
import type { DexEntry } from '../config/dex-registry.ts';
import { SUGGESTIONS } from '../config/suggestions.ts';
import { useTranslation, type Locale } from '../i18n/index.ts';
import type { Manifest } from '../lib/data.ts';
import { DexBadges } from './Badges.tsx';

export function DexIcon({ id, size = 40 }: { id: string; size?: number }) {
  return (
    <img
      src={`/icons/${id}.svg`}
      width={size}
      height={size}
      alt=""
      style={{ borderRadius: size * 0.22 }}
      loading="lazy"
    />
  );
}

export function DexCard({ dex, locale, manifest }: { dex: DexEntry; locale: Locale; manifest: Manifest | undefined }) {
  const { t } = useTranslation();
  const nav = useNavigate();
  const m = manifest?.dex[dex.id];
  const chips = (SUGGESTIONS[dex.id]?.[locale] ?? []).slice(0, 2);
  return (
    <article className="card p-4 flex flex-col gap-3">
      <div className="flex gap-3 items-start">
        <DexIcon id={dex.icon} />
        <div className="min-w-0">
          <h3 className="text-base">{dex.name}</h3>
          <p className="text-sm muted m-0">{dex.tagline[locale]}</p>
        </div>
      </div>
      <DexBadges dex={dex} status={m?.status ?? dex.status} asOf={m?.as_of ?? dex.asOf} locale={locale} />
      <div className="flex flex-col gap-1">
        {chips.map((q) => (
          <button key={q} className="chip" onClick={() => nav(`/dex/${dex.id}/chat?q=${encodeURIComponent(q)}`)}>
            {q}
          </button>
        ))}
      </div>
      <Link className="btn mt-auto self-start" to={`/dex/${dex.id}`} aria-label={`${t('common.open')} ${dex.name}`}>
        {t('common.open')}
      </Link>
    </article>
  );
}
