#!/usr/bin/env python3
"""
Finandex — reference implementation, part 5: My LAIwyer (legal-text retrieval over uploaded PDFs).
(c) 2026 Dea Saka Kurnia Putra. All rights reserved.
Requires poppler `pdftotext` (layout mode) — the same extraction must be reproduced in the app's ETL
(e.g. pdfjs-dist text extraction with the same normalisation; parity is checked on pasal counts, not on byte-identical text).
Usage: python3 -I finandex_reference_law.py --pdf-dir <folder with the 4 PDFs> --out <folder>
"""
import argparse, hashlib, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from finandex_reference import dump

DOCS = [  # file name (as uploaded) -> identity established from the CONTENT, not from the file name
    {"file": "UUD_45.pdf", "doc_id": "uud-1945-naskah-asli", "role": "primary",
     "title": "Undang-Undang Dasar 1945 — NASKAH ASLI sebelum Perubahan I–IV (1999–2002), termasuk Aturan Peralihan, Aturan Tambahan, dan Penjelasan", "max_pasal": 37},
    {"file": "KUHP_Lama.pdf", "doc_id": "uu-8-1981-kuhap", "role": "primary",
     "title": "UU No. 8 Tahun 1981 tentang Hukum Acara Pidana (KUHAP lama) — teks resmi", "max_pasal": 286},
    {"file": "UU_Nomor_20_Tahun_2025_KUHP.pdf", "doc_id": "uu-20-2025-kuhap", "role": "primary",
     "title": "UU No. 20 Tahun 2025 tentang Kitab Undang-Undang Hukum Acara Pidana (KUHAP baru) — salinan hasil pindai (OCR)", "max_pasal": 369},
    {"file": "Undang-undang_UU_No._1_Tahun_1946_Peraturan_tentang_Hukum_Pidana.pdf", "doc_id": "uu-1-1946-peraturan-hukum-pidana", "role": "primary",
     "title": "UU No. 1 Tahun 1946 tentang Peraturan Hukum Pidana (dasar berlakunya KUHP lama/WvS; 17 pasal + penjelasan) — BUKAN teks lengkap KUHP", "max_pasal": 17},
    {"file": "KUHAP.pdf", "doc_id": "uu-8-1981-kuhap-kompilasi", "role": "secondary",
     "title": "KUHAP (UU No. 8 Tahun 1981) — versi kompilasi tidak resmi", "max_pasal": 286},
    {"file": "KUHP.pdf", "doc_id": None, "role": "duplicate_of:KUHAP.pdf",
     "title": "Duplikat byte-identik dari KUHAP.pdf (isinya KUHAP 1981, BUKAN KUHP)", "max_pasal": None},
]
OCR_DIGITS = str.maketrans({"O": "0", "o": "0", "I": "1", "l": "1", "i": "1", "S": "5", "B": "8", "Z": "2"})
HEADING = re.compile(r"^\s*P\s*[aeo]\s*[s5]\s*[aeo]\s*[l1I|]\s*[\.,]?\s*([0-9OoIlSBZ]{1,4})\s*([A-Z]?)\s*[\.,]?\s*$")
PENJELASAN = re.compile(r"^\s*PENJELASAN(\s+(ATAS|TENTANG)\b.*)?\s*$")


def normalise(text):
    """Text normalisation used for chunking/search and golden-quote checks:
    join hyphenated line breaks ("undang-\n   undang" -> "undang-undang"), collapse all whitespace to single spaces."""
    text = re.sub(r"-\s*\n\s*", "-", text)
    return re.sub(r"\s+", " ", text).strip()


def sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()


def pages_text(pdf):
    out = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True, check=True).stdout
    return out.split("\f")


def analyse(pdf, max_pasal):
    pages = pages_text(pdf)
    lines = [(pi + 1, l) for pi, p in enumerate(pages) for l in p.split("\n")]
    cut = next((i for i, (_, l) in enumerate(lines) if PENJELASAN.match(l)), len(lines))
    found = {}
    for i, (pg, l) in enumerate(lines[:cut]):
        m = HEADING.match(l)
        if m:
            try:
                n = int(m.group(1).translate(OCR_DIGITS))
            except ValueError:
                continue
            if max_pasal and 1 <= n <= max_pasal and n not in found:
                found[n] = pg
    text = "\n".join(l for _, l in lines)
    eff = re.findall(r"[^\n]*m\s*u\s*[lL]\s*a\s*i\s+b\s*e\s*r\s*l\s*a\s*k\s*u\s+p\s*a\s*d\s*a\s+t\s*a\s*n\s*[eg]\s*g\s*a\s*l[^\n]*", text)
    return {"pages": len([p for p in pages if p.strip()]) if pages else 0, "pages_total": len(pages) - (1 if pages and not pages[-1].strip() else 0),
            "penjelasan_starts_page": lines[cut][0] if cut < len(lines) else None,
            "pasal_headings_detected": len(found),
            "pasal_missing_headings": sorted(set(range(1, max_pasal + 1)) - set(found)) if max_pasal else None,
            "first_pasal_page": found.get(1), "effective_clause_raw": [e.strip() for e in eff][-1:] if eff else []}


def run(a):
    res = []
    for d in DOCS:
        p = os.path.join(a.pdf_dir, d["file"])
        r = dict(d, sha256=sha(p), bytes=os.path.getsize(p))
        if d["max_pasal"]:
            r.update(analyse(p, d["max_pasal"]))
        res.append(r)
    by = {r["file"]: r for r in res}
    dup = by["KUHAP.pdf"]["sha256"] == by["KUHP.pdf"]["sha256"]
    norm_old = normalise("\n".join(pages_text(os.path.join(a.pdf_dir, "KUHP_Lama.pdf"))))
    quotes = {"uu-8-1981-kuhap|Pasal 1|1": "Penyidik adalah pejabat polisi negara Republik Indonesia atau pejabat pegawai negeri sipil tertentu yang diberi wewenang khusus oleh undang-undang untuk melakukan penyidikan.",
              "uu-8-1981-kuhap|penutup": "Undang-undang ini mulai berlaku pada tanggal diundangkan."}
    norm_1946 = normalise("\n".join(pages_text(os.path.join(a.pdf_dir, "Undang-undang_UU_No._1_Tahun_1946_Peraturan_tentang_Hukum_Pidana.pdf"))))
    quotes_1946 = {"uu-1-1946-peraturan-hukum-pidana|Pasal 6|1": "Nama Undang-undang hukum pidana \"Wetboek van Strafrecht voor Nederlandsh-Indie\" dirobah menjadi \"Wetboek van Strafrecht\".",
                   "uu-1-1946-peraturan-hukum-pidana|penutup": "Undang-undang ini mulai berlaku buat pulau Jawa dan Madura pada hari diumumkannya"}
    norm_uud = normalise("\n".join(pages_text(os.path.join(a.pdf_dir, "UUD_45.pdf"))))
    quotes_uud = {"uud-1945-naskah-asli|Pasal 1|1": "Negara Indonesia ialah Negara kesatuan yang berbentuk Republik.",
                  "uud-1945-naskah-asli|Pasal 1|2": "Kedaulatan adalah di tangan rakyat, dan dilakukan sepenuhnya oleh Majelis Permusyawaratan Rakyat."}
    quote_ok = {k: (v in norm_old) for k, v in quotes.items()}
    quote_ok.update({k: (v in norm_uud) for k, v in quotes_uud.items()})
    quote_ok.update({k: (v in norm_1946) for k, v in quotes_1946.items()})
    quotes.update(quotes_1946); quotes.update(quotes_uud)
    dump(a.out, "law/golden.json", {
        "documents": res, "kuhp_pdf_is_identical_to_kuhap_pdf": dup,
        "coverage": {"available": ["UUD 1945 naskah asli (sebelum perubahan) — dasar acuan konstitusional; teks UUD NRI 1945 hasil Perubahan I–IV belum tersedia","Hukum Acara Pidana lama (UU 8/1981)", "Hukum Acara Pidana baru (UU 20/2025, berlaku 2 Januari 2026 menurut Pasal penutupnya)",
                                   "UU 1/1946 tentang Peraturan Hukum Pidana (dasar berlakunya WvS/KUHP lama dan perubahan sebagian pasalnya)"],
                     "missing_sources": ["UUD NRI Tahun 1945 hasil Perubahan I–IV (1999–2002) — naskah yang berlaku saat ini", "Teks lengkap KUHP lama (Wetboek van Strafrecht, +/- 569 pasal)", "KUHP baru (UU 1/2023)", "KUHPerdata (Burgerlijk Wetboek)", "Hukum acara perdata (HIR/RBg)"]},
        "golden_quotes": quotes, "golden_quotes_found_after_normalisation": quote_ok,
        "rules": {"identity": "Identify each document by its CONTENT (title page), never by its file name; the file names KUHP*.pdf are misleading",
                  "normalise": "join hyphenated line breaks then collapse whitespace (see normalise())",
                  "dedupe": "Exclude byte-identical duplicates (same SHA-256) from the index",
                  "chunks": "One chunk per Pasal (body) + one chunk per Pasal in PENJELASAN + one chunk per page as fallback; every chunk carries doc_id, pasal (if known), page",
                  "ocr": "UU 20/2025 is a scanned copy with an OCR layer: use OCR-tolerant heading regex; where a heading is not detected, cite the page only and offer 'Lihat halaman asli'"}})


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--pdf-dir", required=True)
    ap.add_argument("--out", required=True)
    run(ap.parse_args())
    print("ok")
