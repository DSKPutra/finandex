# A06 — Spesifikasi data & kamus data

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

| Kontrol dokumen | |
|---|---|
| ID dokumen | A06 |
| Judul | Spesifikasi data & kamus data |
| Versi | 0.1.0 (= versi aplikasi) · commit `ae7d11b` |
| Tanggal | 2026-10-24 |
| Status | Draf |
| Klasifikasi | Internal |
| Pemilik | Dea Saka Kurnia Putra |
| Penyusun | Dibangkitkan oleh `scripts/compliance/*` (Claude Code) dari sumber kebenaran repo |
| Penyetuju | [KONFIRMASI] — penyetuju dokumen belum ditetapkan |
| Lingkup | 42 input, 4 dataset kit, 37 dokumen regulasi |
| Standar acuan | ISO/IEC 25012 (model kualitas data) |
| Dokumen terkait | A03, B01 |

**Riwayat perubahan**

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1.0 | 2026-10-24 | Versi pertama, dibangkitkan dari sumber kebenaran repo. |

## 1. File input (terverifikasi SHA-256)
| No | Nama | File | Ukuran (byte) | SHA-256 |
|---|---|---|---|---|
| 1 | Global_Financial_Markets_Dataset_2000-Present.zip | `Global_Financial_Markets_Dataset_2000-Present.zip` | 3.616.489 | `bf744c24c1300fd1…` |
| 2 | NASDAQ_daily_stock_prices_OHLC_prices_between_1962-01-02_till_2026-09-18_Dataset.zip | `NASDAQ_daily_stock_prices_OHLC_prices_between_1962-01-02_till_2026-09-18_Dataset.zip` | 31.681.188 | `0ec17bbacfc86ecf…` |
| 3 | S_P_500_US_Stock_Market_Data_2026_master_stock_data.csv | `S_P_500_US_Stock_Market_Data_2026_master_stock_data.csv` | 255.053.716 | `2ed5caa9e7183d61…` |
| 4 | Global_E-Commerce_Giants_2015_2026_.zip | `Global_E-Commerce_Giants_2015_2026_.zip` | 2.104.283 | `dd4fce52ea90b181…` |
| 5 | Daily_Multi-Asset_Macroeconomic_and_Financial_Time_Series_Dataset_Indonesia_Global_Markets.csv | `Daily_Multi-Asset_Macroeconomic_and_Financial_Time_Series_Dataset_Indonesia_Global_Markets.csv` | 563.433 | `82f604af080d4b0d…` |
| 6 | Daily_Multi-Asset_Macroeconomic_and_Financial_Time_Series_Dataset__Indonesia_Global_Markets_.ipynb | `Daily_Multi-Asset_Macroeconomic_and_Financial_Time_Series_Dataset__Indonesia_Global_Markets_.ipynb` | 410.405 | `9f2a727df1701067…` |
| 7 | USDIDR_daily_exchange_rate.zip | `USDIDR_daily_exchange_rate.zip` | 184.986 | `94a1a328f9772e61…` |
| 8 | Mutual_Fund_Reksa_Dana_Dataset_in_Indonesia.zip | `Mutual_Fund_Reksa_Dana_Dataset_in_Indonesia.zip` | 8.073.999 | `f1b4da71441b22a9…` |
| 9 | Complete_Indonesia_Stock_Market_IDX_2000-2024.zip | `Complete_Indonesia_Stock_Market_IDX_2000-2024.zip` | 26.606.242 | `13c4b77c47ab302b…` |
| 10 | Dataset_Financial_Statement_in_IDX_Indonesia.zip | `Dataset_Financial_Statement_in_IDX_Indonesia.zip` | 1.825.503 | `30f58cc10d233740…` |
| 11 | e-IPO_Indonesia_Data_-_Investment.zip | `e-IPO_Indonesia_Data_-_Investment.zip` | 48.113 | `397bb0a3d9260e6d…` |
| 12 | Indonesian_Public_Companies.zip | `Indonesian_Public_Companies.zip` | 23.594 | `0a6ed3423cb6b008…` |
| 13 | DeFi_Market_Overview-_TVL__Stablecoins__Yields.ipynb | `DeFi_Market_Overview-_TVL__Stablecoins__Yields.ipynb` | 350.607 | `abb6e742799da434…` |
| 14 | Crypto_Prices_Historical_Data.zip | `Crypto_Prices_Historical_Data.zip` | 2.007.660 | `56bd89a462eee20c…` |
| 15 | Daily_Crypto_Market_Tracker_CoinGecko.zip | `Daily_Crypto_Market_Tracker_CoinGecko.zip` | 27.618 | `90315662a837300b…` |
| 16 | Central_Bank_Balance_Sheets__Global_Liquidity.zip | `Central_Bank_Balance_Sheets__Global_Liquidity.zip` | 1.252.630 | `f72e61a304464bba…` |
| 17 | Fintech_Product_Adoption_and_Reviews.zip | `Fintech_Product_Adoption_and_Reviews.zip` | 5.616.153 | `77c3670879a3caf4…` |
| 18 | Global_Salary_Data_by_Skill__Role_620k_jobs.zip | `Global_Salary_Data_by_Skill__Role_620k_jobs.zip` | 6.560.397 | `aa2d37f88822b151…` |
| 19 | Global_Startup_Funding_Rounds_2019_2026.zip | `Global_Startup_Funding_Rounds_2019_2026.zip` | 3.552.198 | `6406be1a8ebbdfac…` |
| 20 | Indonesian_Food_Delivery_Benchmark_-_10k_Menus.zip | `Indonesian_Food_Delivery_Benchmark_-_10k_Menus.zip` | 1.738.198 | `d50a71edd47a58ef…` |
| 21 | Open_Company_Database_5M_companies_2026.zip | `Open_Company_Database_5M_companies_2026.zip` | 6.308.463 | `bda45e0f990a3457…` |
| 22 | Personal_Finance_and_Financial_Independence.zip | `Personal_Finance_and_Financial_Independence.zip` | 14.860.099 | `768768d13ff64d97…` |
| 23 | VC_Co-Investment_Network-_303k_Investor_Pairs.zip | `VC_Co-Investment_Network-_303k_Investor_Pairs.zip` | 4.381.430 | `c0c7c46fa004d556…` |
| 24 | VC_Investor_Directory_2026-_35k_Startup_Investors.zip | `VC_Investor_Directory_2026-_35k_Startup_Investors.zip` | 1.124.421 | `6af28febc60bb1e9…` |
| 25 | Crypto_Trading_Bots__AI_Agents_Dataset_v5.zip | `Crypto_Trading_Bots__AI_Agents_Dataset_v5.zip` | 113.899 | `0563f9c3511e4186…` |
| 26 | Daily_DeFi_Fees__Revenue.zip | `Daily_DeFi_Fees__Revenue.zip` | 1.249.923 | `aab21f24d4948abb…` |
| 27 | Daily_DeFi_Yield__TVL_Snapshots.zip | `Daily_DeFi_Yield__TVL_Snapshots.zip` | 118.886 | `d9597736b84dde27…` |
| 28 | DeFi_Daily-_TVL_Stablecoins_DEX__Yields.zip | `DeFi_Daily-_TVL_Stablecoins_DEX__Yields.zip` | 5.344.293 | `060af337a965ed40…` |
| 29 | Indonesia_Affordable_Housing.zip | `Indonesia_Affordable_Housing.zip` | 4.593.529 | `edc15c7d27cdd994…` |
| 30 | KUHP_Lama.pdf | `KUHP_Lama.pdf` | 431.399 | `b181015ac811f3fc…` |
| 31 | UU_Nomor_20_Tahun_2025_KUHP.pdf | `UU_Nomor_20_Tahun_2025_KUHP.pdf` | 13.630.882 | `40e8b444aa7efabe…` |
| 32 | KUHAP.pdf | `KUHAP.pdf` | 233.764 | `c13c801c56c633ac…` |
| 33 | KUHP.pdf | `KUHP.pdf` | 233.764 | `c13c801c56c633ac…` |
| 34 | Undang-undang_UU_No._1_Tahun_1946_Peraturan_tentang_Hukum_Pidana.pdf | `Undang-undang_UU_No._1_Tahun_1946_Peraturan_tentang_Hukum_Pidana.pdf` | 82.134 | `18853c15a6d87515…` |
| 35 | UUD_45.pdf | `UUD_45.pdf` | 88.588 | `1d6543303b4134da…` |
| 36 | Global_City_Cost_of_Living__Quality_of_Life_Index.zip | `Global_City_Cost_of_Living__Quality_of_Life_Index.zip` | 17.651 | `98a642b0d1de5cc9…` |
| 37 | Global_Inflation__Cost_of_Living_Dataset.zip | `Global_Inflation__Cost_of_Living_Dataset.zip` | 187.781 | `d131a3aed41a647d…` |
| 38 | Homelessness_News_Dataset_2019-2026.zip | `Homelessness_News_Dataset_2019-2026.zip` | 2.931.258 | `2982867569fb15a3…` |
| 39 | Housing_News_Dataset_2019-2026.zip | `Housing_News_Dataset_2019-2026.zip` | 4.634.979 | `97deecdd22dfd1ca…` |
| 40 | IPO_Data_2019-2026-_India_US_UK__Global_IPOs.zip | `IPO_Data_2019-2026-_India_US_UK__Global_IPOs.zip` | 1.427.412 | `bdf3ecf6ddd904ce…` |
| 41 | Multidimensional_Poverty_Index_MPI.zip | `Multidimensional_Poverty_Index_MPI.zip` | 28.005 | `67462b12039422dd…` |
| 42 | Population_News_Dataset_2019-2026.zip | `Population_News_Dataset_2019-2026.zip` | 1.815.972 | `bc1d93365729ce58…` |

## 2. Dataset kit
| File | Ukuran (byte) | SHA-256 |
|---|---|---|
| `kit/datasets/antiscam/antiscam_kb.json` | 46.609 | `1c68d009d183a548…` |
| `kit/datasets/app/feature_guide.json` | 54.752 | `46b7327f38d0894b…` |
| `kit/datasets/law/legal_qa_flows.json` | 31.510 | `4d0002f46e75015f…` |
| `kit/datasets/law/regulation_catalog.json` | 56.022 | `ca80c0a06af5a7e0…` |

## 3. Dokumen regulasi
| Dokumen | Status | Halaman | Diambil |
|---|---|---|---|
| uud-nri-1945 | available | 21 | 2026-10-22 |
| uu-1-2023-kuhp | available | 345 | 2026-10-22 |
| uu-1-2026-penyesuaian-pidana | available | 260 | 2026-10-22 |
| kuhperdata | pending | — | — |
| uu-16-2011-bantuan-hukum | available | 17 | 2026-10-22 |
| perma-2-2015-jo-4-2019 | available | 15 | 2026-10-22 |
| uu-12-2011-p3 | available | 201 | 2026-10-22 |
| uu-4-2023-p2sk | available | 819 | 2026-10-22 |
| uu-21-2011-ojk | available | 36 | 2026-10-22 |
| uu-7-1992-perbankan | available | 68 | 2026-10-22 |
| uu-10-1998-perbankan | available | 63 | 2026-10-22 |
| uu-21-2008-perbankan-syariah | available | 64 | 2026-10-22 |
| uu-23-1999-bi | available | 55 | 2026-10-22 |
| uu-3-2004-bi | available | 36 | 2026-10-22 |
| uu-6-2009-bi | available | 13 | 2026-10-22 |
| uu-3-2011-transfer-dana | available | 45 | 2026-10-22 |
| uu-8-2010-tppu | available | 65 | 2026-10-22 |
| uu-8-1999-perlindungan-konsumen | available | 54 | 2026-10-22 |
| uu-27-2022-pdp | available | 50 | 2026-10-22 |
| uu-11-2008-ite | available | 38 | 2026-10-22 |
| uu-19-2016-ite | available | 21 | 2026-10-22 |
| uu-1-2024-ite | available | 39 | 2026-10-22 |
| uu-24-2004-lps | available | 107 | 2026-10-22 |
| uu-42-1999-fidusia | available | 22 | 2026-10-22 |
| uu-8-1995-pasar-modal | available | 131 | 2026-10-22 |
| uu-40-2014-perasuransian | available | 86 | 2026-10-22 |
| pojk-22-2023 | available | 131 | 2026-10-22 |
| pojk-31-2020 | available | 28 | 2026-10-22 |
| pojk-61-2020-laps | available | 32 | 2026-10-22 |
| pojk-12-2024-anti-fraud | available | 67 | 2026-10-22 |
| pojk-40-2024-lpbbti | available | 217 | 2026-10-22 |
| pojk-27-2024-akd | available | 178 | 2026-10-22 |
| pojk-23-2025 | available | 73 | 2026-10-22 |
| pbi-6-2026-pkbi | available | 57 | 2026-10-22 |
| pbi-22-23-2020-sp | available | 96 | 2026-10-22 |
| uu-4-2026-perubahan-p2sk | available | 207 | 2026-10-22 |
| pp-33-2026-pdp | failed | — | — |

## 4. Lineage
input (hash dicek `data:verify`) → ekstraksi → ETL `scripts/data/build-*.ts` → `public/data/**` (manifest + hash) → golden `tests/golden/**` → tool server.

## 4a. Sumber data live (`scripts/live-data/sources.yaml`)
Data live memperpanjang Dex setelah tanggal terakhir dataset asli, disimpan sebagai snapshot append-only ber-hash di `data/live/` dan dipublikasikan di `public/data/live/<dex>.json`; data historis tidak diubah.

| ID | Sumber | Status | Dex | Penggunaan diizinkan | Ketentuan dibaca |
|---|---|---|---|---|---|
| `ecb` | European Central Bank — Data Portal (euro foreign exchange reference rates) | enabled | rupiahdex | commercial | 2026-10-24 |
| `worldbank` | World Bank — Indicators API (World Development Indicators) | enabled | inflationdex | commercial | 2026-10-24 |
| `coingecko` | CoinGecko API | blocked-pending-license | cryptdex | per selected plan | 2026-10-24 |
| `coinmarketcap` | CoinMarketCap API | blocked-pending-license | cryptdex | unknown | belum (halaman tidak tersedia) |
| `defillama` | DefiLlama API | blocked-pending-license | cryptdex | view only without permission | 2026-10-24 |
| `fred` | FRED API (Federal Reserve Bank of St. Louis) | disabled | centralbankdex | per series owner | 2026-10-24 |
| `yahoo-finance` | Yahoo Finance | blocked-pending-license | finandex-ai | none without a licence | 2026-10-24 |

## 5. Karakteristik kualitas data (ISO/IEC 25012)
| Karakteristik | Bukti di Finandex |
|---|---|
| Akurasi | tes golden membandingkan keluaran ETL dengan nilai rujukan kit (`tests/golden/**`) |
| Kelengkapan | catatan data per Dex (`src/config/data-notes.ts`), status `partial`/`pending-data` di registry |
| Konsistensi | paritas TypeScript ↔ implementasi Python referensi (`parity.yml`) |
| Kekinian | tanggal "Data per" per Dex (`asOf`) ditampilkan di UI |
| Kredibilitas | hash SHA-256 setiap input dan dokumen regulasi |
| Kepatuhan | lisensi per Dex, mode distribusi non-komersial memblokir data NC |
