// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Input files (§3.1) with licence classes (§12.3). Generated from kit/manifest/input_files_manifest.json — exact file names.
import type { DexId } from './dex-registry.ts';

export interface InputFile {
  no: number;
  file: string;
  bytes: number;
  dex: DexId;
  license: string;
  commercial: 'yes' | 'no' | 'unknown';
  provider: string | null;
}

export const INPUT_FILES: readonly InputFile[] = [
  { no: 1, file: "Global_Financial_Markets_Dataset_2000-Present.zip", bytes: 3616489, dex: 'finandex-ai', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 2, file: "NASDAQ_daily_stock_prices_OHLC_prices_between_1962-01-02_till_2026-09-18_Dataset.zip", bytes: 31681188, dex: 'nasdaqdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 3, file: "S_P_500_US_Stock_Market_Data_2026_master_stock_data.csv", bytes: 255053716, dex: 'snp500dex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 4, file: "Global_E-Commerce_Giants_2015_2026_.zip", bytes: 2104283, dex: 'commercedex', license: "CC BY 4.0 (Param Pratap; teks Wikipedia CC BY-SA 4.0; World Bank CC BY 4.0)", commercial: 'yes', provider: "Param Pratap" },
  { no: 5, file: "Daily_Multi-Asset_Macroeconomic_and_Financial_Time_Series_Dataset_Indonesia_Global_Markets.csv", bytes: 563433, dex: 'idfinandex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 6, file: "Daily_Multi-Asset_Macroeconomic_and_Financial_Time_Series_Dataset__Indonesia_Global_Markets_.ipynb", bytes: 410405, dex: 'idfinandex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 7, file: "USDIDR_daily_exchange_rate.zip", bytes: 184986, dex: 'rupiahdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 8, file: "Mutual_Fund_Reksa_Dana_Dataset_in_Indonesia.zip", bytes: 8073999, dex: 'reksadex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 9, file: "Complete_Indonesia_Stock_Market_IDX_2000-2024.zip", bytes: 26606242, dex: 'idxdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 10, file: "Dataset_Financial_Statement_in_IDX_Indonesia.zip", bytes: 1825503, dex: 'idxdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 11, file: "e-IPO_Indonesia_Data_-_Investment.zip", bytes: 48113, dex: 'idxdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 12, file: "Indonesian_Public_Companies.zip", bytes: 23594, dex: 'idxdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 13, file: "DeFi_Market_Overview-_TVL__Stablecoins__Yields.ipynb", bytes: 350607, dex: 'cryptdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: "DefiLlama (as named in the notebook)" },
  { no: 14, file: "Crypto_Prices_Historical_Data.zip", bytes: 2007660, dex: 'cryptdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 15, file: "Daily_Crypto_Market_Tracker_CoinGecko.zip", bytes: 27618, dex: 'cryptdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: "CoinGecko (as named in the dataset)" },
  { no: 16, file: "Central_Bank_Balance_Sheets__Global_Liquidity.zip", bytes: 1252630, dex: 'centralbankdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: "FRED / World Bank (as stated in the dataset)" },
  { no: 17, file: "Fintech_Product_Adoption_and_Reviews.zip", bytes: 5616153, dex: 'fintechdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 18, file: "Global_Salary_Data_by_Skill__Role_620k_jobs.zip", bytes: 6560397, dex: 'salarydex', license: "CC BY-NC 4.0 (Fliar Research)", commercial: 'no', provider: "Fliar Research" },
  { no: 19, file: "Global_Startup_Funding_Rounds_2019_2026.zip", bytes: 3552198, dex: 'startupdex', license: "CC BY-NC 4.0 (Fliar Research)", commercial: 'no', provider: "Fliar Research" },
  { no: 20, file: "Indonesian_Food_Delivery_Benchmark_-_10k_Menus.zip", bytes: 1738198, dex: 'idfooddeliverydex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 21, file: "Open_Company_Database_5M_companies_2026.zip", bytes: 6308463, dex: 'opencompanydex', license: "CC BY-NC 4.0 (Fliar Research)", commercial: 'no', provider: "Fliar Research" },
  { no: 22, file: "Personal_Finance_and_Financial_Independence.zip", bytes: 14860099, dex: 'personalfinandex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 23, file: "VC_Co-Investment_Network-_303k_Investor_Pairs.zip", bytes: 4381430, dex: 'vcnetworkdex', license: "CC BY-NC 4.0 (Fliar Research)", commercial: 'no', provider: "Fliar Research" },
  { no: 24, file: "VC_Investor_Directory_2026-_35k_Startup_Investors.zip", bytes: 1124421, dex: 'vcdex', license: "CC BY-NC 4.0 (Fliar Research)", commercial: 'no', provider: "Fliar Research" },
  { no: 25, file: "Crypto_Trading_Bots__AI_Agents_Dataset_v5.zip", bytes: 113899, dex: 'cryptdex', license: "CC BY 4.0 (TelegramTrading.net)", commercial: 'yes', provider: "TelegramTrading.net" },
  { no: 26, file: "Daily_DeFi_Fees__Revenue.zip", bytes: 1249923, dex: 'cryptdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 27, file: "Daily_DeFi_Yield__TVL_Snapshots.zip", bytes: 118886, dex: 'cryptdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 28, file: "DeFi_Daily-_TVL_Stablecoins_DEX__Yields.zip", bytes: 5344293, dex: 'cryptdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: "DefiLlama (as named in the dataset)" },
  { no: 29, file: "Indonesia_Affordable_Housing.zip", bytes: 4593529, dex: 'idhousingdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 30, file: "KUHP_Lama.pdf", bytes: 431399, dex: 'mylaiwyer', license: "dokumen peraturan perundang-undangan", commercial: 'yes', provider: null },
  { no: 31, file: "UU_Nomor_20_Tahun_2025_KUHP.pdf", bytes: 13630882, dex: 'mylaiwyer', license: "dokumen peraturan perundang-undangan", commercial: 'yes', provider: null },
  { no: 32, file: "KUHAP.pdf", bytes: 233764, dex: 'mylaiwyer', license: "dokumen peraturan (kompilasi tidak resmi)", commercial: 'yes', provider: null },
  { no: 33, file: "KUHP.pdf", bytes: 233764, dex: 'mylaiwyer', license: "duplikat #32", commercial: 'yes', provider: null },
  { no: 34, file: "Undang-undang_UU_No._1_Tahun_1946_Peraturan_tentang_Hukum_Pidana.pdf", bytes: 82134, dex: 'mylaiwyer', license: "dokumen peraturan perundang-undangan", commercial: 'yes', provider: null },
  { no: 35, file: "UUD_45.pdf", bytes: 88588, dex: 'mylaiwyer', license: "dokumen peraturan perundang-undangan", commercial: 'yes', provider: null },
  { no: 36, file: "Global_City_Cost_of_Living__Quality_of_Life_Index.zip", bytes: 17651, dex: 'costlivingdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 37, file: "Global_Inflation__Cost_of_Living_Dataset.zip", bytes: 187781, dex: 'inflationdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 38, file: "Homelessness_News_Dataset_2019-2026.zip", bytes: 2931258, dex: 'homelessnessdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: "Fliar BI (Prism News API)" },
  { no: 39, file: "Housing_News_Dataset_2019-2026.zip", bytes: 4634979, dex: 'housingdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: "Fliar BI (Prism News API)" },
  { no: 40, file: "IPO_Data_2019-2026-_India_US_UK__Global_IPOs.zip", bytes: 1427412, dex: 'ipodex', license: "CC BY-NC 4.0 (Fliar Research)", commercial: 'no', provider: "Fliar Research" },
  { no: 41, file: "Multidimensional_Poverty_Index_MPI.zip", bytes: 28005, dex: 'povertydex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: null },
  { no: 42, file: "Population_News_Dataset_2019-2026.zip", bytes: 1815972, dex: 'populationdex', license: "tidak dicantumkan dalam file", commercial: 'unknown', provider: "Fliar BI (Prism News API)" },
];

export function inputsForDex(dex: DexId): InputFile[] {
  return INPUT_FILES.filter((f) => f.dex === dex);
}
