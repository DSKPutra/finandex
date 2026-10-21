// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Mock-eval scenarios (group: people): fintech/personal-finance social data, salaries, startups, food delivery,
// companies, VC network/directory and IPOs.
import { fmtMonth } from '../../../src/shared/format.ts';
import type { ScenarioSet, ToolResult } from '../types.ts';
import { date, NOT_ADVICE, num, pct, res } from './fmt.ts';

const INFO = { tool: 'dataset_info', input: {} };
/** "per <as-of>, dataset <name>" from dataset_info (as_of may be a date, a month, a year or a note) */
const src = (r: ToolResult[]) => {
  const d = res(r, 'dataset_info');
  const a = String(d.as_of ?? '');
  const when = /^\d{4}-\d{2}-\d{2}/.test(a) ? date(a) : /^\d{4}-\d{2}$/.test(a) ? fmtMonth(a, 'id') : a;
  return `dataset ${d.dataset}, data per ${when}`;
};
const usd = (x: unknown) => `${num(x, 0)} USD`;

export const scenarios: ScenarioSet = {
  // ── FintechDex ──
  'fintechdex-01': {
    steps: [[INFO, { tool: 'sentiment_overview', input: { include_all: true } }]],
    answer: (r) => {
      const d = res(r, 'sentiment_overview');
      const a = d.results[0];
      return `Dari ${num(a.n, 0)} unggahan/ulasan (${src(r)}), porsi sentimen negatif adalah ${pct(a.negative)}; netral ${pct(a.neutral)} dan positif ${pct(a.positive)}. Sentimen adalah label otomatis dari penyedia data dan ini sampel media sosial, bukan survei representatif.`;
    },
  },
  'fintechdex-02': {
    steps: [[INFO, { tool: 'sentiment_overview', input: { group_by: 'platform', include_all: true } }]],
    answer: (r) => {
      const [a, b] = res(r, 'sentiment_overview').results;
      return `Platform dengan data terbanyak adalah ${a.key} (${num(a.n, 0)} unggahan), disusul ${b.key} (${num(b.n, 0)}); ${src(r)}. Komposisi platform mencerminkan cara data dikumpulkan, bukan popularitas produk fintech.`;
    },
  },
  'fintechdex-03': {
    steps: [],
    answer: () =>
      'Demi privasi, Finandex tidak menyimpan maupun menampilkan nama atau handle penulis, jadi saya tidak dapat menyebut akun tertentu. Saya bisa menunjukkan topik atau platform yang paling banyak berisi keluhan (sentimen negatif) bila Anda mau.',
  },

  // ── PersonalFinanDex ──
  'personalfinandex-01': {
    steps: [[INFO, { tool: 'sentiment_overview', input: { include_all: true } }]],
    answer: (r) => {
      const t = res(r, 'sentiment_overview').dataset_totals_all_rows;
      const [from, to] = t.published_range ?? [];
      return `Dataset berisi ${num(t.rows, 0)} unggahan publik dengan tanggal terbit dari ${date(from)} sampai ${date(to)} (${src(r)}). Sebaran tanggalnya tidak merata: sebagian besar unggahan berasal dari bulan-bulan terakhir.`;
    },
  },
  'personalfinandex-02': {
    steps: [[INFO, { tool: 'sentiment_overview', input: { include_all: true } }]],
    answer: (r) => {
      const a = res(r, 'sentiment_overview').results[0];
      return `Porsi sentimen positif adalah ${pct(a.positive)} dari ${num(a.n, 0)} unggahan (negatif ${pct(a.negative)}, netral ${pct(a.neutral)}); ${src(r)}. Label sentimen dibuat otomatis oleh penyedia data.`;
    },
  },
  'personalfinandex-03': {
    steps: [],
    answer: () =>
      `Besarnya tabungan untuk pensiun dini bergantung pada pengeluaran, usia target, imbal hasil, dan inflasi Anda sendiri, jadi saya tidak membuat rencana keuangan personal. Sebagai edukasi umum, banyak diskusi FIRE memakai patokan target dana sekitar 25 kali pengeluaran tahunan. ${NOT_ADVICE} Pertimbangkan konsultasi dengan perencana keuangan berlisensi.`,
  },

  // ── SalaryDex ──
  'salarydex-01': {
    steps: [
      [
        INFO,
        { tool: 'salary_stats', input: { filters: { country: 'US', role_family: 'software-eng' }, stat: 'median' } },
      ],
    ],
    answer: (r) => {
      const d = res(r, 'salary_stats');
      return `Median gaji software engineer di Amerika Serikat adalah ${usd(d.median)}/tahun (p25 ${usd(d.p25)}, p75 ${usd(d.p75)}; n = ${num(d.n, 0)} lowongan). Angka ini dari sampel ${num(d.rows_in_dataset, 0)} lowongan (${src(r)}), dikonversi dengan kurs tetap, bukan PPP.`;
    },
  },
  'salarydex-02': {
    steps: [
      [
        INFO,
        {
          tool: 'compare_salaries',
          input: {
            groups: [
              { label: 'US', filters: { country: 'US', role_family: 'software-eng' } },
              { label: 'IN', filters: { country: 'IN', role_family: 'software-eng' } },
            ],
          },
        },
      ],
    ],
    answer: (r) => {
      const [us, ind] = res(r, 'compare_salaries').results;
      return `Median gaji software engineer: Amerika Serikat ${usd(us.value)}/tahun (n = ${num(us.n, 0)}) vs India ${usd(ind.value)}/tahun (n = ${num(ind.n, 0)}); ${src(r)}. Selisihnya juga mencerminkan kurs tetap yang dipakai untuk konversi ke USD (bukan PPP), jadi bukan perbandingan daya beli.`;
    },
  },
  'salarydex-03': {
    steps: [[INFO, { tool: 'top_skills', input: { limit: 5 } }]],
    answer: (r) => {
      const [a, b, c] = res(r, 'top_skills').results;
      return `Skill yang paling sering muncul di lowongan adalah ${a.key} (${num(a.value, 0)} lowongan), lalu ${b.key} (${num(b.value, 0)}) dan ${c.key} (${num(c.value, 0)}); ${src(r)}. Hanya sebagian kecil lowongan mencantumkan skill, dan ini sampel 16%.`;
    },
  },

  // ── StartupDex ──
  'startupdex-01': {
    steps: [[INFO, { tool: 'funding_summary', input: { group_by: 'none', status: 'all' } }]],
    answer: (r) => {
      const g = res(r, 'funding_summary').groups[0];
      return `Total pendanaan yang diungkapkan adalah ${usd(g.usd)} dari ${num(g.rounds_with_amount, 0)} putaran yang mencantumkan nominal (dari ${num(g.rounds, 0)} putaran); ${src(r)}. Ini sampel 25% dan mencakup semua status nominal (terverifikasi maupun belum).`;
    },
  },
  'startupdex-02': {
    steps: [[INFO, { tool: 'median_round', input: { stage: 'Seed' } }]],
    answer: (r) => {
      const s = res(r, 'median_round').results[0];
      return `Median putaran ${s.key} adalah ${usd(s.value)} (n = ${num(s.n, 0)} putaran bernominal); ${src(r)}. Angka berasal dari sampel 25% dan nominal yang diungkapkan saja.`;
    },
  },
  'startupdex-03': {
    steps: [[INFO, { tool: 'mega_rounds', input: { limit: 5 } }]],
    answer: (r) => {
      const d = res(r, 'mega_rounds');
      return `Mega-round (≥ 100 juta USD) menyumbang ${pct(d.share_of_dollars)} dari total dolar yang diungkapkan, padahal jumlahnya hanya ${pct(d.share_of_rounds)} dari putaran (${num(d.mega_rounds, 0)} dari ${num(d.rounds_with_amount, 0)}); ${src(r)}. Pendanaan sangat terkonsentrasi pada putaran besar.`;
    },
  },
  'startupdex-04': {
    steps: [
      [
        INFO,
        { tool: 'funding_summary', input: { group_by: 'none', filters: { country: 'Indonesia' }, status: 'all' } },
      ],
    ],
    answer: (r) => {
      const g = res(r, 'funding_summary').groups[0];
      return `Ada ${num(g.rounds, 0)} putaran pendanaan startup Indonesia di sampel ini, ${num(g.rounds_with_amount, 0)} di antaranya mencantumkan nominal (total ${usd(g.usd)}); ${src(r)}. Karena ini sampel 25%, jumlah sebenarnya lebih besar.`;
    },
  },

  // ── IDFoodDeliveryDex ──
  'idfooddeliverydex-01': {
    steps: [[INFO, { tool: 'markup_stats', input: { group_by: 'none' } }]],
    answer: (r) => {
      const d = res(r, 'markup_stats');
      return `Median markup harga online dibanding dine-in adalah ${pct(d.median_markup_pct / 100)} dari ${num(d.items, 0)} item menu (${src(r)}). Harga dine-in di dataset adalah estimasi penyedia data, jadi markup ini juga estimasi.`;
    },
  },
  'idfooddeliverydex-02': {
    steps: [[INFO, { tool: 'markup_stats', input: { group_by: 'city' } }]],
    answer: (r) => {
      const [a, b] = res(r, 'markup_stats').results;
      return `Median markup tertinggi ada di ${a.key} (${pct(a.value)}, n = ${num(a.n, 0)}), tipis di atas ${b.key} (${pct(b.value)}); ${src(r)}. Harga dine-in adalah estimasi penyedia, jadi selisih antarkota yang kecil sebaiknya tidak ditafsirkan berlebihan.`;
    },
  },
  'idfooddeliverydex-03': {
    steps: [[INFO, { tool: 'markup_stats', input: { group_by: 'cloud_kitchen' } }]],
    answer: (r) => {
      const g = res(r, 'markup_stats').results as { key: string; value: number; n: number }[];
      const c = g.find((x) => x.key === 'cloud kitchen')!;
      const n = g.find((x) => x.key === 'non-cloud')!;
      return `Ya, median markup cloud kitchen ${c.value < n.value ? 'lebih rendah' : 'tidak lebih rendah'}: ${pct(c.value)} (n = ${num(c.n, 0)}) vs non-cloud ${pct(n.value)} (n = ${num(n.n, 0)}); ${src(r)}. Markup dihitung terhadap harga dine-in estimasi penyedia.`;
    },
  },

  // ── OpenCompanyDex ──
  'opencompanydex-01': {
    steps: [[INFO, { tool: 'company_counts', input: { group_by: 'none', filters: { country: 'Indonesia' } } }]],
    answer: (r) => {
      const d = res(r, 'company_counts');
      return `Ada ${num(d.matched, 0)} perusahaan Indonesia di dataset (${src(r)}). Ini sampel 2% dari basis data aslinya, jadi bukan jumlah seluruh perusahaan Indonesia.`;
    },
  },
  'opencompanydex-02': {
    steps: [[INFO, { tool: 'funded_share', input: { group_by: 'none' } }]],
    answer: (r) => {
      const a = res(r, 'funded_share').results[0];
      return `${pct(a.value)} perusahaan tercatat pernah didanai, dari ${num(a.n, 0)} perusahaan di sampel (${src(r)}). Banyak kolom kosong di dataset, jadi angka ini batas yang kasar.`;
    },
  },
  'opencompanydex-03': {
    steps: [[INFO, { tool: 'company_counts', input: { group_by: 'founded_decade' } }]],
    answer: (r) => {
      const d = res(r, 'company_counts');
      return `Median tahun berdiri perusahaan adalah ${num(d.median_founded_year, 0)} (dari ${num(d.matched, 0)} perusahaan di sampel; ${src(r)}). Grafik menunjukkan jumlah perusahaan per dekade berdiri; tahun berdiri tidak terisi untuk semua perusahaan.`;
    },
  },

  // ── VCNetworkDex ──
  'vcnetworkdex-01': {
    steps: [[INFO, { tool: 'top_pairs', input: { limit: 10 } }]],
    answer: (r) => {
      const [p, q] = res(r, 'top_pairs').pairs;
      return `Pasangan yang paling sering co-invest adalah ${p.a} dan ${p.b} dengan ${num(p.shared_deals, 0)} deal bersama (${p.first_year}–${p.last_year}), disusul ${q.a} – ${q.b} (${num(q.shared_deals, 0)} deal); ${src(r)}. Jumlah deal dihitung dari sampel 25%.`;
    },
  },
  'vcnetworkdex-02': {
    steps: [[INFO, { tool: 'network_stats', input: {} }]],
    answer: (r) => {
      const d = res(r, 'network_stats');
      return `${pct(d.one_off_share)} pasangan investor hanya sekali co-invest, dari ${num(d.pairs, 0)} pasangan antara ${num(d.unique_investors, 0)} investor (${src(r)}). Ini sampel 25%, jadi sebagian pasangan mungkin punya deal bersama lain di luar sampel.`;
    },
  },

  // ── VCDex ──
  'vcdex-01': {
    steps: [[INFO, { tool: 'rank_investors', input: { metric: 'deals', limit: 10 } }]],
    answer: (r) => {
      const [a, b] = res(r, 'rank_investors').rows;
      return `Investor dengan deal terbanyak adalah ${a.name} (${a.type}, ${a.hq_country}) dengan ${num(a.deals, 0)} deal, disusul ${b.name} (${num(b.deals, 0)} deal); ${src(r)}. Angka deal berasal dari sampel 25%.`;
    },
  },
  'vcdex-02': {
    steps: [[INFO, { tool: 'country_summary', input: { country: 'Indonesia' } }]],
    answer: (r) => {
      const d = res(r, 'country_summary');
      const top = d.most_active[0];
      return `Ada ${num(d.investors, 0)} investor yang berkantor pusat di Indonesia dalam sampel ini (median ${num(d.median_deals, 1)} deal per investor; paling aktif ${top.name} dengan ${num(top.deals, 0)} deal); ${src(r)}. Ini sampel 25% direktori, bukan daftar lengkap.`;
    },
  },
  'vcdex-03': {
    steps: [],
    answer: () =>
      'Saya tidak dapat menjanjikan atau memprediksi investor mana yang pasti mau mendanai startup Anda; keputusan pendanaan bergantung pada banyak faktor di luar data. Yang bisa saya lakukan adalah memfilter direktori investor menurut sektor, tahap, dan negara yang cocok dengan startup Anda sebagai titik awal riset.',
  },

  // ── IPODex ──
  'ipodex-01': {
    steps: [[INFO, { tool: 'ipo_summary', input: { group_by: 'none', filters: { listing_status: 'Completed' } } }]],
    answer: (r) => {
      const d = res(r, 'ipo_summary');
      return `Ada ${num(d.matched, 0)} IPO berstatus Completed (sudah listing) di dataset (${src(r)}). Ini sampel 38%; status "Announced / filed" tidak dihitung sebagai listing.`;
    },
  },
  'ipodex-02': {
    steps: [[INFO, { tool: 'ipo_size_stats', input: {} }]],
    answer: (r) => {
      const d = res(r, 'ipo_size_stats');
      return `Median ukuran IPO dengan nominal terverifikasi adalah ${usd(d.median_usd)} (n = ${num(d.n, 0)} IPO); ${src(r)}. Hanya ukuran yang terverifikasi yang dipakai.`;
    },
  },
  'ipodex-03': {
    steps: [[INFO, { tool: 'india_sme_vs_mainboard', input: {} }]],
    answer: (r) => {
      const g = res(r, 'india_sme_vs_mainboard').results as { key: string; value: number }[];
      const v = (k: string) => g.find((x) => x.key === k)?.value;
      return `Di India tercatat ${num(v('Mainboard'), 0)} IPO Mainboard dan ${num(v('SME'), 0)} IPO SME, ditambah ${num(v('(empty)'), 0)} catatan tanpa keterangan papan; ${src(r)}. Ini jumlah catatan IPO di sampel 38%, semua status listing.`;
    },
  },
};
