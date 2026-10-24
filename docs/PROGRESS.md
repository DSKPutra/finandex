<!-- © 2026 Dea Saka Kurnia Putra. All rights reserved. -->
# Progres build Finandex

## Fase 0 — Verifikasi input · HIJAU (2026-10-21)
- 42/42 dataset cocok (byte, SHA-256, anggota zip, ukuran tak terkompresi); kit cocok dengan `kit_files.sha256`.
- Detail: `docs/INPUTS_VERIFIED.md`. Ekstrak di `data/extracted/<nama-zip>/`.

## Fase 1 — Scaffold · HIJAU (2026-10-21)
- Lint, typecheck (strict + noUncheckedIndexedAccess + exactOptionalPropertyTypes), check:copyright lulus.

## Fase 2 — Shared helpers & analitik · HIJAU (2026-10-22)
- `src/shared/{dates,format,text}.ts`, `src/shared/analytics/*`, `src/shared/law/*`.
- Unit test 35/35; coverage src/shared (unit+golden): baris 99,8%, statement 99,1%, fungsi 99,8%, branch 88,7%.
- Golden 58/58 cocok dengan `kit/golden/**` (semua 31 folder golden), ~18 dtk.

## Fase 3 — ETL semua Dex · HIJAU (2026-10-22)
- `npm run data:verify` 42/42 OK; `data:extract`; `data:build` membangun 27 Dex (~47 dtk) → `public/data/**` + `manifest.json`.
- Setiap file divalidasi zod (seri/matriks/katalog/tabel + JSON-safe), angka ≤10 digit signifikan; SHA-256 tiap file di manifest.
- Golden 58/58 + gate data (§18.13: skema, finite, SHA input = kit, tanpa kolom author/handle) 4/4. Total test 97/97.
- Ukuran: core 33 MB, heavy 562 MB (seri harian NASDAQ/S&P/IDX + matriks Float32). Risiko: ukuran deploy statis & precache PWA → ditangani di Fase 7–8 (precache hanya subset core).

## Fase 4 — Server, tools, orkestrator, prompt, keamanan · HIJAU (2026-10-22)
- `server/handler.ts` (Web Fetch API) + adapter Vercel/Netlify; rute health/version/chat(SSE)/feedback/dex.
- 361 tool terdaftar (13 bersama + khusus per Dex); skema zod → JSON Schema `strict`; ui (artefak grafik) + method untuk setiap tool berangka.
- Orkestrator §8.3 (≤ 8 giliran, ≤ 12 tool, timeout tool 8 dtk, tenggat, citation unik); Claude via @anthropic-ai/sdk (streaming, prompt caching, fallback server-side, tanpa temperature).
- Prompt global (§8.6 persis, id + en) + 27 prompt Dex (5 bagian) dimuat sebagai string saat build.
- Keamanan: CORS allowlist (wildcard), rate limit 20/10 mnt & 200/hari + anggaran token (Upstash/in-memory), batas body 64 KB, header keamanan, detektor data sensitif di server.
- Gate: `test:tools` 363/363; `eval:chat:mock` 128/128 (100%, keamanan 100%); total 479 test; coverage baris 96,1%.

## Fase 5 — Shell UI · HIJAU (2026-10-22)
- Router (deep link §10.1, lazy pages), sidebar berkategori (desktop) + bottom tab 5 item (mobile), pencarian global Ctrl/Cmd+K (Dex + entitas 9 Dex deret waktu + "cari di Dex"), banner offline, prompt versi baru.
- Beranda: hero + 4 saran lintas kategori, ringkasan pasar 6 aset (sparkline dari `core/global/spark.json`), Peta Fitur 27 Dex dalam 8 kategori (cari, chip kategori, filter Indonesia, sembunyikan NC), strip "Data per", footer hak cipta.
- Tentang (wordmark tema-aware, kredit, tagline, versi/build, sumber data), Legal (privasi UU PDP, ketentuan, disclaimer §12.2 persis, sumber data dari registry+manifest, lisensi OSS), Pengaturan (tema, bahasa, buta warna, hapus data perangkat), Watchlist, Lainnya.
- i18n id/en (kunci identik, 6 chip §8.9 per Dex), token desain §10.3, fokus terlihat, skip link, aria-live.

## Fase 6 — Halaman Dex, grafik, chat · HIJAU (2026-10-22)
- Halaman Dex: header badge (as-of, kualitas, status, NC, sampel) + tab (Chat pertama, Data terakhir) sesuai §9 untuk 27 Dex; 178 panel tab menjalankan tool chatbot di browser dengan kontrol dari skema zod (test: semua panel valid & berjalan pada data nyata).
- Renderer ChartSpec → ECharts (line/candle/bar/heatmap/graph/map-fallback; lazy), kartu kutipan hukum + pratinjau halaman PDF asli (pdf.js, termasuk pindaian CCITT), DataTable (sort/saring/virtual/CSV), ekspor PNG/CSV/bagikan bertanda air §11, "Tanya tentang ini", layar penuh, alternatif teks.
- Detail entitas (snapshot, grafik harga, kalender return, drawdown, kualitas, watchlist) untuk 9 Dex deret waktu + `/markets/:slug`.
- Chat: SSE streaming, status tool, kartu jawaban §8.8, panel "Kenapa jawabannya begini?" dari event `method`, sitasi, stop/ulangi/salin/bagikan, riwayat IndexedDB per Dex (≤ 50), persetujuan berversi, detektor data sensitif, disclaimer per Dex.
- Uji: smoke browser seluruh tab 27 Dex + 21 rute tanpa error; unit/komponen UI 25 test baru. Total 682 test lulus; coverage baris 96,4%, statement 93,8%, fungsi 94,6%, branch 74,7%.

## Fase 7 — PWA & native · HIJAU dengan catatan (2026-10-22)
- PWA: manifest (tema #0A0F0C, standalone, ikon kit), SW injectManifest: precache shell + 199 file `core/`, `heavy/` SWR + LRU ≤ 300 MB, fallback SPA (tanpa /api, /data), prompt "Versi baru tersedia". JS awal 159 KB gzip (≤ 250 KB).
- Capacitor 8: `capacitor.config.ts` (appId default [KONFIRMASI]), platform `android/` & `ios/` ditambahkan, `cap sync` OK; ikon adaptive/round/launcher + splash (ikon + logo P + "by Dea Saka Kurnia Putra"); iOS `NSHumanReadableCopyright`.
- Native: splash hide, status bar per tema, tombol back Android (tutup dialog → kembali → konfirmasi keluar), tautan eksternal via Browser, share sheet PNG/CSV via Filesystem+Share, haptic saat kirim, data core dibundel.
- Catatan: build Android debug **tidak dapat dijalankan di mesin ini** (JDK 11 terpasang; Capacitor 8/AGP butuh JDK 21) dan iOS butuh Xcode (hanya Command Line Tools) → dibangun di GitHub Actions (`android.yml`, `ios.yml`).

## Fase 8 — CI/CD & deploy configs · HIJAU (lokal) — deploy menunggu akun (2026-10-22)
- `vercel.json` (rewrite API + SPA, header keamanan & CSP, cache `/data` ber-CORS), `netlify.toml` (setara), adapter Vercel teruji.
- Workflow: `ci.yml` (fetch→data→gitleaks→audit→verify→Lighthouse, unggah laporan), `parity.yml`, `promote.yml` (fast-forward `release`), `android.yml` (APK debug + AAB bertanda tangan bila secret ada), `ios.yml` (build simulator + IPA bila secret ada), `deploy-fallback.yml`, `eval-live.yml`, Dependabot.
- Skrip: `test:parity`, `check:licenses` (+ `public/licenses.json`), `check:secrets`, size-limit, Lighthouse CI, Playwright (E2E + axe).
- Belum dilakukan (butuh akun/keputusan pemilik): repo via Lovable, release `data-inputs-v1`, koneksi Vercel/Netlify, secret CI.

## Fase 9 — QA menyeluruh · HIJAU kecuali eval live (2026-10-22)
- `npm run verify` (PW_LOCAL=1) lulus: lint/typecheck 0 error; 729 test (unit+golden+tools+ui) — coverage baris 96,4%, statement 93,8%, fungsi 94,5%, branch 74,6%; golden 62/62; tools 541/541; eval mock 128/128 (keamanan 100%); bundel awal 165,4 KB gzip (≤ 250 KB); lisensi & secret bersih; E2E 123/123 (Chrome desktop + Pixel 7, termasuk axe 16 halaman tanpa pelanggaran serious/critical).
- Parity Python↔golden 59/59 (dengan toleransi seri di batas top-N); `npm audit --omit=dev` 0 kerentanan; Lighthouse mobile Beranda: Perf 90, A11y 100, BP 100, SEO 100 (median 3 run).
- Eval live **belum dijalankan**: `ANTHROPIC_API_KEY` belum tersedia.

## Pasca-rilis — My LAIwyer hukum keuangan, whitepaper v2, presentasi (2026-10-23)
- My LAIwyer: korpus 19 teks resmi hukum sektor keuangan (SHA-256 dipatok, cermin di release `law-docs-v1`), tool `scam_guide` (8 skenario penipuan), `search_law` scope `finance`, tab "Kena Penipuan?" & "Hukum Keuangan", router mode data untuk pertanyaan hukum.
- Whitepaper v2 (18 bab, termasuk tech stack) dengan unduhan PDF Bahasa Indonesia & English di Beranda dan /whitepaper.
- Presentasi `docs/presentation/Finandex-Presentation-{ID,EN}.pptx` (17 slide, tangkapan layar asli) dari `scripts/build/make-presentation.py` + `scripts/build/capture-screens.ts`.
- Verifikasi: lint/typecheck 0 error; 793 test lulus; bundel awal 180,9 KB gzip (≤ 250 KB); copyright check lulus.

## v3 / v3.1 — 29 Dex, FinLAIwyer, AntiScamDex, Index Constellation, tema Obligasi & Brankas (2026-10-23)
- Repo dipindah ke `DSKPutra/finandex` (main/release di-force-push; riwayat lama di `archive/v2-*`); domain `finandex.vercel.app` / `finandex.netlify.app`.
- Hukum: katalog kit + lock regulasi (35/37 teks resmi; `kuhperdata`, `pp-33-2026-pdp` pending), mesin Konsultasi Terpandu, tool hukum baru (status regulasi, rujukan silang, banding versi, kanal, glosarium), AntiScamDex (statistik IASC/Satgas/OJK, modus, swa-periksa, langkah darurat, wizard laporan offline terenkripsi).
- Eval mock 161/161 (keamanan 100%); golden kit lulus.
- UI "Index Constellation" lalu recolor "Obligasi & Brankas": token baru di `brand.ts` + CSS (kontras AA teruji kedua tema), konstelasi titik tinta, guilloche ≤ 6% hanya di hero, ECharts 1,75 px/area 12%, splash/PWA/status bar `#EEF2EC`/`#0F1F19`, Pengaturan (sistem/Obligasi/Brankas, kurangi gerak, kontras tinggi, haptic), `ui:audit` 0 temuan, tangkapan sebelum/sesudah di `docs/ui-review/recolor/`.

## Secure SBOM — Paket B (2026-10-23)
- `npm run sbom:generate` → 7 SBOM artefak + SBOM induk (1.549 komponen, 7 layanan, 2 model AI) + SPDX 2.3 + VEX (22 pernyataan, semuanya devDependencies `not_affected`) + SHA256SUMS di `public/sbom/<versi>/`.
- `npm run sbom:verify`: 156 pemeriksaan (skema CycloneDX 1.7, elemen minimum CISA 2026, cakupan lockfile, hash, VEX, kebocoran) — 0 gagal; sbomqs SBOM induk 9,0/10.
- Dokumen B01–B05 (+ PDF) di `docs/compliance/sbom/`, `STANDARDS_REFERENCED.md`, `OPEN_ITEMS.md`, `INDEX.md`; halaman `/legal/sbom` & `/legal/security`; `SECURITY.md`; workflow `compliance.yml` (sbomqs, osv-scanner, grype, cosign keyless, attest-sbom, attest-build-provenance, unggah ke Release).
- Belum: Paket A (A01–A13) dan Paket C (C01–C14), tanda tangan/atestasi nyata (menunggu tag rilis).

## UI "Spektrum" (2026-10-24)
- Benchmark Bibit, Stockbit, TradingView, Revolut → `docs/ui-review/benchmark.md`; tema Obligasi & Brankas diganti Spektrum (teal + oranye + indigo, 8 warna kategori).
- Kartu Dex bergaris warna kategori dengan ikon bertinta, header Dex berpita kategori, chip & judul bagian bertitik warna, konstelasi dan ruangan Agent Room memakai warna kategori; splash/PWA/status bar `#F6F7F9`/`#0F1520`; Pengaturan: Terang/Gelap.
- `ui:audit` 0 temuan (fallback literal di scene Agent Room diganti token), 923 test lulus, tangkapan sebelum/sesudah di `docs/ui-review/spektrum/`.

## Dokumentasi teknis — Paket A & C (2026-10-24)
- `npm run docs:build` → A01–A13 (`docs/compliance/technical/`, + `openapi.json`), C01–C14 (`docs/compliance/privacy/`, + `LEGAL_REFS_VERIFIED.md`), 32 PDF bergaya Spektrum, diagram Mermaid → SVG (`docs/compliance/diagrams/`); INDEX/OPEN_ITEMS/STANDARDS untuk ketiga paket.
- `npm run docs:verify`: 1.092 pemeriksaan, 0 gagal; 205 kebutuhan `REQ-*` semuanya tertaut ke tes; 14/14 rujukan pasal UU PDP cocok dengan teks resmi; 13 rujukan PP 33/2026 belum dapat diverifikasi (teks resmi belum tersedia).
- `npm run compliance:all` = SBOM + gate SBOM + dokumen + gate dokumen; langkah dokumen ditambahkan ke `compliance.yml`.
- VEX diperbaiki (zod 3 hanya di alat dev) → 27/27 `not_affected`.

## Data live (2026-10-24)
- `scripts/live-data/`: registry `sources.yaml` (ketentuan 7 sumber dibaca 2026-10-24), konektor ECB & World Bank, normalisasi RupiahDex/InflationDex, validasi §4, snapshot append-only `data/live/` + manifest SHA-256, `public/data/live/*.json`, tool `live_latest`, badge "Data live per …" di header Dex, atribusi di tab Data & /legal/data-sources.
- Hasil pertama: USD/IDR ECB 21–23 Okt 2026 (3 baris; selisih vs dataset ≤ 0,99 % pada 87 hari tumpang-tindih), inflasi World Bank 2025 untuk 168 negara (selisih vs dataset ≤ 0,19 pp).
- `live:fetch|validate|build|report|verify` (29 pemeriksaan, 0 gagal); workflow harian `live-data.yml` membuka PR otomatis; `build:ci` menjalankan `live:build`.

## Sisa UPDATE V3 (2026-10-24)
- Entri PWA `/apps/mylaiwyer/` dan `/apps/finlaiwyer/` (manifest sendiri, router terbatas, rewrite Vercel/Netlify, rute SW) + tes E2E.
- `src-tauri/` (Tauri 2.12.2, plugin updater/dialog/fs/deep-link/single-instance/window-state/opener), origin desktop di CORS, `desktop.yml` (macOS universal, Windows x64 & ARM64, SHA256SUMS ke release). Kompilasi Rust belum terverifikasi lokal (DNS crates.io).
- `regulations.yml` (bulanan, `--check`, membuka issue), `ui-review.yml` + `npm run ui:visual` (4 halaman × 3 viewport × 2 tema × 2 bahasa).
- Tes E2E lama diperbarui (29 Dex, label tema "Terang", pratinjau PDF di tab Sumber Hukum).
