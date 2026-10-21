// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// My LAIwyer — PDFs #30–#35 (§4.20). Port of kit/reference/finandex_reference_law.py (+ chunking & search index).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import MiniSearch from 'minisearch';
import { LAW_SOURCES, MISSING_LAW_SOURCES, type LawSource } from '../../../src/config/law-sources.ts';
import { EFFECTIVE_CLAUSE, normaliseLaw, PASAL_HEADING, PASAL_ROMAN, PENJELASAN_HEADING, parsePasalNumber, splitAyat, BAB_HEADING, ATURAN_HEADING } from '../../../src/shared/law/normalize.ts';
import { LAW_SEARCH_OPTIONS, type LawChunk } from '../../../src/shared/law/search.ts';
import { pdfPages } from '../lib/pdf.ts';
import { INPUTS } from '../lib/io.ts';
import type { DexModule, ModuleResult } from '../lib/module.ts';

const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');

export const GOLDEN_QUOTES: Record<string, string> = {
  'uu-8-1981-kuhap|Pasal 1|1': 'Penyidik adalah pejabat polisi negara Republik Indonesia atau pejabat pegawai negeri sipil tertentu yang diberi wewenang khusus oleh undang-undang untuk melakukan penyidikan.',
  'uu-8-1981-kuhap|penutup': 'Undang-undang ini mulai berlaku pada tanggal diundangkan.',
  'uu-1-1946-peraturan-hukum-pidana|Pasal 6|1': 'Nama Undang-undang hukum pidana "Wetboek van Strafrecht voor Nederlandsh-Indie" dirobah menjadi "Wetboek van Strafrecht".',
  'uu-1-1946-peraturan-hukum-pidana|penutup': 'Undang-undang ini mulai berlaku buat pulau Jawa dan Madura pada hari diumumkannya',
  'uud-1945-naskah-asli|Pasal 1|1': 'Negara Indonesia ialah Negara kesatuan yang berbentuk Republik.',
  'uud-1945-naskah-asli|Pasal 1|2': 'Kedaulatan adalah di tangan rakyat, dan dilakukan sepenuhnya oleh Majelis Permusyawaratan Rakyat.',
};

interface Analysis {
  pages: number;
  pages_total: number;
  penjelasan_starts_page: number | null;
  pasal_headings_detected: number;
  pasal_missing_headings: number[] | null;
  first_pasal_page: number | null;
  effective_clause_raw: string[];
}

export function analyse(pages: string[], maxPasal: number): { a: Analysis; lines: { page: number; text: string }[]; cut: number } {
  const lines = pages.flatMap((p, i) => p.split('\n').map((text) => ({ page: i + 1, text })));
  let cut = lines.findIndex((l) => PENJELASAN_HEADING.test(l.text));
  if (cut < 0) cut = lines.length;
  const found = new Map<number, number>();
  for (const l of lines.slice(0, cut)) {
    const m = PASAL_HEADING.exec(l.text);
    if (!m) continue;
    const n = parsePasalNumber(m[1]!);
    if (n !== null && n >= 1 && n <= maxPasal && !found.has(n)) found.set(n, l.page);
  }
  const text = lines.map((l) => l.text).join('\n');
  const eff = [...text.matchAll(EFFECTIVE_CLAUSE)].map((m) => m[0].trim());
  const missing: number[] = [];
  for (let n = 1; n <= maxPasal; n++) if (!found.has(n)) missing.push(n);
  return {
    a: {
      pages: pages.filter((p) => p.trim()).length,
      pages_total: pages.length,
      penjelasan_starts_page: cut < lines.length ? lines[cut]!.page : null,
      pasal_headings_detected: found.size,
      pasal_missing_headings: missing,
      first_pasal_page: found.get(1) ?? null,
      effective_clause_raw: eff.slice(-1),
    },
    lines,
    cut,
  };
}

/** One chunk per Pasal (body), per Pasal (penjelasan), per transitional article, plus one per page as fallback. */
export function chunkDocument(src: LawSource, pages: string[], lines: { page: number; text: string }[], cut: number): LawChunk[] {
  const chunks: LawChunk[] = [];
  const docId = src.docId!;
  const push = (part: LawChunk['part'], label: string, pasal: string | null, bab: string | null, buf: { page: number; text: string }[]) => {
    const text = normaliseLaw(buf.map((b) => b.text).join('\n'));
    if (!text) return;
    const ayat = splitAyat(text).filter((x) => x.ayat !== null).map((x) => x.ayat!) ;
    chunks.push({ id: `${docId}:${part}:${chunks.length}`, doc_id: docId, part, label, pasal, bab, ayat: ayat.length ? ayat : null, page: buf[0]!.page, page_end: buf[buf.length - 1]!.page, text });
  };
  const scan = (from: number, to: number, part: 'batang_tubuh' | 'penjelasan') => {
    let label = part === 'batang_tubuh' ? 'Pembukaan / Ketentuan awal' : 'Penjelasan umum';
    let pasal: string | null = null;
    let bab: string | null = null;
    let section: string | null = null;
    let buf: { page: number; text: string }[] = [];
    for (let i = from; i < to; i++) {
      const l = lines[i]!;
      const mb = BAB_HEADING.exec(l.text);
      if (mb) bab = `BAB ${mb[1]}`;
      const ma = ATURAN_HEADING.exec(l.text);
      if (ma) {
        push(part, label, pasal, bab, buf);
        section = ma[1]!.replace(/\s+/g, ' ').toUpperCase();
        label = section === 'PEMBUKAAN' ? 'Pembukaan' : section === 'ATURAN TAMBAHAN' ? 'Aturan Tambahan' : 'Aturan Peralihan';
        pasal = null;
        buf = [l];
        continue;
      }
      const mr = PASAL_ROMAN.exec(l.text);
      const mp = PASAL_HEADING.exec(l.text);
      if (mr && section) {
        push(part, label, pasal, bab, buf);
        pasal = mr[1]!;
        label = `${section === 'ATURAN TAMBAHAN' ? 'Aturan Tambahan' : 'Aturan Peralihan'} Pasal ${mr[1]}`;
        buf = [l];
      } else if (mp) {
        const n = parsePasalNumber(mp[1]!);
        if (n !== null && n >= 1 && (!src.maxPasal || n <= src.maxPasal)) {
          push(part, label, pasal, bab, buf);
          pasal = `${n}${mp[2] ?? ''}`;
          label = `${part === 'penjelasan' ? 'Penjelasan ' : ''}Pasal ${pasal}`;
          section = null;
          buf = [l];
          continue;
        }
        buf.push(l);
      } else buf.push(l);
    }
    push(part, label, pasal, bab, buf);
  };
  scan(0, cut, 'batang_tubuh');
  if (cut < lines.length) scan(cut, lines.length, 'penjelasan');
  pages.forEach((p, i) => {
    const text = normaliseLaw(p);
    if (text) chunks.push({ id: `${docId}:page:${i + 1}`, doc_id: docId, part: 'halaman', label: `Halaman ${i + 1}`, pasal: null, bab: null, ayat: null, page: i + 1, page_end: i + 1, text });
  });
  return chunks;
}

export const lawModule: DexModule = {
  name: 'law',
  dex: ['mylaiwyer'],
  inputs: [30, 31, 32, 33, 34, 35],
  requires: () => [], // partial availability is handled inside
  async build(ctx): Promise<ModuleResult> {
    const docs: Record<string, unknown>[] = [];
    const files: Record<string, unknown> = {};
    // original PDFs of indexed primary documents, for the "view original page" renderer (pdf.js)
    const binaries: Record<string, Uint8Array> = {};
    const shaByFile = new Map<string, string>();
    const normText = new Map<string, string>();
    const available: string[] = [];
    for (const src of LAW_SOURCES) {
      const p = src.file ? join(INPUTS, src.file) : null;
      const base = { file: src.file, doc_id: src.docId, role: src.role === 'duplicate' ? 'duplicate_of:KUHAP.pdf' : src.role, title: src.title.id, max_pasal: src.maxPasal };
      if (!p || !existsSync(p)) {
        docs.push({ ...base, available: false, input: src.input });
        continue;
      }
      const s = sha(p);
      shaByFile.set(src.file!, s);
      const r: Record<string, unknown> = { ...base, sha256: s, bytes: statSync(p).size, available: true, input: src.input };
      if (src.maxPasal) {
        const pages = await pdfPages(p);
        const { a, lines, cut } = analyse(pages, src.maxPasal);
        Object.assign(r, a);
        if (src.docId) normText.set(src.docId, normaliseLaw(pages.join('\n')));
        if (src.role === 'primary' && src.docId) {
          available.push(src.docId);
          const chunks = chunkDocument(src, pages, lines, cut);
          const ms = new MiniSearch<LawChunk>(LAW_SEARCH_OPTIONS);
          ms.addAll(chunks);
          files[`heavy/law/${src.docId}/chunks.json`] = { doc_id: src.docId, title: src.title, chunks };
          files[`heavy/law/${src.docId}/index.json`] = ms.toJSON();
          pages.forEach((pg, i) => (files[`heavy/law/${src.docId}/pages/${i + 1}.txt`] = pg));
          binaries[`heavy/law/${src.docId}/source.pdf`] = new Uint8Array(readFileSync(p));
          ctx.log(`law: ${src.docId} ${chunks.length} chunks, ${a.pasal_headings_detected}/${src.maxPasal} headings`);
        }
      }
      docs.push(r);
    }
    const quoteOk: Record<string, boolean> = {};
    for (const [k, q] of Object.entries(GOLDEN_QUOTES)) {
      const doc = k.split('|')[0]!;
      const t = normText.get(doc);
      if (t !== undefined) quoteOk[k] = t.includes(q);
    }
    const dup = shaByFile.has('KUHAP.pdf') && shaByFile.get('KUHAP.pdf') === shaByFile.get('KUHP.pdf');
    const golden = {
      documents: docs.map(({ available: _a, input: _i, ...rest }) => rest),
      kuhp_pdf_is_identical_to_kuhap_pdf: dup,
      golden_quotes_found_after_normalisation: quoteOk,
    };
    const missingInputs = LAW_SOURCES.filter((s) => s.role === 'primary' && !available.includes(s.docId!)).map((s) => s.input!);
    files['core/law/documents.json'] = {
      documents: docs,
      indexed: available,
      awaiting_upload: LAW_SOURCES.filter((s) => s.role === 'primary' && !available.includes(s.docId!)).map((s) => ({ doc_id: s.docId, input: s.input, file: s.file, title: s.title })),
      missing_sources: MISSING_LAW_SOURCES,
      kuhp_pdf_is_identical_to_kuhap_pdf: dup,
    };
    files['core/law/coverage.json'] = { available, missing_inputs: missingInputs, missing_sources: MISSING_LAW_SOURCES, quotes_found: quoteOk };
    return {
      dex: ['mylaiwyer'],
      status: available.length ? 'built' : 'pending-data',
      missingInputs,
      asOf: null,
      golden: { 'law/golden.json': golden },
      files,
      binaries,
    };
  },
};
