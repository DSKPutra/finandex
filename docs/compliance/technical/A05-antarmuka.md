# A05 — Spesifikasi antarmuka

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

| Kontrol dokumen | |
|---|---|
| ID dokumen | A05 |
| Judul | Spesifikasi antarmuka |
| Versi | 0.1.0 (= versi aplikasi) · commit `ae7d11b` |
| Tanggal | 2026-10-24 |
| Status | Draf |
| Klasifikasi | Internal |
| Pemilik | Dea Saka Kurnia Putra |
| Penyusun | Dibangkitkan oleh `scripts/compliance/*` (Claude Code) dari sumber kebenaran repo |
| Penyetuju | [KONFIRMASI] — penyetuju dokumen belum ditetapkan |
| Lingkup | API HTTP, event SSE, tool, kontrak data |
| Standar acuan | ISO/IEC/IEEE 15289:2019 (interface description); OpenAPI 3.1 |
| Dokumen terkait | A04 |

**Riwayat perubahan**

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1.0 | 2026-10-24 | Versi pertama, dibangkitkan dari sumber kebenaran repo. |

## 1. API HTTP
OpenAPI 3.1 (kerangka dibangkitkan dari `server/handler.ts`): [`openapi.json`](openapi.json). Skema isi permintaan didefinisikan dengan zod di `src/shared/chat-protocol.ts`.

| Metode | Rute |
|---|---|
| GET | `/api/health` |
| GET | `/api/version` |
| GET | `/api/dex` |
| POST | `/api/feedback` |
| POST | `/api/chat` |

## 2. Event SSE
Jenis event yang didefinisikan di protokol: .

## 3. Tool per Dex
| Dex | Tool | Deskripsi |
|---|---|---|
| Finandex AI | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| Finandex AI | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| Finandex AI | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| Finandex AI | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| Finandex AI | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| Finandex AI | `search_entities` | Find asset ids in this dataset by code or name (accent/case-insensitive). Use before other tools when you are unsure of the exact id. |
| Finandex AI | `get_snapshot` | Latest metrics of one asset: last value and date, returns 1D–MAX, CAGR, volatility, max drawdown, 52W high/low, ATH, quality flags, and descriptors. Use for "ho |
| Finandex AI | `get_history` | Price history of one asset between optional dates (≤ 400 points, with chart). Use for trends over time and "what happened on/around a date". |
| Finandex AI | `compare` | Compare 2–5 assets: rebased-to-100 chart over a common window plus a metric table (period return, CAGR, volatility, max drawdown). Period defaults to the datase |
| Finandex AI | `calendar_returns` | Calendar-year returns of one asset (first and current years flagged partial), with heatmap. Use for "return in year X" or year-by-year questions. |
| Finandex AI | `rank` | Rank assets by a metric from the catalogue (e.g. ret_1D…ret_MAX, cagr_5Y, vol_1Y, mdd, pct_from_ath, plus Dex-specific fields). Optional filter on one categoric |
| Finandex AI | `correlation` | Correlation matrix of daily returns for 2–8 assets over 1, 3, or 5 years (prices aligned on common dates first), with heatmap. |
| Finandex AI | `drawdowns` | Largest drawdown episodes (peak, trough, recovery date or null) of one asset, with underwater chart. |
| Finandex AI | `extreme_moves` | Largest daily moves (close-to-close) of one asset, optionally within dates and by direction. Dates are as recorded in the dataset. |
| Finandex AI | `event_window` | Price behaviour around a dated event: return from the last close before the event to the window end (default −5 to +20 trading days), with the low point inside  |
| Finandex AI | `cross_dex_lookup` | Suggest which Finandex Dex holds data for a topic this dataset does not cover (e.g. IHSG, USD/IDR, Indonesian stocks, dividends, DeFi, central banks, law). Retu |
| NASDAQDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| NASDAQDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| NASDAQDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| NASDAQDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| NASDAQDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| NASDAQDex | `search_entities` | Find stock ids in this dataset by code or name (accent/case-insensitive). Use before other tools when you are unsure of the exact id. |
| NASDAQDex | `get_snapshot` | Latest metrics of one stock: last value and date, returns 1D–MAX, CAGR, volatility, max drawdown, 52W high/low, ATH, quality flags, and descriptors. Use for "ho |
| NASDAQDex | `get_history` | Price history of one stock between optional dates (≤ 400 points, with chart). Use for trends over time and "what happened on/around a date". |
| NASDAQDex | `compare` | Compare 2–5 stocks: rebased-to-100 chart over a common window plus a metric table (period return, CAGR, volatility, max drawdown). Period defaults to the datase |
| NASDAQDex | `calendar_returns` | Calendar-year returns of one stock (first and current years flagged partial), with heatmap. Use for "return in year X" or year-by-year questions. |
| NASDAQDex | `rank` | Rank stocks by a metric from the catalogue (e.g. ret_1D…ret_MAX, cagr_5Y, vol_1Y, mdd, pct_from_ath, plus Dex-specific fields). Optional filter on one categoric |
| NASDAQDex | `correlation` | Correlation matrix of daily returns for 2–8 stocks over 1, 3, or 5 years (prices aligned on common dates first), with heatmap. |
| NASDAQDex | `drawdowns` | Largest drawdown episodes (peak, trough, recovery date or null) of one stock, with underwater chart. |
| NASDAQDex | `extreme_moves` | Largest daily moves (close-to-close) of one stock, optionally within dates and by direction. Dates are as recorded in the dataset. |
| NASDAQDex | `pulse` | Universe breadth as of the last date: advancers/decliners, % of stocks above SMA200 (eligible count), new 52-week highs/lows, and the survivorship-biased equal- |
| NASDAQDex | `technical` | Descriptive technicals of one ticker: SMA50, SMA200, RSI14 (Wilder), and the most recent golden/death cross within the last 60 rows, with price + SMA chart. Des |
| NASDAQDex | `beta` | Beta of one ticker versus ^IXIC over 1, 3, or 5 years (prices aligned on common dates first; min 120 returns). |
| NASDAQDex | `growth_lab` | Top tickers by long-run growth metrics: multiple_MAX (end ÷ start over the analysis window), cagr_5Y, cagr_10Y, or pct_from_ath (closest to all-time high). |
| NASDAQDex | `period_rank` | Rank all tickers by return over any custom period (start → end), computed from the source-adjusted close matrix (close on/before each date). |
| SnP500Dex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| SnP500Dex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| SnP500Dex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| SnP500Dex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| SnP500Dex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| SnP500Dex | `search_entities` | Find stock ids in this dataset by code or name (accent/case-insensitive). Use before other tools when you are unsure of the exact id. |
| SnP500Dex | `get_snapshot` | Latest metrics of one stock: last value and date, returns 1D–MAX, CAGR, volatility, max drawdown, 52W high/low, ATH, quality flags, and descriptors. Use for "ho |
| SnP500Dex | `get_history` | Price history of one stock between optional dates (≤ 400 points, with chart). Use for trends over time and "what happened on/around a date". |
| SnP500Dex | `compare` | Compare 2–5 stocks: rebased-to-100 chart over a common window plus a metric table (period return, CAGR, volatility, max drawdown). Period defaults to the datase |
| SnP500Dex | `calendar_returns` | Calendar-year returns of one stock (first and current years flagged partial), with heatmap. Use for "return in year X" or year-by-year questions. |
| SnP500Dex | `rank` | Rank stocks by a metric from the catalogue (e.g. ret_1D…ret_MAX, cagr_5Y, vol_1Y, mdd, pct_from_ath, plus Dex-specific fields). Optional filter on one categoric |
| SnP500Dex | `correlation` | Correlation matrix of daily returns for 2–8 stocks over 1, 3, or 5 years (prices aligned on common dates first), with heatmap. |
| SnP500Dex | `drawdowns` | Largest drawdown episodes (peak, trough, recovery date or null) of one stock, with underwater chart. |
| SnP500Dex | `extreme_moves` | Largest daily moves (close-to-close) of one stock, optionally within dates and by direction. Dates are as recorded in the dataset. |
| SnP500Dex | `pulse` | Universe breadth as of the last date: advancers/decliners, % of stocks above SMA200 (eligible count), new 52-week highs/lows, and the survivorship-biased equal- |
| SnP500Dex | `technical` | Descriptive technicals of one ticker: SMA50, SMA200, RSI14 (Wilder), and the most recent golden/death cross within the last 60 rows, with price + SMA chart. Des |
| SnP500Dex | `beta` | Beta of one ticker versus ^GSPC over 1, 3, or 5 years (prices aligned on common dates first; min 120 returns). |
| SnP500Dex | `growth_lab` | Top tickers by long-run growth metrics: multiple_MAX (end ÷ start over the analysis window), cagr_5Y, cagr_10Y, or pct_from_ath (closest to all-time high). |
| SnP500Dex | `period_rank` | Rank all tickers by return over any custom period (start → end), computed from the Adj Close (total return) matrix (close on/before each date). |
| SnP500Dex | `dividends` | Dividend profile of one ticker: TTM dividends and yield, annual dividends per calendar year, increase streak, 5Y/10Y dividend CAGR, last dividend. Special divid |
| SnP500Dex | `splits` | Stock split history (date and ratio) of one ticker, from the dataset Stock Splits column. |
| SnP500Dex | `volume_profile` | Liquidity of one ticker: average volume 20 days and 3 months, average traded value (close × volume) 20 days, with recent volume chart. Volume 0 means not availa |
| SnP500Dex | `simulate_investment` | Historical simulation of investing an amount (USD) in one ticker from a start date to the last date, with dividend reinvestment (Adj Close) or without (shares × |
| SnP500Dex | `total_vs_price_return` | Total return (Adj Close, dividends reinvested) versus price return (Close) of one ticker over a period. |
| CommerceDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| CommerceDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| CommerceDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| CommerceDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| CommerceDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| CommerceDex | `search_entities` | Find company ids in this dataset by code or name (accent/case-insensitive). Use before other tools when you are unsure of the exact id. |
| CommerceDex | `get_snapshot` | Latest metrics of one company: last value and date, returns 1D–MAX, CAGR, volatility, max drawdown, 52W high/low, ATH, quality flags, and descriptors. Use for " |
| CommerceDex | `get_history` | Price history of one company between optional dates (≤ 400 points, with chart). Use for trends over time and "what happened on/around a date". |
| CommerceDex | `compare` | Compare 2–5 companys: rebased-to-100 chart over a common window plus a metric table (period return, CAGR, volatility, max drawdown). Period defaults to the data |
| CommerceDex | `calendar_returns` | Calendar-year returns of one company (first and current years flagged partial), with heatmap. Use for "return in year X" or year-by-year questions. |
| CommerceDex | `rank` | Rank companys by a metric from the catalogue (e.g. ret_1D…ret_MAX, cagr_5Y, vol_1Y, mdd, pct_from_ath, plus Dex-specific fields). Optional filter on one categor |
| CommerceDex | `correlation` | Correlation matrix of daily returns for 2–8 companys over 1, 3, or 5 years (prices aligned on common dates first), with heatmap. |
| CommerceDex | `drawdowns` | Largest drawdown episodes (peak, trough, recovery date or null) of one company, with underwater chart. |
| CommerceDex | `extreme_moves` | Largest daily moves (close-to-close) of one company, optionally within dates and by direction. Dates are as recorded in the dataset. |
| CommerceDex | `company_profile` | Company profile: name, ticker, exchange, country, region, segment, founded date, HQ, founders, website, Wikipedia extract (CC BY-SA 4.0 with link), price and fi |
| CommerceDex | `financials` | Annual financial statements of one company for chosen fields (e.g. total_revenue, net_income, operating_income, free_cash_flow), with the statement currency and |
| CommerceDex | `peer_compare` | Median of a metric (e.g. ret_1Y, ret_YTD, vol_1Y, mdd, fin_net_margin) across companies grouped by segment, region, or country, plus the members. |
| CommerceDex | `index_compare` | One company versus the dataset-provided e-commerce index (equal-weight, base 100 on 2015-01-05), both rebased to 100 on the first common date. Also gives index  |
| CommerceDex | `macro` | World Bank macro indicator for one country (13 countries, 2010–2025): e.g. internet_users_pct, account_ownership_pct_adult, gdp_per_capita_usd. Returns the year |
| IPODex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| IPODex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| IPODex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| IPODex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| IPODex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| IPODex | `ipo_summary` | IPO counts (and total/median issue size in USD) grouped by year, country, exchange, board, sector, ipo_type, or listing_status, with filters. amount_status=veri |
| IPODex | `ipo_search` | Search IPOs by company name or ticker, with filters. |
| IPODex | `ipo_size_stats` | Issue-size statistics (USD, verified amounts): count, median, total, p25/p75, with filters. |
| IPODex | `india_sme_vs_mainboard` | India IPOs split by board (SME vs Mainboard): counts and verified median size, optionally for one year. |
| IPODex | `withdrawn_ipos` | IPOs whose listing_status is not Completed (e.g. withdrawn, postponed, announced, filed), counts by status and examples, with filters. |
| IDFinanDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| IDFinanDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| IDFinanDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| IDFinanDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| IDFinanDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| IDFinanDex | `search_entities` | Find asset ids in this dataset by code or name (accent/case-insensitive). Use before other tools when you are unsure of the exact id. |
| IDFinanDex | `get_snapshot` | Latest metrics of one asset: last value and date, returns 1D–MAX, CAGR, volatility, max drawdown, 52W high/low, ATH, quality flags, and descriptors. Use for "ho |
| IDFinanDex | `get_history` | Price history of one asset between optional dates (≤ 400 points, with chart). Use for trends over time and "what happened on/around a date". |
| IDFinanDex | `compare` | Compare 2–5 assets: rebased-to-100 chart over a common window plus a metric table (period return, CAGR, volatility, max drawdown). Period defaults to the datase |
| IDFinanDex | `calendar_returns` | Calendar-year returns of one asset (first and current years flagged partial), with heatmap. Use for "return in year X" or year-by-year questions. |
| IDFinanDex | `rank` | Rank assets by a metric from the catalogue (e.g. ret_1D…ret_MAX, cagr_5Y, vol_1Y, mdd, pct_from_ath, plus Dex-specific fields). Optional filter on one categoric |
| IDFinanDex | `correlation` | Correlation matrix of daily returns for 2–8 assets over 1, 3, or 5 years (prices aligned on common dates first), with heatmap. |
| IDFinanDex | `drawdowns` | Largest drawdown episodes (peak, trough, recovery date or null) of one asset, with underwater chart. |
| IDFinanDex | `extreme_moves` | Largest daily moves (close-to-close) of one asset, optionally within dates and by direction. Dates are as recorded in the dataset. |
| IDFinanDex | `macro_series` | Step series of a macro indicator: CPI (annual inflation rate in %, one value per year), BI_rate (Bank Indonesia policy rate %), US_rate (US policy rate %), opti |
| IDFinanDex | `rate_decisions` | BI rate changes (date and new level in %) between optional dates, plus the current level and the date it took effect. |
| IDFinanDex | `rate_differential` | Latest BI rate minus latest US rate (percentage points), and BI rate minus latest annual CPI inflation (approximate real rate). |
| IDFinanDex | `regime_returns` | Average daily return (and count of days) of one market series (IHSG, USDIDR, GOLD, OIL, SP500, VIX) split by regime: BI rate direction (rising / falling / uncha |
| IDFinanDex | `normalized_trend` | Several market series (IHSG, USDIDR, GOLD, OIL, SP500, VIX) rebased to 100 from a start date on a common chart. |
| RupiahDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| RupiahDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| RupiahDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| RupiahDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| RupiahDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| RupiahDex | `search_entities` | Find rate ids in this dataset by code or name (accent/case-insensitive). Use before other tools when you are unsure of the exact id. |
| RupiahDex | `get_snapshot` | Latest metrics of one rate: last value and date, returns 1D–MAX, CAGR, volatility, max drawdown, 52W high/low, ATH, quality flags, and descriptors. Use for "how |
| RupiahDex | `get_history` | Price history of one rate between optional dates (≤ 400 points, with chart). Use for trends over time and "what happened on/around a date". |
| RupiahDex | `compare` | Compare 2–5 rates: rebased-to-100 chart over a common window plus a metric table (period return, CAGR, volatility, max drawdown). Period defaults to the dataset |
| RupiahDex | `calendar_returns` | Calendar-year returns of one rate (first and current years flagged partial), with heatmap. Use for "return in year X" or year-by-year questions. |
| RupiahDex | `rank` | Rank rates by a metric from the catalogue (e.g. ret_1D…ret_MAX, cagr_5Y, vol_1Y, mdd, pct_from_ath, plus Dex-specific fields). Optional filter on one categorica |
| RupiahDex | `correlation` | Correlation matrix of daily returns for 2–8 rates over 1, 3, or 5 years (prices aligned on common dates first), with heatmap. |
| RupiahDex | `drawdowns` | Largest drawdown episodes (peak, trough, recovery date or null) of one rate, with underwater chart. |
| RupiahDex | `extreme_moves` | Largest daily moves (close-to-close) of one rate, optionally within dates and by direction. Dates are as recorded in the dataset. |
| RupiahDex | `fx_on_date` | USD/IDR close on a date (last observation on/before that date, after bad-print cleaning). |
| RupiahDex | `convert` | Historical conversion between USD and IDR using the USD/IDR close on/before a date. Educational; not a dealing rate. |
| RupiahDex | `yearly_average` | Average USD/IDR per calendar year (mean of daily closes), for one year or all years. |
| RupiahDex | `change` | Change of USD/IDR between two dates (positive = rupiah weakened), plus the high and low in between. |
| RupiahDex | `compare_sources` | Cross-check of this USD/IDR dataset against the USDIDR column of the IDFinanDex dataset on overlapping days: overlap, maximum absolute difference, days with >1% |
| RupiahDex | `event_window` | Price behaviour around a dated event: return from the last close before the event to the window end (default −5 to +20 trading days), with the low point inside  |
| RupiahDex | `live_latest` | Latest live data after the original dataset ends (validated snapshots from a registered open-data source): as-of date, source, switch date, flags. rupiahdex: US |
| IDXDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| IDXDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| IDXDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| IDXDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| IDXDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| IDXDex | `search_entities` | Find stock ids in this dataset by code or name (accent/case-insensitive). Use before other tools when you are unsure of the exact id. |
| IDXDex | `get_snapshot` | Latest metrics of one stock: last value and date, returns 1D–MAX, CAGR, volatility, max drawdown, 52W high/low, ATH, quality flags, and descriptors. Use for "ho |
| IDXDex | `get_history` | Price history of one stock between optional dates (≤ 400 points, with chart). Use for trends over time and "what happened on/around a date". |
| IDXDex | `compare` | Compare 2–5 stocks: rebased-to-100 chart over a common window plus a metric table (period return, CAGR, volatility, max drawdown). Period defaults to the datase |
| IDXDex | `calendar_returns` | Calendar-year returns of one stock (first and current years flagged partial), with heatmap. Use for "return in year X" or year-by-year questions. |
| IDXDex | `rank` | Rank stocks by a metric from the catalogue (e.g. ret_1D…ret_MAX, cagr_5Y, vol_1Y, mdd, pct_from_ath, plus Dex-specific fields). Optional filter on one categoric |
| IDXDex | `correlation` | Correlation matrix of daily returns for 2–8 stocks over 1, 3, or 5 years (prices aligned on common dates first), with heatmap. |
| IDXDex | `drawdowns` | Largest drawdown episodes (peak, trough, recovery date or null) of one stock, with underwater chart. |
| IDXDex | `extreme_moves` | Largest daily moves (close-to-close) of one stock, optionally within dates and by direction. Dates are as recorded in the dataset. |
| IDXDex | `company_profile` | Issuer directory entry: code, name, listing date (from the IDX listed-companies file), IDX profile link, plus last price and date. |
| IDXDex | `fundamentals` | Latest-FY fundamentals of one ticker: revenue, net income, total assets, equity, liabilities, EPS, shares, FCF by year (2020–2023), and ROE, NPM, DER. |
| IDXDex | `valuation` | Valuation of one ticker at the last price (2024-05-17): PER (price ÷ latest-FY EPS), PBV, market capitalisation (price × shares). |
| IDXDex | `screen_fundamentals` | Screen stocks by fundamental thresholds (null = no filter): roe_min, per_max, pbv_max, npm_min, der_max, market_cap_min_idr. Results sorted by market cap. |
| IDXDex | `beta_vs_ihsg` | Beta of one stock versus IHSG over 3 years (Adj Close returns aligned with the IDFinanDex IHSG series; min 120 returns). |
| IDXDex | `liquidity` | Liquidity of one stock: average traded value (close × volume) over the last 20 days in IDR, share of zero-volume days in the last year, with volume chart. |
| IDXDex | `ipo_list` | List e-IPO records with optional filters: status (Closed, Canceled, …), year (listing year), sector, board, participant_admin (substring). |
| IDXDex | `ipo_stats` | IPO statistics for Closed IPOs: overall median/mean day-1 return and share positive, plus counts and median D1 grouped by year, sector, board, participant_admin |
| IDXDex | `ipo_detail` | Full e-IPO record of one ticker (status, sector, board, offering details, book-building range, final price, returns D1–D7, warrant terms). |
| ReksaDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| ReksaDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| ReksaDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| ReksaDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| ReksaDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| ReksaDex | `search_entities` | Find fund ids in this dataset by code or name (accent/case-insensitive). Use before other tools when you are unsure of the exact id. |
| ReksaDex | `get_snapshot` | Latest metrics of one fund: last value and date, returns 1D–MAX, CAGR, volatility, max drawdown, 52W high/low, ATH, quality flags, and descriptors. Use for "how |
| ReksaDex | `get_history` | Price history of one fund between optional dates (≤ 400 points, with chart). Use for trends over time and "what happened on/around a date". |
| ReksaDex | `compare` | Compare 2–5 funds: rebased-to-100 chart over a common window plus a metric table (period return, CAGR, volatility, max drawdown). Period defaults to the dataset |
| ReksaDex | `calendar_returns` | Calendar-year returns of one fund (first and current years flagged partial), with heatmap. Use for "return in year X" or year-by-year questions. |
| ReksaDex | `rank` | Rank funds by a metric from the catalogue (e.g. ret_1D…ret_MAX, cagr_5Y, vol_1Y, mdd, pct_from_ath, plus Dex-specific fields). Optional filter on one categorica |
| ReksaDex | `correlation` | Correlation matrix of daily returns for 2–8 funds over 1, 3, or 5 years (prices aligned on common dates first), with heatmap. |
| ReksaDex | `drawdowns` | Largest drawdown episodes (peak, trough, recovery date or null) of one fund, with underwater chart. |
| ReksaDex | `extreme_moves` | Largest daily moves (close-to-close) of one fund, optionally within dates and by direction. Dates are as recorded in the dataset. |
| ReksaDex | `industry_overview` | Industry snapshot at the latest month: total AUM (IDR), active funds, AUM and count by fund type, AUM by denomination, top managers and custodians, median 1Y re |
| ReksaDex | `aum_trend` | Monthly AUM trend (IDR): total, by fund type, by denomination (ccy), or for the top 15 managers (mi), between optional dates. |
| ReksaDex | `fund_search` | Search active funds by name (accent/case-insensitive), optionally filtered by fund type or manager. |
| ReksaDex | `fund_detail` | One fund: manager, custodian, type, currency, AUM, NAV/unit, monthly returns 1M/YTD/1Y/3Y, annualised monthly volatility, extreme months, with NAV/unit chart. |
| ReksaDex | `rank_funds` | Rank active funds by aum, ret_1M, ret_YTD, ret_1Y, ret_3Y, or vol_1Y, optionally filtered by type, manager, or currency (IDR/USD). |
| ReksaDex | `mi_leaderboard` | Investment managers ranked by AUM, market share, or number of active funds at the latest month. |
| ReksaDex | `custodian_share` | Custodian banks by AUM held and share of total at the latest month. |
| ReksaDex | `fund_return_usd` | A fund's 1Y and 3Y NAV/unit returns converted to USD using RupiahDex month-end USD/IDR closes (cross-dataset; approximate). |
| CryptDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| CryptDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| CryptDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| CryptDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| CryptDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| CryptDex | `search_entities` | Find coin ids in this dataset by code or name (accent/case-insensitive). Use before other tools when you are unsure of the exact id. |
| CryptDex | `get_snapshot` | Latest metrics of one coin: last value and date, returns 1D–MAX, CAGR, volatility, max drawdown, 52W high/low, ATH, quality flags, and descriptors. Use for "how |
| CryptDex | `get_history` | Price history of one coin between optional dates (≤ 400 points, with chart). Use for trends over time and "what happened on/around a date". |
| CryptDex | `compare` | Compare 2–5 coins: rebased-to-100 chart over a common window plus a metric table (period return, CAGR, volatility, max drawdown). Period defaults to the dataset |
| CryptDex | `calendar_returns` | Calendar-year returns of one coin (first and current years flagged partial), with heatmap. Use for "return in year X" or year-by-year questions. |
| CryptDex | `rank` | Rank coins by a metric from the catalogue (e.g. ret_1D…ret_MAX, cagr_5Y, vol_1Y, mdd, pct_from_ath, plus Dex-specific fields). Optional filter on one categorica |
| CryptDex | `correlation` | Correlation matrix of daily returns for 2–8 coins over 1, 3, or 5 years (prices aligned on common dates first), with heatmap. |
| CryptDex | `drawdowns` | Largest drawdown episodes (peak, trough, recovery date or null) of one coin, with underwater chart. |
| CryptDex | `extreme_moves` | Largest daily moves (close-to-close) of one coin, optionally within dates and by direction. Dates are as recorded in the dataset. |
| CryptDex | `market_snapshot` | CoinGecko single-day snapshot of the top 250 coins: total market cap, BTC/ETH dominance, stablecoin market cap and share (heuristic), top 10 by market cap, top  |
| CryptDex | `coin_lookup` | Look up a coin in the 250-coin snapshot by symbol or name: price, market cap & rank, volume, 1h/24h/7d/30d change (percent units), supply, ATH/ATL. |
| CryptDex | `rank_snapshot` | Rank snapshot coins by market_cap, price_change_pct_24h, price_change_pct_7d, price_change_pct_30d, or ath_change_pct (percent units), optionally only the top 1 |
| CryptDex | `supply_info` | Supply data of one coin from the snapshot: circulating, total and max supply (null = no fixed max), fully diluted valuation. |
| CryptDex | `defi_overview` | DeFi headline numbers: total TVL (latest, ATH and date, % of ATH, 1Y/YTD change), stablecoin supply (latest, ATH), stablecoin-to-TVL ratio, and the protocol dou |
| CryptDex | `defi_tvl_history` | Daily DeFi TVL history (USD) between optional dates. |
| CryptDex | `chain_tvl` | Chain TVL: latest TVL and share for all chains (top 15), or the daily history of one chain. |
| CryptDex | `protocols` | Largest DeFi protocols by TVL (excluding CEX by default), optionally filtered by category or chain; plus TVL by category. Sums double-count. |
| CryptDex | `stablecoins` | Largest USD-pegged stablecoins by circulating supply with share of total supply, and counts by peg mechanism (DefiLlama). |
| CryptDex | `dex_activity` | Monthly DEX volume and fees (USD); the last month is incomplete. Includes the last complete month and the record month. |
| CryptDex | `yield_pools` | Yield pools from the latest DefiLlama snapshot with filters (stablecoin only, chain, project, minimum TVL): median and p90 APY (percent units) and the largest p |
| CryptDex | `fees_revenue` | Protocol fees (USD, 24h) and protocol revenue from the latest fees snapshot (deduplicated by name+date), grouped by protocol or category. |
| CryptDex | `fees_trend` | Daily 24h fees and revenue of one protocol across the fee snapshots (about one month). |
| CryptDex | `bots_kb` | Search the trading-bot knowledge base (bot/chain profiles, verified facts, Q&A, real-capital tests, LLM consensus) and return counts. Educational only; never re |
| CryptDex | `security_checklist` | Finandex safety checklist for crypto bots and DeFi (editorial). Use whenever bots, yields, wallets, seed phrases, or private keys come up. |
| CentralBankDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| CentralBankDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| CentralBankDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| CentralBankDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| CentralBankDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| CentralBankDex | `balance_sheets` | Total assets of the Fed (USD million), ECB (EUR million), BoJ (JPY 100 million), or G3 combined (USD trillion): latest value, peak and date, and history between |
| CentralBankDex | `us_rates` | US series: policy rate, 10Y Treasury yield, 10Y−2Y spread (percentage points), CPI YoY inflation, or M2 (USD billion): latest and history. |
| CentralBankDex | `yield_curve_inversions` | Periods when the US 10Y−2Y spread was negative (inverted curve): start, end, length in days, deepest spread. |
| CentralBankDex | `country_money` | Annual World Bank money indicators for one country: broad money growth (% per year) and broad money (% of GDP), all years available; latest values with their ye |
| CentralBankDex | `rank_countries` | Rank countries by broad money growth or broad money % of GDP for one year (default latest). World Bank aggregates excluded. |
| CentralBankDex | `provider_labels` | Regime labels generated by the dataset provider for US rows (monetary policy regime, yield-curve regime, stress tier) over time — labels, not official data. |
| InflationDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| InflationDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| InflationDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| InflationDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| InflationDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| InflationDex | `inflation_rank` | Countries ranked by annual inflation (percent as provided, with the inflation year of each country), optionally by region or income level. Also returns the medi |
| InflationDex | `country_inflation` | One country: annual inflation (percent, with year), region, income level, and cost-of-living indices where available. |
| InflationDex | `cost_items` | Cost items for one country in USD: bread, one-way transport, monthly pass, monthly rent, utilities (where available). |
| InflationDex | `region_summary` | Median annual inflation (percent) grouped by region or income level. |
| InflationDex | `compare_countries` | Annual inflation (with year) and cost indices for 2–8 countries side by side. |
| InflationDex | `live_latest` | Latest live data after the original dataset ends (validated snapshots from a registered open-data source): as-of date, source, switch date, flags. rupiahdex: US |
| StartupDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| StartupDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| StartupDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| StartupDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| StartupDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| StartupDex | `funding_summary` | Funding totals: overall disclosed USD and rounds (from the summary), or grouped by year, country, sector, or stage with round counts, total and median amount. s |
| StartupDex | `rounds_search` | Search funding rounds by company name, with optional filters; returns rounds with news source and link (excerpts are short quotes). |
| StartupDex | `median_round` | Median round size (USD) for a stage, optionally for one year, using verified amounts. |
| StartupDex | `mega_rounds` | Largest rounds (≥ US$100 million), optionally for one year, with share of dollars. |
| StartupDex | `company_rounds` | All rounds of one company (by name or domain) in the sample. |
| StartupDex | `investor_leads` | Rounds led by an investor (substring match), with count and total disclosed USD; or the most frequent lead investors when null. |
| VCDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| VCDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| VCDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| VCDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| VCDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| VCDex | `investor_search` | Search investors by name, optionally by HQ country and investor type (VC, PE, CVC, accelerator, government, bank-debt, other). |
| VCDex | `investor_profile` | Profile of one investor (by slug or name): type, HQ, deals, lead deals, portfolio size, active years, recent activity, stage shares, top sectors/countries, medi |
| VCDex | `rank_investors` | Rank investors by deals, lead_deals, portfolio_companies, deals_2025_2026, or median_round_usd, optionally filtered by HQ country and type. |
| VCDex | `stage_mix` | Seed / early / growth share of one investor's deals (by slug or name), or the average stage mix per investor type when slug is null. |
| VCDex | `country_summary` | Investors headquartered in a country: count, by type, top investors by deals, median deals. |
| VCNetworkDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| VCNetworkDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| VCNetworkDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| VCNetworkDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| VCNetworkDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| VCNetworkDex | `top_pairs` | Investor pairs with the most shared deals, optionally filtered by top shared sector or country. |
| VCNetworkDex | `investor_partners` | Co-investment partners of one investor in the sample, sorted by shared deals. |
| VCNetworkDex | `network_stats` | Network statistics: pairs, unique investors, share of single-deal pairs, top investors by partners and weighted degree (from the summary); or one investor's deg |
| VCNetworkDex | `ego_graph` | Ego network of one investor (≤ 50 nodes): the investor, its strongest partners, and edges among them; edge weight = shared deals. |
| VCNetworkDex | `sector_country_links` | Most common top shared sectors and countries among pairs, optionally restricted to one sector or country. |
| OpenCompanyDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| OpenCompanyDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| OpenCompanyDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| OpenCompanyDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| OpenCompanyDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| OpenCompanyDex | `company_search` | Search companies by name or domain, optionally by country and sector. |
| OpenCompanyDex | `company_counts` | Company counts grouped by country, sector, industry, status, founded decade, or employees range, with optional filters; or the total for the filters. |
| OpenCompanyDex | `funded_share` | Share of companies that were ever funded, overall or grouped by sector, country, or status. |
| OpenCompanyDex | `business_models` | Most common business models among companies. |
| SalaryDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| SalaryDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| SalaryDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| SalaryDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| SalaryDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| SalaryDex | `salary_stats` | Statistic (p25, median, p75, mean, count) of salary_mid_usd for postings matching filters (country ISO2, role_family, seniority, skill, industry_category). Requ |
| SalaryDex | `compare_salaries` | Median salary_mid_usd for 2–6 groups, each defined by filters (e.g. software-eng in US vs IN). Groups with n < 30 are reported as insufficient. |
| SalaryDex | `skill_premium` | Median salary of postings listing a skill versus postings without it (optionally within a country), with n for both groups. |
| SalaryDex | `top_skills` | Most frequent skills in postings, optionally filtered by country and role family, with each skill's median salary. |
| SalaryDex | `salary_distribution` | Distribution (histogram, p25/median/p75) of salary_mid_usd for postings matching filters, plus median by seniority. |
| CostLivingDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| CostLivingDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| CostLivingDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| CostLivingDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| CostLivingDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| CostLivingDex | `city_rank` | Rank cities by an index (cost_of_living_index, rent_index, groceries_index, restaurant_price_index, local_purchasing_power_index, quality_of_life_index, safety_ |
| CostLivingDex | `city_profile` | All indices of one city for each survey date (synthetic data), plus the provider note. |
| CostLivingDex | `compare_cities` | Compare 2–6 cities on the main indices at the latest survey (synthetic data). |
| CostLivingDex | `survey_change` | Change of a city's indices between the 2023 and 2024 surveys (synthetic data). |
| CostLivingDex | `region_summary` | Median cost-of-living and quality-of-life indices by region, subregion, or development tier at the latest survey (synthetic data). |
| IDHousingDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| IDHousingDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| IDHousingDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| IDHousingDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| IDHousingDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| IDHousingDex | `housing_stats` | Statistic of price_idr (median, mean, p25, p75, count) for valid listings grouped by province, city_regency, subsidy_status, or developer_association, with opti |
| IDHousingDex | `price_per_m2` | Median price per m² of building area (price_idr ÷ building_area_m2, area > 0) for valid listings, overall by subsidy status or grouped. |
| IDHousingDex | `project_search` | Search housing projects by name, optionally by province and city. |
| IDHousingDex | `developer_summary` | Listings, provinces, and median price for a developer (name substring) or developer association (e.g. REI, APERSI); association shares when query is null. |
| IDHousingDex | `map_points` | Project locations (valid coordinates only) for a map, optionally by province and subsidy status; max 2,000 points (sampled evenly). |
| IDHousingDex | `specs_breakdown` | Distribution of one specification (bedrooms, bathrooms, floors, roof/wall/floor/foundation material) for valid listings, optionally by subsidy status. bedrooms  |
| IDFoodDeliveryDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| IDFoodDeliveryDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| IDFoodDeliveryDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| IDFoodDeliveryDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| IDFoodDeliveryDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| IDFoodDeliveryDex | `markup_stats` | Median markup (online vs estimated dine-in price, in percent units) overall or grouped by city, cuisine, cloud_kitchen, or merchant, with optional city/cuisine  |
| IDFoodDeliveryDex | `item_search` | Search menu items by name (e.g. "nasi goreng"), optionally by city and cuisine. |
| IDFoodDeliveryDex | `price_compare` | Online vs estimated dine-in prices for items matching a merchant or item name: medians and per-item rows. |
| IDFoodDeliveryDex | `fee_promo_stats` | Median packaging fee (IDR) and promo discount (percent units), overall or grouped by city, cuisine, or cloud kitchen. |
| IDFoodDeliveryDex | `provider_tiers` | Counts of provider-generated labels (inflation_distortion_tier, consumer_affordability_tier, cloud_kitchen_premium_bias, platform_take_rate_burden) — labels, no |
| PovertyDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| PovertyDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| PovertyDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| PovertyDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| PovertyDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| PovertyDex | `mpi_rank` | Countries ranked by an MPI indicator (mpi_value, mpi_headcount, mpi_intensity, or a dimension indicator), each with its survey year and source note. |
| PovertyDex | `country_mpi` | All MPI indicators of one country with survey year and source note (e.g. "Survey: DHS (2017)"); percentages also given as fractions. |
| PovertyDex | `dimension_breakdown` | The 10 deprivation indicators of one country (percent of people deprived, as provided), as a bar chart. |
| PovertyDex | `compare_countries` | MPI value, headcount, and intensity for 2–8 countries side by side (survey years differ). |
| PopulationDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| PopulationDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| PopulationDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| PopulationDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| PopulationDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| PopulationDex | `coverage_trend` | Coverage per 10,000 news articles by month or year (provider-computed), with the peak month; the last month is partial. |
| PopulationDex | `coverage_geo` | Where coverage comes from (2023–2026): by continent, country, city, US state, or Indian state, with share %. |
| PopulationDex | `tone_breakdown` | Tone of coverage: share of positive/neutral/negative in the article sample, or tone counts by year / by country (provider aggregates). |
| PopulationDex | `themes` | Top themes in coverage 2023–2026 (provider aggregates). |
| PopulationDex | `organisations` | Top organisations in coverage 2023–2026 (provider aggregates). |
| PopulationDex | `research_trend` | Academic papers on the topic per year and per 10,000 papers (provider aggregate). |
| PopulationDex | `patents` | Patent families on the topic: by year, by CPC class, or by patent office (provider aggregates). |
| PopulationDex | `top_papers` | Most-cited papers on the topic (title, year, venue, citations, DOI) from the provider aggregate. |
| PopulationDex | `provider_findings` | Findings stated by the data provider (FINDINGS.md) with their grade: A exact count, B keyword rule, C outlet-sensitive. Always mention the grade. |
| PopulationDex | `sample_articles` | Metadata of sampled article records (date, country, tone, themes, keywords) with filters; no article text. |
| HomelessnessDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| HomelessnessDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| HomelessnessDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| HomelessnessDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| HomelessnessDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| HomelessnessDex | `coverage_trend` | Coverage per 10,000 news articles by month or year (provider-computed), with the peak month; the last month is partial. |
| HomelessnessDex | `coverage_geo` | Where coverage comes from (2023–2026): by continent, country, city, US state, or Indian state, with share %. |
| HomelessnessDex | `tone_breakdown` | Tone of coverage: share of positive/neutral/negative in the article sample, or tone counts by year / by country (provider aggregates). |
| HomelessnessDex | `themes` | Top themes in coverage 2023–2026 (provider aggregates). |
| HomelessnessDex | `organisations` | Top organisations in coverage 2023–2026 (provider aggregates). |
| HomelessnessDex | `research_trend` | Academic papers on the topic per year and per 10,000 papers (provider aggregate). |
| HomelessnessDex | `patents` | Patent families on the topic: by year, by CPC class, or by patent office (provider aggregates). |
| HomelessnessDex | `top_papers` | Most-cited papers on the topic (title, year, venue, citations, DOI) from the provider aggregate. |
| HomelessnessDex | `provider_findings` | Findings stated by the data provider (FINDINGS.md) with their grade: A exact count, B keyword rule, C outlet-sensitive. Always mention the grade. |
| HomelessnessDex | `sample_articles` | Metadata of sampled article records (date, country, tone, themes, keywords) with filters; no article text. |
| HousingDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| HousingDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| HousingDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| HousingDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| HousingDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| HousingDex | `coverage_trend` | Coverage per 10,000 news articles by month or year (provider-computed), with the peak month; the last month is partial. |
| HousingDex | `coverage_geo` | Where coverage comes from (2023–2026): by continent, country, city, US state, or Indian state, with share %. |
| HousingDex | `tone_breakdown` | Tone of coverage: share of positive/neutral/negative in the article sample, or tone counts by year / by country (provider aggregates). |
| HousingDex | `themes` | Top themes in coverage 2023–2026 (provider aggregates). |
| HousingDex | `organisations` | Top organisations in coverage 2023–2026 (provider aggregates). |
| HousingDex | `research_trend` | Academic papers on the topic per year and per 10,000 papers (provider aggregate). |
| HousingDex | `patents` | Patent families on the topic: by year, by CPC class, or by patent office (provider aggregates). |
| HousingDex | `top_papers` | Most-cited papers on the topic (title, year, venue, citations, DOI) from the provider aggregate. |
| HousingDex | `provider_findings` | Findings stated by the data provider (FINDINGS.md) with their grade: A exact count, B keyword rule, C outlet-sensitive. Always mention the grade. |
| HousingDex | `sample_articles` | Metadata of sampled article records (date, country, tone, themes, keywords) with filters; no article text. |
| FintechDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| FintechDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| FintechDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| FintechDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| FintechDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| FintechDex | `sentiment_overview` | Sentiment counts and shares overall (rows, date range, platforms), or grouped by platform, month, or language. |
| FintechDex | `topic_breakdown` | Most frequent provider topic tags, emotions, financial signals, or mentioned products. |
| FintechDex | `search_posts` | Search posts by keyword (title/summary), optionally by platform and sentiment; returns summary, platform, date, URL — never the author. |
| FintechDex | `trend` | Monthly number of posts and share of each sentiment over time. |
| FintechDex | `aspect_sentiment` | Sentiment share of posts mentioning an aspect keyword group (ux, pricing, product, service, security, brand) — keyword matching on summaries, approximate. |
| PersonalFinanDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| PersonalFinanDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| PersonalFinanDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| PersonalFinanDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| PersonalFinanDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| PersonalFinanDex | `sentiment_overview` | Sentiment counts and shares overall (rows, date range, platforms), or grouped by platform, month, or language. |
| PersonalFinanDex | `topic_breakdown` | Most frequent provider topic tags, emotions, financial signals, or mentioned products. |
| PersonalFinanDex | `search_posts` | Search posts by keyword (title/summary), optionally by platform and sentiment; returns summary, platform, date, URL — never the author. |
| PersonalFinanDex | `trend` | Monthly number of posts and share of each sentiment over time. |
| PersonalFinanDex | `aspect_sentiment` | Sentiment share of posts mentioning an aspect keyword group (ux, pricing, product, service, security, brand) — keyword matching on summaries, approximate. |
| My LAIwyer | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| My LAIwyer | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| My LAIwyer | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| My LAIwyer | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| My LAIwyer | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| My LAIwyer | `list_sources` | Documents of this Dex's legal corpus ("umum") with their status (available = official text ingested and verified; pending = waiting for the document; failed = f |
| My LAIwyer | `search_law` | BM25 search over the ingested official texts of the "umum" corpus (per-article, explanation, and page chunks; light Indonesian synonyms). Returns original quota |
| My LAIwyer | `get_pasal` | Exact official text of one article (Pasal), optionally one paragraph (ayat), with document status. For documents whose text is pending, returns the labelled cat |
| My LAIwyer | `get_penjelasan` | Official explanation (PENJELASAN) of one article, when the document has one. |
| My LAIwyer | `regulation_status` | Is a regulation still in force? What amends/revokes it, when is it effective, and are its criminal penalties adjusted by UU 1/2026 (with the pages of the UU 1/2 |
| My LAIwyer | `cross_reference` | Fetch an article from the OTHER law corpus ("keuangan") — e.g. UU Transfer Dana, UU ITE, UU PDP, POJK 22/2023. The quotation is labelled with its source Dex. |
| My LAIwyer | `start_flow` | Guided Consultation (§8.10): without flow_id, list the flows that match the user's situation (pass the user's words as question); with flow_id, return its first |
| My LAIwyer | `flow_step` | Advance a Guided Consultation deterministically: path = node ids so far (from the previous choices artifact), choice_index = 0-based option chosen. back_to = no |
| My LAIwyer | `channel_directory` | Official complaint/reporting channels (bank, IASC, Kontak OJK 157, SiPASTI, BI 131, cekrekening.id, aduannomor.id, police report, LAPS SJK, 112) with when to us |
| My LAIwyer | `glossary` | Legal term ↔ plain language: the official definition quoted from the general-provisions article of the relevant law (when found) plus a labelled plain-language  |
| My LAIwyer | `open_page` | Text of one original PDF page and a preview ("Lihat halaman asli") — for citing pages where article headings were not detected (OCR) or for annexes. |
| My LAIwyer | `compare_versions` | Side-by-side texts on a topic: the old KUHAP (UU 8/1981) vs the new KUHAP (UU 20/2025), or the original 1945 Constitution vs the amended UUD NRI 1945 (pair = uu |
| FinLAIwyer | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| FinLAIwyer | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| FinLAIwyer | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| FinLAIwyer | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| FinLAIwyer | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| FinLAIwyer | `list_sources` | Documents of this Dex's legal corpus ("keuangan") with their status (available = official text ingested and verified; pending = waiting for the document; failed |
| FinLAIwyer | `search_law` | BM25 search over the ingested official texts of the "keuangan" corpus (per-article, explanation, and page chunks; light Indonesian synonyms). Returns original q |
| FinLAIwyer | `get_pasal` | Exact official text of one article (Pasal), optionally one paragraph (ayat), with document status. For documents whose text is pending, returns the labelled cat |
| FinLAIwyer | `get_penjelasan` | Official explanation (PENJELASAN) of one article, when the document has one. |
| FinLAIwyer | `regulation_status` | Is a regulation still in force? What amends/revokes it, when is it effective, and are its criminal penalties adjusted by UU 1/2026 (with the pages of the UU 1/2 |
| FinLAIwyer | `cross_reference` | Fetch an article from the OTHER law corpus ("umum") — e.g. KUHP (UU 1/2023) Pasal 492 on fraud, UU 1/2026, KUHPerdata, PERMA gugatan sederhana, UU Bantuan Hukum |
| FinLAIwyer | `start_flow` | Guided Consultation (§8.10): without flow_id, list the flows that match the user's situation (pass the user's words as question); with flow_id, return its first |
| FinLAIwyer | `flow_step` | Advance a Guided Consultation deterministically: path = node ids so far (from the previous choices artifact), choice_index = 0-based option chosen. back_to = no |
| FinLAIwyer | `channel_directory` | Official complaint/reporting channels (bank, IASC, Kontak OJK 157, SiPASTI, BI 131, cekrekening.id, aduannomor.id, police report, LAPS SJK, 112) with when to us |
| FinLAIwyer | `glossary` | Legal term ↔ plain language: the official definition quoted from the general-provisions article of the relevant law (when found) plus a labelled plain-language  |
| FinLAIwyer | `open_page` | Text of one original PDF page and a preview ("Lihat halaman asli") — for citing pages where article headings were not detected (OCR) or for annexes. |
| AntiScamDex | `dataset_info` | Describe this Dex dataset: exact source file names, coverage, as-of date, entity count, licence, cleaning rules, and limitations. Use when the user asks what da |
| AntiScamDex | `data_quality` | Data-quality report for the dataset or one entity: removed spikes, systemic breaks/reliable_from, carry-forward, bad prints, duplicates, OCR gaps, samples, synt |
| AntiScamDex | `app_info` | Information about the Finandex app and its creator. Use when asked who made the app. |
| AntiScamDex | `feature_guide` | Feature guide (rule 11): what this Dex is for, example questions, every function/tab with a one-line explanation, data & as-of, limitations, related Dex. Use fo |
| AntiScamDex | `open_dex` | Offer the user a button that opens another Finandex Dex (optionally on an entity) when the question belongs to a different dataset. Use instead of guessing numb |
| AntiScamDex | `iasc_stats` | IASC handling statistics (cumulative since 22 Nov 2024): reports, accounts reported/blocked, victim funds blocked/returned, reported losses, phone numbers. view |
| AntiScamDex | `satgas_stats` | Satgas PASTI statistics: complaints about illegal entities (illegal online loans, illegal investment, illegal pawning) and entities stopped, with cut-off dates. |
| AntiScamDex | `ojk_consumer_stats` | OJK consumer-service statistics (service requests, complaints by sector) with the period stated in the source. |
| AntiScamDex | `modus_library` | Library of 11 scam types with red flags (query filters by keyword, e.g. "phishing", "pinjol", "investasi"). |
| AntiScamDex | `modus_stats` | Reports per scam type as published (with source and cut-off). Where media report different numbers for the same type, BOTH are returned with their sources (conf |
| AntiScamDex | `region_stats` | Scam reports by region as published (with source and cut-off). |
| AntiScamDex | `reporting_guide` | How to report to IASC: portal features, 4 reporting steps, data to prepare (grouped), rules (1 form = 1 victim account → 1 reported account; dual track IASC + p |
| AntiScamDex | `channel_directory` | Official channels (IASC report/check, Kontak OJK 157, SiPASTI, BI BICARA 131, cekrekening.id, aduannomor.id, police report, LAPS SJK, your bank, 112) with when  |
| AntiScamDex | `evidence_checklist` | Checklist of evidence to keep (phone numbers, dated chats, transfer proofs, destination accounts, URLs). |
| AntiScamDex | `prevention_tips` | Prevention tips from official public information. |
| AntiScamDex | `scam_selfcheck` | Deterministic self-check quiz "Apakah ini scam?": answers = 10 yes/no booleans in the order of the questions (call with answers null to get the questions). Retu |
| AntiScamDex | `emergency_steps` | Just scammed: elapsed = time since the last transfer (lt24h\|gt24h\|unknown), method = bank\|pjp (e-wallet/payment provider)\|crypto\|other. Runs the FinLAIwyer flow |

## 4. Kontrak data statis
`public/data/manifest.json` mencatat setiap file data beserta hash; klien hanya membaca file yang tercantum di manifest.

## 5. Header keamanan (vercel.json)
| Sumber | Header |
|---|---|
| `/data/(.*)` | Access-Control-Allow-Origin: * |
| `/data/(.*)` | Access-Control-Allow-Methods: GET, HEAD |
| `/data/(.*)` | Cache-Control: public, max-age=3600, stale-while-revalidate=86400 |
| `/assets/(.*)` | Cache-Control: public, max-age=31536000, immutable |
| `/sw.js` | Cache-Control: no-cache |
| `/(.*)` | Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; connect-src 'self' https://finandex.vercel.app https://finande |
| `/(.*)` | Strict-Transport-Security: max-age=63072000; includeSubDomains; preload |
| `/(.*)` | X-Content-Type-Options: nosniff |
| `/(.*)` | Referrer-Policy: strict-origin-when-cross-origin |
| `/(.*)` | Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=() |
| `/(.*)` | Cross-Origin-Opener-Policy: same-origin |
