// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// BM25 search over legal chunks (MiniSearch). The SAME options are used to build (ETL) and to load (server/client).
import { fold } from '../text.ts';
import { LAW_SYNONYMS, stemVariants } from './normalize.ts';

export interface LawChunk {
  id: string;
  doc_id: string;
  part: 'batang_tubuh' | 'penjelasan' | 'halaman';
  label: string;
  pasal: string | null;
  bab: string | null;
  ayat: number[] | null;
  page: number;
  page_end: number;
  text: string;
}

const STOP = new Set([
  'dan',
  'atau',
  'yang',
  'di',
  'ke',
  'dari',
  'untuk',
  'dengan',
  'pada',
  'ini',
  'itu',
  'oleh',
  'dalam',
  'adalah',
  'apa',
  'bagaimana',
  'menurut',
  'tentang',
  'saya',
  'the',
  'of',
  'and',
]);

export function tokenizeLaw(text: string): string[] {
  return fold(text)
    .split(/[^a-z0-9]+/)
    .filter((w) => (w.length > 1 || /^\d$/.test(w)) && !STOP.has(w));
}

export const LAW_SEARCH_OPTIONS = {
  idField: 'id',
  fields: ['label', 'text'],
  storeFields: ['doc_id', 'part', 'label', 'pasal', 'bab', 'page', 'page_end'],
  tokenize: (s: string) => tokenizeLaw(s),
  processTerm: (t: string) => stemVariants(t),
  searchOptions: { boost: { label: 2 }, prefix: false, fuzzy: 0 },
};

/** Expand a query with the small synonym table. */
export function expandQuery(q: string): string {
  const words = tokenizeLaw(q);
  const extra = words.flatMap((w) => LAW_SYNONYMS[w] ?? []);
  return [...words, ...extra].join(' ');
}
