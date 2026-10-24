# C02 — Rekaman kegiatan pemrosesan (RoPA)

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

| Kontrol dokumen | |
|---|---|
| ID dokumen | C02 |
| Judul | Rekaman kegiatan pemrosesan (RoPA) |
| Versi | 0.1.0 (= versi aplikasi) · commit `ae7d11b` |
| Tanggal | 2026-10-24 |
| Status | Draf |
| Klasifikasi | Internal |
| Pemilik | Dea Saka Kurnia Putra |
| Penyusun | Dibangkitkan oleh `scripts/compliance/*` (Claude Code) dari sumber kebenaran repo |
| Penyetuju | [KONFIRMASI] — penyetuju dokumen belum ditetapkan |
| Lingkup | Semua kegiatan pemrosesan |
| Standar acuan | UU PDP (perekaman pemrosesan); PP 33/2026 Pasal 74 (belum diverifikasi) |
| Dokumen terkait | C01, C08 |

**Riwayat perubahan**

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1.0 | 2026-10-24 | Versi pertama, dibangkitkan dari sumber kebenaran repo. |

Pengendali: Finandex (pemilik: Dea Saka Kurnia Putra) [KONFIRMASI identitas & alamat pengendali]. Rujukan: UU PDP Pasal 31 ✓; UU PDP Pasal 20 ✓.

[KONFIRMASI] daftar butir minimum PP 33/2026 Pasal 74 belum dapat disalin karena teks resmi belum tersedia; kolom di bawah mengikuti butir yang lazim (pengendali, tujuan, dasar, kategori subjek & data, penerima, transfer, retensi, keamanan).

| Kegiatan | Elemen (C01) | Tujuan | Dasar | Subjek | Penerima/prosesor | Transfer luar negeri | Retensi | Keamanan |
|---|---|---|---|---|---|---|---|---|
| Chat AI | D01, D02 | menjawab pertanyaan | persetujuan | pengguna aplikasi | Anthropic, Vercel | ya (Anthropic) | tidak disimpan di server | TLS, detektor data sensitif |
| Rate limit | D02, D03 | mencegah penyalahgunaan | kepentingan yang sah [KONFIRMASI] | pengguna chat | Vercel, Upstash (opsional) | tergantung region [KONFIRMASI] | TTL 10 menit / 1 hari | kunci tidak berisi isi pesan |
| Log operasional | D04 | operasi & galat | kepentingan yang sah [KONFIRMASI] | pengguna chat | Vercel | tergantung region [KONFIRMASI] | [KONFIRMASI] 30 hari | metadata saja |
| Persetujuan | D06 | bukti persetujuan lokal | — | pengguna chat | — | tidak | sampai direset | di perangkat |
| Distribusi aplikasi | D09 | unduhan & pembaruan | perjanjian store | pengunduh | Apple, Google, GitHub | ya | kebijakan store | dikelola store |
| Dukungan / email | — | menjawab permintaan | persetujuan | pengirim email | [KONFIRMASI] penyedia email | [KONFIRMASI] | [KONFIRMASI] | [KONFIRMASI] |
| Feedback anonim | — | perbaikan produk | — | — | — | — | — | belum ada fitur feedback di kode |
