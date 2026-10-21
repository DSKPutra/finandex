// © 2026 Dea Saka Kurnia Putra. All rights reserved.
import { describe, expect, it } from 'vitest';
import MiniSearch from 'minisearch';
import * as N from '../../src/shared/law/normalize.ts';
import { expandQuery, LAW_SEARCH_OPTIONS, tokenizeLaw, type LawChunk } from '../../src/shared/law/search.ts';

describe('law text normalisation & OCR-tolerant headings', () => {
  it('joins hyphenated breaks and collapses whitespace', () => {
    expect(N.normaliseLaw('undang-\n   undang ini\n\n berlaku')).toBe('undang-undang ini berlaku');
  });
  it('detects Pasal headings with OCR noise', () => {
    const num = (s: string) => {
      const m = N.PASAL_HEADING.exec(s);
      return m ? N.parsePasalNumber(m[1]!) : null;
    };
    expect(num('Pasal 1')).toBe(1);
    expect(num('  P a s a l  1 2 ')).toBe(null); // spaced digits are not a single number token
    expect(num('Pasa1 7O')).toBe(70);
    expect(num('Pasal lZ')).toBe(12);
    expect(num('Pasal 5B')).toBe(58);
    expect(num('Pasal 12 ayat (1) menyatakan')).toBeNull();
    expect(N.PENJELASAN_HEADING.test('PENJELASAN ATAS')).toBe(true);
    expect(N.PENJELASAN_HEADING.test('Penjelasan Pasal 1')).toBe(false);
    expect(N.PASAL_ROMAN.exec('Pasal IV')?.[1]).toBe('IV');
    expect(N.BAB_HEADING.exec('BAB XII PERTAHANAN NEGARA')?.[1]).toBe('XII');
    expect(N.ATURAN_HEADING.test('ATURAN PERALIHAN')).toBe(true);
    expect(N.parsePasalNumber('x')).toBeNull();
    expect(N.ocrDigits('IOS')).toBe('105');
  });
  it('finds the OCR-damaged effective clause', () => {
    const t = 'bla\nUndang-Undang ini muLai berlaku pada tanegal 2 Jarvari,2O26.\nend';
    expect([...t.matchAll(N.EFFECTIVE_CLAUSE)].map((m) => m[0])).toEqual([
      'Undang-Undang ini muLai berlaku pada tanegal 2 Jarvari,2O26.',
    ]);
  });
  it('splits ayat', () => {
    expect(N.splitAyat('(1) Negara Indonesia ialah Negara kesatuan. (2) Kedaulatan adalah di tangan rakyat.')).toEqual([
      { ayat: 1, text: 'Negara Indonesia ialah Negara kesatuan.' },
      { ayat: 2, text: 'Kedaulatan adalah di tangan rakyat.' },
    ]);
    expect(N.splitAyat('Tanpa ayat.')).toEqual([{ ayat: null, text: 'Tanpa ayat.' }]);
  });
  it('stems Indonesian words conservatively', () => {
    expect(N.stemId('penahanan')).toBe('tahan');
    expect(N.stemId('ditahan')).toBe('tahan');
    expect(N.stemId('pasal')).toBe('pasal');
    expect(N.stemId('ditangkapnya')).toBe('tangkap');
    expect(N.stemId('penangkapan')).toBe('tangkap');
    expect(N.stemVariants('penyidikan')).toContain('sidik');
    expect(N.stemVariants('pertahanan')).toContain('tahan');
    expect(N.stemId('penyidik')).toBe('sidik');
    expect(N.stemId('pembukaan')).toBe('buka');
    expect(N.stemId('mengadili')).toBe('adil');
    expect(N.stemId('kedaulatan')).toBe('daulat');
    expect(N.stemId('di')).toBe('di');
  });
  it('BM25 search with synonyms', () => {
    const chunks: LawChunk[] = [
      {
        id: 'a',
        doc_id: 'x',
        part: 'batang_tubuh',
        label: 'Pasal 1',
        pasal: '1',
        bab: null,
        ayat: null,
        page: 1,
        page_end: 1,
        text: 'Penyidik adalah pejabat polisi negara.',
      },
      {
        id: 'b',
        doc_id: 'x',
        part: 'batang_tubuh',
        label: 'Pasal 21',
        pasal: '21',
        bab: null,
        ayat: null,
        page: 5,
        page_end: 5,
        text: 'Perintah penahanan terhadap tersangka.',
      },
    ];
    const ms = new MiniSearch<LawChunk>(LAW_SEARCH_OPTIONS);
    ms.addAll(chunks);
    const loaded = MiniSearch.loadJSON<LawChunk>(JSON.stringify(ms), LAW_SEARCH_OPTIONS);
    expect(loaded.search(expandQuery('apa itu penyidik'))[0]?.id).toBe('a');
    expect(loaded.search(expandQuery('terdakwa ditahan'))[0]?.id).toBe('b');
    expect(tokenizeLaw('Apa itu Pasal 1?')).toEqual(['pasal', '1']);
  });
});
