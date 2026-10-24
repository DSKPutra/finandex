# C03 — Penilaian Dampak Pelindungan Data Pribadi (DPIA)

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

| Kontrol dokumen | |
|---|---|
| ID dokumen | C03 |
| Judul | Penilaian Dampak Pelindungan Data Pribadi (DPIA) |
| Versi | 0.1.0 (= versi aplikasi) · commit `ae7d11b` |
| Tanggal | 2026-10-24 |
| Status | Draf |
| Klasifikasi | Internal |
| Pemilik | Dea Saka Kurnia Putra |
| Penyusun | Dibangkitkan oleh `scripts/compliance/*` (Claude Code) dari sumber kebenaran repo |
| Penyetuju | [KONFIRMASI] — penyetuju dokumen belum ditetapkan |
| Lingkup | Chat AI, FinLAIwyer/AntiScamDex, penyimpanan lokal |
| Standar acuan | UU PDP Pasal 34; PP 33/2026 Pasal 120–121 (belum diverifikasi); ISO/IEC 29134:2023 |
| Dokumen terkait | C01, C09, A10 |

**Riwayat perubahan**

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1.0 | 2026-10-24 | Versi pertama, dibangkitkan dari sumber kebenaran repo. |

Rujukan: UU PDP Pasal 34 ✓.

## (a) Chat AI — teks pengguna dikirim ke penyedia LLM di luar negeri
| Aspek | Isi |
|---|---|
| Deskripsi | pesan pengguna diteruskan server ke Anthropic untuk menghasilkan jawaban |
| Kebutuhan & proporsionalitas | diperlukan untuk fungsi chat; hanya ≤ 20 pesan terakhir; tanpa clientId/IP ke penyedia |
| Risiko bagi subjek | pengguna mengetik data pribadi/keuangan; transfer lintas batas |
| Mitigasi | persetujuan sebelum chat, detektor data sensitif (blokir), peringatan "jangan masukkan data pribadi", tidak disimpan di server |
| Risiko sisa | sedang — teks bebas selain pola yang dideteksi tetap dapat terkirim |
| Keputusan | dapat dilanjutkan dengan mitigasi; tinjau saat model/penyedia berubah |

## (b) FinLAIwyer / AntiScamDex — konteks korban tindak pidana & data keuangan
| Aspek | Isi |
|---|---|
| Deskripsi | pertanyaan hukum dan kronologi penipuan dapat diketik ke chat |
| Risiko | data yang berkaitan dengan tindak pidana dan keuangan (data pribadi spesifik) |
| Mitigasi | wizard laporan tidak dikirim ke server (C01 D07); chat mengingatkan untuk tidak memasukkan identitas; rujukan ke kanal resmi |
| Risiko sisa | sedang |
| Keputusan | dilanjutkan; [KONFIRMASI] tinjauan konsultan hukum |

## (c) Penyimpanan lokal wizard
| Aspek | Isi |
|---|---|
| Deskripsi | isian laporan disimpan di IndexedDB |
| Mitigasi | AES-GCM dengan kunci perangkat yang tidak dapat diekspor; hapus otomatis 30 hari |
| Risiko sisa | rendah (perangkat yang dibuka orang lain tetap dapat membuka aplikasi) |
| Keputusan | dilanjutkan |
