# A01 — Rencana & indeks dokumentasi

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

| Kontrol dokumen | |
|---|---|
| ID dokumen | A01 |
| Judul | Rencana & indeks dokumentasi |
| Versi | 0.1.0 (= versi aplikasi) · commit `ae7d11b` |
| Tanggal | 2026-10-24 |
| Status | Draf |
| Klasifikasi | Internal |
| Pemilik | Dea Saka Kurnia Putra |
| Penyusun | Dibangkitkan oleh `scripts/compliance/*` (Claude Code) dari sumber kebenaran repo |
| Penyetuju | [KONFIRMASI] — penyetuju dokumen belum ditetapkan |
| Lingkup | Seluruh dokumentasi teknis, SBOM dan privasi Finandex |
| Standar acuan | ISO/IEC/IEEE 15289:2019 (kerangka isi information item); ISO/IEC/IEEE 12207:2017 (proses daur hidup) |
| Dokumen terkait | A02–A13, B01–B05, C01–C14 |

**Riwayat perubahan**

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1.0 | 2026-10-24 | Versi pertama, dibangkitkan dari sumber kebenaran repo. |

## 1. Tujuan
Menetapkan dokumen apa yang dipelihara, siapa pemiliknya, dari mana isinya dibangkitkan, dan kapan diperbarui. Semua dokumen dibangun ulang otomatis (`npm run docs:build`) dan diperiksa (`npm run docs:verify`) di setiap rilis.

## 2. Daftar information item
| ID | Dokumen | Proses ISO/IEC/IEEE 12207 | Sumber kebenaran |
|---|---|---|---|
| A02 | Kebutuhan (StRS + SRS) | Teknis — definisi kebutuhan pemangku kepentingan & sistem | `src/config/dex-registry.ts`, `feature_guide.json` |
| A03 | Deskripsi arsitektur | Teknis — definisi arsitektur | `vercel.json`, `server/**`, `capacitor.config.ts`, `docs/DECISIONS.md` |
| A04 | Deskripsi desain | Teknis — definisi desain | `src/**`, `server/**`, `scripts/**` |
| A05 | Spesifikasi antarmuka | Teknis — definisi desain | `server/handler.ts`, `src/shared/chat-protocol.ts` |
| A06 | Spesifikasi & kamus data | Teknis — implementasi; pendukung — manajemen informasi | `kit/manifest/input_files_manifest.json`, `kit/datasets/**`, `regulations.lock.json` |
| A07 | Dokumentasi pengujian | Teknis — verifikasi & validasi | `tests/**`, `reports/*.json` |
| A08 | Evaluasi kualitas produk | Manajemen — jaminan kualitas | `reports/*.json`, `docs/ui-review/audit.json` |
| A09 | Keamanan aplikasi | Pendukung — manajemen risiko | `server/security/**`, `vercel.json`, `SECURITY.md` |
| A10 | Sistem AI | Teknis & manajemen risiko | `server/env.ts`, `server/agents/**`, `docs/agents/eval.json` |
| A11 | Informasi untuk pengguna | Teknis — transisi & operasi | `feature_guide.json`, `docs/ui-review/**` |
| A12 | Operasi & pemeliharaan | Teknis — operasi, pemeliharaan | `package.json` scripts, `.github/workflows/**`, `server/env.ts` |
| A13 | Keterlacakan & glosarium | Manajemen — manajemen konfigurasi | A02 + `tests/**` |
| B01–B05 | Secure SBOM | Pendukung — manajemen konfigurasi & risiko rantai pasok | `public/sbom/<versi>/` |
| C01–C14 | Pelindungan data pribadi | Manajemen — risiko & kepatuhan | kode + teks resmi UU PDP |

## 3. Siklus pembaruan
- Setiap commit ke `main`: `npm run verify` (lint, audit UI, typecheck, tes, eval, build).
- Setiap rilis (tag `v*`): workflow `compliance.yml` membangun SBOM, menandatangani, mengatestasi, lalu `docs:build` + `docs:verify`.
- Generator **gagal** bila sumber berubah tanpa dokumen ikut berubah: Dex/tab baru tanpa `REQ-*`, env var baru tanpa entri A12, layanan eksternal baru tanpa entri C08 (lihat `scripts/compliance/verify-docs.ts`).

## 4. Workflow CI yang terdaftar
| Workflow | File |
|---|---|
| android | `.github/workflows/android.yml` |
| ci | `.github/workflows/ci.yml` |
| compliance | `.github/workflows/compliance.yml` |
| deploy-fallback | `.github/workflows/deploy-fallback.yml` |
| desktop | `.github/workflows/desktop.yml` |
| eval-live | `.github/workflows/eval-live.yml` |
| ios | `.github/workflows/ios.yml` |
| live-data | `.github/workflows/live-data.yml` |
| parity | `.github/workflows/parity.yml` |
| promote | `.github/workflows/promote.yml` |
| regulations | `.github/workflows/regulations.yml` |
| ui-review | `.github/workflows/ui-review.yml` |
