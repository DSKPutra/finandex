// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// My LAIwyer document registry (§4.20). Identity is established from CONTENT, never from the file name.
// Adding a source later = add the PDF + one entry here (status 'available').

export type LawDocStatus = 'available' | 'awaiting-upload' | 'awaiting-document' | 'secondary' | 'duplicate';

export interface LawSource {
  /** stable id used by tools & chunks; null for excluded duplicates */
  docId: string | null;
  /** input number in §3.1 (null = not yet supplied by the owner) */
  input: number | null;
  file: string | null;
  title: { id: string; en: string };
  short: string;
  role: 'primary' | 'secondary' | 'duplicate' | 'missing';
  /** citation priority: lower = checked first (UUD 1945 first) */
  priority: number;
  maxPasal: number | null;
  status: LawDocStatus;
  effective?: string;
}

/** Fixed note that MUST accompany every quote from the 1945 Constitution (not composed by the LLM). */
export const UUD_ORIGINAL_NOTE_ID =
  'Naskah yang tersedia adalah UUD 1945 naskah asli sebelum perubahan; teks UUD NRI Tahun 1945 hasil Perubahan I–IV (yang berlaku saat ini) belum tersedia di Finandex.';
export const UUD_ORIGINAL_NOTE_EN =
  'The available text is the ORIGINAL 1945 Constitution before the amendments; the text of the 1945 Constitution as amended (Amendments I–IV, currently in force) is not yet available in Finandex.';

export const LAW_SOURCES: readonly LawSource[] = [
  {
    docId: 'uud-1945-naskah-asli',
    input: 35,
    file: 'UUD_45.pdf',
    title: {
      id: 'Undang-Undang Dasar 1945 — NASKAH ASLI sebelum Perubahan I–IV (1999–2002), termasuk Aturan Peralihan, Aturan Tambahan, dan Penjelasan',
      en: 'The 1945 Constitution — ORIGINAL TEXT before Amendments I–IV (1999–2002), incl. Transitional Provisions, Additional Provisions and Elucidation',
    },
    short: 'UUD 1945',
    role: 'primary',
    priority: 0,
    maxPasal: 37,
    status: 'available',
  },
  {
    docId: 'uu-8-1981-kuhap',
    input: 30,
    file: 'KUHP_Lama.pdf',
    title: {
      id: 'UU No. 8 Tahun 1981 tentang Hukum Acara Pidana (KUHAP lama) — teks resmi',
      en: 'Law No. 8 of 1981 on Criminal Procedure (old KUHAP) — official text',
    },
    short: 'UU 8/1981',
    role: 'primary',
    priority: 1,
    maxPasal: 286,
    status: 'awaiting-upload',
  },
  {
    docId: 'uu-20-2025-kuhap',
    input: 31,
    file: 'UU_Nomor_20_Tahun_2025_KUHP.pdf',
    title: {
      id: 'UU No. 20 Tahun 2025 tentang Kitab Undang-Undang Hukum Acara Pidana (KUHAP baru) — salinan hasil pindai (OCR)',
      en: 'Law No. 20 of 2025 on the Code of Criminal Procedure (new KUHAP) — scanned copy (OCR)',
    },
    short: 'UU 20/2025',
    role: 'primary',
    priority: 1,
    maxPasal: 369,
    status: 'awaiting-upload',
    effective: '2026-01-02',
  },
  {
    docId: 'uu-1-1946-peraturan-hukum-pidana',
    input: 34,
    file: 'Undang-undang_UU_No._1_Tahun_1946_Peraturan_tentang_Hukum_Pidana.pdf',
    title: {
      id: 'UU No. 1 Tahun 1946 tentang Peraturan Hukum Pidana (dasar berlakunya KUHP lama/WvS; 17 pasal + penjelasan) — BUKAN teks lengkap KUHP',
      en: 'Law No. 1 of 1946 on Criminal Law Regulations (basis for the old Penal Code/WvS; 17 articles + elucidation) — NOT the full Penal Code',
    },
    short: 'UU 1/1946',
    role: 'primary',
    priority: 2,
    maxPasal: 17,
    status: 'available',
    effective: '1946-02-26',
  },
  {
    docId: 'uu-8-1981-kuhap-kompilasi',
    input: 32,
    file: 'KUHAP.pdf',
    title: {
      id: 'KUHAP (UU No. 8 Tahun 1981) — versi kompilasi tidak resmi',
      en: 'KUHAP (Law No. 8 of 1981) — unofficial compilation',
    },
    short: 'KUHAP (kompilasi)',
    role: 'secondary',
    priority: 9,
    maxPasal: 286,
    status: 'secondary',
  },
  {
    docId: null,
    input: 33,
    file: 'KUHP.pdf',
    title: {
      id: 'Duplikat byte-identik dari KUHAP.pdf (isinya KUHAP 1981, BUKAN KUHP)',
      en: 'Byte-identical duplicate of KUHAP.pdf (it contains the 1981 KUHAP, NOT the Penal Code)',
    },
    short: 'KUHP.pdf (duplikat)',
    role: 'duplicate',
    priority: 99,
    maxPasal: null,
    status: 'duplicate',
  },
];

/** Sources not supplied at all (shown as "menunggu dokumen" in the Sources tab). */
export const MISSING_LAW_SOURCES: readonly { id: string; en: string }[] = [
  {
    id: 'UUD NRI Tahun 1945 hasil Perubahan I–IV (1999–2002) — naskah yang berlaku saat ini',
    en: 'The 1945 Constitution as amended (Amendments I–IV, 1999–2002) — the text currently in force',
  },
  {
    id: 'Teks lengkap KUHP lama (Wetboek van Strafrecht, ±569 pasal)',
    en: 'Full text of the old Penal Code (Wetboek van Strafrecht, ±569 articles)',
  },
  { id: 'KUHP baru (UU 1/2023)', en: 'The new Penal Code (Law 1/2023)' },
  { id: 'KUHPerdata (Burgerlijk Wetboek)', en: 'The Civil Code (Burgerlijk Wetboek)' },
  { id: 'Hukum acara perdata (HIR/RBg)', en: 'Civil procedure law (HIR/RBg)' },
];

export const INDEXED_LAW_DOCS = LAW_SOURCES.filter((s) => s.role === 'primary' && s.status === 'available');
