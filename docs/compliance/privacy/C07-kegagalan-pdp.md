# C07 — Prosedur pemberitahuan kegagalan pelindungan data pribadi

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

| Kontrol dokumen | |
|---|---|
| ID dokumen | C07 |
| Judul | Prosedur pemberitahuan kegagalan pelindungan data pribadi |
| Versi | 0.1.0 (= versi aplikasi) · commit `ae7d11b` |
| Tanggal | 2026-10-24 |
| Status | Draf |
| Klasifikasi | Internal |
| Pemilik | Dea Saka Kurnia Putra |
| Penyusun | Dibangkitkan oleh `scripts/compliance/*` (Claude Code) dari sumber kebenaran repo |
| Penyetuju | [KONFIRMASI] — penyetuju dokumen belum ditetapkan |
| Lingkup | Insiden data pribadi |
| Standar acuan | UU PDP Pasal 46; PP 33/2026 Pasal 114–118 (belum diverifikasi) |
| Dokumen terkait | A12 |

**Riwayat perubahan**

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1.0 | 2026-10-24 | Versi pertama, dibangkitkan dari sumber kebenaran repo. |

Rujukan: UU PDP Pasal 46 ✓.

## 1. Tenggat
Pemberitahuan tertulis kepada subjek data dan lembaga (sementara: Komdigi) paling lambat **3 × 24 jam** sejak kegagalan diketahui.

## 2. Isi pemberitahuan
Data yang terungkap; kapan dan bagaimana terungkap; upaya penanganan dan pemulihan.

## 3. Langkah
1. Pastikan insiden (runbook A12 §5).
2. Hentikan sumber (rollback, rotasi secret, `CHAT_MODE=mock`).
3. Nilai elemen C01 yang terdampak (catatan: isi pesan tidak disimpan di server — paparan paling mungkin adalah log metadata atau kunci rate limit).
4. Kirim pemberitahuan; pemberitahuan publik bila subjek tidak dapat dihubungi satu per satu (tanpa akun, ini kemungkinan besar).
5. Prosesor melapor ke pengendali pada kesempatan pertama (C08).

## 4. Templat
**ID:** "Pada [tanggal] kami mengetahui [uraian]. Data yang terdampak: [elemen]. Langkah yang telah kami ambil: [tindakan]. Kontak: [kontak PDP]."

**EN:** "On [date] we became aware of [description]. Data affected: [elements]. Steps taken: [actions]. Contact: [PDP contact]."

## 5. Register insiden
| Tanggal | Uraian | Elemen | Diberitahukan | Selesai |
|---|---|---|---|---|
| — | belum ada insiden | — | — | — |
