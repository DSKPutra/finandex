# C05 — Spesifikasi persetujuan & pemberitahuan

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

| Kontrol dokumen | |
|---|---|
| ID dokumen | C05 |
| Judul | Spesifikasi persetujuan & pemberitahuan |
| Versi | 0.1.0 (= versi aplikasi) · commit `ae7d11b` |
| Tanggal | 2026-10-24 |
| Status | Draf |
| Klasifikasi | Internal |
| Pemilik | Dea Saka Kurnia Putra |
| Penyusun | Dibangkitkan oleh `scripts/compliance/*` (Claude Code) dari sumber kebenaran repo |
| Penyetuju | [KONFIRMASI] — penyetuju dokumen belum ditetapkan |
| Lingkup | Dialog persetujuan chat |
| Standar acuan | UU PDP Pasal 9 & 20; PP 33/2026 Pasal 30–36 (belum diverifikasi) |
| Dokumen terkait | C04, C06 |

**Riwayat perubahan**

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1.0 | 2026-10-24 | Versi pertama, dibangkitkan dari sumber kebenaran repo. |

Rujukan: UU PDP Pasal 20 ✓; UU PDP Pasal 9 ✓.

| Syarat | Implementasi | Bukti |
|---|---|---|
| Eksplisit & spesifik | dialog khusus chat sebelum pesan pertama | `src/components/ConsentDialog.tsx @ ae7d11b` |
| Tidak digabung dengan syarat & ketentuan | dialog persetujuan terpisah dari halaman Ketentuan | `src/content/legal.ts` (PRIVACY vs TERMS) |
| Layanan tetap tersedia tanpa persetujuan | Dex, grafik, statistik dapat dipakai tanpa chat | `src/features/dex/` |
| Penarikan persetujuan | Pengaturan → reset semua menghapus consentVersion dan clientId | `src/lib/store.ts#L36 @ ae7d11b` |
| Bukti persetujuan | versi kebijakan disimpan di perangkat (`consentVersion` = `2026-10-23`); server tidak mencatat persetujuan | `src/lib/store.ts#L35 @ ae7d11b` |
| Re-consent | bila POLICY_VERSION berubah, dialog muncul lagi | `src/components/ConsentDialog.tsx#L6 @ ae7d11b` |

Catatan: bukti persetujuan hanya di perangkat (data minimum). Bila PP 33/2026 Pasal 36 mensyaratkan bukti di sisi pengendali, rancangan tambahan: catat `(POLICY_VERSION, waktu, hash clientId)` di server — [KONFIRMASI] setelah teks resmi diverifikasi.
