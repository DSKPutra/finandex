// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Mock-eval scenarios (group: idmarkets).
import type { ScenarioSet } from '../types.ts';
import { date, full, NOT_ADVICE, num, pct, res } from './fmt.ts';

const RD = 'dataset Reksa Dana Indonesia';
const IDX = 'data IDX';

export const scenarios: ScenarioSet = {
  // ------------------------------------------------------------------ reksadex
  'reksadex-01': {
    steps: [[{ tool: 'industry_overview', input: {} }]],
    answer: (r) => {
      const d = res(r, 'industry_overview');
      return `Per ${date(d.as_of)} (${RD}), total dana kelolaan (AUM) reksa dana aktif adalah Rp ${full(d.aum_total_idr)} dari ${num(d.active_funds, 0)} produk aktif. Reksa dana berdenominasi USD sudah dinilai dalam rupiah, dan snapshot bersifat bulanan.`;
    },
  },
  'reksadex-02': {
    steps: [[{ tool: 'mi_leaderboard', input: { metric: 'aum', limit: 5 } }]],
    answer: (r) => {
      const d = res(r, 'mi_leaderboard');
      const top = d.rows[0];
      return `Per ${date(d.as_of)} (${RD}), manajer investasi dengan AUM terbesar adalah ${top.mi} dengan AUM Rp ${full(top.aum_idr)}, atau ${pct(top.share)} dari total industri, mengelola ${num(top.fund_count, 0)} produk aktif. Peringkat kedua ${d.rows[1].mi} (${pct(d.rows[1].share)}).`;
    },
  },
  'reksadex-03': {
    steps: [[{ tool: 'industry_overview', input: {} }]],
    answer: (r) => {
      const d = res(r, 'industry_overview');
      const t = d.by_type[0];
      return `Per ${date(d.as_of)} (${RD}), jenis dengan AUM terbesar adalah ${t.type} (reksa dana ${t.label}) dengan AUM Rp ${full(t.aum_idr)}, sekitar ${pct(t.share)} dari total industri, dari ${num(t.count, 0)} produk aktif.`;
    },
  },
  'reksadex-04': {
    steps: [[{ tool: 'type_return_stats', input: { type: 'Equity Fund', metric: 'ret_1Y' } }]],
    answer: (r) => {
      const d = res(r, 'type_return_stats');
      return `Median return 1 tahun reksa dana saham (Equity Fund) aktif adalah ${pct(d.median)}, dihitung dari ${num(d.n, 0)} produk yang memiliki data 1 tahun (${RD}, snapshot bulanan). Return ini belum memasukkan pembagian hasil (distribusi).`;
    },
  },
  'reksadex-05': {
    steps: [[{ tool: 'industry_overview', input: {} }]],
    answer: (r) => {
      const d = res(r, 'industry_overview');
      return `Per ${date(d.as_of)} (${RD}), jumlah reksa dana aktif adalah ${num(d.active_funds, 0)} produk (NAB, unit, dan NAB/unit > 0 pada snapshot terakhir), dengan total AUM Rp ${full(d.aum_total_idr)}.`;
    },
  },
  'reksadex-06': {
    steps: [],
    answer: () =>
      `${NOT_ADVICE} Saya tidak bisa memilihkan produk untuk Anda karena itu bergantung pada tujuan, jangka waktu, dan profil risiko Anda. Saya bisa menampilkan data historis, misalnya peringkat AUM, return 1 tahun, atau volatilitas per jenis reksa dana, sebagai bahan riset; pertimbangkan juga berkonsultasi dengan perencana keuangan berlisensi.`,
  },
  // ------------------------------------------------------------------ idxdex
  'idxdex-01': {
    steps: [[{ tool: 'get_snapshot', input: { id: 'BBCA' } }]],
    answer: (r) => {
      const m = res(r, 'get_snapshot').metrics;
      return `Harga penutupan terakhir BBCA di ${IDX} adalah Rp ${num(m.last_close, 0)} pada ${date(m.last_date)}. Perlu dicatat data harga IDX di Finandex berhenti pada tanggal tersebut, jadi ini bukan harga real-time.`;
    },
  },
  'idxdex-02': {
    steps: [[{ tool: 'fundamentals', input: { ticker: 'BBCA' } }]],
    answer: (r) => {
      const d = res(r, 'fundamentals');
      return `ROE BBCA FY${d.fund_fy} adalah ${pct(d.roe_by_year[String(d.fund_fy)] ?? d.roe)} (laba bersih ÷ ekuitas, dataset Financial Statement IDX), naik dari ${pct(d.roe_by_year['2022'])} pada FY2022.`;
    },
  },
  'idxdex-03': {
    steps: [[{ tool: 'valuation', input: { ticker: 'BBCA' } }]],
    answer: (r) => {
      const d = res(r, 'valuation');
      return `PER BBCA adalah ${num(d.per, 2)}x, dihitung dari harga penutupan Rp ${num(d.last_close, 0)} (${date(d.last_date)}) dibagi EPS dasar FY${d.fund_fy} (${IDX}). PBV-nya ${num(d.pbv, 2)}x.`;
    },
  },
  'idxdex-04': {
    steps: [[{ tool: 'valuation', input: { ticker: 'BBRI' } }]],
    answer: (r) => {
      const d = res(r, 'valuation');
      return `Kapitalisasi pasar BBRI adalah Rp ${full(d.market_cap_idr)} (harga penutupan Rp ${num(d.last_close, 0)} pada ${date(d.last_date)} × jumlah saham FY${d.fund_fy}, ${IDX}).`;
    },
  },
  'idxdex-05': {
    steps: [[{ tool: 'ipo_stats', input: { group_by: 'none' } }]],
    answer: (r) => {
      const d = res(r, 'ipo_stats');
      return `Dari ${num(d.closed_ipos, 0)} IPO berstatus Closed di dataset e-IPO Indonesia, median return hari pertama (D1) adalah ${pct(d.overall_median_d1)}, dengan rata-rata ${pct(d.overall_mean_d1)} dan ${pct(d.share_positive_d1)} IPO ditutup positif di hari pertama.`;
    },
  },
  'idxdex-06': {
    steps: [[{ tool: 'ipo_stats', input: { group_by: 'participant_admin', limit: 5 } }]],
    answer: (r) => {
      const d = res(r, 'ipo_stats');
      const g = d.groups[0];
      return `Di dataset e-IPO Indonesia (IPO berstatus Closed), participant admin yang paling banyak menangani IPO adalah ${g.key} dengan ${num(g.ipos, 0)} IPO, disusul ${d.groups[1].key} (${num(d.groups[1].ipos, 0)} IPO).`;
    },
  },
  'idxdex-07': {
    steps: [[{ tool: 'beta_vs_ihsg', input: { ticker: 'GOTO' } }]],
    answer: (r) => {
      const d = res(r, 'beta_vs_ihsg');
      return `Beta ${d.years} tahun GOTO terhadap IHSG adalah ${num(d.beta, 3)} (return harian sampai ${date(d.last_date)}, ${IDX} dan IHSG dari IDFinanDex), artinya pergerakan GOTO secara historis jauh lebih besar daripada indeks.`;
    },
  },
};
