# A02 — Spesifikasi kebutuhan pemangku kepentingan & perangkat lunak (StRS + SRS)

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

| Kontrol dokumen | |
|---|---|
| ID dokumen | A02 |
| Judul | Spesifikasi kebutuhan pemangku kepentingan & perangkat lunak (StRS + SRS) |
| Versi | 0.1.0 (= versi aplikasi) · commit `ae7d11b` |
| Tanggal | 2026-10-24 |
| Status | Draf |
| Klasifikasi | Internal |
| Pemilik | Dea Saka Kurnia Putra |
| Penyusun | Dibangkitkan oleh `scripts/compliance/*` (Claude Code) dari sumber kebenaran repo |
| Penyetuju | [KONFIRMASI] — penyetuju dokumen belum ditetapkan |
| Lingkup | 29 Dex, 205 kebutuhan |
| Standar acuan | ISO/IEC/IEEE 29148 (kebutuhan); ISO/IEC 25010:2023 (karakteristik kualitas produk) |
| Dokumen terkait | A07, A13 |

**Riwayat perubahan**

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1.0 | 2026-10-24 | Versi pertama, dibangkitkan dari sumber kebenaran repo. |

## 1. Pemangku kepentingan
| Pemangku kepentingan | Kepentingan utama |
|---|---|
| Pengguna umum (investor ritel, pelajar, pekerja) | jawaban berbasis data dengan sumber dan tanggal data; tanpa akun |
| Korban/calon korban penipuan | langkah darurat, kanal resmi, laporan siap kirim yang tetap di perangkat |
| Pemilik produk (Dea Saka Kurnia Putra) | kepatuhan lisensi data, biaya LLM terkendali, dokumentasi dapat diaudit |
| Penyedia data & pemegang lisensi | atribusi dan batas penggunaan (NC/komersial) dihormati |
| Regulator (Komdigi / lembaga PDP) | kepatuhan UU PDP dan PSE |

## 2. Kebutuhan fungsional per Dex
Satu kebutuhan per tab, dibangkitkan dari registry dan `feature_guide.json`. Karakteristik kualitas: kesesuaian fungsional.

| ID | Dex | Kebutuhan | Sumber |
|---|---|---|---|
| REQ-finandex-ai-001 | Finandex AI | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L100 @ ae7d11b` |
| REQ-finandex-ai-002 | Finandex AI | Tab "Pasar Global": 34 aset global (indeks, komoditas, kripto, mata uang) dengan sparkline dan filter. (34 aset, sparkline, filter kategori/wilayah) | `src/config/dex-registry.ts#L100 @ ae7d11b` |
| REQ-finandex-ai-003 | Finandex AI | Tab "Bandingkan": Bandingkan 2–5 entitas dalam satu grafik (rebase 100) plus tabel metrik. | `src/config/dex-registry.ts#L100 @ ae7d11b` |
| REQ-finandex-ai-004 | Finandex AI | Tab "Korelasi": Matriks korelasi return antar-aset (1/3/5 tahun). (heatmap) | `src/config/dex-registry.ts#L100 @ ae7d11b` |
| REQ-finandex-ai-005 | Finandex AI | Tab "Kalender Return": Heatmap return tahunan per aset (tahun parsial ditandai). (heatmap tahun×aset) | `src/config/dex-registry.ts#L100 @ ae7d11b` |
| REQ-finandex-ai-006 | Finandex AI | Tab "Peristiwa": Pergerakan harga di sekitar peristiwa bertanggal pasti (krisis, keputusan bank sentral, halving). | `src/config/dex-registry.ts#L100 @ ae7d11b` |
| REQ-finandex-ai-007 | Finandex AI | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L100 @ ae7d11b` |
| REQ-nasdaqdex-001 | NASDAQDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L124 @ ae7d11b` |
| REQ-nasdaqdex-002 | NASDAQDex | Tab "Pulse": Denyut pasar: breadth, % saham di atas SMA, indeks equal-weight vs indeks acuan. (breadth + indeks EW vs ^IXIC) | `src/config/dex-registry.ts#L124 @ ae7d11b` |
| REQ-nasdaqdex-003 | NASDAQDex | Tab "Screener": Saring saham dengan kriteria (return, volatilitas, valuasi, likuiditas). | `src/config/dex-registry.ts#L124 @ ae7d11b` |
| REQ-nasdaqdex-004 | NASDAQDex | Tab "Growth Lab": Saham dengan pertumbuhan terbesar: kelipatan harga, CAGR 5/10 tahun, jarak dari ATH. | `src/config/dex-registry.ts#L124 @ ae7d11b` |
| REQ-nasdaqdex-005 | NASDAQDex | Tab "Teknikal": Indikator teknikal deskriptif (SMA50/200, RSI14, golden/death cross) — bukan sinyal beli/jual. | `src/config/dex-registry.ts#L124 @ ae7d11b` |
| REQ-nasdaqdex-006 | NASDAQDex | Tab "Bandingkan": Bandingkan 2–5 entitas dalam satu grafik (rebase 100) plus tabel metrik. | `src/config/dex-registry.ts#L124 @ ae7d11b` |
| REQ-nasdaqdex-007 | NASDAQDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L124 @ ae7d11b` |
| REQ-snp500dex-001 | SnP500Dex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L145 @ ae7d11b` |
| REQ-snp500dex-002 | SnP500Dex | Tab "Pulse": Denyut pasar: breadth, % saham di atas SMA, indeks equal-weight vs indeks acuan. | `src/config/dex-registry.ts#L145 @ ae7d11b` |
| REQ-snp500dex-003 | SnP500Dex | Tab "Dividen": Riwayat dividen, dividend yield TTM, dan streak kenaikan dividen. | `src/config/dex-registry.ts#L145 @ ae7d11b` |
| REQ-snp500dex-004 | SnP500Dex | Tab "Simulator": Simulasi nilai investasi historis dengan/tanpa reinvestasi dividen (bukan rekomendasi). | `src/config/dex-registry.ts#L145 @ ae7d11b` |
| REQ-snp500dex-005 | SnP500Dex | Tab "Screener": Saring saham dengan kriteria (return, volatilitas, valuasi, likuiditas). | `src/config/dex-registry.ts#L145 @ ae7d11b` |
| REQ-snp500dex-006 | SnP500Dex | Tab "Volume & Likuiditas": Volume, nilai transaksi, dan likuiditas saham. | `src/config/dex-registry.ts#L145 @ ae7d11b` |
| REQ-snp500dex-007 | SnP500Dex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L145 @ ae7d11b` |
| REQ-commercedex-001 | CommerceDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L169 @ ae7d11b` |
| REQ-commercedex-002 | CommerceDex | Tab "Peta Global": Peta dunia perusahaan e-commerce per negara. | `src/config/dex-registry.ts#L169 @ ae7d11b` |
| REQ-commercedex-003 | CommerceDex | Tab "Perusahaan": Profil perusahaan e-commerce dan kinerjanya. | `src/config/dex-registry.ts#L169 @ ae7d11b` |
| REQ-commercedex-004 | CommerceDex | Tab "Fundamental": Data fundamental (pendapatan, laba, margin, ROE, DER, dll.) per tahun fiskal dengan mata uang laporan. | `src/config/dex-registry.ts#L169 @ ae7d11b` |
| REQ-commercedex-005 | CommerceDex | Tab "Indeks E-Commerce": Indeks equal-weight saham e-commerce dunia dan kinerjanya. | `src/config/dex-registry.ts#L169 @ ae7d11b` |
| REQ-commercedex-006 | CommerceDex | Tab "Makro": Indikator makro negara terkait perusahaan e-commerce (World Bank). | `src/config/dex-registry.ts#L169 @ ae7d11b` |
| REQ-commercedex-007 | CommerceDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L169 @ ae7d11b` |
| REQ-ipodex-001 | IPODex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L194 @ ae7d11b` |
| REQ-ipodex-002 | IPODex | Tab "Ringkasan": Ringkasan utama dataset Dex ini dalam kartu & grafik. | `src/config/dex-registry.ts#L194 @ ae7d11b` |
| REQ-ipodex-003 | IPODex | Tab "Negara & Bursa": IPO per negara dan bursa. | `src/config/dex-registry.ts#L194 @ ae7d11b` |
| REQ-ipodex-004 | IPODex | Tab "India SME vs Mainboard": Perbandingan IPO India papan SME dan Mainboard. | `src/config/dex-registry.ts#L194 @ ae7d11b` |
| REQ-ipodex-005 | IPODex | Tab "Cari IPO": Cari IPO berdasarkan nama, negara, bursa, sektor, atau status. | `src/config/dex-registry.ts#L194 @ ae7d11b` |
| REQ-ipodex-006 | IPODex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L194 @ ae7d11b` |
| REQ-idfinandex-001 | IDFinanDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L218 @ ae7d11b` |
| REQ-idfinandex-002 | IDFinanDex | Tab "Dashboard Makro": Ringkasan indikator makro Indonesia (BI rate, inflasi, kurs, suku bunga AS) dalam satu layar. | `src/config/dex-registry.ts#L218 @ ae7d11b` |
| REQ-idfinandex-003 | IDFinanDex | Tab "Aset": Daftar aset dengan harga/nilai terakhir, perubahan, dan grafik per aset. | `src/config/dex-registry.ts#L218 @ ae7d11b` |
| REQ-idfinandex-004 | IDFinanDex | Tab "Tren Ter-normalisasi": Tren beberapa aset yang dinormalisasi ke titik awal yang sama. | `src/config/dex-registry.ts#L218 @ ae7d11b` |
| REQ-idfinandex-005 | IDFinanDex | Tab "Korelasi": Matriks korelasi return antar-aset (1/3/5 tahun). | `src/config/dex-registry.ts#L218 @ ae7d11b` |
| REQ-idfinandex-006 | IDFinanDex | Tab "Rezim Suku Bunga": Return aset saat BI rate naik, turun, atau tetap. | `src/config/dex-registry.ts#L218 @ ae7d11b` |
| REQ-idfinandex-007 | IDFinanDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L218 @ ae7d11b` |
| REQ-rupiahdex-001 | RupiahDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L242 @ ae7d11b` |
| REQ-rupiahdex-002 | RupiahDex | Tab "Kurs": Grafik kurs USD/IDR (garis & candlestick) dengan statistik. (garis + candlestick) | `src/config/dex-registry.ts#L242 @ ae7d11b` |
| REQ-rupiahdex-003 | RupiahDex | Tab "Konverter Historis": Konversi USD↔IDR memakai kurs pada tanggal tertentu. | `src/config/dex-registry.ts#L242 @ ae7d11b` |
| REQ-rupiahdex-004 | RupiahDex | Tab "Statistik Tahunan": Rata-rata, tertinggi, terendah, dan perubahan kurs per tahun. | `src/config/dex-registry.ts#L242 @ ae7d11b` |
| REQ-rupiahdex-005 | RupiahDex | Tab "Peristiwa": Pergerakan harga di sekitar peristiwa bertanggal pasti (krisis, keputusan bank sentral, halving). | `src/config/dex-registry.ts#L242 @ ae7d11b` |
| REQ-rupiahdex-006 | RupiahDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L242 @ ae7d11b` |
| REQ-idxdex-001 | IDXDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L262 @ ae7d11b` |
| REQ-idxdex-002 | IDXDex | Tab "Saham": Daftar & detail saham dengan grafik, return, risiko, dan likuiditas. | `src/config/dex-registry.ts#L262 @ ae7d11b` |
| REQ-idxdex-003 | IDXDex | Tab "Fundamental": Data fundamental (pendapatan, laba, margin, ROE, DER, dll.) per tahun fiskal dengan mata uang laporan. | `src/config/dex-registry.ts#L262 @ ae7d11b` |
| REQ-idxdex-004 | IDXDex | Tab "IPO Center": Statistik & daftar IPO BEI (e-IPO): return hari pertama, sektor, papan, penjamin. | `src/config/dex-registry.ts#L262 @ ae7d11b` |
| REQ-idxdex-005 | IDXDex | Tab "Direktori Emiten": Profil emiten BEI: sektor, papan, tanggal pencatatan, informasi perusahaan. | `src/config/dex-registry.ts#L262 @ ae7d11b` |
| REQ-idxdex-006 | IDXDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L262 @ ae7d11b` |
| REQ-reksadex-001 | ReksaDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L285 @ ae7d11b` |
| REQ-reksadex-002 | ReksaDex | Tab "Industri": Ringkasan industri reksa dana: total dana kelolaan, jumlah produk, tren. | `src/config/dex-registry.ts#L285 @ ae7d11b` |
| REQ-reksadex-003 | ReksaDex | Tab "Manajer Investasi": Peringkat & pangsa manajer investasi berdasarkan dana kelolaan dan jumlah produk. | `src/config/dex-registry.ts#L285 @ ae7d11b` |
| REQ-reksadex-004 | ReksaDex | Tab "Cari Reksa Dana": Cari reksa dana berdasarkan nama, jenis, atau manajer investasi. | `src/config/dex-registry.ts#L285 @ ae7d11b` |
| REQ-reksadex-005 | ReksaDex | Tab "Peringkat": Peringkat terurut berdasarkan metrik pilihan. | `src/config/dex-registry.ts#L285 @ ae7d11b` |
| REQ-reksadex-006 | ReksaDex | Tab "Bank Kustodian": Pangsa bank kustodian reksa dana berdasarkan dana kelolaan. | `src/config/dex-registry.ts#L285 @ ae7d11b` |
| REQ-reksadex-007 | ReksaDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L285 @ ae7d11b` |
| REQ-cryptdex-001 | CryptDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L309 @ ae7d11b` |
| REQ-cryptdex-002 | CryptDex | Tab "Pasar Kripto": Snapshot 250 koin: kapitalisasi, dominasi, perubahan harga, stablecoin (heuristik). (snapshot 250) | `src/config/dex-registry.ts#L309 @ ae7d11b` |
| REQ-cryptdex-003 | CryptDex | Tab "Harga Historis": Grafik harga historis koin (garis/candlestick) dengan return per periode. | `src/config/dex-registry.ts#L309 @ ae7d11b` |
| REQ-cryptdex-004 | CryptDex | Tab "DeFi": TVL DeFi, TVL per chain & protokol, suplai stablecoin, aktivitas DEX — dengan catatan hitung ganda. (TVL, chain, protokol, stablecoin, DEX) | `src/config/dex-registry.ts#L309 @ ae7d11b` |
| REQ-cryptdex-005 | CryptDex | Tab "Yield": Pool yield DeFi (APY dasar & reward, TVL) dengan peringatan risiko — bukan rekomendasi. | `src/config/dex-registry.ts#L309 @ ae7d11b` |
| REQ-cryptdex-006 | CryptDex | Tab "Fees & Revenue": Fee & revenue protokol DeFi per protokol/kategori dan trennya. | `src/config/dex-registry.ts#L309 @ ae7d11b` |
| REQ-cryptdex-007 | CryptDex | Tab "Bot & AI Agent": Edukasi bot trading & AI agent kripto: profil, fakta terverifikasi, uji nyata, checklist keamanan — tanpa rekomendasi & tanpa tautan referral. (edukasi + keamanan) | `src/config/dex-registry.ts#L309 @ ae7d11b` |
| REQ-cryptdex-008 | CryptDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L309 @ ae7d11b` |
| REQ-centralbankdex-001 | CentralBankDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L335 @ ae7d11b` |
| REQ-centralbankdex-002 | CentralBankDex | Tab "Neraca G3": Neraca bank sentral The Fed, ECB, BoJ, dan gabungan G3. (Fed/ECB/BoJ) | `src/config/dex-registry.ts#L335 @ ae7d11b` |
| REQ-centralbankdex-003 | CentralBankDex | Tab "Suku Bunga & Kurva Imbal Hasil": Suku bunga kebijakan AS, imbal hasil Treasury, spread 10Y–2Y, dan periode inversi. | `src/config/dex-registry.ts#L335 @ ae7d11b` |
| REQ-centralbankdex-004 | CentralBankDex | Tab "Uang Beredar": Uang beredar (M2/broad money) AS dan negara lain. | `src/config/dex-registry.ts#L335 @ ae7d11b` |
| REQ-centralbankdex-005 | CentralBankDex | Tab "Peta Negara": Peta per negara untuk indikator Dex ini. | `src/config/dex-registry.ts#L335 @ ae7d11b` |
| REQ-centralbankdex-006 | CentralBankDex | Tab "Label Rezim": Label rezim likuiditas buatan penyedia dataset (ditandai sebagai label penyedia, bukan fakta). (penyedia) | `src/config/dex-registry.ts#L335 @ ae7d11b` |
| REQ-centralbankdex-007 | CentralBankDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L335 @ ae7d11b` |
| REQ-inflationdex-001 | InflationDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L359 @ ae7d11b` |
| REQ-inflationdex-002 | InflationDex | Tab "Peta Inflasi": Peta inflasi antarnegara (tahun data ditampilkan). | `src/config/dex-registry.ts#L359 @ ae7d11b` |
| REQ-inflationdex-003 | InflationDex | Tab "Peringkat": Peringkat terurut berdasarkan metrik pilihan. | `src/config/dex-registry.ts#L359 @ ae7d11b` |
| REQ-inflationdex-004 | InflationDex | Tab "Biaya Barang": Harga barang & jasa sehari-hari antarnegara (roti, transport, sewa, utilitas). | `src/config/dex-registry.ts#L359 @ ae7d11b` |
| REQ-inflationdex-005 | InflationDex | Tab "Wilayah & Pendapatan": Ringkasan per wilayah dunia dan kelompok pendapatan. | `src/config/dex-registry.ts#L359 @ ae7d11b` |
| REQ-inflationdex-006 | InflationDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L359 @ ae7d11b` |
| REQ-startupdex-001 | StartupDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L382 @ ae7d11b` |
| REQ-startupdex-002 | StartupDex | Tab "Ringkasan": Ringkasan utama dataset Dex ini dalam kartu & grafik. | `src/config/dex-registry.ts#L382 @ ae7d11b` |
| REQ-startupdex-003 | StartupDex | Tab "Tahapan": Pendanaan startup per tahap (Seed, Series A, dst.) dan median ukurannya. (Stage) | `src/config/dex-registry.ts#L382 @ ae7d11b` |
| REQ-startupdex-004 | StartupDex | Tab "Negara & Sektor": Pendanaan startup per negara dan sektor. | `src/config/dex-registry.ts#L382 @ ae7d11b` |
| REQ-startupdex-005 | StartupDex | Tab "Mega-round": Putaran pendanaan ≥ US$100 juta dan porsinya terhadap total. | `src/config/dex-registry.ts#L382 @ ae7d11b` |
| REQ-startupdex-006 | StartupDex | Tab "Cari Putaran": Cari putaran pendanaan startup berdasarkan perusahaan, tahap, negara, sektor, atau investor. | `src/config/dex-registry.ts#L382 @ ae7d11b` |
| REQ-startupdex-007 | StartupDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L382 @ ae7d11b` |
| REQ-vcdex-001 | VCDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L407 @ ae7d11b` |
| REQ-vcdex-002 | VCDex | Tab "Direktori": Direktori investor yang bisa difilter (tipe, negara, tahap, jumlah deal). | `src/config/dex-registry.ts#L407 @ ae7d11b` |
| REQ-vcdex-003 | VCDex | Tab "Peringkat": Peringkat terurut berdasarkan metrik pilihan. | `src/config/dex-registry.ts#L407 @ ae7d11b` |
| REQ-vcdex-004 | VCDex | Tab "Stage Mix": Komposisi tahap pendanaan yang diikuti investor. | `src/config/dex-registry.ts#L407 @ ae7d11b` |
| REQ-vcdex-005 | VCDex | Tab "Negara": Statistik per negara untuk cakupan Dex ini. | `src/config/dex-registry.ts#L407 @ ae7d11b` |
| REQ-vcdex-006 | VCDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L407 @ ae7d11b` |
| REQ-vcnetworkdex-001 | VCNetworkDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L428 @ ae7d11b` |
| REQ-vcnetworkdex-002 | VCNetworkDex | Tab "Graf Jaringan": Graf ego jaringan co-investment investor (≤ 50 node) dengan ketebalan garis = jumlah deal bersama. | `src/config/dex-registry.ts#L428 @ ae7d11b` |
| REQ-vcnetworkdex-003 | VCNetworkDex | Tab "Pasangan Teratas": Pasangan investor yang paling sering berinvestasi bersama. | `src/config/dex-registry.ts#L428 @ ae7d11b` |
| REQ-vcnetworkdex-004 | VCNetworkDex | Tab "Investor": Profil investor dalam jaringan: mitra co-investment terbanyak & statistik. | `src/config/dex-registry.ts#L428 @ ae7d11b` |
| REQ-vcnetworkdex-005 | VCNetworkDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L428 @ ae7d11b` |
| REQ-opencompanydex-001 | OpenCompanyDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L451 @ ae7d11b` |
| REQ-opencompanydex-002 | OpenCompanyDex | Tab "Peta Negara": Peta per negara untuk indikator Dex ini. | `src/config/dex-registry.ts#L451 @ ae7d11b` |
| REQ-opencompanydex-003 | OpenCompanyDex | Tab "Sektor & Industri": Jumlah & karakteristik perusahaan per sektor dan industri. | `src/config/dex-registry.ts#L451 @ ae7d11b` |
| REQ-opencompanydex-004 | OpenCompanyDex | Tab "Status & Pendanaan": Status perusahaan (aktif/tutup/diakuisisi) dan porsi yang pernah didanai. | `src/config/dex-registry.ts#L451 @ ae7d11b` |
| REQ-opencompanydex-005 | OpenCompanyDex | Tab "Cari Perusahaan": Cari perusahaan di direktori berdasarkan nama, negara, atau sektor. | `src/config/dex-registry.ts#L451 @ ae7d11b` |
| REQ-opencompanydex-006 | OpenCompanyDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L451 @ ae7d11b` |
| REQ-salarydex-001 | SalaryDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L475 @ ae7d11b` |
| REQ-salarydex-002 | SalaryDex | Tab "Kalkulator Benchmark": Bandingkan gaji dengan median/persentil berdasarkan negara, peran, senioritas, dan skill. | `src/config/dex-registry.ts#L475 @ ae7d11b` |
| REQ-salarydex-003 | SalaryDex | Tab "Negara": Statistik per negara untuk cakupan Dex ini. | `src/config/dex-registry.ts#L475 @ ae7d11b` |
| REQ-salarydex-004 | SalaryDex | Tab "Peran & Senioritas": Gaji berdasarkan keluarga peran dan tingkat senioritas. | `src/config/dex-registry.ts#L475 @ ae7d11b` |
| REQ-salarydex-005 | SalaryDex | Tab "Skill": Skill paling dicari dan premi gaji per skill. | `src/config/dex-registry.ts#L475 @ ae7d11b` |
| REQ-salarydex-006 | SalaryDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L475 @ ae7d11b` |
| REQ-costlivingdex-001 | CostLivingDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L499 @ ae7d11b` |
| REQ-costlivingdex-002 | CostLivingDex | Tab "Peringkat Kota": Peringkat kota menurut indeks biaya hidup, sewa, kualitas hidup, dll. (data sintetis). | `src/config/dex-registry.ts#L499 @ ae7d11b` |
| REQ-costlivingdex-003 | CostLivingDex | Tab "Profil Kota": Profil lengkap satu kota (biaya, kualitas hidup, keamanan, polusi, internet). | `src/config/dex-registry.ts#L499 @ ae7d11b` |
| REQ-costlivingdex-004 | CostLivingDex | Tab "Bandingkan": Bandingkan 2–5 entitas dalam satu grafik (rebase 100) plus tabel metrik. | `src/config/dex-registry.ts#L499 @ ae7d11b` |
| REQ-costlivingdex-005 | CostLivingDex | Tab "Perubahan 2023→2024": Perubahan indeks kota antara dua survei. | `src/config/dex-registry.ts#L499 @ ae7d11b` |
| REQ-costlivingdex-006 | CostLivingDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L499 @ ae7d11b` |
| REQ-idhousingdex-001 | IDHousingDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L522 @ ae7d11b` |
| REQ-idhousingdex-002 | IDHousingDex | Tab "Ringkasan": Ringkasan utama dataset Dex ini dalam kartu & grafik. | `src/config/dex-registry.ts#L522 @ ae7d11b` |
| REQ-idhousingdex-003 | IDHousingDex | Tab "Provinsi & Kota": Statistik perumahan per provinsi dan kota/kabupaten. | `src/config/dex-registry.ts#L522 @ ae7d11b` |
| REQ-idhousingdex-004 | IDHousingDex | Tab "Peta Proyek": Peta titik proyek perumahan (ter-cluster) dengan filter provinsi & status subsidi. | `src/config/dex-registry.ts#L522 @ ae7d11b` |
| REQ-idhousingdex-005 | IDHousingDex | Tab "Spesifikasi": Spesifikasi rumah (kamar, lantai, material) per segmen. | `src/config/dex-registry.ts#L522 @ ae7d11b` |
| REQ-idhousingdex-006 | IDHousingDex | Tab "Pengembang": Ringkasan pengembang & asosiasi pengembang perumahan. | `src/config/dex-registry.ts#L522 @ ae7d11b` |
| REQ-idhousingdex-007 | IDHousingDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L522 @ ae7d11b` |
| REQ-idfooddeliverydex-001 | IDFoodDeliveryDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L546 @ ae7d11b` |
| REQ-idfooddeliverydex-002 | IDFoodDeliveryDex | Tab "Ringkasan Markup": Ringkasan markup harga online vs dine-in, biaya kemasan, dan promo. | `src/config/dex-registry.ts#L546 @ ae7d11b` |
| REQ-idfooddeliverydex-003 | IDFoodDeliveryDex | Tab "Kota": Statistik per kota (markup food delivery). | `src/config/dex-registry.ts#L546 @ ae7d11b` |
| REQ-idfooddeliverydex-004 | IDFoodDeliveryDex | Tab "Kuliner": Statistik per jenis kuliner (harga, markup, promo). | `src/config/dex-registry.ts#L546 @ ae7d11b` |
| REQ-idfooddeliverydex-005 | IDFoodDeliveryDex | Tab "Cloud Kitchen": Perbandingan harga & markup cloud kitchen dengan restoran biasa. | `src/config/dex-registry.ts#L546 @ ae7d11b` |
| REQ-idfooddeliverydex-006 | IDFoodDeliveryDex | Tab "Cari Menu": Cari menu food delivery berdasarkan nama, kota, atau kuliner, lengkap dengan markup. | `src/config/dex-registry.ts#L546 @ ae7d11b` |
| REQ-idfooddeliverydex-007 | IDFoodDeliveryDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L546 @ ae7d11b` |
| REQ-povertydex-001 | PovertyDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L570 @ ae7d11b` |
| REQ-povertydex-002 | PovertyDex | Tab "Peta MPI": Peta Indeks Kemiskinan Multidimensi per negara. | `src/config/dex-registry.ts#L570 @ ae7d11b` |
| REQ-povertydex-003 | PovertyDex | Tab "Peringkat": Peringkat terurut berdasarkan metrik pilihan. | `src/config/dex-registry.ts#L570 @ ae7d11b` |
| REQ-povertydex-004 | PovertyDex | Tab "Dimensi": Kontribusi 10 dimensi kemiskinan multidimensi per negara. | `src/config/dex-registry.ts#L570 @ ae7d11b` |
| REQ-povertydex-005 | PovertyDex | Tab "Bandingkan": Bandingkan 2–5 entitas dalam satu grafik (rebase 100) plus tabel metrik. | `src/config/dex-registry.ts#L570 @ ae7d11b` |
| REQ-povertydex-006 | PovertyDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L570 @ ae7d11b` |
| REQ-populationdex-001 | PopulationDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L593 @ ae7d11b` |
| REQ-populationdex-002 | PopulationDex | Tab "Tren Liputan": Tren liputan berita per bulan/tahun per 10 ribu berita (bulan parsial ditandai). | `src/config/dex-registry.ts#L593 @ ae7d11b` |
| REQ-populationdex-003 | PopulationDex | Tab "Geografi": Sebaran liputan berita per benua, negara, kota, atau negara bagian. | `src/config/dex-registry.ts#L593 @ ae7d11b` |
| REQ-populationdex-004 | PopulationDex | Tab "Tema & Organisasi": Tema dan organisasi yang paling sering muncul dalam liputan berita. | `src/config/dex-registry.ts#L593 @ ae7d11b` |
| REQ-populationdex-005 | PopulationDex | Tab "Riset & Paten": Tren publikasi riset dan paten terkait topik berita. | `src/config/dex-registry.ts#L593 @ ae7d11b` |
| REQ-populationdex-006 | PopulationDex | Tab "Temuan Penyedia": Temuan penyedia dataset berlabel grade A/B/C (bukan hitungan Finandex). | `src/config/dex-registry.ts#L593 @ ae7d11b` |
| REQ-populationdex-007 | PopulationDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L593 @ ae7d11b` |
| REQ-homelessnessdex-001 | HomelessnessDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L611 @ ae7d11b` |
| REQ-homelessnessdex-002 | HomelessnessDex | Tab "Tren Liputan": Tren liputan berita per bulan/tahun per 10 ribu berita (bulan parsial ditandai). | `src/config/dex-registry.ts#L611 @ ae7d11b` |
| REQ-homelessnessdex-003 | HomelessnessDex | Tab "Geografi": Sebaran liputan berita per benua, negara, kota, atau negara bagian. | `src/config/dex-registry.ts#L611 @ ae7d11b` |
| REQ-homelessnessdex-004 | HomelessnessDex | Tab "Tema & Organisasi": Tema dan organisasi yang paling sering muncul dalam liputan berita. | `src/config/dex-registry.ts#L611 @ ae7d11b` |
| REQ-homelessnessdex-005 | HomelessnessDex | Tab "Riset & Paten": Tren publikasi riset dan paten terkait topik berita. | `src/config/dex-registry.ts#L611 @ ae7d11b` |
| REQ-homelessnessdex-006 | HomelessnessDex | Tab "Temuan Penyedia": Temuan penyedia dataset berlabel grade A/B/C (bukan hitungan Finandex). | `src/config/dex-registry.ts#L611 @ ae7d11b` |
| REQ-homelessnessdex-007 | HomelessnessDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L611 @ ae7d11b` |
| REQ-housingdex-001 | HousingDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L629 @ ae7d11b` |
| REQ-housingdex-002 | HousingDex | Tab "Tren Liputan": Tren liputan berita per bulan/tahun per 10 ribu berita (bulan parsial ditandai). | `src/config/dex-registry.ts#L629 @ ae7d11b` |
| REQ-housingdex-003 | HousingDex | Tab "Geografi": Sebaran liputan berita per benua, negara, kota, atau negara bagian. | `src/config/dex-registry.ts#L629 @ ae7d11b` |
| REQ-housingdex-004 | HousingDex | Tab "Tema & Organisasi": Tema dan organisasi yang paling sering muncul dalam liputan berita. | `src/config/dex-registry.ts#L629 @ ae7d11b` |
| REQ-housingdex-005 | HousingDex | Tab "Riset & Paten": Tren publikasi riset dan paten terkait topik berita. | `src/config/dex-registry.ts#L629 @ ae7d11b` |
| REQ-housingdex-006 | HousingDex | Tab "Temuan Penyedia": Temuan penyedia dataset berlabel grade A/B/C (bukan hitungan Finandex). | `src/config/dex-registry.ts#L629 @ ae7d11b` |
| REQ-housingdex-007 | HousingDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L629 @ ae7d11b` |
| REQ-fintechdex-001 | FintechDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L647 @ ae7d11b` |
| REQ-fintechdex-002 | FintechDex | Tab "Sentimen": Distribusi sentimen (label otomatis penyedia) per platform, bulan, atau bahasa. | `src/config/dex-registry.ts#L647 @ ae7d11b` |
| REQ-fintechdex-003 | FintechDex | Tab "Topik & Aspek": Topik & aspek ulasan (UX, harga, produk, layanan, keamanan, merek) beserta sentimennya. | `src/config/dex-registry.ts#L647 @ ae7d11b` |
| REQ-fintechdex-004 | FintechDex | Tab "Jelajah Ulasan": Telusuri ulasan produk fintech tanpa identitas penulis. | `src/config/dex-registry.ts#L647 @ ae7d11b` |
| REQ-fintechdex-005 | FintechDex | Tab "Tren": Tren bulanan jumlah unggahan dan porsi sentimen. | `src/config/dex-registry.ts#L647 @ ae7d11b` |
| REQ-fintechdex-006 | FintechDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L647 @ ae7d11b` |
| REQ-personalfinandex-001 | PersonalFinanDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L670 @ ae7d11b` |
| REQ-personalfinandex-002 | PersonalFinanDex | Tab "Sentimen": Distribusi sentimen (label otomatis penyedia) per platform, bulan, atau bahasa. | `src/config/dex-registry.ts#L670 @ ae7d11b` |
| REQ-personalfinandex-003 | PersonalFinanDex | Tab "Topik": Topik diskusi yang paling sering muncul. | `src/config/dex-registry.ts#L670 @ ae7d11b` |
| REQ-personalfinandex-004 | PersonalFinanDex | Tab "Jelajah Diskusi": Telusuri diskusi keuangan pribadi (judul/ringkasan/platform/tanggal) tanpa identitas penulis. | `src/config/dex-registry.ts#L670 @ ae7d11b` |
| REQ-personalfinandex-005 | PersonalFinanDex | Tab "Tren": Tren bulanan jumlah unggahan dan porsi sentimen. | `src/config/dex-registry.ts#L670 @ ae7d11b` |
| REQ-personalfinandex-006 | PersonalFinanDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L670 @ ae7d11b` |
| REQ-mylaiwyer-001 | My LAIwyer | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L693 @ ae7d11b` |
| REQ-mylaiwyer-002 | My LAIwyer | Tab "Konsultasi Terpandu": Tanya-jawab bertahap dengan pilihan (chip): situasi Anda → langkah yang bisa dilakukan + dasar hukum resmi. | `src/config/dex-registry.ts#L693 @ ae7d11b` |
| REQ-mylaiwyer-003 | My LAIwyer | Tab "Sumber Hukum": Daftar dokumen hukum: tersedia (sudah diverifikasi) dan menunggu dokumen, dengan tautan resmi. (tersedia & menunggu dokumen) | `src/config/dex-registry.ts#L693 @ ae7d11b` |
| REQ-mylaiwyer-004 | My LAIwyer | Tab "Jelajah Pasal": Daftar isi per dokumen hukum (Pembukaan/Bab/Pasal/Penjelasan/Lampiran) dengan pencarian. | `src/config/dex-registry.ts#L693 @ ae7d11b` |
| REQ-mylaiwyer-005 | My LAIwyer | Tab "Bandingkan Versi": Teks pasal berdampingan antar-versi peraturan (KUHAP 1981 ↔ 2025; UUD naskah asli ↔ UUD NRI 1945). (KUHAP 1981–2025; UUD naskah asli–UUD NRI 1945) | `src/config/dex-registry.ts#L693 @ ae7d11b` |
| REQ-mylaiwyer-006 | My LAIwyer | Tab "Glosarium": Istilah hukum/keuangan dijelaskan dalam bahasa awam. | `src/config/dex-registry.ts#L693 @ ae7d11b` |
| REQ-mylaiwyer-007 | My LAIwyer | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L693 @ ae7d11b` |
| REQ-finlaiwyer-001 | FinLAIwyer | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L724 @ ae7d11b` |
| REQ-finlaiwyer-002 | FinLAIwyer | Tab "Konsultasi Terpandu": Tanya-jawab bertahap dengan pilihan (chip): situasi Anda → langkah yang bisa dilakukan + dasar hukum resmi. | `src/config/dex-registry.ts#L724 @ ae7d11b` |
| REQ-finlaiwyer-003 | FinLAIwyer | Tab "Peta Regulasi Keuangan": Graf peraturan keuangan & perbankan: mana mengubah, mencabut, atau disesuaikan; klik untuk status & pasal kunci. (graf relasi ubah/cabut/disesuaikan) | `src/config/dex-registry.ts#L724 @ ae7d11b` |
| REQ-finlaiwyer-004 | FinLAIwyer | Tab "Jelajah Pasal": Daftar isi per dokumen hukum (Pembukaan/Bab/Pasal/Penjelasan/Lampiran) dengan pencarian. | `src/config/dex-registry.ts#L724 @ ae7d11b` |
| REQ-finlaiwyer-005 | FinLAIwyer | Tab "Status & Perubahan": Linimasa status peraturan: berlaku, diubah, dicabut, dan penyesuaian ancaman pidana oleh UU 1/2026. (linimasa + penyesuaian UU 1/2026) | `src/config/dex-registry.ts#L724 @ ae7d11b` |
| REQ-finlaiwyer-006 | FinLAIwyer | Tab "Kanal Pengaduan": Ke mana mengadu (bank/PUJK, OJK 157/APPK, BI 131, LAPS SJK) dan urutannya. | `src/config/dex-registry.ts#L724 @ ae7d11b` |
| REQ-finlaiwyer-007 | FinLAIwyer | Tab "Glosarium": Istilah hukum/keuangan dijelaskan dalam bahasa awam. | `src/config/dex-registry.ts#L724 @ ae7d11b` |
| REQ-finlaiwyer-008 | FinLAIwyer | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L724 @ ae7d11b` |
| REQ-antiscamdex-001 | AntiScamDex | Tab "Chat": Tanya apa saja tentang cakupan Dex ini; jawaban berisi angka dari data, grafik, analisis, dan panel "Kenapa jawabannya begini?". | `src/config/dex-registry.ts#L756 @ ae7d11b` |
| REQ-antiscamdex-002 | AntiScamDex | Tab "Baru Kena Scam": Layar darurat: dua pertanyaan (kapan & lewat apa) lalu langkah segera dengan tombol kanal resmi. (langkah darurat) | `src/config/dex-registry.ts#L756 @ ae7d11b` |
| REQ-antiscamdex-003 | AntiScamDex | Tab "Siapkan Laporan": Wizard offline untuk menyiapkan data & kronologi sesuai formulir IASC; data tidak pernah meninggalkan perangkat. (offline) | `src/config/dex-registry.ts#L756 @ ae7d11b` |
| REQ-antiscamdex-004 | AntiScamDex | Tab "Statistik Penanganan": Statistik IASC & Satgas PASTI: laporan, rekening diblokir, dana diblokir & dikembalikan, modus, wilayah — per tanggal potong & sumber. | `src/config/dex-registry.ts#L756 @ ae7d11b` |
| REQ-antiscamdex-005 | AntiScamDex | Tab "Kenali Modus": Pustaka modus scam, tanda bahaya, dan kuis cek-mandiri "Apakah ini scam?". (+ kuis cek-mandiri) | `src/config/dex-registry.ts#L756 @ ae7d11b` |
| REQ-antiscamdex-006 | AntiScamDex | Tab "Kanal Resmi": Direktori kanal resmi (IASC, OJK, SiPASTI, BI, cekrekening.id, aduannomor.id, Polri, LAPS SJK) dan kapan memakainya. | `src/config/dex-registry.ts#L756 @ ae7d11b` |
| REQ-antiscamdex-007 | AntiScamDex | Tab "Cegah & Bukti": Tips pencegahan scam dan daftar bukti yang perlu diamankan sebelum melapor. | `src/config/dex-registry.ts#L756 @ ae7d11b` |
| REQ-antiscamdex-008 | AntiScamDex | Tab "Data": File sumber persis, cakupan, tanggal data (as-of), aturan pembersihan, laporan kualitas, lisensi & atribusi. | `src/config/dex-registry.ts#L756 @ ae7d11b` |

## 3. Kebutuhan lintas aplikasi & non-fungsional
Dipetakan ke sembilan karakteristik kualitas ISO/IEC 25010:2023.

| ID | Kebutuhan | Karakteristik kualitas | Sumber |
|---|---|---|---|
| REQ-app-001 | Persetujuan chat (versi kebijakan) sebelum pesan pertama; ditanya ulang bila versi berubah | Keamanan | `src/components/ConsentDialog.tsx @ ae7d11b` |
| REQ-app-002 | Pesan yang tampak berisi seed phrase, private key, nomor kartu, atau NIK diblokir di klien dan server | Keamanan | `src/shared/text.ts @ ae7d11b` |
| REQ-app-003 | Pembatasan laju per clientId + IP (jendela 10 menit dan harian) serta anggaran token harian | Keandalan | `server/security/ratelimit.ts @ ae7d11b` |
| REQ-app-004 | Angka dalam jawaban hanya dari keluaran tool; klaim tanpa bukti dihapus Verifikator | Kesesuaian fungsional | `server/agents/verifier.ts @ ae7d11b` |
| REQ-app-005 | Orkestrasi multi-agen: Penjaga → Konduktor (≤ 4 spesialis) → agen Dex → Verifikator, dialirkan sebagai event SSE | Kesesuaian fungsional | `server/agents/run.ts @ ae7d11b` |
| REQ-app-006 | Aplikasi dapat dibuka offline (service worker, cache data yang pernah dibuka) | Keandalan | `vite.config.ts @ ae7d11b` |
| REQ-app-007 | Halaman /install: petunjuk pemasangan iPhone/iPad/Android/macOS/Windows dan QR | Kapabilitas interaksi | `src/features/install/InstallCenter.tsx @ ae7d11b` |
| REQ-app-008 | Kontras teks ≥ 4,5 : 1 pada kedua tema; navigasi keyboard; lulus pemeriksaan axe | Kapabilitas interaksi | `tests/unit/contrast.test.ts @ ae7d11b` |
| REQ-app-009 | Isian "Siapkan Laporan" AntiScamDex terenkripsi AES-GCM di perangkat, terhapus otomatis setelah 30 hari kecuali disimpan | Keamanan | `src/lib/secure-store.ts @ ae7d11b` |
| REQ-app-010 | Konsultasi Terpandu hukum: alur pertanyaan bercabang dengan rujukan pasal dari teks resmi | Kesesuaian fungsional | `kit/datasets/law/legal_qa_flows.json @ ae7d11b` |
| REQ-app-011 | Panduan Fitur menjawab "fitur ini untuk apa?" dari feature_guide.json | Kapabilitas interaksi | `kit/datasets/app/feature_guide.json @ ae7d11b` |
| REQ-app-012 | Bundel awal ≤ 250 KB gzip | Efisiensi kinerja | `package.json @ ae7d11b` |

## 4. Kriteria penerimaan
Setiap kebutuhan diterima bila tes yang tertaut di A13 lulus pada rilis yang sama dan gate `npm run verify` hijau. Hasil terakhir: 909/909 tes unit/komponen lulus; eval chat mock 161/161.
