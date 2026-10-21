// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for My LAIwyer (§9): sources (available & awaiting), browse articles, compare KUHAP old–new, glossary.
import { clean, int, L, type DexViews } from './types.ts';

const DOCS = [
  { value: 'UUD 1945', label: L('UUD 1945 (naskah asli)', '1945 Constitution (original text)') },
  { value: 'UU 1/1946', label: 'UU 1/1946' },
  {
    value: 'UU 8/1981',
    label: L('UU 8/1981 (KUHAP lama — menunggu dokumen)', 'Law 8/1981 (old KUHAP — awaiting document)'),
  },
  {
    value: 'UU 20/2025',
    label: L('UU 20/2025 (KUHAP baru — menunggu dokumen)', 'Law 20/2025 (new KUHAP — awaiting document)'),
  },
];
const NOTE = L(
  'Informasi hukum, bukan nasihat hukum. Untuk kasus nyata, hubungi advokat atau LBH.',
  'Legal information, not legal advice. For a real case, contact an advocate or legal-aid office (LBH).',
);

export const views: DexViews = {
  sources: { intro: NOTE, calls: () => [{ tool: 'list_sources', input: {} }] },
  browse: {
    intro: NOTE,
    entityKey: 'ref',
    controls: [
      { kind: 'select', key: 'doc', label: L('Dokumen', 'Document'), options: DOCS, default: 'UUD 1945' },
      { kind: 'text', key: 'pasal', label: L('Pasal', 'Article'), default: '1' },
      { kind: 'text', key: 'q', label: L('Cari teks', 'Search text'), default: '' },
      { kind: 'text', key: 'ref', label: L('Halaman (doc@hal)', 'Page (doc@page)'), default: '' },
    ],
    calls: (v) => {
      const [refDoc, page] = (v.ref ?? '').split('@');
      if (refDoc && page) return [{ tool: 'open_page', input: { doc: refDoc, page: int(page, 1) } }];
      return v.q
        ? [{ tool: 'search_law', input: clean({ query: v.q, doc: v.doc, limit: 8 }) as { query: string } }]
        : [{ tool: 'get_pasal', input: { doc: v.doc, pasal: v.pasal || '1' } }];
    },
  },
  compare: {
    intro: L(
      'Perbandingan UU 8/1981 vs UU 20/2025 per topik (aktif setelah kedua dokumen diunggah).',
      'Law 8/1981 vs Law 20/2025 by topic (active once both documents are uploaded).',
    ),
    controls: [{ kind: 'text', key: 'q', label: L('Topik', 'Topic'), default: 'penahanan' }],
    calls: (v) => [{ tool: 'compare_versions', input: { query: v.q || 'penahanan' } }],
  },
  glossary: {
    intro: L(
      'Cari istilah di dokumen yang tersedia (kutipan apa adanya).',
      'Look up a term in the available documents (verbatim quotes).',
    ),
    controls: [{ kind: 'text', key: 'term', label: L('Istilah', 'Term'), default: 'kedaulatan' }],
    calls: (v) => [{ tool: 'search_law', input: { query: v.term || 'kedaulatan', limit: 6 } }],
  },
};
