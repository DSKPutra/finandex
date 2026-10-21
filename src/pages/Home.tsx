// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Beranda (§10.2): hero with "Ask Finandex AI", whitepaper card (PDF first), market summary, feature map of all 27 Dex in 8 categories, as-of strip.
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { BookOpen, Download } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { APP_TAGLINE_EN, APP_TAGLINE_ID } from '../config/brand.ts';
import { DEX_REGISTRY } from '../config/dex-registry.ts';
import { pdfPath, whitepaper } from '../content/whitepaper.ts';
import { fmtAsOf, fmtPct, fmtPrice } from '../shared/format.ts';
import { useTranslation } from '../i18n/index.ts';
import { runTool, useManifest } from '../lib/data.ts';
import { useSettings } from '../lib/settings.ts';
import { FeatureMap } from '../components/FeatureMap.tsx';
import { Skeleton } from '../components/States.tsx';

const SUMMARY = ['^GSPC', '^IXIC', 'GC=F', 'BTC-USD', 'CL=F', 'EURUSD=X'];
/** fixed tile height so the prerendered skeleton row and the loaded tiles occupy the same space (no layout shift) */
const TILE_H = 136;

function MarketSummary() {
  const { t } = useTranslation();
  const locale = useSettings((s) => s.locale);
  const manifest = useManifest();
  const q = useQuery({
    queryKey: ['summary', locale],
    enabled: !manifest.isLoading,
    queryFn: () =>
      Promise.all(
        SUMMARY.map((id) =>
          runTool('finandex-ai', { tool: 'get_snapshot', input: { id } }, locale, manifest.data ?? null),
        ),
      ),
  });
  return (
    <section aria-labelledby="ms" className="flex flex-col gap-2">
      <h2 id="ms" className="text-xl">
        {t('home.marketSummary')}
      </h2>
      <div className="grid gap-2 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
        {(q.isLoading || q.isPending) && SUMMARY.map((s) => <Skeleton key={s} h={TILE_H} />)}
        {q.data?.map((r, i) => {
          if (!r.ok) return <div key={SUMMARY[i]} className="card" style={{ height: TILE_H }} />;
          const d = r.out.data as { id: string; name: string; metrics: Record<string, number | string> };
          const m = d.metrics;
          const tone = (v: unknown) => (typeof v === 'number' ? (v >= 0 ? 'pos' : 'neg') : '');
          const arrow = (v: unknown) => (typeof v === 'number' ? (v >= 0 ? '▲' : '▼') : '');
          return (
            <Link
              key={SUMMARY[i]}
              to={`/markets/${encodeURIComponent(d.id)}`}
              className="card p-3 no-underline num"
              style={{ color: 'var(--text)' }}
            >
              <p className="text-sm m-0 truncate">{d.name}</p>
              <p className="text-lg font-semibold m-0">
                {fmtPrice(m.last_close as number, locale, (m.last_close as number) < 10 ? 4 : 2)}
              </p>
              <p className="text-xs m-0">
                <span className={tone(m.ret_1D)}>
                  1D {arrow(m.ret_1D)} {fmtPct(m.ret_1D as number, locale)}
                </span>{' '}
                · <span className={tone(m.ret_YTD)}>YTD {fmtPct(m.ret_YTD as number, locale)}</span>
              </p>
              <p className="text-xs muted m-0">{t('common.asOf', { date: fmtAsOf(m.last_date as string, locale) })}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function WhitepaperCard() {
  const { t } = useTranslation();
  const locale = useSettings((s) => s.locale);
  const chapters = whitepaper(locale);
  return (
    <section aria-labelledby="wp" className="card p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <BookOpen size={22} aria-hidden="true" style={{ color: 'var(--brand-text)' }} />
        <h2 id="wp" className="text-xl m-0">
          {t('home.whitepaper')}
        </h2>
      </div>
      <p className="m-0 muted">{t('home.whitepaperLead')}</p>
      <div className="flex flex-wrap gap-2">
        <a className="btn btn-primary" href={pdfPath(locale)} download>
          <Download size={18} aria-hidden="true" /> {t('home.whitepaperPdf')}
        </a>
        <Link className="btn" to="/whitepaper">
          {t('home.whitepaperRead')}
        </Link>
      </div>
      <ol className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3 m-0 p-0" style={{ listStyle: 'none' }}>
        {chapters.map((c, i) => (
          <li key={c.slug}>
            <Link to={`/whitepaper/${c.slug}`} className="text-sm">
              <span className="num muted">{String(i + 1).padStart(2, '0')}</span> {c.title}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const locale = useSettings((s) => s.locale);
  const nav = useNavigate();
  const manifest = useManifest();
  const [q, setQ] = useState('');
  const ask = (s: string) => s.trim() && nav(`/ai?q=${encodeURIComponent(s.trim())}`);
  const sugg = t('home.suggestions', { returnObjects: true }) as string[];
  return (
    <div className="flex flex-col gap-8">
      <section
        className="card p-5 md:p-8 flex flex-col gap-4"
        style={{
          background: 'radial-gradient(1200px 300px at 10% -20%, rgba(25,242,58,.12), transparent), var(--surface)',
        }}
      >
        <div className="flex items-center gap-3">
          <img src="/icons/finandex.svg" width={56} height={56} alt="" />
          <div>
            <h1 className="text-2xl md:text-4xl" style={{ letterSpacing: '0.1em' }}>
              FINANDEX
            </h1>
            <p className="muted m-0">{locale === 'id' ? APP_TAGLINE_ID : APP_TAGLINE_EN}</p>
          </div>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            ask(q);
          }}
        >
          <label htmlFor="hero-ask" className="sr-only">
            {t('home.askPlaceholder')}
          </label>
          <input
            id="hero-ask"
            className="input text-lg"
            placeholder={t('home.askPlaceholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">
            {t('home.ask')}
          </button>
        </form>
        <div className="flex flex-wrap gap-2">
          {sugg.map((s) => (
            <button key={s} className="chip" onClick={() => ask(s)}>
              {s}
            </button>
          ))}
        </div>
      </section>
      <WhitepaperCard />
      <MarketSummary />
      <FeatureMap locale={locale} />
      <section aria-labelledby="asof" className="flex flex-col gap-2">
        <h2 id="asof" className="text-lg">
          {t('home.asOfStrip')}
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {DEX_REGISTRY.map((d) => (
            <Link
              key={d.id}
              to={`/dex/${d.id}/data`}
              className="badge no-underline num"
              style={{ color: 'var(--text)' }}
            >
              {d.name}: {fmtAsOf(manifest.data?.dex[d.id]?.as_of ?? d.asOf, locale)}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
