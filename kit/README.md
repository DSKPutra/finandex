# Finandex Build Kit

© 2026 Dea Saka Kurnia Putra. All rights reserved.

Kit ini menyertai `FINANDEX_MASTER_PROMPT.md`. Unggah ke Claude Code **bersamaan** dengan 42 file dataset yang disebut di §3.1 prompt (total 43 file).

| Folder / file | Isi |
|---|---|
| `FINANDEX_MASTER_PROMPT.md` | Prompt master one-shot (salinan) |
| `manifest/input_files_manifest.json` | Nama persis, ukuran byte, SHA-256, dan isi zip untuk 42 file dataset |
| `manifest/kit_files.sha256` | Checksum semua file di kit (verifikasi: `cd kit && sha256sum -c manifest/kit_files.sha256`) |
| `reference/finandex_reference.py` | Spesifikasi eksekusi: Finandex AI (global), NASDAQDex, SnP500Dex |
| `reference/finandex_reference_id.py` | CommerceDex, IDFinanDex, RupiahDex, ReksaDex, IDXDex |
| `reference/finandex_reference_x.py` | CryptDex (harga & snapshot), CentralBankDex, FintechDex, PersonalFinanDex, SalaryDex, StartupDex, IDFoodDeliveryDex, OpenCompanyDex, VCNetworkDex, VCDex, IDHousingDex |
| `reference/finandex_reference_defi.py` | CryptDex sub-modul: DeFi, Fees & Revenue, Yield, Trading Bots |
| `reference/finandex_reference_y.py` | IPODex, InflationDex, CostLivingDex, PovertyDex, PopulationDex, HomelessnessDex, HousingDex |
| `reference/finandex_reference_law.py` | My LAIwyer (UUD 1945, KUHAP 1981, KUHAP 2025, UU 1/1946) — butuh `pdftotext` (poppler) |
| `reference/make_eval.py` | Membangkitkan `golden/chatbot_eval.json` dari golden fixtures |
| `reference/asset_metadata_authored.json` | Metadata 34 aset global (nama ID/EN, negara, wilayah, satuan, kalender) |
| `golden/<modul>/` | Nilai benar hasil reference implementation atas dataset asli — dipakai golden test aplikasi |
| `golden/chatbot_eval.json` | 128 pertanyaan evaluasi chatbot (27 Dex) + nilai yang diharapkan |
| `brand/` | Logo personal Dea Saka Kurnia Putra: asli + versi transparan terang/gelap; `_logo_preview.png` |
| `brand/icons/` | 28 ikon (aplikasi Finandex + 27 Dex): SVG sumber + PNG 1024/512/192; `_family_preview.png` |
| `brand/make_icons.py` | Generator keluarga ikon (untuk membuat ikon Dex baru dengan gaya yang sama; butuh Playwright) |
| `templates/ADD_NEW_DEX_PROMPT.md` | Template prompt untuk menambah Dex chatbot baru |

## Menjalankan ulang reference (Python 3.12 + pandas + numpy + pyarrow, poppler-utils)

Ekstrak setiap zip ke foldernya sendiri di `data/extracted/<nama-zip>/` (dua zip berisi `history.csv`), lalu dari root repo:

```bash
X=data/extracted
python3 -I kit/reference/finandex_reference.py \
  --global "$X/Global_Financial_Markets_Dataset_2000-Present/global_financial_markets_2000_Now.csv" \
  --nasdaq "$X/NASDAQ_daily_stock_prices_OHLC_prices_between_1962-01-02_till_2026-09-18_Dataset" \
  --sp500  "data/inputs/S_P_500_US_Stock_Market_Data_2026_master_stock_data.csv" \
  --meta kit/reference/asset_metadata_authored.json --out /tmp/golden
python3 -I kit/reference/finandex_reference_id.py \
  --ecom "$X/Global_E-Commerce_Giants_2015_2026_/Ecommerce_dataset/data" \
  --idfin "data/inputs/Daily_Multi-Asset_Macroeconomic_and_Financial_Time_Series_Dataset_Indonesia_Global_Markets.csv" \
  --usdidr "$X/USDIDR_daily_exchange_rate/usd_idr_daily_cleaned.csv" \
  --reksa "$X/Mutual_Fund_Reksa_Dana_Dataset_in_Indonesia/Reksadana di Indonesia.csv" \
  --idx-prices "$X/Complete_Indonesia_Stock_Market_IDX_2000-2024/IDX 2000-2024.csv" \
  --idx-fin "$X/Dataset_Financial_Statement_in_IDX_Indonesia/combined_financial_data_idx.csv" \
  --idx-ipo "$X/e-IPO_Indonesia_Data_-_Investment/e-IPO Data.csv" --idx-warrant "$X/e-IPO_Indonesia_Data_-_Investment/Warrant - Price D1.csv" \
  --idx-companies "$X/Indonesian_Public_Companies/idx_listed_companies.csv" --out /tmp/golden
python3 -I kit/reference/finandex_reference_x.py \
  --crypto-prices "$X/Crypto_Prices_Historical_Data" --coingecko "$X/Daily_Crypto_Market_Tracker_CoinGecko/crypto_daily_history.csv" \
  --centralbank "$X/Central_Bank_Balance_Sheets__Global_Liquidity/central_bank_balance_sheets_global_liquidity_enriched.csv" \
  --fintech "$X/Fintech_Product_Adoption_and_Reviews/fintech-product-adoption-and-reviews.csv/fintech_product_adoption_and_reviews__2026-09-08__f94b9fc2.csv" \
  --salary "$X/Global_Salary_Data_by_Skill__Role_620k_jobs/skill_salary_percentiles_global_sample.csv" \
  --startup "$X/Global_Startup_Funding_Rounds_2019_2026/global_startup_funding_sample.csv" \
  --food "$X/Indonesian_Food_Delivery_Benchmark_-_10k_Menus/indonesian_food_delivery_benchmark.csv" \
  --companies "$X/Open_Company_Database_5M_companies_2026/open_company_database_sample.csv" \
  --personalfinance "$X/Personal_Finance_and_Financial_Independence/personal-finance-and-financial-independence.csv/personal_finance_and_financial_independence__2026-09-16__f1d77e5b.csv" \
  --vcnetwork "$X/VC_Co-Investment_Network-_303k_Investor_Pairs/investor_coinvestment_network_sample.csv" \
  --vcdirectory "$X/VC_Investor_Directory_2026-_35k_Startup_Investors/vc_investor_directory_sample.csv" \
  --housing "$X/Indonesia_Affordable_Housing/indonesia_housing_dataset.csv" --out /tmp/golden
python3 -I kit/reference/finandex_reference_defi.py \
  --defi "$X/DeFi_Daily-_TVL_Stablecoins_DEX__Yields" --fees "$X/Daily_DeFi_Fees__Revenue/history.csv" \
  --yields "$X/Daily_DeFi_Yield__TVL_Snapshots/history.csv" --bots "$X/Crypto_Trading_Bots__AI_Agents_Dataset_v5/dataset.csv" --out /tmp/golden
python3 -I kit/reference/finandex_reference_y.py \
  --costliving "$X/Global_City_Cost_of_Living__Quality_of_Life_Index/global_city_col_qol_index.csv" \
  --inflation "$X/Global_Inflation__Cost_of_Living_Dataset/inflation_cost_of_living_dataset.csv" \
  --poverty "$X/Multidimensional_Poverty_Index_MPI/MPI_193 countries_data.csv" \
  --ipo "$X/IPO_Data_2019-2026-_India_US_UK__Global_IPOs/ipo_tracker_2019_2026_sample.csv" \
  --homelessness "$X/Homelessness_News_Dataset_2019-2026/data" --housingnews "$X/Housing_News_Dataset_2019-2026/data" \
  --population "$X/Population_News_Dataset_2019-2026/data" --out /tmp/golden
python3 -I kit/reference/finandex_reference_law.py --pdf-dir data/inputs --out /tmp/golden
python3 -I kit/reference/make_eval.py /tmp/golden "$X/Global_Financial_Markets_Dataset_2000-Present/global_financial_markets_2000_Now.csv"
diff -r /tmp/golden kit/golden && echo "golden identical"
```

Catatan: sesuaikan path folder hasil ekstrak bila struktur zip menyimpan subfolder (lihat `zip_members_sample` di manifest).
