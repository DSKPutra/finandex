// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// "View original page" for My LAIwyer (§9): renders one page of the source PDF with pdf.js (lazy, own worker chunk).
// The extracted text of the same page is shown below by the open_page tool for screen readers and copying.
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../i18n/index.ts';
import { ready, runtime } from '../lib/data.ts';
import { Skeleton } from './States.tsx';

export default function PdfPage({ docId, page }: { docId: string; page: number }) {
  const { t } = useTranslation();
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLElement>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading');
  const [pages, setPages] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | null = null;
    void (async () => {
      try {
        await ready;
        const [pdfjs, worker] = await Promise.all([
          import('pdfjs-dist/legacy/build/pdf.mjs'),
          import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
        ]);
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const task = pdfjs.getDocument({ url: `${runtime.dataBase}/heavy/law/${docId}/source.pdf` });
        destroy = () => void task.destroy();
        const doc = await task.promise;
        if (cancelled) return;
        setPages(doc.numPages);
        const p = await doc.getPage(Math.min(Math.max(1, page), doc.numPages));
        const c = canvas.current;
        if (!c || cancelled) return;
        const width = Math.min((box.current?.clientWidth ?? 824) - 24, 900);
        const base = p.getViewport({ scale: 1 });
        const vp = p.getViewport({ scale: (width / base.width) * (window.devicePixelRatio || 1) });
        c.width = vp.width;
        c.height = vp.height;
        c.style.width = `${width}px`;
        await p.render({ canvas: c, viewport: vp }).promise;
        if (!cancelled) setState('ok');
      } catch (e) {
        console.warn('pdf page unavailable', e);
        if (!cancelled) setState('missing');
      }
    })();
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [docId, page]);
  if (state === 'missing') return null;
  return (
    <figure ref={box} className="card p-3 m-0">
      <figcaption className="text-sm muted mb-2">{t('law.originalPage', { page, pages: pages || '…' })}</figcaption>
      {state === 'loading' && <Skeleton h={480} />}
      <div
        style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', display: state === 'ok' ? 'block' : 'none' }}
      >
        <canvas ref={canvas} role="img" aria-label={t('law.originalPage', { page, pages: pages || '…' })} />
      </div>
    </figure>
  );
}
