# © 2026 Dea Saka Kurnia Putra. All rights reserved.
# Parity (§15.7): run the kit Python references for every dataset present (inputs #2, #3, #30, #31 skipped while missing).
import sys, os, types, json
REPO, OUT = sys.argv[1], sys.argv[2]
sys.path.insert(0, os.path.join(REPO, "kit/reference"))
import finandex_reference as R, finandex_reference_id as RI, finandex_reference_x as RX, finandex_reference_defi as RD, finandex_reference_y as RY
X = os.path.join(REPO, "data/extracted"); I = os.path.join(REPO, "data/inputs")
gs, gm = R.run_global(f"{X}/Global_Financial_Markets_Dataset_2000-Present/global_financial_markets_2000_Now.csv", f"{REPO}/kit/reference/asset_metadata_authored.json", OUT)
RI.run_commerce(f"{X}/Global_E-Commerce_Giants_2015_2026_/Ecommerce_dataset/data", OUT)
ser = RI.run_idfin(f"{I}/Daily_Multi-Asset_Macroeconomic_and_Financial_Time_Series_Dataset_Indonesia_Global_Markets.csv", OUT)
RI.run_usdidr(f"{X}/USDIDR_daily_exchange_rate/usd_idr_daily_cleaned.csv", ser, OUT)
RI.run_reksa(f"{X}/Mutual_Fund_Reksa_Dana_Dataset_in_Indonesia/Reksadana di Indonesia.csv", OUT)
a = types.SimpleNamespace(idx_prices=f"{X}/Complete_Indonesia_Stock_Market_IDX_2000-2024/IDX 2000-2024.csv",
  idx_fin=f"{X}/Dataset_Financial_Statement_in_IDX_Indonesia/combined_financial_data_idx.csv",
  idx_ipo=f"{X}/e-IPO_Indonesia_Data_-_Investment/e-IPO Data.csv", idx_warrant=f"{X}/e-IPO_Indonesia_Data_-_Investment/Warrant - Price D1.csv",
  idx_companies=f"{X}/Indonesian_Public_Companies/idx_listed_companies.csv")
RI.run_idx(a, ser, OUT)
b = types.SimpleNamespace(crypto_prices=f"{X}/Crypto_Prices_Historical_Data", coingecko=f"{X}/Daily_Crypto_Market_Tracker_CoinGecko/crypto_daily_history.csv",
  centralbank=f"{X}/Central_Bank_Balance_Sheets__Global_Liquidity/central_bank_balance_sheets_global_liquidity_enriched.csv",
  fintech=f"{X}/Fintech_Product_Adoption_and_Reviews/fintech-product-adoption-and-reviews.csv/fintech_product_adoption_and_reviews__2026-09-08__f94b9fc2.csv",
  salary=f"{X}/Global_Salary_Data_by_Skill__Role_620k_jobs/skill_salary_percentiles_global_sample.csv",
  startup=f"{X}/Global_Startup_Funding_Rounds_2019_2026/global_startup_funding_sample.csv",
  food=f"{X}/Indonesian_Food_Delivery_Benchmark_-_10k_Menus/indonesian_food_delivery_benchmark.csv",
  companies=f"{X}/Open_Company_Database_5M_companies_2026/open_company_database_sample.csv",
  personalfinance=f"{X}/Personal_Finance_and_Financial_Independence/personal-finance-and-financial-independence.csv/personal_finance_and_financial_independence__2026-09-16__f1d77e5b.csv",
  vcnetwork=f"{X}/VC_Co-Investment_Network-_303k_Investor_Pairs/investor_coinvestment_network_sample.csv",
  vcdirectory=f"{X}/VC_Investor_Directory_2026-_35k_Startup_Investors/vc_investor_directory_sample.csv",
  housing=f"{X}/Indonesia_Affordable_Housing/indonesia_housing_dataset.csv")
RX.run_crypto(b, OUT); RX.run_cb(b, OUT); RX.run_salary(b, OUT)
RX.run_social(b.fintech, OUT, "fintech", "collected/updated 2026-09-08 (file name)")
RX.run_startup(b, OUT); RX.run_food(b, OUT); RX.run_companies(b, OUT)
RX.run_social(b.personalfinance, OUT, "personalfinance", "collected/updated 2026-09-16 (file name)")
RX.run_vcnet(b.vcnetwork, OUT); RX.run_vcdir(b.vcdirectory, OUT); RX.run_housing(b.housing, OUT)
RD.run(types.SimpleNamespace(defi=f"{X}/DeFi_Daily-_TVL_Stablecoins_DEX__Yields", fees=f"{X}/Daily_DeFi_Fees__Revenue/history.csv",
  yields=f"{X}/Daily_DeFi_Yield__TVL_Snapshots/history.csv", bots=f"{X}/Crypto_Trading_Bots__AI_Agents_Dataset_v5/dataset.csv", out=OUT))
RY.run_costliving(f"{X}/Global_City_Cost_of_Living__Quality_of_Life_Index/global_city_col_qol_index.csv", OUT)
RY.run_inflation(f"{X}/Global_Inflation__Cost_of_Living_Dataset/inflation_cost_of_living_dataset.csv", OUT)
RY.run_poverty(f"{X}/Multidimensional_Poverty_Index_MPI/MPI_193 countries_data.csv", OUT)
RY.run_ipo(f"{X}/IPO_Data_2019-2026-_India_US_UK__Global_IPOs/ipo_tracker_2019_2026_sample.csv", OUT)
RY.run_news(f"{X}/Homelessness_News_Dataset_2019-2026/data", "homelessness", "homelessness-news-sample.csv", OUT)
RY.run_news(f"{X}/Housing_News_Dataset_2019-2026/data", "housingnews", "housing-news-sample.csv", OUT)
RY.run_news(f"{X}/Population_News_Dataset_2019-2026/data", "population", "population-news-sample.csv", OUT)
print("ok")
