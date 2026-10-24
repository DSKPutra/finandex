# C09 — Penilaian transfer data lintas batas

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

| Kontrol dokumen | |
|---|---|
| ID dokumen | C09 |
| Judul | Penilaian transfer data lintas batas |
| Versi | 0.1.0 (= versi aplikasi) · commit `ae7d11b` |
| Tanggal | 2026-10-24 |
| Status | Draf |
| Klasifikasi | Internal |
| Pemilik | Dea Saka Kurnia Putra |
| Penyusun | Dibangkitkan oleh `scripts/compliance/*` (Claude Code) dari sumber kebenaran repo |
| Penyetuju | [KONFIRMASI] — penyetuju dokumen belum ditetapkan |
| Lingkup | Prosesor di luar Indonesia |
| Standar acuan | UU PDP Pasal 56; PP 33/2026 Pasal 160–167 (belum diverifikasi) |
| Dokumen terkait | C03, C08 |

**Riwayat perubahan**

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1.0 | 2026-10-24 | Versi pertama, dibangkitkan dari sumber kebenaran repo. |

Rujukan: UU PDP Pasal 56 ✓.

Urutan dasar transfer: tingkat pelindungan setara → pelindungan yang memadai dan mengikat → persetujuan subjek data. Karena penilaian kesetaraan bergantung pada lembaga PDP yang belum terbentuk, mekanisme sementara dicatat di bawah.

| Prosesor | Data | Negara | Mekanisme sementara |
|---|---|---|---|
| Anthropic | teks percakapan (D01) | AS | ketentuan komersial penyedia + persetujuan pengguna di dialog chat [KONFIRMASI penyebutan transfer di dialog] |
| Vercel | D01 (transit), D03, D04 | tergantung region | DPA Vercel [KONFIRMASI] |
| Upstash (opsional) | D02, D03 | tergantung region | DPA Upstash [KONFIRMASI] |
