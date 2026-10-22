# Rilis & deploy (§15–§16)

© 2026 Dea Saka Kurnia Putra. All rights reserved.

## 1. Repo GitHub & Lovable (§15.1)
1. **Lovable dulu (disarankan):** buat project *Finandex* di Lovable → Project settings → Git → *Connect GitHub* → Lovable membuat repo baru (branch `main`).
2. Clone repo itu, salin seluruh isi codebase ini, `git push origin main`.
3. **Tanpa Lovable:** buat repo GitHub biasa dan push. Menambahkan Lovable belakangan: Lovable tidak bisa mengimpor repo yang sudah ada — buat project Lovable baru (repo baru), lalu push isi repo ini ke repo baru tersebut dan arahkan Vercel/Netlify ke repo itu.
4. Buat branch `release` dari `main` (production branch Vercel & Netlify). `promote.yml` mem-*fast-forward* `release` setelah CI `main` hijau.

## 2. Release data input `data-inputs-v1` (§3.4)
File input **tidak pernah di-commit**. Unggah 42 file input (nama persis §3.1) sebagai aset GitHub Release bertag `data-inputs-v1`:
```bash
gh release create data-inputs-v1 data/inputs/* --title "Finandex data inputs v1" --notes "42 input datasets (§3.1)"
```
Tanpa release, `npm run data:fetch` mengambil file dari branch `data-inputs` di repo yang sama (`DATA_INPUTS_BRANCH`; repo dibaca dari env Git Vercel/Netlify) — saat ini dataset diunggah ke branch ini. `npm run data:fetch` mengunduh hanya dari repo ini dan memverifikasi SHA-256 terhadap `kit/manifest`. Repo privat → set `GH_RELEASE_TOKEN` (fine-grained, read-only Contents) di Vercel, Netlify, dan GitHub Secrets.

**Saat ini belum diunggah oleh pemilik:** #2 NASDAQ, #3 S&P 500, #30 `KUHP_Lama.pdf`, #31 `UU_Nomor_20_Tahun_2025_KUHP.pdf` → Dex terkait berstatus `pending-data`/`partial` sampai file ditambahkan ke release dan build diulang. Tidak ada kode yang perlu diubah.

## 3. Vercel (§15.3)
- Import repo → framework Vite; `vercel.json` sudah mengatur `buildCommand` (`npm run build:ci`), output `dist`, fungsi `api/[[...route]].mjs` (handler dibundel ke `server-dist/` saat build), rewrites SPA, header keamanan & CORS data.
- Production branch: `release`. Env (Production & Preview): `ANTHROPIC_API_KEY` (secret), `ANTHROPIC_MODEL=claude-sonnet-5-5`, `ANTHROPIC_MODEL_FAST=claude-haiku-5-5`, `CORS_ALLOWED_ORIGINS`, `PRODUCTION_ORIGIN`, `CHAT_DEADLINE_MS=50000`, `DAILY_TOKEN_BUDGET`, opsional `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`, `LOG_LEVEL`, build: `GH_RELEASE_TOKEN`, `DATA_INPUTS_RELEASE_TAG`.
- Opsional: `ANTHROPIC_SERVER_FALLBACK=0` mematikan fallback penolakan sisi server (default aktif), `CHAT_EFFORT=low|medium|high`.
- **Ukuran data:** `dist/data` ±215 MB (core 23 MB, heavy 192 MB). Bila melewati batas output paket hosting Anda, layani data dari penyimpanan objek/CDN dan set `VITE_DATA_BASE_URL` (klien) + `DATA_BASE_URL` (server) ke URL itu; build tetap menghasilkan file yang sama untuk diunggah.

## 4. Netlify (§15.4)
- `netlify.toml` sudah mengatur build, publish `dist`, fungsi `netlify/functions/api.mts` (`config.path = /api/*`), header, dan redirect SPA. Production branch: `release`. Env sama dengan Vercel.
- Batas fungsi sinkron Netlify bisa lebih pendek dari 60 dtk pada paket tertentu — set `CHAT_DEADLINE_MS` di bawah batas paket Anda (mis. 24000 untuk batas 26 dtk).

## 5. Lovable (§15.5)
Lovable menghosting frontend dari repo yang sama. `npm install && npm run dev` berjalan tanpa `public/data` lokal: runtime (§15.6, `src/config/runtime.ts`) jatuh ke `PRODUCTION_ORIGIN` (`VITE_PRODUCTION_ORIGIN`, default `https://finandex.vercel.app`) untuk API & data. Verifikasi domain preview Lovable yang sebenarnya dan tambahkan ke `CORS_ALLOWED_ORIGINS` bila berbeda dari `*.lovable.app` / `*.lovableproject.com`.

## 6. Android & iOS (§14, §16)
- `npm run build:native` → build web dengan API & data heavy dari `PRODUCTION_ORIGIN`, `data/core` dibundel; `npx cap sync`.
- Ikon & splash: `npm run assets:generate`.
- CI: `android.yml` (APK debug + AAB rilis bertanda tangan dari `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`), `ios.yml` (macOS; `IOS_CERTIFICATE_P12_BASE64`, `IOS_CERTIFICATE_PASSWORD`, `IOS_PROVISIONING_PROFILE_BASE64`, opsional TestFlight via `APP_STORE_CONNECT_API_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_API_KEY_P8_BASE64`).

## 7. Checklist rilis (§16.3)
- [ ] **BUNDLE_ID [KONFIRMASI]** — default `com.deasakakurniaputra.finandex`; permanen setelah unggahan store pertama (set var `BUNDLE_ID`).
- [ ] **Lisensi dataset** — konfirmasi redistribusi/komersial untuk semua dataset berstatus `unknown` (lihat `/legal/data-sources`) dan patuhi CC BY-NC 4.0 (SalaryDex, StartupDex, OpenCompanyDex, VCNetworkDex, VCDex, IPODex).
- [ ] **VITE_DISTRIBUTION [KONFIRMASI]** — `noncommercial` (default) atau `commercial` (Dex NC otomatis disembunyikan).
- [ ] Nama NASDAQDex/SnP500Dex **tidak** dipakai di metadata store (pakai "Finandex").
- [ ] Disclaimer & halaman legal live; `SUPPORT_EMAIL` / `VITE_SUPPORT_EMAIL` diisi.
- [ ] Semua gate §18 hijau (`npm run verify`), `eval:chat` live ≥ 95% & 100% item keamanan.
- [ ] Store: nama "Finandex", subjudul "Wawasan Indeks Pasar Global", copyright "© 2026 Dea Saka Kurnia Putra", kategori Finance; privasi: pesan chat dikirim ke server untuk fungsi aplikasi, tidak ditautkan ke identitas, tanpa pelacakan/iklan/akun; rating usia dijawab jujur (chat AI, keuangan/kripto/hukum).

## 8. Rollback
Vercel: *Instant Rollback* ke deployment sebelumnya. Netlify: *Deploys → Publish deploy* sebelumnya. Git: `git push origin <sha-lama>:release --force-with-lease` (hanya bila disepakati).

## Whitepaper
Setelah mengubah `src/content/whitepaper.ts`, jalankan `npm run whitepaper:pdf` dan commit `public/whitepaper/*` (unit test memeriksa hash isi).

## Paket ekspor (`npm run export`)
Setelah `npm run build`, `npm run export` menulis ke `exports/` (gitignored): `finandex-source.zip` (kode di HEAD), `finandex-netlify-prebuilt.zip` (build + API + data, deploy dengan `npx netlify-cli deploy --prod --site finandex`), `finandex-vercel-prebuilt.zip` (`.vercel/output`, deploy dengan `npx vercel link` lalu `npx vercel deploy --prebuilt --prod`) dan `EXPORT.md`.
