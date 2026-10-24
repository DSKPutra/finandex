// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Legal page texts (§12.1, §13). Privacy refers to Law No. 27 of 2022 on Personal Data Protection (UU PDP).
// Facts stated here mirror the implementation: no accounts, no third-party analytics, on-device history.
type B = { id: string; en: string };
export type LegalSection = { title: B; body: B[] };

export const LEGAL_UPDATED = '2026-10-22';

export const PRIVACY: LegalSection[] = [
  {
    title: { id: 'Ringkasan', en: 'Summary' },
    body: [
      { id: 'Finandex tidak memakai akun, tidak memasang analytics pihak ketiga, dan tidak melacak Anda. Kebijakan ini disusun dengan mengacu pada Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP).', en: 'Finandex has no accounts, no third-party analytics, and no tracking. This policy was prepared with reference to Indonesian Law No. 27 of 2022 on Personal Data Protection (UU PDP).' },
    ],
  },
  {
    title: { id: 'Data yang disimpan di perangkat Anda', en: 'Data stored on your device' },
    body: [
      { id: 'Riwayat chat (maksimal 50 percakapan per Dex), watchlist, preferensi tampilan/bahasa, status persetujuan chat, dan pengenal acak (clientId) disimpan hanya di perangkat Anda (IndexedDB/penyimpanan lokal). Semuanya dapat dihapus kapan saja dari Pengaturan.', en: 'Chat history (up to 50 conversations per Dex), watchlist, display/language preferences, chat consent status, and a random identifier (clientId) are stored only on your device (IndexedDB/local storage). All of it can be deleted at any time from Settings.' },
      { id: 'Data pasar yang pernah dibuka disimpan dalam cache perangkat agar dapat dipakai offline.', en: 'Market data you have opened is cached on the device for offline use.' },
    ],
  },
  {
    title: { id: 'Data yang dikirim saat memakai chat', en: 'Data sent when you use chat' },
    body: [
      { id: 'Saat Anda mengirim pertanyaan, isi percakapan (maksimal 20 pesan terakhir), bahasa, Dex yang dipakai, konteks tampilan (entitas/periode), dan clientId dikirim ke server Finandex, lalu diproses oleh penyedia AI (Anthropic) untuk menghasilkan jawaban.', en: 'When you send a question, the conversation (up to the last 20 messages), language, the Dex used, view context (entity/period), and clientId are sent to the Finandex server and processed by the AI provider (Anthropic) to generate an answer.' },
      { id: 'Server Finandex tidak menyimpan isi pesan. Log server hanya memuat ID permintaan, Dex, nama tool, latensi, jumlah token, dan kode error. Alamat IP dan clientId dipakai sementara untuk pembatasan laju (rate limit).', en: 'The Finandex server does not store message contents. Server logs contain only the request ID, Dex, tool names, latency, token counts, and error codes. IP address and clientId are used transiently for rate limiting.' },
      { id: 'Jangan memasukkan data pribadi. Aplikasi memblokir pengiriman pesan yang tampak berisi seed phrase, private key, nomor kartu, atau NIK.', en: 'Do not enter personal data. The app blocks messages that appear to contain a seed phrase, private key, card number, or national ID number (NIK).' },
    ],
  },
  {
    title: { id: 'Data media sosial dalam dataset', en: 'Social-media data in datasets' },
    body: [
      { id: 'Untuk dataset ulasan/diskusi publik, identitas penulis, jumlah pengikut, dan mention dibuang saat pemrosesan; handle dalam teks diganti "[pengguna]". Data ini tidak pernah ditampilkan atau dikirim ke penyedia AI.', en: 'For public review/discussion datasets, author identity, follower counts, and mentions are removed during processing; handles in text are replaced with "[user]". This data is never displayed or sent to the AI provider.' },
    ],
  },
  {
    title: { id: 'Hak Anda', en: 'Your rights' },
    body: [
      { id: 'Sesuai UU PDP, Anda berhak memperoleh informasi, mengakses, memperbaiki, dan menghapus data pribadi Anda serta menarik persetujuan. Karena data disimpan di perangkat Anda, hak ini dapat Anda laksanakan langsung melalui Pengaturan (hapus riwayat, kosongkan watchlist, atur ulang persetujuan).', en: 'Under the UU PDP you have the right to information about, access to, correction and deletion of your personal data, and to withdraw consent. Because data is stored on your device, you can exercise these rights directly in Settings (delete history, clear watchlist, reset consent).' },
    ],
  },
  {
    title: { id: 'Perubahan kebijakan', en: 'Policy changes' },
    body: [{ id: 'Bila kebijakan ini berubah, aplikasi akan meminta persetujuan ulang sebelum chat dapat dipakai kembali.', en: 'If this policy changes, the app will ask for consent again before chat can be used.' }],
  },
];

export const TERMS: LegalSection[] = [
  {
    title: { id: 'Penggunaan', en: 'Use' },
    body: [
      { id: 'Finandex disediakan untuk informasi dan edukasi. Dengan memakai aplikasi ini Anda setuju untuk tidak menyalahgunakan layanan (misalnya mengirim permintaan otomatis berlebihan, mencoba menembus pembatasan, atau memasukkan konten yang melanggar hukum).', en: 'Finandex is provided for information and education. By using the app you agree not to misuse the service (e.g. sending excessive automated requests, attempting to bypass limits, or submitting unlawful content).' },
      { id: 'Batas pemakaian chat berlaku (per perangkat/IP dan anggaran harian) dan dapat berubah.', en: 'Chat usage limits apply (per device/IP and a daily budget) and may change.' },
    ],
  },
  {
    title: { id: 'Bukan nasihat', en: 'No advice' },
    body: [
      { id: 'Konten Finandex bukan rekomendasi investasi, nasihat keuangan, nasihat pajak, maupun nasihat hukum. Keputusan Anda sepenuhnya tanggung jawab Anda.', en: 'Finandex content is not investment recommendation, financial, tax, or legal advice. Your decisions are your own responsibility.' },
    ],
  },
  {
    title: { id: 'Data pihak ketiga', en: 'Third-party data' },
    body: [
      { id: 'Data berasal dari dataset pihak ketiga dengan lisensi masing-masing (lihat Sumber Data). Data tidak real-time, dapat tidak lengkap, dan dapat mengandung kesalahan dari sumbernya. Jawaban AI dapat keliru; selalu periksa panel "Kenapa jawabannya begini?" dan sumbernya.', en: 'Data comes from third-party datasets under their own licences (see Data Sources). Data is not real-time, may be incomplete, and may contain errors from its sources. AI answers can be wrong; always check the "Why this answer?" panel and the sources.' },
    ],
  },
  {
    title: { id: 'Hak kekayaan intelektual', en: 'Intellectual property' },
    body: [
      { id: 'Perangkat lunak, desain, dan merek Finandex adalah milik Dea Saka Kurnia Putra. Tidak ada bagian yang boleh digunakan, disalin, diubah, atau didistribusikan tanpa izin tertulis sebelumnya.', en: 'The Finandex software, design, and brand belong to Dea Saka Kurnia Putra. No part may be used, copied, modified, or distributed without prior written permission.' },
    ],
  },
  {
    title: { id: 'Batasan tanggung jawab', en: 'Limitation of liability' },
    body: [
      { id: 'Layanan disediakan "sebagaimana adanya" tanpa jaminan. Sejauh diizinkan hukum, Finandex tidak bertanggung jawab atas kerugian yang timbul dari penggunaan informasi di aplikasi ini.', en: 'The service is provided "as is" without warranties. To the extent permitted by law, Finandex is not liable for losses arising from the use of information in this app.' },
    ],
  },
  {
    title: { id: 'Hukum yang berlaku', en: 'Governing law' },
    body: [{ id: 'Ketentuan ini tunduk pada hukum Republik Indonesia.', en: 'These terms are governed by the laws of the Republic of Indonesia.' }],
  },
];

/** /legal/security — summary of SECURITY.md (TECHNICAL_DOCS_PROMPT §4). */
export const SECURITY: LegalSection[] = [
  {
    title: { id: 'Melaporkan kerentanan', en: 'Reporting a vulnerability' },
    body: [
      { id: 'Laporkan secara privat melalui GitHub Security Advisories di repo DSKPutra/finandex (Security → Report a vulnerability). Jangan membuka issue publik. Sertakan langkah reproduksi, versi atau commit, dan dampaknya.', en: 'Report privately via GitHub Security Advisories on the DSKPutra/finandex repository (Security → Report a vulnerability). Do not open a public issue. Include reproduction steps, the version or commit, and the impact.' },
      { id: 'Jangan menguji dengan data pribadi orang lain atau melakukan serangan penolakan layanan. Perbaikan dirilis bersama pernyataan VEX di halaman SBOM.', en: 'Do not test with other people’s personal data or run denial-of-service attacks. Fixes are released with a VEX statement on the SBOM page.' },
    ],
  },
  {
    title: { id: 'Kontrol keamanan', en: 'Security controls' },
    body: [
      { id: 'Kunci API hanya di server; bundel aplikasi dipindai pola kunci. CSP ketat, HSTS, CORS allowlist, validasi semua input API, dan pembatasan laju per perangkat.', en: 'API keys live only on the server; the app bundle is scanned for key patterns. Strict CSP, HSTS, a CORS allowlist, validation of every API input, and per-device rate limits.' },
      { id: 'Data sensitif (OTP/PIN, NIK, nomor kartu/rekening, seed phrase, private key) dicegah sebelum terkirim, di perangkat maupun di server. Alat AI hanya membaca data; aksi aplikasi baru dijalankan setelah Anda konfirmasi.', en: 'Sensitive data (OTP/PIN, national ID, card/account numbers, seed phrases, private keys) is blocked before it is sent, on the device and on the server. AI tools only read data; in-app actions run only after you confirm.' },
      { id: 'Tanpa akun dan tanpa analytics pihak ketiga. Riwayat chat dan isian "Siapkan Laporan" hanya tersimpan di perangkat Anda (terenkripsi AES-GCM).', en: 'No accounts and no third-party analytics. Chat history and "Prepare a Report" entries are stored only on your device (AES-GCM encrypted).' },
    ],
  },
  {
    title: { id: 'Rantai pasok perangkat lunak', en: 'Software supply chain' },
    body: [
      { id: 'Setiap rilis disertai SBOM CycloneDX 1.7 dan SPDX 2.3, pernyataan VEX untuk setiap temuan pemindai, tanda tangan Sigstore, dan atestasi GitHub. Unduh dan verifikasi di halaman SBOM.', en: 'Every release ships CycloneDX 1.7 and SPDX 2.3 SBOMs, a VEX statement for every scanner finding, Sigstore signatures and GitHub attestations. Download and verify them on the SBOM page.' },
    ],
  },
];
