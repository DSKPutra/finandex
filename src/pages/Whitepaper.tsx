// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Whitepaper reader (/whitepaper/:chapter?) in a GitBook-style layout: chapter list on the left, one chapter per
// page with previous/next cards, "on this page" headings on the right. The first action is the PDF download.
import { BookOpen, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { copyrightLine } from '../config/brand.ts';
import {
  headings,
  pdfPath,
  whitepaper,
  WHITEPAPER_DATE,
  WHITEPAPER_SUBTITLE,
  WHITEPAPER_TITLE,
  WHITEPAPER_VERSION,
} from '../content/whitepaper.ts';
import { WhitepaperMarkdown } from '../components/WhitepaperMarkdown.tsx';
import { fmtAsOf } from '../shared/format.ts';
import { useSettings } from '../lib/settings.ts';
import type { Locale } from '../i18n/index.ts';

const UI: Record<Locale, Record<string, string>> = {
  id: {
    download: 'Unduh PDF',
    other: 'English PDF',
    chapters: 'Daftar isi',
    onThisPage: 'Di halaman ini',
    prev: 'Sebelumnya',
    next: 'Berikutnya',
    updated: 'Diperbarui',
    version: 'Versi',
  },
  en: {
    download: 'Download PDF',
    other: 'PDF Bahasa Indonesia',
    chapters: 'Contents',
    onThisPage: 'On this page',
    prev: 'Previous',
    next: 'Next',
    updated: 'Updated',
    version: 'Version',
  },
};

export default function Whitepaper() {
  const locale = useSettings((s) => s.locale);
  const { chapter } = useParams();
  const chapters = whitepaper(locale);
  const other: Locale = locale === 'id' ? 'en' : 'id';
  const ui = UI[locale];

  // A slug from the other language (e.g. after switching locale) maps to the same chapter by position.
  let idx = chapters.findIndex((c) => c.slug === chapter);
  if (idx < 0 && chapter) idx = whitepaper(other).findIndex((c) => c.slug === chapter);
  const current = chapters[Math.max(idx, 0)]!;
  const toc = headings(current.body);
  const prev = idx > 0 ? chapters[idx - 1] : undefined;
  const next = chapters[Math.max(idx, 0) + 1];

  useEffect(() => {
    document.title = `${current.title} · ${WHITEPAPER_TITLE[locale]}`;
    window.scrollTo({ top: 0 });
  }, [current.title, locale]);

  if (chapter && idx >= 0 && chapters[idx]!.slug !== chapter)
    return <Navigate to={`/whitepaper/${current.slug}`} replace />;
  if (chapter && idx < 0) return <Navigate to="/whitepaper" replace />;

  const nav = (
    <ol className="wp-nav">
      {chapters.map((c, i) => (
        <li key={c.slug}>
          <Link to={`/whitepaper/${c.slug}`} aria-current={c.slug === current.slug ? 'page' : undefined}>
            <span className="num muted">{String(i + 1).padStart(2, '0')}</span> {c.title}
          </Link>
        </li>
      ))}
    </ol>
  );

  return (
    <div className="wp flex flex-col gap-4">
      <header className="card p-4 md:p-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <BookOpen size={28} aria-hidden="true" style={{ color: 'var(--brand-text)', flex: 'none' }} />
          <div className="min-w-0">
            <p className="m-0 text-xl font-semibold" style={{ fontFamily: 'var(--font-display)' }}>
              {WHITEPAPER_TITLE[locale]}
            </p>
            <p className="m-0 text-sm muted">{WHITEPAPER_SUBTITLE[locale]}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className="btn btn-primary" href={pdfPath(locale)} download>
            <Download size={18} aria-hidden="true" /> {ui.download}
          </a>
          <a className="btn" href={pdfPath(other)} download hrefLang={other}>
            {ui.other}
          </a>
        </div>
      </header>

      <details className="wp-mobile-nav card p-3 lg:hidden">
        <summary className="font-semibold">
          {ui.chapters}: {current.title}
        </summary>
        {nav}
      </details>

      <div className="wp-grid">
        <aside className="wp-left hidden lg:block" aria-label={ui.chapters}>
          <p className="wp-label">{ui.chapters}</p>
          {nav}
        </aside>

        <article className="wp-main card p-5 md:p-8 min-w-0">
          <p className="m-0 text-sm muted">
            {String(Math.max(idx, 0) + 1).padStart(2, '0')} / {String(chapters.length).padStart(2, '0')}
          </p>
          <h1 className="text-2xl md:text-3xl mt-1 mb-2">{current.title}</h1>
          <p className="m-0 text-xs muted num">
            {ui.version} {WHITEPAPER_VERSION} · {ui.updated} {fmtAsOf(WHITEPAPER_DATE, locale)}
          </p>
          <WhitepaperMarkdown body={current.body} />
          <nav className="wp-pager" aria-label={`${ui.prev} / ${ui.next}`}>
            {prev ? (
              <Link to={`/whitepaper/${prev.slug}`} className="card p-3 no-underline">
                <span className="text-xs muted flex items-center gap-1">
                  <ChevronLeft size={14} aria-hidden="true" /> {ui.prev}
                </span>
                <span className="font-semibold">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link to={`/whitepaper/${next.slug}`} className="card p-3 no-underline text-right">
                <span className="text-xs muted flex items-center gap-1 justify-end">
                  {ui.next} <ChevronRight size={14} aria-hidden="true" />
                </span>
                <span className="font-semibold">{next.title}</span>
              </Link>
            ) : null}
          </nav>
          <p className="text-xs muted mt-6 mb-0">{copyrightLine(locale)}</p>
        </article>

        {toc.length > 0 && (
          <aside className="wp-right hidden xl:block" aria-label={ui.onThisPage}>
            <p className="wp-label">{ui.onThisPage}</p>
            <ul>
              {toc.map((h) => (
                <li key={h.id}>
                  <a href={`#${h.id}`}>{h.text}</a>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </div>
  );
}
