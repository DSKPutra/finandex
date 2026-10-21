// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Legal-text normalisation & OCR-tolerant structure detection (§4.20). Shared by ETL (chunking) and server (search).

/** Join hyphenated line breaks ("undang-\n   undang" → "undang-undang"), then collapse all whitespace. */
export function normaliseLaw(text: string): string {
  return text
    .replace(/-\s*\n\s*/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** OCR digit confusions: O/o→0, I/l/i→1, S→5, B→8, Z→2. */
const OCR_DIGITS: Record<string, string> = { O: '0', o: '0', I: '1', l: '1', i: '1', S: '5', B: '8', Z: '2' };

export function ocrDigits(s: string): string {
  return s.replace(/[OoIliSBZ]/g, (c) => OCR_DIGITS[c] ?? c);
}

/** A line that is only a Pasal heading: "Pasal 12", "P a s a l 1 2", OCR variants l/1/I/| and O→0 etc. */
export const PASAL_HEADING = /^\s*P\s*[aeo]\s*[s5]\s*[aeo]\s*[l1I|]\s*[.,]?\s*([0-9OoIlSBZ]{1,4})\s*([A-Z]?)\s*[.,]?\s*$/;
export const PENJELASAN_HEADING = /^\s*PENJELASAN(\s+(ATAS|TENTANG)\b.*)?\s*$/;
/** Roman-numbered transitional articles of the 1945 Constitution ("Pasal I" … "Pasal IV"). */
export const PASAL_ROMAN = /^\s*Pasal\s+(I{1,3}|IV)\s*\.?\s*$/;
export const BAB_HEADING = /^\s*BAB\s+([IVXLC]+)\b(.*)$/;
export const ATURAN_HEADING = /^\s*(ATURAN\s+PERALIHAN|ATURAN\s+TAMBAHAN|PEMBUKAAN)\s*$/i;

/** Effective-date clause (OCR-tolerant), e.g. "Undang-Undang ini mulai berlaku pada tanggal …". */
export const EFFECTIVE_CLAUSE = /[^\n]*m\s*u\s*[lL]\s*a\s*i\s+b\s*e\s*r\s*l\s*a\s*k\s*u\s+p\s*a\s*d\s*a\s+t\s*a\s*n\s*[eg]\s*g\s*a\s*l[^\n]*/g;

export function parsePasalNumber(raw: string): number | null {
  const n = Number(ocrDigits(raw));
  return Number.isInteger(n) ? n : null;
}

/** Detect "ayat (n)" markers at the start of a sentence inside a Pasal body. */
export function splitAyat(text: string): { ayat: number | null; text: string }[] {
  const parts = text.split(/(?=\(\s*\d{1,2}\s*\)\s)/);
  return parts
    .map((p) => {
      const m = /^\(\s*(\d{1,2})\s*\)\s*/.exec(p);
      return m ? { ayat: Number(m[1]), text: p.slice(m[0].length).trim() } : { ayat: null, text: p.trim() };
    })
    .filter((p) => p.text.length);
}

/** Light Indonesian stemming for BM25 (prefix/suffix stripping, conservative). */
export function stemId(w: string): string {
  let s = w.toLowerCase();
  if (s.length <= 4) return s;
  s = s.replace(/(lah|kah|tah|pun)$/, '');
  s = s.replace(/(nya|ku|mu)$/, '');
  if (s.length > 6) s = s.replace(/(kan|an|i)$/, '');
  if (s.length > 6) s = s.replace(/^(meng|meny|mem|men|me|peng|peny|pem|pen|pe|di|ter|ber|ke|se)/, '');
  return s.length >= 3 ? s : w.toLowerCase();
}

/** Small synonym table expanded at query time (§4.20). */
export const LAW_SYNONYMS: Record<string, string[]> = {
  tersangka: ['terdakwa'],
  terdakwa: ['tersangka'],
  penahanan: ['ditahan', 'tahanan'],
  ditahan: ['penahanan'],
  ditangkap: ['penangkapan', 'tangkap'],
  penangkapan: ['ditangkap'],
  praperadilan: ['pra peradilan'],
  pengacara: ['advokat', 'penasihat hukum'],
  advokat: ['penasihat hukum'],
  polisi: ['penyidik', 'kepolisian'],
  kedaulatan: ['berdaulat'],
};
