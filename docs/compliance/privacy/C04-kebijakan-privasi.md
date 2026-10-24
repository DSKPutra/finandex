# C04 — Kebijakan Privasi publik (ID & EN)

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

| Kontrol dokumen | |
|---|---|
| ID dokumen | C04 |
| Judul | Kebijakan Privasi publik (ID & EN) |
| Versi | 0.1.0 (= versi aplikasi) · commit `ae7d11b` |
| Tanggal | 2026-10-24 |
| Status | Draf |
| Klasifikasi | Publik |
| Pemilik | Dea Saka Kurnia Putra |
| Penyusun | Dibangkitkan oleh `scripts/compliance/*` (Claude Code) dari sumber kebenaran repo |
| Penyetuju | [KONFIRMASI] — penyetuju dokumen belum ditetapkan |
| Lingkup | Isi halaman /legal/privacy |
| Standar acuan | UU PDP (hak & kewajiban informasi); PP 33/2026 Pasal 33 (belum diverifikasi) |
| Dokumen terkait | C01, C05 |

**Riwayat perubahan**

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1.0 | 2026-10-24 | Versi pertama, dibangkitkan dari sumber kebenaran repo. |

Versi kebijakan aktif di aplikasi: `2026-10-23` (`src/lib/store.ts#L8 @ ae7d11b`). Teks di bawah dibangkitkan dari `src/content/legal.ts` — sumber yang sama dengan /legal/privacy.

### Ringkasan · Summary
Finandex tidak memakai akun, tidak memasang analytics pihak ketiga, dan tidak melacak Anda. Kebijakan ini disusun dengan mengacu pada Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP).

*Finandex has no accounts, no third-party analytics, and no tracking. This policy was prepared with reference to Indonesian Law No. 27 of 2022 on Personal Data Protection (UU PDP).*

### Data yang disimpan di perangkat Anda · Data stored on your device
Riwayat chat (maksimal 50 percakapan per Dex), watchlist, preferensi tampilan/bahasa, status persetujuan chat, dan pengenal acak (clientId) disimpan hanya di perangkat Anda (IndexedDB/penyimpanan lokal). Semuanya dapat dihapus kapan saja dari Pengaturan.

*Chat history (up to 50 conversations per Dex), watchlist, display/language preferences, chat consent status, and a random identifier (clientId) are stored only on your device (IndexedDB/local storage). All of it can be deleted at any time from Settings.*

Data pasar yang pernah dibuka disimpan dalam cache perangkat agar dapat dipakai offline.

*Market data you have opened is cached on the device for offline use.*

### Data yang dikirim saat memakai chat · Data sent when you use chat
Saat Anda mengirim pertanyaan, isi percakapan (maksimal 20 pesan terakhir), bahasa, Dex yang dipakai, konteks tampilan (entitas/periode), dan clientId dikirim ke server Finandex, lalu diproses oleh penyedia AI (Anthropic) untuk menghasilkan jawaban.

*When you send a question, the conversation (up to the last 20 messages), language, the Dex used, view context (entity/period), and clientId are sent to the Finandex server and processed by the AI provider (Anthropic) to generate an answer.*

Server Finandex tidak menyimpan isi pesan. Log server hanya memuat ID permintaan, Dex, nama tool, latensi, jumlah token, dan kode error. Alamat IP dan clientId dipakai sementara untuk pembatasan laju (rate limit).

*The Finandex server does not store message contents. Server logs contain only the request ID, Dex, tool names, latency, token counts, and error codes. IP address and clientId are used transiently for rate limiting.*

Jangan memasukkan data pribadi. Aplikasi memblokir pengiriman pesan yang tampak berisi seed phrase, private key, nomor kartu, atau NIK.

*Do not enter personal data. The app blocks messages that appear to contain a seed phrase, private key, card number, or national ID number (NIK).*

### Data media sosial dalam dataset · Social-media data in datasets
Untuk dataset ulasan/diskusi publik, identitas penulis, jumlah pengikut, dan mention dibuang saat pemrosesan; handle dalam teks diganti "[pengguna]". Data ini tidak pernah ditampilkan atau dikirim ke penyedia AI.

*For public review/discussion datasets, author identity, follower counts, and mentions are removed during processing; handles in text are replaced with "[user]". This data is never displayed or sent to the AI provider.*

### Hak Anda · Your rights
Sesuai UU PDP, Anda berhak memperoleh informasi, mengakses, memperbaiki, dan menghapus data pribadi Anda serta menarik persetujuan. Karena data disimpan di perangkat Anda, hak ini dapat Anda laksanakan langsung melalui Pengaturan (hapus riwayat, kosongkan watchlist, atur ulang persetujuan).

*Under the UU PDP you have the right to information about, access to, correction and deletion of your personal data, and to withdraw consent. Because data is stored on your device, you can exercise these rights directly in Settings (delete history, clear watchlist, reset consent).*

### Perubahan kebijakan · Policy changes
Bila kebijakan ini berubah, aplikasi akan meminta persetujuan ulang sebelum chat dapat dipakai kembali.

*If this policy changes, the app will ask for consent again before chat can be used.*

### Butir yang belum ada di halaman publik
- Identitas & alamat pengendali, kontak PDP — [KONFIRMASI].
- Transfer lintas batas ke Anthropic (AS) dan dasar transfer — lihat C09.
- Retensi log server — [KONFIRMASI].
