# Butir yang memerlukan keputusan pemilik — [KONFIRMASI]

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

| # | Butir | Dokumen | Keterangan |
|---|---|---|---|
| 1 | Penyetuju (approver) dokumen kepatuhan | semua | blok kontrol dokumen |
| 2 | Identitas & alamat pengendali data | C01, C02, C04 | nama badan/perorangan, alamat |
| 3 | Kontak PDP / pejabat PDP | C04, C06, C11 | nama & email |
| 4 | Alamat kontak keamanan & pertanyaan SBOM | B01, SECURITY.md | email resmi |
| 5 | Retensi log server (usulan 30 hari) | C01, C10, A12 | atur di platform |
| 6 | Dasar pemrosesan rate limit & log (kepentingan yang sah) | C01, C02 | konfirmasi pilihan dasar |
| 7 | Teks resmi PP 33/2026 untuk verifikasi pasal | C02–C12, LEGAL_REFS_VERIFIED.md | unduh dari JDIH resmi lalu jalankan ulang docs:build |
| 8 | Penyebutan transfer ke Anthropic (AS) di dialog persetujuan | C05, C09 | teks dialog |
| 9 | Region Vercel/Upstash dan DPA yang berlaku | C08, C09 | verifikasi tautan |
| 10 | Penyedia email dukungan | C02, C08 | — |
| 11 | Pendaftaran PSE Lingkup Privat | C14 | sebelum peluncuran publik |
| 12 | Tinjauan konsultan hukum PDP Indonesia | Paket C | sebelum publikasi |
| 13 | Kerahasiaan prompt sistem | A10 | boleh dimuat atau tidak |
| 14 | Uji penetrasi pihak ketiga | A09 | ASVS verifikasi independen |
| 15 | Menandai rilis `v0.1.0` agar compliance.yml menandatangani & mengatestasi SBOM | B01, B02 | izin push tag |
| 16 | Pin versi paket Python referensi | B01, B03 | parity.yml |
| 17 | Mengaktifkan OpenSSF Scorecard | B03 | workflow terpisah |
| 18 | Rating usia store | C13, C14 | — |
| 19 | Izin DefiLlama untuk data DeFi CryptDex: dataset input menyebut DefiLlama sebagai sumber, sedangkan ketentuan DefiLlama (dibaca 2026-10-24) melarang "republish the data in any form without permission" | A06, docs/live-data/REPORT.md | minta izin tertulis atau batasi tampilan |
| 20 | Lisensi penyedia harga saham/indeks/kripto (Yahoo Finance, CoinGecko, CoinMarketCap) untuk data live | scripts/live-data/sources.yaml | saat ini blocked-pending-license |
| 21 | Kunci tanda tangan updater Tauri (TAURI_SIGNING_PRIVATE_KEY/PUBLIC_KEY), sertifikat Apple Developer ID + notarisasi, tanda tangan Authenticode Windows | A12, desktop.yml | secret repo; tanpa itu build desktop tidak bertanda tangan |
| 22 | Kompilasi Rust src-tauri belum diverifikasi lokal (index.crates.io tidak dapat di-resolve dari mesin pengembang); verifikasi pertama di desktop.yml | A03, A12 | jalankan workflow desktop manual |
