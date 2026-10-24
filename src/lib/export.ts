// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Exports (§11.4): every CSV/PNG/share carries the watermark "Finandex · © Dea Saka Kurnia Putra".
import { EXPORT_WATERMARK } from '../config/brand';

type Cell = string | number | boolean | null | undefined;

function csvCell(v: Cell): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // Neutralise spreadsheet formula injection from third-party text (=, +, -, @ at start).
  const safe = /^[=+\-@\t\r]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function toCsv(columns: string[], rows: Cell[][], meta: { source?: string; asOf?: string } = {}): string {
  const lines = [`# ${EXPORT_WATERMARK}`];
  if (meta.source) lines.push(`# Source: ${meta.source}${meta.asOf ? ` · as of ${meta.asOf}` : ''}`);
  lines.push(columns.map(csvCell).join(','));
  for (const r of rows) lines.push(r.map(csvCell).join(','));
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function slugFile(title: string, ext: string): string {
  const base = title
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 60);
  return `finandex-${base || 'export'}.${ext}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(title: string, columns: string[], rows: Cell[][], meta?: { source?: string; asOf?: string }): void {
  downloadBlob(new Blob([toCsv(columns, rows, meta)], { type: 'text/csv;charset=utf-8' }), slugFile(title, 'csv'));
}

/** Composes a chart image with a title strip and the watermark footer, returning a PNG blob. */
export async function watermarkPng(dataUrl: string, title: string, footer: string, bg: string, fg: string): Promise<Blob> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const pad = 24;
  const canvas = document.createElement('canvas');
  canvas.width = img.width + pad * 2;
  canvas.height = img.height + pad * 2 + 64;
  const g = canvas.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = fg;
  g.font = '600 22px Unbounded, IBM Plex Sans, sans-serif';
  g.fillText(title, pad, pad + 18);
  g.drawImage(img, pad, pad + 32);
  g.font = '14px IBM Plex Sans, sans-serif';
  g.globalAlpha = 0.75;
  g.fillText(`${footer} · ${EXPORT_WATERMARK}`, pad, canvas.height - pad + 4);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('toBlob failed'))), 'image/png'));
}

/** Web Share with a file when supported (native share sheet on mobile), else download. */
export async function shareOrDownload(blob: Blob, filename: string, text: string): Promise<void> {
  try {
    const { nativeShare } = await import('../native');
    if (await nativeShare(blob, filename, `${text}\n${EXPORT_WATERMARK}`)) return;
  } catch {
    /* fall through to the web share / download path */
  }
  const file = new File([blob], filename, { type: blob.type });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename, text: `${text}\n${EXPORT_WATERMARK}` });
      return;
    } catch {
      /* cancelled → fall back to download */
    }
  }
  downloadBlob(blob, filename);
}
