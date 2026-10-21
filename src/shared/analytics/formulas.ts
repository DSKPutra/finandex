// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Formula catalogue (§8.8): human-readable ID/EN descriptions referenced by `method.formula_ids`.
// The justification panel is generated from these strings — never from model reasoning.

export const FORMULAS = {
  simple_return: { id: 'Return = close akhir ÷ close awal − 1 (close awal = close terakhir pada/sebelum tanggal acuan).', en: 'Return = ending close ÷ starting close − 1 (starting close = last close on/before the anchor date).' },
  period_anchor: { id: 'Tanggal acuan: 1W = L − 7 hari; 1M/3M/6M/1Y/3Y/5Y/10Y = mundur N bulan/tahun dari L (hari di-clamp ke akhir bulan); YTD = close ≤ 31 Des tahun sebelumnya.', en: 'Anchor: 1W = L − 7 days; 1M…10Y = N months/years back from L (day clamped to month end); YTD = close ≤ 31 Dec of the previous year.' },
  cagr: { id: 'CAGR = (akhir ÷ awal)^(365,25 ÷ jumlah hari) − 1, hanya untuk periode ≥ 1 tahun dan harga > 0.', en: 'CAGR = (end ÷ start)^(365.25 ÷ days) − 1, only for periods ≥ 1 year and prices > 0.' },
  vol_1y: { id: 'Volatilitas 1Y = simpangan baku sampel (ddof=1) return harian setahun terakhir × √N (N = 252; 365 untuk kripto), minimal 60 return.', en: 'Volatility 1Y = sample std (ddof=1) of daily returns over the trailing year × √N (N = 252; 365 for crypto), minimum 60 returns.' },
  max_drawdown: { id: 'Max drawdown = min(close ÷ puncak berjalan − 1); tanggal puncak, palung, dan pemulihan (close ≥ puncak lagi).', en: 'Max drawdown = min(close ÷ running peak − 1); peak, trough and recovery dates (close back at the peak).' },
  correlation: { id: 'Korelasi Pearson dari return harian yang dihitung SETELAH harga disejajarkan pada tanggal yang sama (inner join); jendela (min(L₁,L₂) − N tahun, min(L₁,L₂)]; minimal 60 return.', en: 'Pearson correlation of daily returns computed AFTER aligning prices on common dates (inner join); window (min(L₁,L₂) − N years, min(L₁,L₂)]; minimum 60 returns.' },
  beta: { id: 'Beta = kovarians(return aset, return benchmark) ÷ varians(return benchmark), return disejajarkan pada tanggal yang sama, minimal 120 return.', en: 'Beta = cov(asset, benchmark returns) ÷ var(benchmark returns), returns aligned on common dates, minimum 120 returns.' },
  calendar_return: { id: 'Return tahun kalender = close akhir tahun ÷ close akhir tahun sebelumnya − 1; tahun pertama relatif terhadap close pertama, dan tahun pertama/terakhir ditandai parsial.', en: 'Calendar-year return = year-end close ÷ previous year-end close − 1; the first year is relative to the first close; first/last years are flagged partial.' },
  rebase_100: { id: 'Rebase 100 = close ÷ close pada tanggal awal bersama × 100.', en: 'Rebase 100 = close ÷ close on the common start date × 100.' },
  high_low_52w: { id: '52W high/low dan ATH dihitung dari harga close (bukan high/low intraday).', en: '52W high/low and ATH are computed from closing prices (not intraday high/low).' },
  sma_rsi: { id: 'SMA = rata-rata close N hari terakhir; RSI14 metode Wilder.', en: 'SMA = mean of the last N closes; RSI14 with Wilder smoothing.' },
  daily_move: { id: 'Pergerakan harian = close ÷ close hari bursa sebelumnya − 1.', en: 'Daily move = close ÷ previous trading-day close − 1.' },
  rank: { id: 'Peringkat diurutkan menurut metrik; nilai kosong dikeluarkan; tie-break id A→Z.', en: 'Ranked by the metric; missing values excluded; ties broken by id A→Z.' },
  median: { id: 'Median = nilai tengah dari n baris yang memenuhi filter (n ditampilkan).', en: 'Median = middle value of the n rows matching the filters (n shown).' },
  share: { id: 'Porsi = jumlah bagian ÷ jumlah total.', en: 'Share = part ÷ total.' },
  count: { id: 'Jumlah baris yang memenuhi filter.', en: 'Count of rows matching the filters.' },
  sum: { id: 'Total = penjumlahan nilai pada baris yang memenuhi filter.', en: 'Total = sum of values over the rows matching the filters.' },
  monthly_aggregate: { id: 'Agregasi bulanan = jumlah nilai harian per bulan kalender; bulan berjalan yang belum lengkap dikeluarkan.', en: 'Monthly aggregate = sum of daily values per calendar month; the current incomplete month is excluded.' },
  fx_conversion: { id: 'Konversi = jumlah × kurs close USD/IDR pada/ sebelum tanggal yang diminta.', en: 'Conversion = amount × USD/IDR close on/before the requested date.' },
  yearly_average: { id: 'Rata-rata tahunan = rata-rata close harian USD/IDR dalam tahun kalender.', en: 'Yearly average = mean of daily USD/IDR closes in the calendar year.' },
  rate_diff: { id: 'Selisih suku bunga = BI rate − suku bunga AS (poin persentase), nilai terakhir masing-masing.', en: 'Rate differential = BI rate − US rate (percentage points), latest values.' },
  monthly_return: { id: 'Return bulanan reksa dana = NAB/unit bulan ini ÷ NAB/unit bulan sebelumnya − 1, hanya untuk bulan berurutan; 1Y/3Y/YTD memakai bulan acuan yang tepat ada.', en: 'Fund monthly return = NAV/unit this month ÷ NAV/unit previous month − 1, consecutive months only; 1Y/3Y/YTD need the exact reference month.' },
  ratios_idx: { id: 'ROE = laba bersih ÷ ekuitas; NPM = laba bersih ÷ pendapatan; DER = liabilitas ÷ ekuitas; PER = close ÷ EPS dasar; PBV = kapitalisasi ÷ ekuitas; kapitalisasi = close terakhir × jumlah saham.', en: 'ROE = net income ÷ equity; NPM = net income ÷ revenue; DER = liabilities ÷ equity; PER = close ÷ basic EPS; PBV = market cap ÷ equity; market cap = last close × shares outstanding.' },
  dominance: { id: 'Dominasi = kapitalisasi koin ÷ total kapitalisasi 250 koin di snapshot.', en: 'Dominance = coin market cap ÷ total market cap of the 250 coins in the snapshot.' },
  stablecoin_heuristic: { id: 'Stablecoin (heuristik): harga dalam ±3% dari US$1 DAN simbol/nama memuat usd/dollar/stable (atau dai/gho) DAN nama tanpa "fund".', en: 'Stablecoin (heuristic): price within ±3% of US$1 AND symbol/name contains usd/dollar/stable (or dai/gho) AND name without "fund".' },
  tvl_double_count: { id: 'Rasio hitung ganda = Σ TVL protokol (non-CEX) ÷ TVL headline DeFi; aset yang sama terhitung di beberapa protokol.', en: 'Double-counting ratio = Σ protocol TVL (non-CEX) ÷ headline DeFi TVL; the same assets are counted in several protocols.' },
  dedup: { id: 'Duplikat dibuang sebelum dihitung (kunci sesuai aturan dataset).', en: 'Duplicates removed before counting (key per dataset rule).' },
  markup: { id: 'Markup = (harga online ÷ estimasi harga dine-in − 1) × 100.', en: 'Markup = (online price ÷ estimated dine-in price − 1) × 100.' },
  price_per_m2: { id: 'Harga per m² = harga ÷ luas (luas > 0), dihitung ulang dari data.', en: 'Price per m² = price ÷ area (area > 0), recomputed from the data.' },
  per_10k: { id: 'Liputan per 10 ribu berita = artikel bertopik ÷ seluruh artikel di indeks × 10.000 (agregat penyedia).', en: 'Coverage per 10k news = topic articles ÷ all indexed articles × 10,000 (provider aggregate).' },
  bm25: { id: 'Pencarian teks BM25 atas potongan per pasal/halaman dokumen hukum (stemming ringan & sinonim).', en: 'BM25 text search over per-article/per-page chunks of the legal documents (light stemming & synonyms).' },
  drip: { id: 'Dengan reinvestasi = jumlah × AdjClose akhir ÷ AdjClose awal; tanpa reinvestasi = (jumlah ÷ close awal) × close akhir + dividen tunai.', en: 'With reinvestment = amount × ending adj close ÷ starting adj close; without = (amount ÷ starting close) × ending close + cash dividends.' },
  dividend_ttm: { id: 'Dividen TTM = jumlah dividen 12 bulan terakhir; yield = TTM ÷ close terakhir; streak = tahun kalender berturut-turut dengan dividen tahunan naik.', en: 'TTM dividends = sum over the trailing 12 months; yield = TTM ÷ last close; streak = consecutive calendar years of rising annual dividends.' },
  breadth: { id: 'Breadth = jumlah naik/turun pada tanggal as-of; % di atas SMA200 dari saham dengan ≥ 200 bar.', en: 'Breadth = advancers/decliners on the as-of date; % above SMA200 among stocks with ≥ 200 bars.' },
} as const;

export type FormulaId = keyof typeof FORMULAS;
