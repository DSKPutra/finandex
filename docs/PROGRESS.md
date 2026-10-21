# Progres

## Fase 0 — Input · MERAH → dilanjutkan atas instruksi pemilik
- Kit 199/199 checksum OK. Dataset 38/42 terverifikasi (byte + SHA-256 + isi zip). Hilang: #2, #3, #30, #31 → `pending-data` (lihat DECISIONS).
- Referensi Python (`kit/reference/*.py`) dijalankan atas data tersedia: **semua golden yang datanya ada cocok 0 selisih** (global, commerce, idfin, usdidr, reksa, idx, crypto*, centralbank, fintech, personalfinance, salary, startup, food, opencompany, vcnetwork, vcdirectory, housing, ipo, inflation, costliving, poverty, population, homelessness, housingnews). Dilewati: nasdaq, sp500, law.

## Fase 1 — Scaffold · HIJAU
- Gate: `lint` ✓ · `typecheck` (app/server/node) ✓ · `check:copyright` ✓.

## Fase 2 — Analitik bersama · HIJAU
- `src/shared/{dates,format,text,analytics,law}` + unit test 40/40; coverage `src/shared` 99,1% statement / 92,9% branch.

## Fase 3 — ETL + golden · HIJAU (parsial sesuai data)
- 24 Dex `live`, 1 `partial` (My LAIwyer), 2 `pending-data` (NASDAQDex, SnP500Dex). `test:golden` 60/60: 49 file golden dibandingkan persis (rel 1e-6 / abs 1e-9); 10 file NASDAQ/S&P dilaporkan pending.

## Fase 4 — Server, tools, SSE, prompt, keamanan · HIJAU (dengan item pending-data)
- Tools untuk 27 Dex (`server/dex/*/tools.ts`, registry `server/dex/index.ts`), skema `strict`, `ui` + `method` wajib untuk tool angka.
- Orkestrator §8.3 (`server/chat/orchestrator.ts`), adapter Claude (`server/chat/anthropic.ts`), SSE §8.2, handler (`server/handler.ts`) untuk Vercel (`api/[[...route]].ts`) & Netlify (`netlify/functions/api.mts`), keamanan (CORS allowlist, rate limit + anggaran token, validasi zod + 64 KB, header, penjaga data sensitif).
- System prompt global + 27 Dex (`server/chat/system-prompts/*.md`, dibundel ke `prompts.generated.ts`).
- `test:tools` + unit: 326 tes lulus; coverage `src/shared` + `server` **98,6% statement · 90,9% branch · 99,7% function · 99,4% line** (matriks tool memanggil setiap tool; fixture saham SINTETIS untuk tool NASDAQ/S&P yang datanya belum ada).
- `eval:chat:mock`: **115/128 lulus, 0 gagal, 13 pending-data** (NASDAQ 7, S&P 500 6 → input #2/#3; mylaiwyer-01 → input #30). Laporan: `docs/eval/mock-report.md`.

## Fase 5–6 — UI · HIJAU (E2E menyusul di Fase 9)
- Shell: sidebar 8 kategori (desktop, bisa diciutkan), bottom tab bar 5 item (mobile, AI di tengah), Ctrl/Cmd+K pencarian global (Dex + entitas lintas Dex + pasal), offline banner, splash §11.1, footer hak cipta.
- Beranda: hero "Tanya Finandex AI…", ringkasan pasar 6 aset, Peta Fitur 27 Dex dalam 8 kategori (cari, filter kategori, Indonesia, sembunyikan NC), strip "Data per".
- Halaman Dex: header + badge (as-of, status, sampel, NC, sintetis) + tab; Chat pertama, Data terakhir; tab fitur deklaratif (`src/dex/views/*.ts`) menjalankan tool yang SAMA dengan chatbot di browser → angka identik.
- Chat: streaming SSE, chip status tool, kartu jawaban §8.8 (teks → grafik → panel "Kenapa jawabannya begini?" dari event `method` → sitasi), stop/ulangi/salin/bagikan, riwayat lokal (IndexedDB, 50/Dex), persetujuan pertama §13.3, detektor data sensitif klien, disclaimer per Dex.
- Grafik ECharts dari ChartSpec (line/candle/bar/heatmap/histogram/graph/map-scatter), tabel tervirtualisasi, ekspor PNG/CSV bertanda air, layar penuh, tabel tersembunyi untuk pembaca layar.
- Halaman: Dex Hub, Watchlist, Pengaturan (bahasa, tema, buta warna, hapus data lokal), Tentang (wordmark, kredit, tagline, versi/build), Legal (privasi UU 27/2022, syarat, disclaimer, sumber data dari registry+manifest, lisensi OSS).
- Test: `tests/tools/views.test.ts` (setiap tab fitur 27 Dex punya view; panggilan default sukses; ≥ 6 saran id/en). Bundel entry 151 KB gzip; ECharts dimuat malas.

## Fase 7 — PWA & native · HIJAU (build native di CI macOS/Android menunggu secret)
- PWA (vite-plugin-pwa): manifest (Finandex, ikon kit, `#0A0F0C`, standalone), precache shell + `data/core` (378 entri), `heavy/` stale-while-revalidate (LRU 4.000 entri + purge saat kuota penuh), `/api` NetworkOnly, prompt "Versi baru tersedia".
- Offline: banner global; chat menonaktifkan kirim dengan pesan "Butuh koneksi internet".
- Resolusi runtime §15.6 (`src/config/runtime.ts`): env → same-origin `/data/manifest.json` → `PRODUCTION_ORIGIN`.
- Capacitor 8: `android/` & `ios/` ditambahkan; `npm run build:native` (API + data heavy dari produksi, `data/core` dibundel). Integrasi native: status bar & splash, tombol back Android (tutup sheet → kembali → konfirmasi keluar), haptic saat kirim, share sheet PNG, tautan eksternal via in-app browser, keyboard resize. `NSHumanReadableCopyright` di Info.plist.
- Ikon & splash native dirender dari artwork kit (`npm run assets:generate`, Chromium headless; logo tidak digambar ulang).

## Fase 8 — CI/CD & deploy · HIJAU (koneksi akun menunggu pemilik)
- `vercel.json` (build `build:ci`, fungsi `api/[[...route]].mjs` dari handler yang dibundel esbuild ke `server-dist/`, rewrites SPA, CSP & header keamanan, CORS data), `netlify.toml` (fungsi `netlify/functions/api.mts` path `/api/*`, header, redirect SPA).
- Workflow: `ci.yml` (semua gate + gitleaks + unggah laporan), `parity.yml` (Python 3.12 + pandas/numpy/pyarrow/poppler), `promote.yml` (fast-forward `release`), `android.yml`, `ios.yml`, `deploy-fallback.yml`, `eval-live.yml`; Dependabot npm + actions.
- Gate baru: `check:licenses` (878 paket OK), `check:secrets` (repo + dist), `check:contrast` (dua tema + palet grafik + buta warna), `test:parity`, `size` (entry 153,88 KB gzip ≤ 250 KB).
- Dokumen: `docs/RELEASE.md`, `docs/DATA.md`, `docs/ARCHITECTURE.md`, `docs/ADD_NEW_DEX.md`.

## Fase 9 — QA · SEBAGIAN (lihat `docs/FINAL_REPORT.md`)
- Hijau: lint, typecheck, copyright, kontras, lisensi, secret, 380 tes unit+tools (coverage 98,64/90,87/99,65/99,39), golden 60/60, parity 0 selisih, eval mock 115/128 (0 gagal, 13 pending-data), build, size 130,27 KB gzip, E2E Chromium 72/72 + Pixel 44, axe 16/16.
- Belum: Lighthouse Performance 81–83 (< 90), E2E WebKit/Firefox (hanya di CI), eval live (butuh kunci API), deploy & build native (butuh akun/secret).
