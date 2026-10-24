# A11 — Informasi untuk pengguna (ID & EN)

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

| Kontrol dokumen | |
|---|---|
| ID dokumen | A11 |
| Judul | Informasi untuk pengguna (ID & EN) |
| Versi | 0.1.0 (= versi aplikasi) · commit `ae7d11b` |
| Tanggal | 2026-10-24 |
| Status | Draf |
| Klasifikasi | Publik |
| Pemilik | Dea Saka Kurnia Putra |
| Penyusun | Dibangkitkan oleh `scripts/compliance/*` (Claude Code) dari sumber kebenaran repo |
| Penyetuju | [KONFIRMASI] — penyetuju dokumen belum ditetapkan |
| Lingkup | Panduan memakai semua Dex |
| Standar acuan | ISO/IEC/IEEE 26514 |
| Dokumen terkait | C04 |

**Riwayat perubahan**

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1.0 | 2026-10-24 | Versi pertama, dibangkitkan dari sumber kebenaran repo. |

## 1. Memulai · Getting started
Buka https://finandex.vercel.app. Tanpa akun. Beranda menampilkan Index Constellation: setiap bintang adalah satu Dex. — *No account needed. The home page shows the Index Constellation: each star is one Dex.*

## 2. Setiap Dex · Every Dex
### Finandex AI
Asisten pasar global: indeks, komoditas, kripto, mata uang (chatbot utama & router)

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Pasar Global | 34 aset global (indeks, komoditas, kripto, mata uang) dengan sparkline dan filter. (34 aset, sparkline, filter kategori/wilayah) |
| Bandingkan | Bandingkan 2–5 entitas dalam satu grafik (rebase 100) plus tabel metrik. |
| Korelasi | Matriks korelasi return antar-aset (1/3/5 tahun). (heatmap) |
| Kalender Return | Heatmap return tahunan per aset (tahun parsial ditandai). (heatmap tahun×aset) |
| Peristiwa | Pergerakan harga di sekitar peristiwa bertanggal pasti (krisis, keputusan bank sentral, halving). |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### NASDAQDex
500 saham NASDAQ, 1962–2026

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Pulse | Denyut pasar: breadth, % saham di atas SMA, indeks equal-weight vs indeks acuan. (breadth + indeks EW vs ^IXIC) |
| Screener | Saring saham dengan kriteria (return, volatilitas, valuasi, likuiditas). |
| Growth Lab | Saham dengan pertumbuhan terbesar: kelipatan harga, CAGR 5/10 tahun, jarak dari ATH. |
| Teknikal | Indikator teknikal deskriptif (SMA50/200, RSI14, golden/death cross) — bukan sinyal beli/jual. |
| Bandingkan | Bandingkan 2–5 entitas dalam satu grafik (rebase 100) plus tabel metrik. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### SnP500Dex
233 saham S&P 500: total return, dividen, volume

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Pulse | Denyut pasar: breadth, % saham di atas SMA, indeks equal-weight vs indeks acuan. |
| Dividen | Riwayat dividen, dividend yield TTM, dan streak kenaikan dividen. |
| Simulator | Simulasi nilai investasi historis dengan/tanpa reinvestasi dividen (bukan rekomendasi). |
| Screener | Saring saham dengan kriteria (return, volatilitas, valuasi, likuiditas). |
| Volume & Likuiditas | Volume, nilai transaksi, dan likuiditas saham. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### CommerceDex
43 raksasa e-commerce dunia: harga, fundamental, makro

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Peta Global | Peta dunia perusahaan e-commerce per negara. |
| Perusahaan | Profil perusahaan e-commerce dan kinerjanya. |
| Fundamental | Data fundamental (pendapatan, laba, margin, ROE, DER, dll.) per tahun fiskal dengan mata uang laporan. |
| Indeks E-Commerce | Indeks equal-weight saham e-commerce dunia dan kinerjanya. |
| Makro | Indikator makro negara terkait perusahaan e-commerce (World Bank). |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### IPODex
IPO global 2019–2026: India, AS, Inggris & 100+ negara

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Ringkasan | Ringkasan utama dataset Dex ini dalam kartu & grafik. |
| Negara & Bursa | IPO per negara dan bursa. |
| India SME vs Mainboard | Perbandingan IPO India papan SME dan Mainboard. |
| Cari IPO | Cari IPO berdasarkan nama, negara, bursa, sektor, atau status. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### IDFinanDex
Indonesia multi-aset & makro: IHSG, USD/IDR, BI rate

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Dashboard Makro | Ringkasan indikator makro Indonesia (BI rate, inflasi, kurs, suku bunga AS) dalam satu layar. |
| Aset | Daftar aset dengan harga/nilai terakhir, perubahan, dan grafik per aset. |
| Tren Ter-normalisasi | Tren beberapa aset yang dinormalisasi ke titik awal yang sama. |
| Korelasi | Matriks korelasi return antar-aset (1/3/5 tahun). |
| Rezim Suku Bunga | Return aset saat BI rate naik, turun, atau tetap. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### RupiahDex
Kurs USD/IDR harian sejak 2001

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Kurs | Grafik kurs USD/IDR (garis & candlestick) dengan statistik. (garis + candlestick) |
| Konverter Historis | Konversi USD↔IDR memakai kurs pada tanggal tertentu. |
| Statistik Tahunan | Rata-rata, tertinggi, terendah, dan perubahan kurs per tahun. |
| Peristiwa | Pergerakan harga di sekitar peristiwa bertanggal pasti (krisis, keputusan bank sentral, halving). |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### IDXDex
Saham Bursa Efek Indonesia: harga, fundamental, IPO

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Saham | Daftar & detail saham dengan grafik, return, risiko, dan likuiditas. |
| Fundamental | Data fundamental (pendapatan, laba, margin, ROE, DER, dll.) per tahun fiskal dengan mata uang laporan. |
| IPO Center | Statistik & daftar IPO BEI (e-IPO): return hari pertama, sektor, papan, penjamin. |
| Direktori Emiten | Profil emiten BEI: sektor, papan, tanggal pencatatan, informasi perusahaan. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### ReksaDex
Reksa dana Indonesia: AUM, manajer investasi, kinerja

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Industri | Ringkasan industri reksa dana: total dana kelolaan, jumlah produk, tren. |
| Manajer Investasi | Peringkat & pangsa manajer investasi berdasarkan dana kelolaan dan jumlah produk. |
| Cari Reksa Dana | Cari reksa dana berdasarkan nama, jenis, atau manajer investasi. |
| Peringkat | Peringkat terurut berdasarkan metrik pilihan. |
| Bank Kustodian | Pangsa bank kustodian reksa dana berdasarkan dana kelolaan. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### CryptDex
Kripto: harga, snapshot pasar, DeFi, fee protokol, edukasi bot

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Pasar Kripto | Snapshot 250 koin: kapitalisasi, dominasi, perubahan harga, stablecoin (heuristik). (snapshot 250) |
| Harga Historis | Grafik harga historis koin (garis/candlestick) dengan return per periode. |
| DeFi | TVL DeFi, TVL per chain & protokol, suplai stablecoin, aktivitas DEX — dengan catatan hitung ganda. (TVL, chain, protokol, stablecoin, DEX) |
| Yield | Pool yield DeFi (APY dasar & reward, TVL) dengan peringatan risiko — bukan rekomendasi. |
| Fees & Revenue | Fee & revenue protokol DeFi per protokol/kategori dan trennya. |
| Bot & AI Agent | Edukasi bot trading & AI agent kripto: profil, fakta terverifikasi, uji nyata, checklist keamanan — tanpa rekomendasi & tanpa tautan referral. (edukasi + keamanan) |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### CentralBankDex
Neraca bank sentral & likuiditas global (Fed, ECB, BoJ, 167 negara)

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Neraca G3 | Neraca bank sentral The Fed, ECB, BoJ, dan gabungan G3. (Fed/ECB/BoJ) |
| Suku Bunga & Kurva Imbal Hasil | Suku bunga kebijakan AS, imbal hasil Treasury, spread 10Y–2Y, dan periode inversi. |
| Uang Beredar | Uang beredar (M2/broad money) AS dan negara lain. |
| Peta Negara | Peta per negara untuk indikator Dex ini. |
| Label Rezim | Label rezim likuiditas buatan penyedia dataset (ditandai sebagai label penyedia, bukan fakta). (penyedia) |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### InflationDex
Inflasi & biaya hidup antarnegara

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Peta Inflasi | Peta inflasi antarnegara (tahun data ditampilkan). |
| Peringkat | Peringkat terurut berdasarkan metrik pilihan. |
| Biaya Barang | Harga barang & jasa sehari-hari antarnegara (roti, transport, sewa, utilitas). |
| Wilayah & Pendapatan | Ringkasan per wilayah dunia dan kelompok pendapatan. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### StartupDex
Putaran pendanaan startup global 2019–2026

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Ringkasan | Ringkasan utama dataset Dex ini dalam kartu & grafik. |
| Tahapan | Pendanaan startup per tahap (Seed, Series A, dst.) dan median ukurannya. (Stage) |
| Negara & Sektor | Pendanaan startup per negara dan sektor. |
| Mega-round | Putaran pendanaan ≥ US$100 juta dan porsinya terhadap total. |
| Cari Putaran | Cari putaran pendanaan startup berdasarkan perusahaan, tahap, negara, sektor, atau investor. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### VCDex
Direktori investor startup 2026

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Direktori | Direktori investor yang bisa difilter (tipe, negara, tahap, jumlah deal). |
| Peringkat | Peringkat terurut berdasarkan metrik pilihan. |
| Stage Mix | Komposisi tahap pendanaan yang diikuti investor. |
| Negara | Statistik per negara untuk cakupan Dex ini. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### VCNetworkDex
Jaringan co-investment antar investor VC

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Graf Jaringan | Graf ego jaringan co-investment investor (≤ 50 node) dengan ketebalan garis = jumlah deal bersama. |
| Pasangan Teratas | Pasangan investor yang paling sering berinvestasi bersama. |
| Investor | Profil investor dalam jaringan: mitra co-investment terbanyak & statistik. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### OpenCompanyDex
Direktori 100 ribu perusahaan (sampel Open Company Database)

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Peta Negara | Peta per negara untuk indikator Dex ini. |
| Sektor & Industri | Jumlah & karakteristik perusahaan per sektor dan industri. |
| Status & Pendanaan | Status perusahaan (aktif/tutup/diakuisisi) dan porsi yang pernah didanai. |
| Cari Perusahaan | Cari perusahaan di direktori berdasarkan nama, negara, atau sektor. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### SalaryDex
Gaji global per skill & peran (sampel 100 ribu lowongan)

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Kalkulator Benchmark | Bandingkan gaji dengan median/persentil berdasarkan negara, peran, senioritas, dan skill. |
| Negara | Statistik per negara untuk cakupan Dex ini. |
| Peran & Senioritas | Gaji berdasarkan keluarga peran dan tingkat senioritas. |
| Skill | Skill paling dicari dan premi gaji per skill. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### CostLivingDex
Biaya & kualitas hidup 148 kota (data sintetis)

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Peringkat Kota | Peringkat kota menurut indeks biaya hidup, sewa, kualitas hidup, dll. (data sintetis). |
| Profil Kota | Profil lengkap satu kota (biaya, kualitas hidup, keamanan, polusi, internet). |
| Bandingkan | Bandingkan 2–5 entitas dalam satu grafik (rebase 100) plus tabel metrik. |
| Perubahan 2023→2024 | Perubahan indeks kota antara dua survei. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### IDHousingDex
Perumahan subsidi & komersil Indonesia (listing proyek)

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Ringkasan | Ringkasan utama dataset Dex ini dalam kartu & grafik. |
| Provinsi & Kota | Statistik perumahan per provinsi dan kota/kabupaten. |
| Peta Proyek | Peta titik proyek perumahan (ter-cluster) dengan filter provinsi & status subsidi. |
| Spesifikasi | Spesifikasi rumah (kamar, lantai, material) per segmen. |
| Pengembang | Ringkasan pengembang & asosiasi pengembang perumahan. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### IDFoodDeliveryDex
Benchmark harga 10 ribu menu food delivery Indonesia

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Ringkasan Markup | Ringkasan markup harga online vs dine-in, biaya kemasan, dan promo. |
| Kota | Statistik per kota (markup food delivery). |
| Kuliner | Statistik per jenis kuliner (harga, markup, promo). |
| Cloud Kitchen | Perbandingan harga & markup cloud kitchen dengan restoran biasa. |
| Cari Menu | Cari menu food delivery berdasarkan nama, kota, atau kuliner, lengkap dengan markup. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### PovertyDex
Indeks Kemiskinan Multidimensi (MPI) 108 negara

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Peta MPI | Peta Indeks Kemiskinan Multidimensi per negara. |
| Peringkat | Peringkat terurut berdasarkan metrik pilihan. |
| Dimensi | Kontribusi 10 dimensi kemiskinan multidimensi per negara. |
| Bandingkan | Bandingkan 2–5 entitas dalam satu grafik (rebase 100) plus tabel metrik. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### PopulationDex
Liputan berita kependudukan global 2019–2026

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Tren Liputan | Tren liputan berita per bulan/tahun per 10 ribu berita (bulan parsial ditandai). |
| Geografi | Sebaran liputan berita per benua, negara, kota, atau negara bagian. |
| Tema & Organisasi | Tema dan organisasi yang paling sering muncul dalam liputan berita. |
| Riset & Paten | Tren publikasi riset dan paten terkait topik berita. |
| Temuan Penyedia | Temuan penyedia dataset berlabel grade A/B/C (bukan hitungan Finandex). |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### HomelessnessDex
Liputan berita isu tunawisma global 2019–2026

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Tren Liputan | Tren liputan berita per bulan/tahun per 10 ribu berita (bulan parsial ditandai). |
| Geografi | Sebaran liputan berita per benua, negara, kota, atau negara bagian. |
| Tema & Organisasi | Tema dan organisasi yang paling sering muncul dalam liputan berita. |
| Riset & Paten | Tren publikasi riset dan paten terkait topik berita. |
| Temuan Penyedia | Temuan penyedia dataset berlabel grade A/B/C (bukan hitungan Finandex). |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### HousingDex
Liputan berita perumahan global 2019–2026

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Tren Liputan | Tren liputan berita per bulan/tahun per 10 ribu berita (bulan parsial ditandai). |
| Geografi | Sebaran liputan berita per benua, negara, kota, atau negara bagian. |
| Tema & Organisasi | Tema dan organisasi yang paling sering muncul dalam liputan berita. |
| Riset & Paten | Tren publikasi riset dan paten terkait topik berita. |
| Temuan Penyedia | Temuan penyedia dataset berlabel grade A/B/C (bukan hitungan Finandex). |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### FintechDex
Adopsi & ulasan produk fintech dari 14 platform

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Sentimen | Distribusi sentimen (label otomatis penyedia) per platform, bulan, atau bahasa. |
| Topik & Aspek | Topik & aspek ulasan (UX, harga, produk, layanan, keamanan, merek) beserta sentimennya. |
| Jelajah Ulasan | Telusuri ulasan produk fintech tanpa identitas penulis. |
| Tren | Tren bulanan jumlah unggahan dan porsi sentimen. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### PersonalFinanDex
Diskusi keuangan pribadi & kebebasan finansial

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Sentimen | Distribusi sentimen (label otomatis penyedia) per platform, bulan, atau bahasa. |
| Topik | Topik diskusi yang paling sering muncul. |
| Jelajah Diskusi | Telusuri diskusi keuangan pribadi (judul/ringkasan/platform/tanggal) tanpa identitas penulis. |
| Tren | Tren bulanan jumlah unggahan dan porsi sentimen. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### My LAIwyer
Tanya-jawab hukum umum: konstitusi, pidana & acara pidana, perdata dasar, bantuan hukum

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Konsultasi Terpandu | Tanya-jawab bertahap dengan pilihan (chip): situasi Anda → langkah yang bisa dilakukan + dasar hukum resmi. |
| Sumber Hukum | Daftar dokumen hukum: tersedia (sudah diverifikasi) dan menunggu dokumen, dengan tautan resmi. (tersedia & menunggu dokumen) |
| Jelajah Pasal | Daftar isi per dokumen hukum (Pembukaan/Bab/Pasal/Penjelasan/Lampiran) dengan pencarian. |
| Bandingkan Versi | Teks pasal berdampingan antar-versi peraturan (KUHAP 1981 ↔ 2025; UUD naskah asli ↔ UUD NRI 1945). (KUHAP 1981–2025; UUD naskah asli–UUD NRI 1945) |
| Glosarium | Istilah hukum/keuangan dijelaskan dalam bahasa awam. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### FinLAIwyer
Tanya-jawab hukum keuangan & perbankan Indonesia — fokus korban scam & sengketa lembaga keuangan

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Konsultasi Terpandu | Tanya-jawab bertahap dengan pilihan (chip): situasi Anda → langkah yang bisa dilakukan + dasar hukum resmi. |
| Peta Regulasi Keuangan | Graf peraturan keuangan & perbankan: mana mengubah, mencabut, atau disesuaikan; klik untuk status & pasal kunci. (graf relasi ubah/cabut/disesuaikan) |
| Jelajah Pasal | Daftar isi per dokumen hukum (Pembukaan/Bab/Pasal/Penjelasan/Lampiran) dengan pencarian. |
| Status & Perubahan | Linimasa status peraturan: berlaku, diubah, dicabut, dan penyesuaian ancaman pidana oleh UU 1/2026. (linimasa + penyesuaian UU 1/2026) |
| Kanal Pengaduan | Ke mana mengadu (bank/PUJK, OJK 157/APPK, BI 131, LAPS SJK) dan urutannya. |
| Glosarium | Istilah hukum/keuangan dijelaskan dalam bahasa awam. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

### AntiScamDex
Adopsi informasi publik IASC, Satgas PASTI, OJK & BI: langkah darurat, siapkan laporan, statistik, modus

| Tab | Fungsi |
|---|---|
| Chat | Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". |
| Baru Kena Scam | Layar darurat: dua pertanyaan (kapan & lewat apa) lalu langkah segera dengan tombol kanal resmi. (langkah darurat) |
| Siapkan Laporan | Wizard offline untuk menyiapkan data & kronologi sesuai formulir IASC; data tidak pernah meninggalkan perangkat. (offline) |
| Statistik Penanganan | Statistik IASC & Satgas PASTI: laporan, rekening diblokir, dana diblokir & dikembalikan, modus, wilayah — per tanggal potong & sumber. |
| Kenali Modus | Pustaka modus scam, tanda bahaya, dan kuis cek-mandiri "Apakah ini scam?". (+ kuis cek-mandiri) |
| Kanal Resmi | Direktori kanal resmi (IASC, OJK, SiPASTI, BI, cekrekening.id, aduannomor.id, Polri, LAPS SJK) dan kapan memakainya. |
| Cegah & Bukti | Tips pencegahan scam dan daftar bukti yang perlu diamankan sebelum melapor. |
| Data | File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. |

## 3. Chat & "Kenapa jawabannya begini?"
Setiap jawaban menampilkan sumber dan langkah perhitungan. Angka hanya dari data. — *Every answer shows sources and calculation steps.*

## 4. AntiScamDex — darurat & Siapkan Laporan
Langkah darurat dan kanal resmi; isian laporan terenkripsi di perangkat dan terhapus otomatis setelah 30 hari kecuali disimpan.

## 5. Pemasangan · Installation
Halaman /install berisi langkah iPhone/iPad (Bagikan → Tambahkan ke Layar Utama), Android, macOS dan Windows.

## 6. Privasi & hapus data · Privacy & data deletion
Pengaturan → hapus riwayat / reset semua. Lihat Kebijakan Privasi (/legal/privacy, C04).

## 7. Tangkapan layar
`docs/ui-review/spektrum/` (Beranda, FinLAIwyer, RupiahDex, Agent Room — terang & gelap).
