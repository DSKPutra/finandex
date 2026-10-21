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
export const PASAL_HEADING =
  /^\s*P\s*[aeo]\s*[s5]\s*[aeo]\s*[l1I|]\s*[.,]?\s*([0-9OoIlSBZ]{1,4})\s*([A-Z]?)\s*[.,]?\s*$/;
export const PENJELASAN_HEADING = /^\s*PENJELASAN(\s+(ATAS|TENTANG)\b.*)?\s*$/;
/** Roman-numbered transitional articles of the 1945 Constitution ("Pasal I" … "Pasal IV"). */
export const PASAL_ROMAN = /^\s*Pasal\s+(I{1,3}|IV)\s*\.?\s*$/;
export const BAB_HEADING = /^\s*BAB\s+([IVXLC]+)\b(.*)$/;
export const ATURAN_HEADING = /^\s*(ATURAN\s+PERALIHAN|ATURAN\s+TAMBAHAN|PEMBUKAAN)\s*$/i;

/** Effective-date clause (OCR-tolerant), e.g. "Undang-Undang ini mulai berlaku pada tanggal …". */
export const EFFECTIVE_CLAUSE =
  /[^\n]*m\s*u\s*[lL]\s*a\s*i\s+b\s*e\s*r\s*l\s*a\s*k\s*u\s+p\s*a\s*d\s*a\s+t\s*a\s*n\s*[eg]\s*g\s*a\s*l[^\n]*/g;

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

function deprefix(w: string): { rest: string; prefixed: boolean } {
  let s = w
    .toLowerCase()
    .replace(/(lah|kah|tah|pun)$/, '')
    .replace(/(nya|ku|mu)$/, '');
  if (s.length <= 4) return { rest: s, prefixed: false };
  const vowel = (c: string | undefined) => c !== undefined && 'aiueo'.includes(c);
  const rules: [RegExp, (rest: string) => string][] = [
    [/^(meng|peng)/, (r) => r],
    [/^(meny|peny)/, (r) => (vowel(r[0]) ? 's' + r : r)],
    [/^(mem|pem)/, (r) => (vowel(r[0]) ? 'p' + r : r)],
    [/^(men|pen)/, (r) => (vowel(r[0]) ? 't' + r : r)],
    [/^(ter|ber|per)/, (r) => r],
    [/^(di|ke|se|me|pe)/, (r) => r],
  ];
  for (const [re, recode] of rules) {
    const m = re.exec(s);
    if (m && s.length - m[0].length >= 4) {
      s = recode(s.slice(m[0].length));
      return { rest: s, prefixed: true };
    }
  }
  return { rest: s, prefixed: false };
}

/**
 * Light Indonesian stemmer for BM25 (no dictionary): strip particles/possessives, then a derivational prefix with the
 * usual nasal recoding (peN-/meN- + vowel → t, peny-/meny- + vowel → s, pem-/mem- + vowel → p), then -kan/-an/-i only
 * when a prefix was removed (confixes like pe-an, di-kan) and ≥ 4 letters remain. The same function is used for indexing
 * and querying, so imperfect stems still match each other.
 */
export function stemId(w: string): string {
  if (w.length <= 4) return w.toLowerCase();
  const d = deprefix(w);
  let rest = d.rest;
  const prefixed = d.prefixed;
  if (prefixed) {
    const t = rest.replace(/(kan|an|i)$/, '');
    if (t.length >= 4) rest = t;
  }
  return rest.length >= 3 ? rest : w.toLowerCase();
}

/** All plausible stems (ambiguous -kan/-an/-i emitted together) — MiniSearch processTerm, for recall. */
export function stemVariants(w: string): string[] {
  const out = new Set([w.toLowerCase(), stemId(w)]);
  if (w.length > 4) {
    const { rest } = deprefix(w);
    out.add(rest);
    for (const suf of ['kan', 'an', 'i'])
      if (rest.endsWith(suf) && rest.length - suf.length >= 4) out.add(rest.slice(0, -suf.length));
  }
  return [...out].filter((x) => x.length >= 2);
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
