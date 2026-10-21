# Finandex — Laporan Akhir (§20)

© 2026 Dea Saka Kurnia Putra. All rights reserved.

Tanggal: 2026-10-21 · Branch: `main` (repo lokal; belum ada remote GitHub).

## 1. URL preview & produksi
**Belum ada URL live.**
- **Netlify:** site `finandex` sudah dibuat di akun Anda (https://app.netlify.com/projects/finandex → `https://finandex.netlify.app`), tetapi unggahan deploy ditolak oleh kebijakan jaringan sesi ini (host `api.netlify.com` dan `netlify-mcp.netlify.app` diblokir, 403). Bundel siap-deploy dibuat oleh `npx tsx scripts/deploy/stage-prebuilt.ts <folder>` (dist + API terbundel, tanpa input mentah).
- **Vercel:** akun terhubung, tetapi deploy tanpa Git berarti mengirim ±2.900 file (±230 MB) satu per satu — tidak praktis; deploy via Git menunggu repo GitHub.
- **GitHub/Lovable:** repo `finandex` belum ada dan sesi ini tidak punya kredensial GitHub untuk membuatnya.
Semua konfigurasi siap: `vercel.json`, `netlify.toml`, fungsi `api/[[...route]].mjs` dan `netlify/functions/api.mts`, workflow `.github/workflows/*`. Langkah lengkap: `docs/RELEASE.md`.

## 2. Artefak APK/AAB & IPA
**Belum dibangun.** Lingkungan ini tidak memiliki Android SDK maupun Xcode. Proyek `android/` dan `ios/` (Capacitor 8) sudah ditambahkan dan disinkronkan; ikon & splash dibangkitkan dari artwork kit. `android.yml` menghasilkan APK debug + AAB rilis bertanda tangan, `ios.yml` mengarsip & mengekspor IPA (opsional TestFlight). Keduanya butuh secret penandatanganan (§19).

## 3. Hasil gate §18 (diukur di lingkungan ini)

| Gate | Hasil |
|---|---|
| `lint` (ESLint, `--max-warnings 0`) | ✅ lulus |
| `typecheck` (app/server/node) | ✅ 0 error |
| `check:copyright` | ✅ |
| `check:contrast` (WCAG AA, dua tema, palet grafik, buta warna) | ✅ |
| `check:licenses` | ✅ 1.129 paket (lihat DECISIONS untuk dedikasi domain publik & lisensi dev) |
| `check:secrets` (repo + `dist/`) | ✅ 924 file; gitleaks berjalan di CI |
| Unit + tools test | ✅ 380/380 (golden + tools: 400/400) |
| Coverage `src/shared/**` + `server/**` | ✅ statement **98,64%** · branch **90,87%** · function **99,65%** · line **99,39%** |
| Golden (`test:golden`) | ✅ 60/60 tes; **49 file golden identik** (rel 1e-6 / abs 1e-9); 10 file NASDAQ/S&P 500 dilaporkan *pending* (input #2/#3 tidak ada); `law/golden.json` dibandingkan parsial (dokumen #30/#31 tidak ada) |
| Parity Python ↔ golden ↔ TS (`test:parity`) | ✅ 48 file golden: **0 selisih**; 11 dilewati (NASDAQ, S&P 500, hukum) |
| `eval:chat:mock` (128 item) | ✅ untuk semua item yang datanya ada: **115 lulus, 0 gagal**, 13 *pending-data* (NASDAQ 7, S&P 500 6 → #2/#3; mylaiwyer-01 → #30). Item keamanan: 16/17 (yang tersisa = mylaiwyer-01, pending-data). Laporan: `docs/eval/mock-report.md` |
| `eval:chat` live | ⏸ belum dijalankan — butuh `ANTHROPIC_API_KEY` |
| `build` | ✅ (handler server dibundel; PWA: 378 entri precache, ±24,5 MB termasuk `data/core`) |
| `size` (JS awal) | ✅ **130,27 KB gzip** ≤ 250 KB |
| E2E Playwright | ✅ Chromium desktop + Pixel **116 lulus** (28 dilewati sesuai desain); desktop 72/72 (rute & deep link + refresh, 27 kartu dalam 8 kategori, setiap tab dari 27 Dex, chat streaming/stop/persetujuan/data sensitif/offline, watermark CSV, halaman hukum + render PDF asli, ID/EN, tema); Chromium Pixel **44 lulus**, 28 dilewati sesuai desain (sapuan tab penuh hanya di desktop). WebKit & Firefox **belum dijalankan di sini** (hanya Chromium terpasang) — CI menjalankan ketiganya |
| Aksesibilitas (axe WCAG 2.2 AA) | ✅ 8 halaman × 2 tema, 0 pelanggaran *serious/critical* |
| Lighthouse mobile — Beranda | ✅ `lhci` lulus (median 3 run): **Performance 91** (run 91/93/82) · Accessibility 100 · Best Practices 100 · SEO 92; LCP ±2,0 dtk, CLS ≈ 0. Dicapai dengan prerender shell Beranda (id & en) saat build, `boot.js` yang menerapkan bahasa/tema sebelum paint, skrip entry di akhir `<body>`, dan tinggi tetap kartu ringkasan pasar. Skor lab bervariasi antar-run; workflow `lighthouse.yml` menjaganya |

## 4. Status Dex

| Dex | Status | Data per |
|---|---|---|
| Finandex AI | live | 2026-10-19 |
| NASDAQDex | **pending-data** (input #2 belum diunggah) | — |
| SnP500Dex | **pending-data** (input #3 belum diunggah) | — |
| CommerceDex | live | 2026-05-13 |
| IPODex | live | 2026-06-18 |
| IDFinanDex | live | 2026-05-29 |
| RupiahDex | live | 2026-10-20 |
| IDXDex | live | 2024-05-17 |
| ReksaDex | live | 2026-05-29 |
| CryptDex | live | 2026-10-20 |
| CentralBankDex | live | 2026-10-16 |
| InflationDex | live | 2024 (tahun per negara) |
| StartupDex | live | 2026-06-12 |
| VCDex · VCNetworkDex | live | 2026 |
| OpenCompanyDex | live | 2026-10 |
| SalaryDex | live | 2026-06 |
| CostLivingDex | live (data **sintetis**) | 2024-06-15 |
| IDHousingDex · IDFoodDeliveryDex | live | tidak dicantumkan di dataset |
| PovertyDex | live | tahun survei per negara |
| PopulationDex · HomelessnessDex | live (liputan berita) | 2026-07-29 (Juli 2026 parsial) |
| HousingDex | live (liputan berita) | 2026-07-23 (Juli 2026 parsial) |
| FintechDex · PersonalFinanDex | live | 2026-09-08 · 2026-09-16 |
| My LAIwyer | **partial** — UUD 1945 naskah asli & UU 1/1946 terindeks; UU 8/1981 (#30) & UU 20/2025 (#31) menunggu dokumen | UUD 1945 naskah asli |

As-of resmi tiap Dex ada di `public/data/manifest.json` dan strip "Data per" di Beranda.

## 5. Keputusan
Lihat `docs/DECISIONS.md` — antara lain: perlakuan input yang belum ada (`pending-data`), tie-break IDX, perbandingan golden hukum parsial, format seri ringkas, tab Dex sebagai view deklaratif atas tool yang sama dengan chatbot, fallback penolakan sisi server aktif default, thinking adaptif dengan `effort=low`, penjaga data sensitif di server, bundel handler untuk Vercel, palet grafik tema terang, gate lisensi, batas cache heavy.

## 6. Keterbatasan & langkah manual yang perlu Anda lakukan
1. **Unggah input yang belum ada:** #2 NASDAQ, #3 S&P 500, #30 `KUHP_Lama.pdf`, #31 `UU_Nomor_20_Tahun_2025_KUHP.pdf` — lalu build ulang. Kode ETL, tool, tab, prompt, dan skenario eval sudah siap; 13 item eval akan bisa diuji.
2. **Akun & repo:** buat project Lovable → repo GitHub (atau repo biasa), push, buat release `data-inputs-v1` berisi 42 input, hubungkan Vercel & Netlify (production branch `release`).
3. **Secret/env:** `ANTHROPIC_API_KEY`, `GH_RELEASE_TOKEN` (bila repo privat), `CORS_ALLOWED_ORIGINS`, `PRODUCTION_ORIGIN`, `DAILY_TOKEN_BUDGET`, opsional Upstash; CI: `VERCEL_*`, `NETLIFY_*`, keystore Android, sertifikat/profil iOS, kunci App Store Connect.
4. **[KONFIRMASI]:** `BUNDLE_ID` (default `com.deasakakurniaputra.finandex`, permanen setelah unggahan pertama) dan `VITE_DISTRIBUTION` (`noncommercial` default).
5. **Lisensi data:** konfirmasi redistribusi/komersial untuk dataset berstatus "tidak dicantumkan"; enam dataset Fliar Research CC BY-NC 4.0 hanya non-komersial.
6. **`SUPPORT_EMAIL`** untuk halaman privasi/syarat dan store.
7. **Eval live** (`npm run eval:chat` / `eval-live.yml`) setelah kunci API tersedia — target ≥ 95% & 100% item keamanan.
8. **Ukuran data** ±215 MB di `dist/data`; bila melebihi batas paket hosting, layani dari CDN/penyimpanan objek via `VITE_DATA_BASE_URL`/`DATA_BASE_URL`.
9. **Akses jaringan untuk deploy dari sesi:** izinkan `api.netlify.com` dan `netlify-mcp.netlify.app` (dan `api.vercel.com` bila perlu) di pengaturan *Network access* environment, lalu saya bisa mengunggah bundel siap-deploy ke site `finandex`.
10. **E2E WebKit/Firefox** dan **build APK/AAB/IPA** berjalan di CI (browser & SDK tidak tersedia di sesi ini).
11. **Peta** memakai scatter/bar (tanpa GeoJSON, karena tidak ada di input dan tidak boleh diunduh).
