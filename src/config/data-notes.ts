// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Data tab content per Dex (§9, §12.3): cleaning rules that affect results, limitations, provider and
// attribution — summarised from master prompt §4 (the ETL in scripts/data implements them exactly).
import type { DexId } from './dex-registry';

type B = { id: string; en: string };
export type DataNote = { rules: B[]; limits: B[]; provider?: B; attribution?: B[] };

const b = (id: string, en: string): B => ({ id, en });

const COMMON_TS: B[] = [
  b('Return sederhana; CAGR hanya untuk periode ≥ 1 tahun; offset kalender di-clamp ke akhir bulan.', 'Simple returns; CAGR only for periods ≥ 1 year; calendar offsets clamp to month end.'),
  b('Korelasi/beta: harga disejajarkan pada tanggal yang sama dulu, baru dihitung return-nya.', 'Correlation/beta: prices are aligned on common dates first, then returns are computed.'),
  b('52W, ATH, SMA, dan RSI memakai harga close.', '52W, ATH, SMA, and RSI use closing prices.'),
];
const NEWS_RULES: B[] = [
  b('Yang diukur adalah liputan berita, bukan jumlah kejadian nyata.', 'What is measured is news coverage, not real-world counts.'),
  b('Bulan terakhir (parsial) dikecualikan dari perbandingan tren.', 'The last (partial) month is excluded from trend comparisons.'),
  b('Temuan FINDINGS.md disajikan sebagai temuan penyedia beserta grade (A/B/C).', 'FINDINGS.md results are shown as provider findings with their grade (A/B/C).'),
  b('Sampel artikel tidak memuat teks artikel; tautan API penyedia tidak pernah diambil.', 'The article sample has no article text; provider API links are never fetched.'),
];
const SOCIAL_RULES: B[] = [
  b('Hanya kolom whitelist yang diproses; penulis, jumlah pengikut, dan mention dibuang; handle diganti [pengguna].', 'Only whitelisted columns are processed; author, follower counts, and mentions are dropped; handles become [user].'),
  b('Baris spam/phishing dikecualikan dari agregat default.', 'Spam/phishing rows are excluded from default aggregates.'),
  b('Label sentimen adalah label penyedia (VADER/LLM).', 'Sentiment labels are provider labels (VADER/LLM).'),
];
const NC = b('Lisensi CC BY-NC 4.0 (Fliar Research): hanya penggunaan non-komersial.', 'CC BY-NC 4.0 licence (Fliar Research): non-commercial use only.');
const SAMPLE = (pct: string) => b(`Sampel ${pct} dari dataset penuh penyedia; angka berlaku untuk sampel.`, `${pct} sample of the provider's full dataset; figures describe the sample.`);

export const DATA_NOTES: Record<DexId, DataNote> = {
  'finandex-ai': {
    rules: [...COMMON_TS, b('Candlestick saja: high/low tampil = max/min(o,h,l,c) bila close di luar rentang; analitik memakai close.', 'Candles only: displayed high/low = max/min(o,h,l,c) when close is outside the range; analytics use close.'), b('Volume mata uang selalu 0 → panel volume disembunyikan.', 'Currency volume is always 0 → volume panel hidden.')],
    limits: [b('WTI close negatif pada 2020-04-20 (nyata); skala log dinonaktifkan untuk seri ≤ 0.', 'WTI closed negative on 2020-04-20 (real); log scale disabled for series ≤ 0.'), b('JPYUSD=X dan INRUSD=X presisi rendah (4 desimal).', 'JPYUSD=X and INRUSD=X are low precision (4 decimals).'), b('Kuotasi FX = USD per 1 unit mata uang asing; bar FX bisa bergeser satu hari dari peristiwa.', 'FX quotes = USD per 1 unit of foreign currency; FX bars can be one day off the event date.')],
  },
  nasdaqdex: {
    rules: [...COMMON_TS, b('Buang close ≤ 0; spike satu hari pulang-pergi dibuang; tanggal sistemik → reliable_from per ticker.', 'Drop close ≤ 0; one-day round-trip spikes removed; systemic dates → per-ticker reliable_from.'), b('Pergerakan ekstrem (≥ +100% / ≤ −50%) dipertahankan tetapi diberi flag.', 'Extreme moves (≥ +100% / ≤ −50%) are kept but flagged.')],
    limits: [b('Harga ter-adjust sumber; tanpa volume dan dividen.', 'Source-adjusted prices; no volume or dividends.'), b('Indeks equal-weight universe memiliki bias survivorship.', 'The equal-weight universe index has survivorship bias.')],
  },
  snp500dex: {
    rules: [...COMMON_TS, b('Return & risiko memakai Adj Close (total return); harga tampil memakai Close.', 'Returns & risk use Adj Close (total return); displayed prices use Close.'), b('Dividen TTM, streak, dan simulator mengikuti §4.3; volume 0 = tidak tersedia.', 'TTM dividends, streaks, and the simulator follow §4.3; zero volume = unavailable.')],
    limits: [b('Benchmark ^GSPC adalah indeks harga (tanpa dividen).', 'The ^GSPC benchmark is a price index (no dividends).'), b('Dividen khusus dapat mengganggu streak.', 'Special dividends can break streaks.')],
  },
  commercedex: {
    rules: [...COMMON_TS, b('Return memakai adj_close; harga dalam mata uang listing; company_metrics.csv tidak dipakai (dihitung ulang).', 'Returns use adj_close; prices in listing currency; company_metrics.csv is not used (recomputed).')],
    limits: [b('Mata uang laporan keuangan berbeda untuk alibaba, jdcom, pinduoduo, vipshop (CNY) dan stoneco (BRL); angka absolut tidak dibandingkan lintas mata uang.', 'Financial statement currency differs for alibaba, jdcom, pinduoduo, vipshop (CNY) and stoneco (BRL); absolute figures are not compared across currencies.'), b('Hari indeks dengan konstituen turun > 20% ditandai parsial.', 'Index days where constituents drop > 20% are marked partial.')],
    provider: b('Param Pratap', 'Param Pratap'),
    attribution: [b('Dataset CC BY 4.0 (Param Pratap).', 'Dataset CC BY 4.0 (Param Pratap).'), b('Teks Wikipedia (wiki_extract) CC BY-SA 4.0.', 'Wikipedia text (wiki_extract) CC BY-SA 4.0.'), b('Data World Bank CC BY 4.0; Wikidata CC0.', 'World Bank data CC BY 4.0; Wikidata CC0.')],
  },
  ipodex: {
    rules: [b('Hanya listing_status = Completed dihitung sebagai IPO tercatat.', 'Only listing_status = Completed counts as a listed IPO.'), b('Ukuran IPO default memakai amount_status = verified.', 'IPO size defaults to amount_status = verified.')],
    limits: [SAMPLE('38%'), b('Kutipan berita selalu dengan sumber & tautan.', 'News excerpts always shown with source & link.')],
    attribution: [NC],
  },
  idfinandex: {
    rules: [...COMMON_TS, b('Nilai yang sama persis dengan hari sebelumnya = carry-forward hari libur, dikecualikan dari return.', 'Values identical to the previous day = holiday carry-forward, excluded from returns.'), b('USDIDR: cetakan rusak dibuang dengan aturan FX.', 'USDIDR: bad prints removed with the FX rule.'), b('Tidak memakai ffill().bfill() (mencegah look-ahead).', 'No ffill().bfill() (prevents look-ahead).')],
    limits: [b('CPI = inflasi tahunan (%), bukan indeks harga; suku bunga tidak dinormalisasi ke basis 100.', 'CPI = annual inflation (%), not a price index; rates are not rebased to 100.')],
  },
  rupiahdex: {
    rules: [b('Tanggal = 10 karakter pertama kolom Date (tanpa konversi zona waktu).', 'Date = first 10 characters of the Date column (no time-zone conversion).'), b('Aturan bad print FX iteratif: spike pulang-pergi & dataran vs median bergulir 11 baris.', 'Iterative FX bad-print rule: round-trip spikes & plateaus vs an 11-row rolling median.'), b('Konversi memakai close pada/sebelum tanggal yang diminta.', 'Conversion uses the close on/before the requested date.')],
    limits: [b('USD/IDR naik = rupiah melemah.', 'USD/IDR up = rupiah weaker.'), b('Data setelah tanggal terakhir dataset berasal dari kurs referensi ECB (bukan harga penutupan pasar); batasnya ditandai source_switch_date.', "Data after the dataset's last date comes from ECB reference rates (not market closes); the boundary is marked by source_switch_date.")],
    attribution: [b('Sumber: ECB statistics (kurs referensi euro). USD/IDR dihitung Finandex dari dua kurs referensi ECB tanpa mengubah nilai aslinya.', 'Source: ECB statistics (euro reference rates). USD/IDR is calculated by Finandex from two ECB reference rates without modifying the original values.')],
  },
  idxdex: {
    rules: [...COMMON_TS, b('Baris kosong dibuang; Adj Close ≤ 0 dikecualikan dari seri total return; spike rule §4.2.', 'Empty rows dropped; Adj Close ≤ 0 excluded from total-return series; §4.2 spike rule.'), b('Rasio dihitung pada FY terbaru yang tersedia; EPS ≤ 0 → PER "n/m".', 'Ratios use the latest available FY; EPS ≤ 0 → P/E "n/m".')],
    limits: [b('Harga s/d 2024-05-17; fundamental per FY terbaru (FY2023 tidak lengkap).', 'Prices up to 2024-05-17; fundamentals per latest FY (FY2023 incomplete).'), b('Sektor hanya tersedia untuk emiten e-IPO (2021+). DER kurang relevan untuk bank.', 'Sector only available for e-IPO issuers (2021+). DER is less relevant for banks.')],
  },
  reksadex: {
    rules: [b('Baris aktif: NAB > 0, unit > 0, NAB/unit > 0; return bulanan hanya untuk bulan berurutan.', 'Active rows: AUM > 0, units > 0, NAV/unit > 0; monthly returns only for consecutive months.'), b('Return bulanan ekstrem diberi flag dan dikecualikan dari agregat.', 'Extreme monthly returns are flagged and excluded from aggregates.')],
    limits: [b('Semua NAB dalam Rupiah, termasuk produk USD (return memuat efek kurs).', 'All AUM/NAV in rupiah, including USD products (returns include FX effects).'), b('Return mengabaikan pembagian hasil.', 'Returns ignore distributions.')],
  },
  cryptdex: {
    rules: [b('ID aset = nama file (TON → GRAM satu aset); spike rule §4.2; anualisasi 365.', 'Asset id = file name (TON → GRAM is one asset); §4.2 spike rule; 365-day annualisation.'), b('Stablecoin = heuristik (harga ±3% dari US$1 + nama).', 'Stablecoins = heuristic (price ±3% of US$1 + name).'), b('Kategori CEX dikecualikan dari DeFi; bulan berjalan dibuang dari agregat bulanan.', 'CEX category excluded from DeFi; the current month is dropped from monthly aggregates.'), b('Fees: dedupe (name, snapshot_date); daftar chain di-parse tanpa eval.', 'Fees: dedupe (name, snapshot_date); chain lists parsed without eval.')],
    limits: [b('Dominasi dihitung dari total 250 koin snapshot, bukan seluruh pasar.', 'Dominance is computed from the 250-coin snapshot total, not the whole market.'), b('Jumlah TVL semua protokol ≈ 3× TVL headline (hitung ganda) — hanya untuk perbandingan kategori.', 'Sum of all protocol TVL ≈ 3× headline TVL (double counting) — only for comparing categories.'), b('Tautan referral bot tidak ditampilkan; hanya source_url.', 'Bot referral links are not shown; only source_url.')],
    attribution: [b('Bot & AI Agent: CC BY 4.0 (TelegramTrading.net).', 'Bots & AI Agents: CC BY 4.0 (TelegramTrading.net).'), b('Data DeFi: DefiLlama (sebagaimana tertulis di dataset).', 'DeFi data: DefiLlama (as stated in the dataset).')],
  },
  centralbankdex: {
    rules: [b('Agregat World Bank dikecualikan dari peringkat negara.', 'World Bank aggregates are excluded from country rankings.'), b('Perubahan memakai titik saat nilai berubah (nilai harian dibawa di antara rilis).', 'Changes use points where the value changes (daily values are carried between releases).')],
    limits: [b('Label rezim adalah label penyedia; cot_rationale & evidence_span tidak ditampilkan.', 'Regime labels are provider labels; cot_rationale & evidence_span are not shown.'), b('Satuan berbeda per kolom (juta USD, juta EUR, 100 juta JPY, triliun USD).', 'Units differ per column (USD mn, EUR mn, JPY 100 mn, USD tn).')],
  },
  inflationdex: {
    rules: [b('ISO3 dari country_code_y; region di-trim.', 'ISO3 from country_code_y; region trimmed.')],
    limits: [b('Tahun inflasi berbeda per negara — tahun selalu ditampilkan.', 'Inflation year differs per country — the year is always shown.'), b('Harga barang hanya untuk 45 negara; bisa berbeda dari IDFinanDex (tidak direkonsiliasi).', 'Goods prices only for 45 countries; may differ from IDFinanDex (not reconciled).')],
    attribution: [b('Data inflasi terbaru: World Bank, World Development Indicators (FP.CPI.TOTL.ZG), CC BY 4.0.', 'Latest inflation data: World Bank, World Development Indicators (FP.CPI.TOTL.ZG), CC BY 4.0.')],
  },
  startupdex: {
    rules: [b('Analitik default memakai amount_status = verified.', 'Default analytics use amount_status = verified.'), b('Mega-round = ≥ US$100 juta.', 'Mega-round = ≥ US$100 million.')],
    limits: [SAMPLE('25%'), b('Kutipan berita selalu dengan sumber & tautan.', 'News excerpts always shown with source & link.')],
    attribution: [NC],
  },
  vcdex: { rules: [b('Kolom daftar dipisah "; ".', 'List columns split on "; ".')], limits: [SAMPLE('25%'), b('Tidak ada kontak pribadi; bukan janji pendanaan.', 'No personal contacts; not a funding promise.')], attribution: [NC] },
  vcnetworkdex: { rules: [b('Satu baris = satu pasangan tak berarah berbobot shared_deals; derajat dihitung di sampel.', 'One row = one undirected pair weighted by shared_deals; degree computed within the sample.')], limits: [SAMPLE('25%')], attribution: [NC] },
  opencompanydex: { rules: [b('business_model dipisah "|".', 'business_model split on "|".')], limits: [SAMPLE('2%'), b('employees_range sebagian besar kosong.', 'employees_range is mostly empty.')], attribution: [NC] },
  salarydex: {
    rules: [b('Median hanya ditampilkan bila n ≥ 30.', 'Medians shown only when n ≥ 30.'), b('skills dipisah "|".', 'skills split on "|".')],
    limits: [SAMPLE('16%'), b('Gaji USD memakai satu tabel kurs tetap — bukan PPP.', 'USD salaries use one fixed FX table — not PPP.')],
    attribution: [NC],
  },
  costlivingdex: { rules: [b('Dua survei (2023, 2024) dibandingkan per kota.', 'Two surveys (2023, 2024) compared per city.')], limits: [b('DATA SINTETIS (pola Numbeo/Mercer/EIU), bukan hasil survei nyata.', 'SYNTHETIC DATA (Numbeo/Mercer/EIU pattern), not real survey results.')] },
  idhousingdex: {
    rules: [b('Duplikat identik dibuang; harga valid Rp50 jt–Rp100 M; koordinat di luar Indonesia tidak dipetakan.', 'Identical duplicates removed; valid prices Rp50 mn–Rp100 bn; coordinates outside Indonesia are not mapped.'), b('Harga/m² dihitung ulang dari harga ÷ luas; bedrooms = 0 = tidak dilaporkan.', 'Price/m² recomputed from price ÷ area; bedrooms = 0 = not reported.')],
    limits: [b('Data listing, bukan penilaian properti.', 'Listing data, not a property valuation.')],
  },
  idfooddeliverydex: {
    rules: [b('markup = (online ÷ dine-in − 1) × 100.', 'markup = (online ÷ dine-in − 1) × 100.')],
    limits: [b('Harga dine-in adalah estimasi penyedia; tanggal pengambilan data tidak dicantumkan.', 'Dine-in price is a provider estimate; collection date not stated.'), b('Kolom tier/bias adalah label penyedia.', 'Tier/bias columns are provider labels.')],
  },
  povertydex: { rules: [b('Memakai actualValue (presisi penuh), bukan value.', 'Uses actualValue (full precision), not value.')], limits: [b('Tahun survei berbeda per negara (DHS/MICS).', 'Survey year differs per country (DHS/MICS).'), b('Berisi 108 negara (nama file menyebut 193).', 'Contains 108 countries (the file name says 193).')] },
  populationdex: { rules: NEWS_RULES, limits: [] },
  homelessnessdex: { rules: NEWS_RULES, limits: [b('Topik sensitif: tanpa kasus individu.', 'Sensitive topic: no individual cases.')] },
  housingdex: { rules: NEWS_RULES, limits: [b('Berbeda dari IDHousingDex (listing perumahan Indonesia).', 'Different from IDHousingDex (Indonesian housing listings).')] },
  fintechdex: { rules: SOCIAL_RULES, limits: [b('Konten pihak ketiga; bukan rekomendasi produk.', 'Third-party content; not a product recommendation.')] },
  personalfinandex: { rules: [...SOCIAL_RULES, b('Listing token (dexscreener, pump.fun) dikecualikan dari agregat default.', 'Token listings (dexscreener, pump.fun) are excluded from default aggregates.')], limits: [b('Diskusi publik, bukan nasihat keuangan.', 'Public discussion, not financial advice.')] },
  mylaiwyer: {
    rules: [
      b('Identitas dokumen unggahan (#30–#35) ditentukan dari isi, bukan nama file; KUHP.pdf (duplikat KUHAP.pdf) dikecualikan.', 'Uploaded documents (#30–#35) are identified from content, not file names; KUHP.pdf (duplicate of KUHAP.pdf) is excluded.'),
      b('Dokumen resmi lain diunduh dari domain pemerintah yang diizinkan katalog, diverifikasi (nomor, tahun, judul di hal. 1–3; anchor pasal; SHA-256) dan dikunci di regulations.lock.json.', 'Other official documents are downloaded from government domains allowed by the catalogue, verified (number, year, title on pp. 1–3; article anchors; SHA-256) and pinned in regulations.lock.json.'),
      b('Teks per halaman dinormalisasi; heading pasal dideteksi dengan regex toleran OCR; pencarian BM25 per corpus.', 'Per-page text normalised; article headings detected with an OCR-tolerant regex; BM25 search per corpus.'),
    ],
    attribution: [b('Katalog regulasi & alur Konsultasi Terpandu: karya Finandex (kit). Teks peraturan dari situs resmi; peraturan tidak dilindungi hak cipta (UU 28/2014 Pasal 42).', 'Regulation catalogue & guided-consultation flows: Finandex (kit). Regulation texts from official sites; statutes are not copyrighted (Law 28/2014 Art. 42).')],
    limits: [
      b('Informasi hukum, bukan nasihat hukum. Untuk kasus nyata, hubungi advokat atau LBH.', 'Legal information, not legal advice. For real cases, contact a lawyer or legal aid institute.'),
      b('Dokumen berstatus "menunggu dokumen" tidak dikutip; ringkasan katalog selalu berlabel.', 'Documents marked "pending" are never quoted; catalogue summaries are always labelled.'),
      b('UU 20/2025 adalah pindaian OCR; beberapa heading pasal tidak terdeteksi.', 'Law 20/2025 is an OCR scan; some article headings were not detected.'),
    ],
  },
  finlaiwyer: {
    rules: [
      b('Corpus "keuangan": dokumen resmi diunduh dari domain pemerintah yang diizinkan, diverifikasi, dan dikunci SHA-256 (regulations.lock.json).', 'Corpus "keuangan": official documents downloaded from allowed government domains, verified, and pinned by SHA-256 (regulations.lock.json).'),
      b('Status (berlaku/dicabut) dan relasi ubah/cabut dari katalog; dokumen dicabut tetap tampil sebagai riwayat.', 'Status (in force/revoked) and amend/revoke relations from the catalogue; revoked documents remain as history.'),
      b('Ancaman pidana UU sektoral dibaca bersama lampiran UU 1/2026 (halaman lampiran ditautkan; teks lampiran hasil OCR).', 'Penalties in sectoral laws are read together with the UU 1/2026 annex (annex pages linked; annex text is OCR).'),
    ],
    attribution: [b('Katalog, alur, dan kanal: karya Finandex atas informasi publik (kit). Tidak berafiliasi dengan OJK, BI, IASC, atau Polri.', 'Catalogue, flows, and channels: Finandex work on public information (kit). Not affiliated with OJK, BI, IASC, or Polri.')],
    limits: [
      b('Informasi hukum keuangan, bukan nasihat hukum; Finandex tidak meneruskan laporan dan tidak dapat memulihkan dana.', 'Financial-law information, not legal advice; Finandex does not forward reports and cannot recover funds.'),
      b('Ringkasan katalog bukan kutipan; dokumen "menunggu dokumen" tidak dikutip.', 'Catalogue summaries are not quotations; pending documents are never quoted.'),
    ],
  },
  antiscamdex: {
    rules: [
      b('Seri kumulatif hanya memakai titik bertanggal pasti; titik dari judul berita ditandai; observasi berpresisi bulan tampil di tabel.', 'Cumulative series use exact-date points only; headline-only points are marked; month-precision observations appear in tables.'),
      b('Validator menolak seri kumulatif yang menurun; laporan via PUJK + langsung = total pada tanggal potong terbaru.', 'The validator rejects decreasing cumulative series; reports via PUJK + direct = total at the latest cut-off.'),
      b('Perbedaan angka antar-media tidak direkonsiliasi; keduanya ditampilkan dengan sumbernya.', 'Differences between media figures are not reconciled; both are shown with their sources.'),
    ],
    attribution: [b('Ringkasan karya Finandex atas informasi publik OJK, BI, portal IASC, Satgas PASTI, dan media; setiap fakta beratribusi + tautan. Tanpa logo lembaga.', 'Finandex summary of public information from OJK, BI, the IASC portal, Satgas PASTI, and media; every fact attributed + linked. No institutional logos.')],
    limits: [
      b('Finandex bukan IASC dan tidak berafiliasi dengan lembaga tersebut. Laporan resmi hanya di iasc.ojk.go.id.', 'Finandex is not IASC and is not affiliated with those institutions. Official reports only at iasc.ojk.go.id.'),
      b('Statistik per tanggal potong; diperbarui dengan menambah observasi bersumber.', 'Statistics are per cut-off date; updated by adding sourced observations.'),
    ],
  },
};
