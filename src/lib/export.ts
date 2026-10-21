// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Export with watermark (§11.4): PNG of a chart (watermark drawn onto the image) and CSV (watermark line at the top).
import { EXPORT_WATERMARK } from '../config/brand.ts';

function download(name: string, blob: Blob): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

export function slug(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'finandex'
  );
}

export async function exportPng(dataUrl: string, title: string, footer: string): Promise<void> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const pad = 48;
  const c = document.createElement('canvas');
  c.width = img.width;
  c.height = img.height + pad;
  const g = c.getContext('2d')!;
  const dark = document.documentElement.dataset.theme !== 'light';
  g.fillStyle = dark ? '#0A0F0C' : '#FFFFFF';
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(img, 0, 0);
  g.fillStyle = dark ? '#9DB0A4' : '#4A5B51';
  g.font = '14px Inter, sans-serif';
  g.fillText(footer, 16, img.height + 20);
  g.fillText(EXPORT_WATERMARK, 16, img.height + 38);
  c.toBlob((b) => b && download(`${slug(title)}.png`, b), 'image/png');
}

function cell(v: unknown): string {
  const s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(columns: string[], rows: unknown[][], meta: string): string {
  return [
    `# ${EXPORT_WATERMARK}`,
    `# ${meta}`,
    columns.map(cell).join(','),
    ...rows.map((r) => r.map(cell).join(',')),
  ].join('\n');
}

export function exportCsv(title: string, columns: string[], rows: unknown[][], meta: string): void {
  download(`${slug(title)}.csv`, new Blob(['﻿' + toCsv(columns, rows, meta)], { type: 'text/csv;charset=utf-8' }));
}
