# C10 — Kebijakan retensi & pemusnahan

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

| Kontrol dokumen | |
|---|---|
| ID dokumen | C10 |
| Judul | Kebijakan retensi & pemusnahan |
| Versi | 0.1.0 (= versi aplikasi) · commit `ae7d11b` |
| Tanggal | 2026-10-24 |
| Status | Draf |
| Klasifikasi | Internal |
| Pemilik | Dea Saka Kurnia Putra |
| Penyusun | Dibangkitkan oleh `scripts/compliance/*` (Claude Code) dari sumber kebenaran repo |
| Penyetuju | [KONFIRMASI] — penyetuju dokumen belum ditetapkan |
| Lingkup | Semua elemen C01 |
| Standar acuan | UU PDP; PP 33/2026 (belum diverifikasi) |
| Dokumen terkait | C01 |

**Riwayat perubahan**

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1.0 | 2026-10-24 | Versi pertama, dibangkitkan dari sumber kebenaran repo. |

| Elemen | Retensi | Cara pemusnahan | Bukti |
|---|---|---|---|
| D01 — Isi pesan chat | server: tidak disimpan (hanya selama permintaan); penyedia LLM: sesuai ketentuan penyedia [KONFIRMASI] | dihapus pengguna (Pengaturan) atau otomatis | `server/chat/orchestrator.ts @ ae7d11b` |
| D02 — clientId | perangkat: sampai direset pengguna; server: kunci rate limit ber-TTL | dihapus pengguna (Pengaturan) atau otomatis | `src/lib/store.ts#L61 @ ae7d11b` |
| D03 — Alamat IP | TTL kunci: 600 detik (jendela) dan 1 hari (harian) | kedaluwarsa TTL / rotasi log platform | `server/security/ratelimit.ts#L54 @ ae7d11b` |
| D04 — Log operasional: requestId, Dex, tool, latensi, token, kode galat | [KONFIRMASI] default 30 hari | kedaluwarsa TTL / rotasi log platform | `server/handler.ts#L148 @ ae7d11b` |
| D05 — Riwayat chat | sampai dihapus pengguna | dihapus pengguna (Pengaturan) atau otomatis | `src/lib/history.ts @ ae7d11b` |
| D06 — Watchlist, preferensi tema/bahasa/aksesibilitas, status persetujuan + versi kebijakan | sampai direset pengguna | dihapus pengguna (Pengaturan) atau otomatis | `src/lib/store.ts#L18 @ ae7d11b` |
| D07 — Isian "Siapkan Laporan" | 30 hari otomatis, kecuali pengguna memilih simpan | dihapus pengguna (Pengaturan) atau otomatis | `src/lib/secure-store.ts#L9 @ ae7d11b` |
| D08 — Data pasar/regulasi yang dibuka | sampai cache dibersihkan | dihapus pengguna (Pengaturan) atau otomatis | `vite.config.ts @ ae7d11b` |
| D09 — Data unduhan/pembaruan aplikasi | sesuai kebijakan store | kedaluwarsa TTL / rotasi log platform | `capacitor.config.ts @ ae7d11b` |
