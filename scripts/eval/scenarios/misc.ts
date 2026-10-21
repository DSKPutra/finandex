// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Mock-eval scenarios (group: misc) — InflationDex, CostLivingDex, PovertyDex, news Dex, IDHousingDex, My LAIwyer,
// NASDAQDex, SnP500Dex.
import type { ScenarioSet, ToolResult } from '../types.ts';
import { date, err, full, num, NOT_ADVICE, PENDING, pct, pctUnits, res } from './fmt.ts';

const SYN = 'Catatan: ini data sintetis (pola Numbeo/Mercer/EIU), bukan hasil survei nyata.';
const NEWS = 'Yang diukur adalah liputan berita, bukan jumlah kejadian di dunia nyata.';
const LAW = 'Ini informasi hukum umum, bukan nasihat hukum; untuk kasus nyata hubungi advokat atau LBH.';

const quote = (r: ToolResult[]) => {
  const d = res(r, 'get_pasal');
  return `${d.doc} Pasal ${d.pasal}${d.ayat ? ` ayat (${d.ayat})` : ''} (hal. ${d.page}): "${d.text}"${d.note ? `\n\nCatatan: ${d.note}` : ''}\n\n${LAW}`;
};
const unavailable = (r: ToolResult[], tool = 'search_law') => {
  const d = res(r, tool);
  return d.available === false
    ? `${d.message}\n\n${LAW}`
    : `Dokumen yang mengatur hal ini belum tersedia di Finandex, jadi saya tidak dapat mengutipnya. ${LAW}`;
};
const pendingStock = (ds: string, tool: string) => (r: ToolResult[]) =>
  `${err(r, tool) ? PENDING(ds) : ''} Silakan coba lagi setelah dataset diunggah.`;

export const scenarios: ScenarioSet = {
  // ------------------------------------------------------------------------------------------- InflationDex
  'inflationdex-01': {
    steps: [[{ tool: 'rank_countries', input: { limit: 5 } }]],
    answer: (r) => {
      const d = res(r, 'rank_countries').rows[0];
      return `Inflasi tahunan tertinggi di dataset adalah ${d.country}: ${pctUnits(d.value)} (tahun ${d.inflation_year}). Tahun data berbeda per negara, jadi tahun selalu disebut di samping nilai.`;
    },
  },
  'inflationdex-02': {
    steps: [[{ tool: 'country_inflation', input: { countries: ['Indonesia'] } }]],
    answer: (r) => {
      const d = res(r, 'country_inflation').rows[0];
      return `Menurut Global Inflation & Cost of Living Dataset, inflasi tahunan Indonesia adalah ${pctUnits(d.inflation_annual_pct)} pada tahun ${d.inflation_year}.`;
    },
  },
  'inflationdex-03': {
    steps: [[{ tool: 'inflation_stats', input: {} }]],
    answer: (r) => {
      const d = res(r, 'inflation_stats');
      const g = d.results[0];
      return `Median inflasi tahunan dari ${g.n} negara adalah ${pctUnits(g.value)}. Tahun data berbeda per negara (${Object.entries(
        d.inflation_year_counts,
      )
        .map(([y, n]) => `${y}: ${n} negara`)
        .join(', ')}), jadi angka ini bukan satu tahun yang sama.`;
    },
  },
  // ------------------------------------------------------------------------------------------- CostLivingDex
  'costlivingdex-01': {
    steps: [[{ tool: 'rank_cities', input: { metric: 'cost_of_living_index', limit: 5 } }]],
    answer: (r) => {
      const d = res(r, 'rank_cities');
      return `Pada survei ${date(d.survey_date)}, indeks biaya hidup tertinggi ada di ${d.rows[0].city} (${d.rows[0].country}) dengan nilai ${num(d.rows[0].value)}. ${SYN}`;
    },
  },
  'costlivingdex-02': {
    steps: [[{ tool: 'rank_cities', input: { metric: 'quality_of_life_index', limit: 5 } }]],
    answer: (r) => {
      const d = res(r, 'rank_cities');
      return `Indeks kualitas hidup tertinggi pada survei ${date(d.survey_date)}: ${d.rows[0].city} (${d.rows[0].country}), ${num(d.rows[0].value)}. ${SYN}`;
    },
  },
  'costlivingdex-03': {
    steps: [[{ tool: 'data_quality', input: {} }]],
    answer: (r) => {
      const q = res(r, 'data_quality').quality;
      return `Bukan. Semua ${q.rows} baris bertanda pola sintetis (${Object.entries(q.patterns)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')}). Jadi ini data sintetis, bukan hasil survei nyata; gunakan hanya untuk ilustrasi pola.`;
    },
  },
  // ------------------------------------------------------------------------------------------- PovertyDex
  'povertydex-01': {
    steps: [[{ tool: 'country_mpi', input: { country: 'Indonesia' } }]],
    answer: (r) => {
      const d = res(r, 'country_mpi');
      return `Nilai MPI Indonesia adalah ${num(d.mpi_value, 7)} (skala 0–1), dari survei tahun ${d.survey_year} (${d.survey_note}). Tahun survei berbeda per negara.`;
    },
  },
  'povertydex-02': {
    steps: [[{ tool: 'country_mpi', input: { country: 'Indonesia' } }]],
    answer: (r) => {
      const d = res(r, 'country_mpi');
      return `Sekitar ${pctUnits(d.headcount_pct)} penduduk Indonesia tergolong miskin multidimensi (headcount MPI), dengan intensitas ${pctUnits(d.intensity_pct)} — survei ${d.survey_year} (${d.survey_note}). Ini kemiskinan multidimensi, bukan kemiskinan moneter.`;
    },
  },
  'povertydex-03': {
    steps: [[{ tool: 'rank_mpi', input: { limit: 5 } }]],
    answer: (r) => {
      const d = res(r, 'rank_mpi').rows[0];
      return `MPI tertinggi di dataset: ${d.country} (${num(d.value, 4)}), tahun survei ${d.survey_year} (${d.survey_note}). Tahun survei berbeda per negara, jadi peringkat ini tidak berada pada satu tahun yang sama.`;
    },
  },
  // ------------------------------------------------------------------------------------------- news Dex
  'homelessnessdex-01': {
    steps: [[{ tool: 'coverage_trend', input: {} }]],
    answer: (r) => {
      const d = res(r, 'coverage_trend');
      return `Intensitas liputan berita tunawisma tertinggi terjadi pada ${d.peak_excluding_partial.month} dengan ${num(d.peak_excluding_partial.per_10k_news)} artikel per 10.000 berita (bulan parsial ${d.partial_month} dikecualikan). ${NEWS}`;
    },
  },
  'homelessnessdex-02': {
    steps: [[{ tool: 'coverage_geo', input: { level: 'country', limit: 5 } }]],
    answer: (r) => {
      const d = res(r, 'coverage_geo').rows[0];
      return `Dataset ini tidak memuat jumlah tunawisma; yang tersedia adalah liputan berita. Untuk ${d.name}, tercatat ${num(d.articles_2023_2026, 0)} artikel 2023–2026 (${num(d.share_pct)}% dari artikel yang cocok). ${NEWS}`;
    },
  },
  'housingdex-01': {
    steps: [[{ tool: 'coverage_geo', input: { level: 'country', limit: 5 } }]],
    answer: (r) => {
      const d = res(r, 'coverage_geo').rows[0];
      return `Negara yang paling banyak diberitakan soal perumahan (2023–2026) adalah ${d.name}: ${num(d.articles_2023_2026, 0)} artikel, porsi ${num(d.share_pct)}%. ${NEWS}`;
    },
  },
  'housingdex-02': {
    steps: [[{ tool: 'coverage_trend', input: {} }]],
    answer: (r) => {
      const d = res(r, 'coverage_trend');
      return `Bulan terakhir di data adalah ${d.latest.month} (${num(d.latest.per_10k_news)} per 10.000 berita), tetapi bulan itu masih parsial sehingga tidak dibandingkan dengan bulan lain. Puncak bulan lengkap: ${d.peak_excluding_partial.month} (${num(d.peak_excluding_partial.per_10k_news)}). ${NEWS}`;
    },
  },
  'populationdex-01': {
    steps: [[{ tool: 'tone_breakdown', input: { scope: 'sample' } }]],
    answer: (r) => {
      const d = res(r, 'tone_breakdown');
      const neg = d.results.find((x: { key: string }) => x.key === 'negative');
      return `Di sampel ${num(d.sample_rows, 0)} rekaman artikel (${date(d.sample_date_range[0])} – ${date(d.sample_date_range[1])}), porsi berita bernada negatif adalah ${pct(neg.value)}. ${NEWS}`;
    },
  },
  'populationdex-02': {
    steps: [[{ tool: 'coverage_geo', input: { level: 'country', limit: 5 } }]],
    answer: (r) => {
      const d = res(r, 'coverage_geo').rows[0];
      return `Negara yang paling banyak diberitakan soal populasi (2023–2026): ${d.name} dengan ${num(d.articles_2023_2026, 0)} artikel (${num(d.share_pct)}%). ${NEWS}`;
    },
  },
  // ------------------------------------------------------------------------------------------- IDHousingDex
  'idhousingdex-01': {
    steps: [[{ tool: 'housing_stats', input: { group_by: 'subsidy_status', stat: 'median' } }]],
    answer: (r) => {
      const g = res(r, 'housing_stats').results as { key: string; value: number }[];
      const v = (k: string) => g.find((x) => x.key === k)!.value;
      return `Median harga rumah subsidi Rp${full(v('subsidi'))} dibanding komersil Rp${full(v('komersil'))} (setelah duplikat dan harga tidak valid dibuang).`;
    },
  },
  'idhousingdex-02': {
    steps: [[{ tool: 'housing_stats', input: { group_by: 'province', stat: 'count', limit: 5 } }]],
    answer: (r) => {
      const g = res(r, 'housing_stats').results[0];
      return `Provinsi dengan listing perumahan terbanyak adalah ${g.key} dengan ${num(g.value, 0)} listing.`;
    },
  },
  'idhousingdex-03': {
    steps: [[{ tool: 'housing_stats', input: { group_by: 'developer_association', stat: 'share', limit: 5 } }]],
    answer: (r) => {
      const g = res(r, 'housing_stats').results[0];
      return `Asosiasi pengembang paling dominan adalah ${g.key} dengan porsi ${pct(g.value)} listing.`;
    },
  },
  'idhousingdex-04': {
    steps: [[{ tool: 'price_per_m2', input: { group_by: 'subsidy_status' } }]],
    answer: (r) => {
      const g = res(r, 'price_per_m2').results.find((x: { key: string }) => x.key === 'subsidi');
      return `Median harga per m² bangunan rumah subsidi adalah Rp${full(g.value)} (dihitung ulang dari harga ÷ luas bangunan, n = ${num(g.n, 0)}).`;
    },
  },
  'idhousingdex-05': {
    steps: [[{ tool: 'data_quality', input: {} }]],
    answer: (r) => {
      const q = res(r, 'data_quality').quality;
      return `File mentah berisi ${num(q.rows_raw, 0)} baris. Sebanyak ${num(q.duplicates, 0)} duplikat identik dibuang dan ${num(q.price_invalid, 0)} baris dengan harga di luar rentang valid dikecualikan, sehingga jumlah data analisis lebih kecil. Selain itu, CSV memiliki sel multi-baris sehingga jumlah baris file tidak sama dengan jumlah rekaman.`;
    },
  },
  'idhousingdex-06': {
    steps: [[{ tool: 'housing_stats', input: { group_by: 'subsidy_status', stat: 'median' } }]],
    answer: (r) => {
      const g = res(r, 'housing_stats').results as { key: string; value: number }[];
      return `Saya tidak dapat memilihkan rumah atau KPR untuk Anda — ini bukan nasihat pembelian maupun bukan nasihat keuangan. Sebagai gambaran data historis: median harga ${g.map((x) => `${x.key} Rp${full(x.value)}`).join(' dan ')}. Konsultasikan kemampuan cicilan dengan bank atau perencana keuangan.`;
    },
  },
  // ------------------------------------------------------------------------------------------- My LAIwyer
  'mylaiwyer-01': {
    pendingData: 'UU 8/1981 (KUHP_Lama.pdf, input #30) belum diunggah — definisi Penyidik tidak dapat dikutip',
    steps: [[{ tool: 'search_law', input: { query: 'definisi penyidik', doc: 'UU 8/1981' } }]],
    answer: (r) => unavailable(r),
  },
  'mylaiwyer-02': {
    steps: [[{ tool: 'search_law', input: { query: 'mulai berlaku', doc: 'UU 20/2025' } }]],
    answer: (r) => {
      const d = res(r, 'search_law');
      return `Menurut registri sumber Finandex, UU 20/2025 (KUHAP baru) mulai berlaku ${date(d.effective_date_registry)}. Namun teks dokumennya belum tersedia di Finandex, sehingga klausul berlakunya belum dapat dikutip langsung. ${LAW}`;
    },
  },
  'mylaiwyer-03': {
    steps: [[{ tool: 'search_law', input: { query: 'ancaman pidana pencurian KUHP baru' } }]],
    answer: (r) => unavailable(r),
  },
  'mylaiwyer-04': {
    steps: [[{ tool: 'search_law', input: { query: 'gugatan cerai hukum perdata' } }]],
    answer: (r) => unavailable(r),
  },
  'mylaiwyer-05': {
    steps: [[{ tool: 'search_law', input: { query: 'penangkapan surat perintah penangkapan' } }]],
    answer: (r) => {
      const d = res(r, 'search_law');
      return `Aturan penangkapan ada di hukum acara pidana (KUHAP), tetapi teksnya (${(d.not_indexed ?? []).join(', ')}) belum tersedia di Finandex, jadi saya tidak dapat mengutip pasalnya. Segera hubungi advokat atau LBH terdekat untuk pendampingan; dalam keadaan darurat keselamatan hubungi 112. Ini informasi hukum umum, bukan nasihat hukum.`;
    },
  },
  'mylaiwyer-06': { steps: [[{ tool: 'get_pasal', input: { doc: 'UU 1/1946', pasal: '6' } }]], answer: quote },
  'mylaiwyer-07': {
    steps: [[{ tool: 'search_law', input: { query: 'Pasal 362 KUHP lama pencurian' } }]],
    answer: (r) => `${unavailable(r)} UU 1/1946 yang tersedia hanya dasar berlakunya KUHP lama, bukan teks lengkapnya.`,
  },
  'mylaiwyer-08': { steps: [[{ tool: 'get_pasal', input: { doc: 'UUD 1945', pasal: '1', ayat: 1 } }]], answer: quote },
  'mylaiwyer-09': { steps: [[{ tool: 'get_pasal', input: { doc: 'UUD 1945', pasal: '1', ayat: 2 } }]], answer: quote },
  'mylaiwyer-10': {
    steps: [[{ tool: 'data_quality', input: {} }]],
    answer: (r) => {
      const d = res(r, 'data_quality').quality.documents;
      const dup = d.documents.find((x: { file: string }) => x.file === 'KUHP.pdf');
      return `Tidak. KUHP.pdf ${d.kuhp_pdf_is_identical_to_kuhap_pdf ? 'byte-identik dengan KUHAP.pdf' : String(dup?.role)}: isinya KUHAP (UU 8/1981 versi kompilasi), bukan KUHP, sehingga dikecualikan dari indeks.`;
    },
  },
  // ------------------------------------------------------------------------------------------- NASDAQDex (pending data)
  'nasdaqdex-01': {
    pendingData: 'NASDAQ dataset (input #2) not uploaded',
    steps: [[{ tool: 'get_snapshot', input: { id: 'NVDA' } }]],
    answer: pendingStock('NASDAQ', 'get_snapshot'),
  },
  'nasdaqdex-02': {
    pendingData: 'NASDAQ dataset (input #2) not uploaded',
    steps: [[{ tool: 'rank', input: { metric: 'ret_1Y', order: 'desc', limit: 5 } }]],
    answer: pendingStock('NASDAQ', 'rank'),
  },
  'nasdaqdex-03': {
    pendingData: 'NASDAQ dataset (input #2) not uploaded',
    steps: [[{ tool: 'get_snapshot', input: { id: 'TSLA' } }]],
    answer: pendingStock('NASDAQ', 'get_snapshot'),
  },
  'nasdaqdex-04': {
    pendingData: 'NASDAQ dataset (input #2) not uploaded',
    steps: [[{ tool: 'pulse', input: {} }]],
    answer: pendingStock('NASDAQ', 'pulse'),
  },
  'nasdaqdex-05': {
    pendingData: 'NASDAQ dataset (input #2) not uploaded',
    steps: [[{ tool: 'data_quality', input: { id: 'NFLX' } }]],
    answer: pendingStock('NASDAQ', 'data_quality'),
  },
  'nasdaqdex-06': {
    steps: [
      [
        {
          tool: 'open_dex',
          input: { dexId: 'snp500dex', entity: 'AAPL', reason: 'dividen tidak ada di dataset NASDAQ' },
        },
      ],
    ],
    answer: () =>
      `Dataset NASDAQDex tidak memuat dividen, jadi dividend yield AAPL tidak dapat dihitung di sini. Data dividen tersedia di SnP500Dex — gunakan tombol di atas untuk membukanya. ${NOT_ADVICE}`,
  },
  'nasdaqdex-07': {
    pendingData: 'NASDAQ dataset (input #2) not uploaded — the extreme_move flag cannot be shown',
    steps: [[{ tool: 'data_quality', input: { id: 'SMCI' } }]],
    answer: (r) => `Saya perlu memeriksa kualitas data untuk ini. ${pendingStock('NASDAQ', 'data_quality')(r)}`,
  },
  // ------------------------------------------------------------------------------------------- SnP500Dex (pending data)
  'snp500dex-01': {
    pendingData: 'S&P 500 dataset (input #3) not uploaded',
    steps: [[{ tool: 'dividends', input: { ticker: 'KO' } }]],
    answer: pendingStock('S&P 500', 'dividends'),
  },
  'snp500dex-02': {
    pendingData: 'S&P 500 dataset (input #3) not uploaded',
    steps: [[{ tool: 'rank', input: { metric: 'dividend_increase_streak_years', order: 'desc', limit: 5 } }]],
    answer: pendingStock('S&P 500', 'rank'),
  },
  'snp500dex-03': {
    pendingData: 'S&P 500 dataset (input #3) not uploaded',
    steps: [[{ tool: 'simulate_investment', input: { ticker: 'MSFT', start: '2010-01-04', amount_usd: 10000 } }]],
    answer: (r) =>
      `${pendingStock('S&P 500', 'simulate_investment')(r)} Simulasi historis bukan rekomendasi investasi.`,
  },
  'snp500dex-04': {
    pendingData: 'S&P 500 dataset (input #3) not uploaded',
    steps: [[{ tool: 'splits', input: { ticker: 'AAPL' } }]],
    answer: pendingStock('S&P 500', 'splits'),
  },
  'snp500dex-05': {
    pendingData: 'S&P 500 dataset (input #3) not uploaded',
    steps: [[{ tool: 'total_vs_price_return', input: { ticker: 'JNJ', periods: ['5Y'] } }]],
    answer: pendingStock('S&P 500', 'total_vs_price_return'),
  },
  'snp500dex-06': {
    pendingData: 'S&P 500 dataset (input #3) not uploaded',
    steps: [[{ tool: 'get_snapshot', input: { id: 'EA' } }]],
    answer: (r) => `${pendingStock('S&P 500', 'get_snapshot')(r)} Riwayat harga EA juga tercatat pendek di dataset.`,
  },
};
