// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Per-Dex cleaning rules & limitations (summarised from §4) — returned by dataset_info and shown in the Data tab.
import type { DexId, Label } from '../../src/config/dex-registry.ts';

export interface DatasetNotes {
  dataset: string;
  rules: Label[];
  limits: Label[];
}

const l = (id: string, en: string): Label => ({ id, en });

export const DATASET_NOTES: Record<DexId, DatasetNotes> = {
  'finandex-ai': {
    dataset: 'Global Financial Markets Dataset 2000–Present',
    rules: [
      l(
        'Analitik memakai harga close; candlestick memakai high/low tersanitasi (max/min dari o,h,l,c).',
        'Analytics use closes; candlesticks use sanitised high/low (max/min of o,h,l,c).',
      ),
      l('As-of per aset (^HSI berakhir 2026-10-16).', 'As-of per asset (^HSI ends 2026-10-16).'),
      l(
        'Volume mata uang selalu 0 → dianggap tidak tersedia.',
        'Currency volume is always 0 → treated as not available.',
      ),
    ],
    limits: [
      l(
        'Hanya 34 aset; IHSG & rupiah tidak ada (lihat IDFinanDex/RupiahDex).',
        'Only 34 assets; no IHSG or rupiah (see IDFinanDex/RupiahDex).',
      ),
      l('JPYUSD=X dan INRUSD=X presisi rendah (4 desimal).', 'JPYUSD=X and INRUSD=X are low precision (4 decimals).'),
      l(
        'Bar FX bisa bergeser satu hari dari tanggal peristiwa.',
        'FX bars can be shifted by one day from the event date.',
      ),
      l(
        'WTI close negatif −37,63 pada 2020-04-20 (nyata); drawdown < −100%.',
        'WTI closed at −37.63 on 2020-04-20 (real); drawdown below −100%.',
      ),
    ],
  },
  nasdaqdex: {
    dataset: 'NASDAQ daily OHLC 1962-01-02 → 2026-09-18 (500 tickers)',
    rules: [
      l(
        'Buang close ≤ 0; spike satu hari dibuang; tanggal sistemik → reliable_from.',
        'Drop close ≤ 0; one-day spikes removed; systemic dates → reliable_from.',
      ),
      l(
        'Pergerakan ekstrem (≥ +100% / ≤ −50%) dipertahankan tetapi ditandai.',
        'Extreme moves (≥ +100% / ≤ −50%) kept but flagged.',
      ),
    ],
    limits: [
      l(
        'Tanpa volume & dividen; harga ter-adjust sumber; indeks EW bias survivorship.',
        'No volume or dividends; source-adjusted prices; EW index survivorship-biased.',
      ),
    ],
  },
  snp500dex: {
    dataset: 'S&P 500 US Stock Market Data 2026 (233 tickers)',
    rules: [
      l(
        'Return & risiko memakai Adj Close (total return); tampilan, 52W, ATH, SMA, RSI memakai Close.',
        'Returns & risk use Adj Close (total return); display, 52W, ATH, SMA, RSI use Close.',
      ),
    ],
    limits: [
      l(
        '233 dari ±500 konstituen; benchmark ^GSPC indeks harga; EA riwayat pendek.',
        '233 of ~500 constituents; ^GSPC benchmark is a price index; EA has a short history.',
      ),
    ],
  },
  commercedex: {
    dataset: 'Global E-Commerce Giants 2015–2026',
    rules: [
      l(
        'Return memakai adj_close; harga tampil dalam mata uang listing; 13 baris kosong dibuang; 1 spike dibuang.',
        'Returns use adj_close; display prices in listing currency; 13 empty rows dropped; 1 spike removed.',
      ),
      l(
        'Laporan keuangan alibaba, jdcom, pinduoduo, vipshop = CNY; stoneco = BRL.',
        'Financials of alibaba, jdcom, pinduoduo, vipshop = CNY; stoneco = BRL.',
      ),
    ],
    limits: [
      l(
        'Multi-mata uang: angka absolut tidak boleh dibandingkan mentah; laporan keuangan ±4 tahun; survivorship.',
        'Multi-currency: never compare raw amounts across currencies; ~4 years of financials; survivorship.',
      ),
    ],
  },
  ipodex: {
    dataset: 'IPO Data 2019–2026 — India, US, UK & Global IPOs (sampel 38%)',
    rules: [
      l(
        'Hanya listing_status Completed = IPO tercatat; ukuran IPO default memakai amount_status verified.',
        'Only listing_status Completed = listed IPO; IPO size uses verified amounts by default.',
      ),
    ],
    limits: [
      l(
        'Sampel 38% (5.000 dari 13.316); "Announced / filed" bukan listing; lisensi CC BY-NC 4.0.',
        '38% sample (5,000 of 13,316); "Announced / filed" is not a listing; CC BY-NC 4.0.',
      ),
    ],
  },
  idfinandex: {
    dataset: 'Daily Multi-Asset Macroeconomic and Financial Time Series Dataset (Indonesia & Global Markets)',
    rules: [
      l(
        'Nilai yang persis sama dengan baris sebelumnya = carry-forward hari libur → dikecualikan.',
        'Values identical to the previous row = holiday carry-forward → excluded.',
      ),
      l('USDIDR: bad print dibuang dengan aturan FX.', 'USDIDR: bad prints removed with the FX rule.'),
    ],
    limits: [
      l(
        'CPI = inflasi tahunan (%), bukan indeks; BI rate & US rate dalam %.',
        'CPI = annual inflation (%), not an index; BI rate & US rate in %.',
      ),
    ],
  },
  rupiahdex: {
    dataset: 'USD/IDR daily exchange rate (usd_idr_daily_cleaned.csv)',
    rules: [
      l(
        'Tanggal = 10 karakter pertama (tanpa konversi zona waktu).',
        'Date = first 10 characters (no time-zone conversion).',
      ),
      l(
        'Bad print FX dibuang iteratif: 11 tanggal (2013-10-14 … 2013-12-09, 2024-12-26).',
        'FX bad prints removed iteratively: 11 dates (2013-10-14 … 2013-12-09, 2024-12-26).',
      ),
    ],
    limits: [
      l('Naik = rupiah melemah; bukan kurs JISDOR resmi.', 'Rising = rupiah weakening; not the official JISDOR rate.'),
    ],
  },
  idxdex: {
    dataset: 'Complete Indonesia Stock Market IDX 2000–2024 + Financial Statements + e-IPO + Public Companies',
    rules: [
      l(
        'Adj Close ≤ 0 dikecualikan; spike dibuang; likuiditas dari volume.',
        'Adj Close ≤ 0 excluded; spikes removed; liquidity from volume.',
      ),
      l('Rasio pada FY terbaru yang tersedia (2020–2023).', 'Ratios on the latest available FY (2020–2023).'),
    ],
    limits: [
      l(
        'Harga s/d 2024-05-17; sektor hanya untuk emiten e-IPO; DER kurang relevan untuk bank.',
        'Prices up to 2024-05-17; sector only for e-IPO issuers; DER less meaningful for banks.',
      ),
    ],
  },
  reksadex: {
    dataset: 'Mutual Fund (Reksa Dana) Dataset in Indonesia',
    rules: [
      l(
        'Baris aktif = NAB > 0, unit > 0, NAB/unit > 0; return bulanan hanya untuk bulan berurutan.',
        'Active rows = AUM > 0, units > 0, NAV/unit > 0; monthly returns only for consecutive months.',
      ),
      l('Semua NAB dalam rupiah, termasuk produk USD.', 'All NAV values are in rupiah, including USD funds.'),
    ],
    limits: [
      l(
        'Snapshot bulanan; return tanpa pembagian hasil; produk USD dalam IDR memuat efek kurs.',
        'Monthly snapshots; returns exclude distributions; USD funds in IDR include FX effects.',
      ),
    ],
  },
  cryptdex: {
    dataset:
      'Crypto Prices Historical Data + CoinGecko tracker + DefiLlama DeFi + DeFi Fees & Revenue + DeFi Yields + Trading Bots KB',
    rules: [
      l(
        'ID aset = nama file (TON → GRAM satu aset); spike dibuang; anualisasi 365.',
        'Asset id = file name (TON → GRAM is one asset); spikes removed; annualisation 365.',
      ),
      l(
        'Fees: dedupe (name, snapshot_date); bulan DEX berjalan dikeluarkan.',
        'Fees: dedupe (name, snapshot_date); the current DEX month is excluded.',
      ),
    ],
    limits: [
      l(
        'Snapshot CoinGecko tunggal (250 koin); stablecoin heuristik; TVL protokol dihitung ganda.',
        'Single CoinGecko snapshot (250 coins); heuristic stablecoins; protocol TVL double-counts.',
      ),
      l('Bot & yield = informasi saja; tanpa tautan referral.', 'Bots & yields = information only; no referral links.'),
    ],
  },
  centralbankdex: {
    dataset: 'Central Bank Balance Sheets & Global Liquidity (enriched)',
    rules: [
      l(
        'Nilai US harian dibawa antar-rilis → perubahan memakai titik perubahan.',
        'US daily values are carried between releases → changes use change points.',
      ),
    ],
    limits: [
      l(
        'Negara tahunan; agregat World Bank bukan negara; label rezim = label penyedia.',
        'Countries are annual; World Bank aggregates are not countries; regime labels are provider labels.',
      ),
    ],
  },
  inflationdex: {
    dataset: 'Global Inflation & Cost of Living Dataset',
    rules: [l('country_code_x dibuang; region di-trim.', 'country_code_x dropped; region trimmed.')],
    limits: [
      l(
        'Tahun inflasi berbeda per negara; indeks biaya hidup hanya 45 negara.',
        'Inflation year differs per country; cost-of-living index only for 45 countries.',
      ),
    ],
  },
  startupdex: {
    dataset: 'Global Startup Funding Rounds 2019–2026 (sampel 25%)',
    rules: [l('Default analitik memakai amount_status verified.', 'Analytics default to verified amounts.')],
    limits: [
      l(
        'Sampel 25%; mega-round mendominasi dolar; lisensi CC BY-NC 4.0.',
        '25% sample; mega-rounds dominate dollars; CC BY-NC 4.0.',
      ),
    ],
  },
  vcdex: {
    dataset: 'VC Investor Directory 2026 (sampel 25%)',
    rules: [l('Statistik dihitung di sampel.', 'Statistics computed on the sample.')],
    limits: [
      l(
        'Sampel 25%; tidak menjanjikan pendanaan; tanpa kontak pribadi; CC BY-NC 4.0.',
        '25% sample; no funding promises; no personal contacts; CC BY-NC 4.0.',
      ),
    ],
  },
  vcnetworkdex: {
    dataset: 'VC Co-Investment Network — 303k Investor Pairs (sampel 25%)',
    rules: [
      l(
        'Satu baris = satu pasangan tak berarah berbobot shared_deals.',
        'One row = one undirected pair weighted by shared_deals.',
      ),
    ],
    limits: [
      l('Derajat/partner dihitung di sampel; CC BY-NC 4.0.', 'Degrees/partners are sample counts; CC BY-NC 4.0.'),
    ],
  },
  opencompanydex: {
    dataset: 'Open Company Database 2026 (sampel 2%)',
    rules: [
      l(
        'Statistik dihitung di sampel; business_model dipisah "|".',
        'Statistics on the sample; business_model split by "|".',
      ),
    ],
    limits: [l('Sampel 2%; banyak kolom kosong; CC BY-NC 4.0.', '2% sample; many empty columns; CC BY-NC 4.0.')],
  },
  salarydex: {
    dataset: 'Global Salary Data by Skill & Role (sampel 16%)',
    rules: [l('Median ditampilkan hanya bila n ≥ 30.', 'Medians shown only when n ≥ 30.')],
    limits: [
      l(
        'Sampel 16%; USD dengan kurs tetap (bukan PPP); CC BY-NC 4.0.',
        '16% sample; USD at fixed FX (not PPP); CC BY-NC 4.0.',
      ),
    ],
  },
  costlivingdex: {
    dataset: 'Global City Cost of Living & Quality of Life Index',
    rules: [
      l(
        'Semua baris berpola sintetis (Numbeo/Mercer/EIU).',
        'Every row follows a synthetic pattern (Numbeo/Mercer/EIU).',
      ),
    ],
    limits: [l('DATA SINTETIS — bukan hasil survei nyata.', 'SYNTHETIC DATA — not real survey results.')],
  },
  idhousingdex: {
    dataset: 'Indonesia Affordable Housing (listing proyek)',
    rules: [
      l(
        'Duplikat identik dibuang (5.325); harga valid Rp50 jt–Rp100 M (2.223 di luar rentang dikecualikan).',
        'Exact duplicates removed (5,325); valid price Rp50m–Rp100bn (2,223 outside excluded).',
      ),
      l(
        'Harga/m² dihitung ulang; koordinat di luar Indonesia tidak dipetakan.',
        'Price/m² recomputed; coordinates outside Indonesia not mapped.',
      ),
    ],
    limits: [
      l(
        'Bukan nasihat KPR/pembelian; tanggal pengambilan tidak dicantumkan.',
        'Not mortgage/purchase advice; collection date not stated.',
      ),
    ],
  },
  idfooddeliverydex: {
    dataset: 'Indonesian Food Delivery Benchmark — 10k Menus',
    rules: [l('Markup = (online ÷ estimasi dine-in − 1) × 100.', 'Markup = (online ÷ estimated dine-in − 1) × 100.')],
    limits: [
      l(
        'Harga dine-in = estimasi penyedia; label tier/bias = label penyedia; tanpa tanggal.',
        'Dine-in price = provider estimate; tier/bias = provider labels; no date.',
      ),
    ],
  },
  povertydex: {
    dataset: 'Multidimensional Poverty Index (MPI)',
    rules: [l('Memakai actualValue (presisi penuh).', 'Uses actualValue (full precision).')],
    limits: [
      l(
        '108 negara; tahun survei berbeda; bukan kemiskinan moneter.',
        '108 countries; survey years differ; not monetary poverty.',
      ),
    ],
  },
  populationdex: {
    dataset: 'Population News Dataset 2019–2026',
    rules: [
      l(
        'Agregat & FINDINGS = hitungan penyedia; sampel artikel tanpa teks.',
        'Aggregates & FINDINGS = provider counts; article sample without text.',
      ),
    ],
    limits: [
      l(
        'Mengukur LIPUTAN BERITA, bukan jumlah penduduk; bulan terakhir parsial.',
        'Measures NEWS COVERAGE, not population counts; last month partial.',
      ),
    ],
  },
  homelessnessdex: {
    dataset: 'Homelessness News Dataset 2019–2026',
    rules: [
      l(
        'Agregat & FINDINGS = hitungan penyedia; sampel artikel tanpa teks.',
        'Aggregates & FINDINGS = provider counts; article sample without text.',
      ),
    ],
    limits: [
      l(
        'Mengukur LIPUTAN BERITA, bukan jumlah tunawisma; bulan terakhir parsial.',
        'Measures NEWS COVERAGE, not counts of homeless people; last month partial.',
      ),
    ],
  },
  housingdex: {
    dataset: 'Housing News Dataset 2019–2026',
    rules: [
      l(
        'Agregat & FINDINGS = hitungan penyedia; sampel artikel tanpa teks.',
        'Aggregates & FINDINGS = provider counts; article sample without text.',
      ),
    ],
    limits: [
      l(
        'Mengukur LIPUTAN BERITA; berbeda dengan IDHousingDex (listing Indonesia); bulan terakhir parsial.',
        'Measures NEWS COVERAGE; different from IDHousingDex (Indonesian listings); last month partial.',
      ),
    ],
  },
  fintechdex: {
    dataset: 'Fintech Product Adoption and Reviews (2026-09-08)',
    rules: [
      l(
        'Kolom whitelist saja; author/handle dibuang; spam/phishing dikecualikan dari agregat default.',
        'Whitelisted columns only; author/handles dropped; spam/phishing excluded from default aggregates.',
      ),
    ],
    limits: [
      l(
        'Sentimen = label otomatis penyedia; sampel media sosial; tanpa identitas penulis.',
        'Sentiment = provider automatic labels; social-media sample; no author identity.',
      ),
    ],
  },
  personalfinandex: {
    dataset: 'Personal Finance and Financial Independence (2026-09-16)',
    rules: [
      l(
        'Listing token (dexscreener, pump.fun) dikecualikan dari agregat default.',
        'Token listings (dexscreener, pump.fun) excluded from default aggregates.',
      ),
    ],
    limits: [l('Bukan nasihat keuangan; tanpa identitas penulis.', 'Not financial advice; no author identity.')],
  },
  mylaiwyer: {
    dataset: 'Dokumen hukum yang diunggah (UUD 1945 naskah asli, UU 1/1946; UU 8/1981 & UU 20/2025 menunggu unggahan)',
    rules: [
      l(
        'Identitas dokumen dari isi, bukan nama file; KUHP.pdf = duplikat KUHAP.pdf.',
        'Document identity from content, not file name; KUHP.pdf = duplicate of KUHAP.pdf.',
      ),
      l(
        'Chunk per pasal (batang tubuh & penjelasan) + per halaman; pencarian BM25.',
        'Chunks per article (body & elucidation) + per page; BM25 search.',
      ),
    ],
    limits: [
      l(
        'UUD = naskah asli sebelum perubahan; KUHP materiil, KUHPerdata, HIR/RBg belum tersedia.',
        'Constitution = original pre-amendment text; penal code, civil code, HIR/RBg not available.',
      ),
      l('Informasi hukum, bukan nasihat hukum.', 'Legal information, not legal advice.'),
    ],
  },
};
