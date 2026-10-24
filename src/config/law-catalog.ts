// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Law document registry for My LAIwyer (corpus "umum") and FinLAIwyer (corpus "keuangan"), generated from
// kit/datasets/law/regulation_catalog.json + src/config/regulations.lock.json (§4.20, §4.28, §4.30).
// Server & ETL only (the client reads public/data/core/law/catalog.json). Fixed notes are written here, never by the LLM.
import catalogJson from '../../kit/datasets/law/regulation_catalog.json' with { type: 'json' };
import flowsJson from '../../kit/datasets/law/legal_qa_flows.json' with { type: 'json' };
import lockJson from './regulations.lock.json' with { type: 'json' };
import supplementJson from './regulation-catalog.supplement.json' with { type: 'json' };
import type { Catalog, CatalogDoc, Flows } from '../shared/law/kb';

export const CATALOG = catalogJson as unknown as Catalog;
export const FLOWS = flowsJson as unknown as Flows;
export type LockEntry = { doc_id: string; url: string | null; sha256: string | null; bytes: number | null; pages: number | null; fetched_at: string | null; title_detected: string | null; status: 'available' | 'pending' | 'failed'; reason?: string };
export const LOCK = lockJson as unknown as { version: string; catalog_version: string; release: string; documents: LockEntry[] };

export type Corpus = 'umum' | 'keuangan';
export const LAW_DEX_CORPUS = { mylaiwyer: 'umum', finlaiwyer: 'keuangan' } as const satisfies Record<string, Corpus>;
export type LawDexId = keyof typeof LAW_DEX_CORPUS;

/** Uploaded inputs (§4.20) → their file and the id used by kit/golden/law. Identity comes from content, not names. */
export const INPUT_FILES: Record<string, { file: string; golden_id: string; max_pasal: number }> = {
  'uud-1945-naskah-asli': { file: 'UUD_45.pdf', golden_id: 'uud-1945-naskah-asli', max_pasal: 37 },
  'uu-8-1981-kuhap': { file: 'KUHP_Lama.pdf', golden_id: 'uu-8-1981-kuhap', max_pasal: 286 },
  'uu-20-2025-kuhap': { file: 'UU_Nomor_20_Tahun_2025_KUHP.pdf', golden_id: 'uu-20-2025-kuhap', max_pasal: 369 },
  'uu-1-1946': { file: 'Undang-undang_UU_No._1_Tahun_1946_Peraturan_tentang_Hukum_Pidana.pdf', golden_id: 'uu-1-1946-peraturan-hukum-pidana', max_pasal: 17 },
};

export const NOTES = {
  uud_original: {
    id: 'Naskah yang tersedia adalah UUD 1945 naskah asli sebelum perubahan; teks UUD NRI Tahun 1945 hasil Perubahan I–IV (yang berlaku saat ini) belum tersedia di Finandex.',
    en: 'The available text is the original 1945 Constitution before amendment; the text of the 1945 Constitution as amended (Amendments I–IV, currently in force) is not yet available in Finandex.',
  },
  uud_both: {
    id: 'Naskah asli (1945) ditampilkan untuk sejarah; yang berlaku adalah UUD NRI Tahun 1945 setelah Perubahan I–IV.',
    en: 'The original (1945) text is shown for history; the text in force is the 1945 Constitution after Amendments I–IV.',
  },
  catalog_summary: {
    id: 'Ringkasan katalog (bukan kutipan) — teks resmi belum tersedia',
    en: 'Catalogue summary (not a quotation) — official text not yet available',
  },
  catalog_summary_short: { id: 'Ringkasan katalog (bukan kutipan)', en: 'Catalogue summary (not a quotation)' },
  penalty: {
    id: 'Ancaman pidana dalam undang-undang ini disesuaikan oleh UU 1/2026 tentang Penyesuaian Pidana (berlaku 2 Januari 2026); baca lampirannya.',
    en: 'Criminal penalties in this law are adjusted by Law 1/2026 on Penalty Adjustment (in force 2 January 2026); read its annex.',
  },
  from_mylaiwyer: { id: 'dari My LAIwyer', en: 'from My LAIwyer' },
  from_finlaiwyer: { id: 'dari FinLAIwyer', en: 'from FinLAIwyer' },
} as const;

export type LawDoc = CatalogDoc & { supplement?: boolean };
/** Finandex supplement entries (same schema, labelled "suplemen"; not part of the kit golden). */
export const SUPPLEMENT = (supplementJson as unknown as { documents: LawDoc[] }).documents;
/** Kit catalogue + supplement. */
export const ALL_DOCS: LawDoc[] = [...CATALOG.documents, ...SUPPLEMENT];
export const DOCS = new Map<string, LawDoc>(ALL_DOCS.map((d) => [d.id, d]));
const LOCK_BY = new Map(LOCK.documents.map((e) => [e.doc_id, e]));

export function lockOf(id: string): LockEntry | undefined {
  return LOCK_BY.get(id);
}

/** A document's text is usable for quotations: an uploaded input, or a fetched PDF that passed verification. */
export function isAvailable(id: string): boolean {
  const d = DOCS.get(id);
  if (!d) return false;
  if (d.source === 'input') return id in INPUT_FILES;
  if (d.source === 'catalog-only') return false;
  return LOCK_BY.get(id)?.status === 'available';
}

export function docsOf(corpus: Corpus): LawDoc[] {
  return ALL_DOCS.filter((d) => d.corpus === corpus);
}

export function availableIds(corpus: Corpus): string[] {
  return docsOf(corpus)
    .filter((d) => isAvailable(d.id))
    .map((d) => d.id);
}

export const ALL_DOC_IDS = ALL_DOCS.map((d) => d.id) as [string, ...string[]];

/** Human file/dataset label for citations. */
export function datasetLabel(id: string): string {
  const inp = INPUT_FILES[id];
  if (inp) return inp.file;
  const l = LOCK_BY.get(id);
  return l?.url ? new URL(l.url).host + ' — ' + (DOCS.get(id)?.short ?? id) : (DOCS.get(id)?.short ?? id);
}

/** "Berlaku / Dicabut oleh … / Disesuaikan UU 1/2026" badge text. */
export function statusBadge(id: string, locale: 'id' | 'en'): string[] {
  const d = DOCS.get(id);
  if (!d) return [];
  const out: string[] = [];
  if (d.status === 'dicabut') out.push(locale === 'id' ? `Dicabut oleh ${d.revoked_by.map((r) => DOCS.get(r)?.short ?? r).join(', ')}` : `Revoked by ${d.revoked_by.map((r) => DOCS.get(r)?.short ?? r).join(', ')}`);
  else if (d.status === 'berlaku') out.push(locale === 'id' ? 'Berlaku' : 'In force');
  else out.push(d.status);
  if ((d.penalty_adjusted_by ?? []).length) out.push(locale === 'id' ? 'Disesuaikan UU 1/2026' : 'Adjusted by Law 1/2026');
  return out;
}

export const UUD_NRI_AVAILABLE = (): boolean => isAvailable('uud-nri-1945');
