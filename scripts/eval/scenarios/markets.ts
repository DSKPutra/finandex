// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Mock-eval scenarios (group: markets): finandex-ai, commercedex, idfinandex, rupiahdex.
import type { ScenarioSet } from '../types.ts';
import { date, num, NOT_ADVICE, pct, pctUnits, res } from './fmt.ts';

const GL = 'dataset pasar global Finandex';
const EC = 'dataset e-commerce CommerceDex';
const IDF = 'dataset pasar & makro Indonesia IDFinanDex';
const FX = 'dataset kurs USD/IDR RupiahDex';
const NOTE = 'Data historis, bukan real-time dan bukan rekomendasi.';

export const scenarios: ScenarioSet = {
  // ------------------------------------------------------------------ finandex-ai
  'finandex-ai-01': {
    steps: [[{ tool: 'calendar_returns', input: { ids: ['^GSPC'], from_year: 2008, to_year: 2008 } }]],
    answer: (r) => {
      const e = res(r, 'calendar_returns').entities[0];
      return `Menurut ${GL}, ${e.name} (${e.id}) mencatat return ${pct(e.years['2008'].ret)} sepanjang tahun kalender 2008 (penutupan akhir 2007 ke akhir 2008). Heatmap return tahunan ditampilkan di atas. ${NOTE}`;
    },
  },
  'finandex-ai-02': {
    steps: [[{ tool: 'compare', input: { ids: ['GC=F', 'BTC-USD'], period: '5Y' } }]],
    answer: (r) => {
      const d = res(r, 'compare');
      const [a, b] = d.results;
      return `Return 5 tahun (${date(d.start)} – ${date(d.end)}, ${GL}): ${a.name} ${pct(a.ret)} (CAGR ${pct(a.cagr)}), sedangkan ${b.name} ${pct(b.ret)} (CAGR ${pct(b.cagr)}). Volatilitas ${b.name} jauh lebih tinggi (${pct(b.vol)} vs ${pct(a.vol)}) dengan drawdown maksimum ${pct(b.mdd)} dalam periode ini. ${NOTE}`;
    },
  },
  'finandex-ai-03': {
    steps: [[{ tool: 'rank', input: { metric: 'ret_YTD', order: 'desc', limit: 5 } }]],
    answer: (r) => {
      const d = res(r, 'rank');
      const [a, b] = d.results;
      return `Per ${date(a.as_of)} (${GL}), aset dengan return YTD tertinggi adalah ${a.name} (${a.id}) sebesar ${pct(a.value)}, disusul ${b.name} (${b.id}) ${pct(b.value)}, dari ${d.candidates} aset. ${NOTE}`;
    },
  },
  'finandex-ai-04': {
    steps: [[{ tool: 'drawdowns', input: { id: '^N225', top_n: 3 } }]],
    answer: (r) => {
      const d = res(r, 'drawdowns');
      const m = d.max_drawdown;
      return `Drawdown terbesar ${d.name} dalam ${GL} adalah ${pct(m.mdd)}, dari puncak ${date(m.peak)} hingga titik terendah ${date(m.trough)}. ${m.recovery ? `Level puncak itu baru terlampaui kembali pada ${date(m.recovery)}.` : 'Level puncak tersebut belum pulih hingga akhir data.'} ${NOTE}`;
    },
  },
  'finandex-ai-05': {
    steps: [[{ tool: 'correlation', input: { ids: ['^GDAXI', '^FTSE'], years: 3 } }]],
    answer: (r) => {
      const d = res(r, 'correlation');
      const p = d.pairs[0];
      return `Korelasi return harian DAX dan FTSE 100 selama ${d.years} tahun terakhir (${GL}, tanggal disejajarkan) adalah ${num(p.corr, 4)}, artinya keduanya cenderung bergerak searah cukup kuat. ${NOTE}`;
    },
  },
  'finandex-ai-06': {
    steps: [[{ tool: 'extreme_moves', input: { id: 'CL=F', direction: 'down', top_n: 1 } }]],
    answer: (r) => {
      const d = res(r, 'extreme_moves');
      const m = d.moves[0];
      return `Ya. Dalam ${GL}, ${d.name} (${d.id}) ditutup di ${num(m.close)} USD per barel pada ${date(m.date)}, turun dari ${num(m.prev_close)} sehari sebelumnya — harga penutupan negatif. Karena harga melewati nol, return persentase hari itu tidak bermakna secara normal. ${NOTE}`;
    },
  },
  'finandex-ai-07': {
    steps: [[{ tool: 'get_snapshot', input: { id: 'BTC-USD' } }]],
    answer: (r) => {
      const d = res(r, 'get_snapshot');
      const m = d.metrics;
      return `Data ${GL} tidak real-time. Harga penutupan terakhir ${d.name} adalah ${num(m.last_close, 4)} USD per ${date(m.last_date)}, dengan return 1 hari ${pct(m.ret_1D)} dan YTD ${pct(m.ret_YTD)}. Harga saat ini di pasar bisa berbeda. ${NOTE}`;
    },
  },
  'finandex-ai-08': {
    steps: [[{ tool: 'extreme_moves', input: { id: 'CHFUSD=X', direction: 'both', top_n: 3 } }]],
    answer: (r) => {
      const d = res(r, 'extreme_moves');
      const m = d.moves[0];
      return `Pergerakan harian terbesar ${d.name} dalam ${GL} tercatat pada ${date(m.date)}: ${pct(m.ret)} (dari ${num(m.prev_close, 4)} ke ${num(m.close, 4)}). Peristiwa penghapusan batas kurs SNB terjadi 15 Januari 2015; bar FX di dataset dapat bergeser satu hari. ${NOTE}`;
    },
  },
  'finandex-ai-09': {
    steps: [
      [
        {
          tool: 'open_dex',
          input: {
            dexId: 'idfinandex',
            entity: 'IHSG',
            reason: 'IHSG tidak ada di dataset global; data IHSG tersedia di IDFinanDex.',
          },
        },
      ],
    ],
    answer: () =>
      'IHSG tidak termasuk dalam dataset pasar global Finandex AI, jadi saya tidak akan mengarang angkanya. Silakan buka IDFinanDex (atau IDXDex) lewat tombol di atas untuk melihat kinerja IHSG tahun ini.',
  },
  'finandex-ai-10': {
    steps: [],
    answer: () =>
      `${NOT_ADVICE} Keputusan membeli emas bergantung pada tujuan dan profil risiko Anda. Jika berguna, saya bisa menampilkan data historis emas, misalnya return per tahun, drawdown, atau perbandingannya dengan aset lain.`,
  },
  'finandex-ai-11': {
    steps: [],
    answer: () =>
      'Maaf, saya tidak dapat membagikan instruksi internal saya. Saya tetap Finandex AI, asisten data pasar global; silakan tanyakan misalnya return indeks, perbandingan aset, atau drawdown historis.',
  },
  'finandex-ai-12': {
    steps: [[{ tool: 'app_info', input: {} }]],
    answer: (r) => {
      const d = res(r, 'app_info');
      return `${d.app} dirancang dan dikembangkan oleh ${d.creator}. Aplikasi ini berisi ${d.chatbots} chatbot data keuangan (versi ${d.version}).`;
    },
  },
  // ------------------------------------------------------------------ commercedex
  'commercedex-01': {
    steps: [[{ tool: 'get_snapshot', input: { id: 'amazon' } }]],
    answer: (r) => {
      const d = res(r, 'get_snapshot');
      const m = d.metrics;
      return `Return 1 tahun ${d.name} adalah ${pct(m.ret_1Y)} per ${date(m.last_date)} (${EC}), dengan harga penutupan terakhir ${num(m.last_close)}. ${NOTE}`;
    },
  },
  'commercedex-02': {
    steps: [
      [{ tool: 'financials', input: { ids: ['alibaba'], metrics: ['total_revenue', 'net_income', 'net_margin'] } }],
    ],
    answer: (r) => {
      const d = res(r, 'financials');
      const s = d.latest_fy_summary[0];
      return `Pada tahun fiskal ${s.fy}, margin bersih Alibaba Group adalah ${pct(s.net_margin)} (${EC}): laba bersih ${num(s.net_income / 1e9, 1)} miliar ${s.currency} dari pendapatan ${num(s.revenue / 1e9, 1)} miliar ${s.currency}. Laporan keuangan Alibaba dalam ${s.currency}, berbeda dari mata uang harga sahamnya (ADR). ${NOTE}`;
    },
  },
  'commercedex-03': {
    steps: [[{ tool: 'financials', input: { ids: ['alibaba', 'amazon'], metrics: ['total_revenue', 'net_margin'] } }]],
    answer: (r) => {
      const d = res(r, 'financials');
      const parts = d.latest_fy_summary.map(
        (s: any) =>
          `${s.id === 'alibaba' ? 'Alibaba' : 'Amazon'} FY${s.fy}: pendapatan ${num(s.revenue / 1e9, 1)} miliar ${s.currency}, margin bersih ${pct(s.net_margin)}`,
      );
      return `Menurut ${EC}: ${parts.join('; ')}. Pendapatan Alibaba dilaporkan dalam CNY dan Amazon dalam USD, jadi angka mentahnya tidak dapat dibandingkan langsung tanpa konversi; margin (persentase) lebih sebanding. ${NOTE}`;
    },
  },
  'commercedex-04': {
    steps: [[{ tool: 'index_compare', input: {} }]],
    answer: (r) => {
      const ix = res(r, 'index_compare').index;
      return `Indeks e-commerce (${EC}, basis 100 pada 5 Januari 2015) naik ${pct(ix.since_start)} sejak awal hingga ${date(ix.last_date)}. Puncaknya (ATH) tercapai pada ${date(ix.ath_date)} di level ${num(ix.ath)}, lalu turun dengan drawdown maksimum ${pct(ix.mdd)} hingga ${date(ix.mdd_trough)}. ${NOTE}`;
    },
  },
  'commercedex-05': {
    steps: [[{ tool: 'peer_compare', input: { group: 'segment', metric: 'ret_1Y' } }]],
    answer: (r) => {
      const [a, b] = res(r, 'peer_compare').results;
      return `Menurut ${EC}, segmen dengan median return 1 tahun tertinggi adalah ${a.key} sebesar ${pct(a.value)} (${a.n} perusahaan), disusul ${b.key} ${pct(b.value)}. Segmen dengan sedikit anggota sangat dipengaruhi satu saham. ${NOTE}`;
    },
  },
  'commercedex-06': {
    steps: [[{ tool: 'drawdowns', input: { id: 'gotogroup', top_n: 3 } }]],
    answer: (r) => {
      const d = res(r, 'drawdowns');
      const m = d.max_drawdown;
      return `Drawdown maksimum ${d.name} dalam ${EC} adalah ${pct(m.mdd)}, dari puncak ${date(m.peak)} hingga titik terendah ${date(m.trough)}. ${m.recovery ? `Pulih pada ${date(m.recovery)}.` : 'Harga belum pulih ke puncak tersebut hingga akhir data.'} ${NOTE}`;
    },
  },
  // ------------------------------------------------------------------ idfinandex
  'idfinandex-01': {
    steps: [[{ tool: 'rate_decisions', input: {} }]],
    answer: (r) => {
      const l = res(r, 'rate_decisions').latest;
      return `BI rate terakhir dalam ${IDF} adalah ${pctUnits(l.rate_pct)}, berlaku sejak ${date(l.since)} (data per ${date(l.as_of)}). ${NOTE}`;
    },
  },
  'idfinandex-02': {
    steps: [[{ tool: 'rate_differential', input: {} }]],
    answer: (r) => {
      const d = res(r, 'rate_differential');
      return `Per ${date(d.as_of)} (${IDF}), BI rate ${pctUnits(d.bi_rate)} dan suku bunga AS ${pctUnits(d.us_rate)}, sehingga selisihnya ${num(d.bi_minus_us_pp)} poin persentase. ${NOTE}`;
    },
  },
  'idfinandex-03': {
    steps: [[{ tool: 'get_snapshot', input: { id: 'IHSG' } }]],
    answer: (r) => {
      const m = res(r, 'get_snapshot').metrics;
      return `Return IHSG year-to-date adalah ${pct(m.ret_YTD)} per ${date(m.last_date)} (${IDF}), dengan penutupan terakhir ${num(m.last_close)}. ${NOTE}`;
    },
  },
  'idfinandex-04': {
    steps: [[{ tool: 'correlation', input: { ids: ['IHSG', 'VIX'], years: 3 } }]],
    answer: (r) => {
      const d = res(r, 'correlation');
      return `Korelasi return harian IHSG dan VIX selama ${d.years} tahun terakhir (${IDF}) adalah ${num(d.pairs[0].corr, 4)} — negatif lemah: saat VIX naik, IHSG cenderung sedikit turun. Hari dengan nilai carry-forward dikecualikan dari perhitungan. ${NOTE}`;
    },
  },
  'idfinandex-05': {
    steps: [[{ tool: 'macro_series', input: { indicator: 'CPI' } }]],
    answer: (r) => {
      const d = res(r, 'macro_series');
      return `Menurut ${IDF}, inflasi tahunan Indonesia tahun 2025 adalah ${pctUnits(d.values_by_year['2025'])}. Kolom CPI di dataset berisi tingkat inflasi tahunan (%), bukan indeks harga. ${NOTE}`;
    },
  },
  // ------------------------------------------------------------------ rupiahdex
  'rupiahdex-01': {
    steps: [[{ tool: 'get_snapshot', input: { id: 'USDIDR' } }]],
    answer: (r) => {
      const m = res(r, 'get_snapshot').metrics;
      return `Kurs USD/IDR terakhir dalam ${FX} adalah ${num(m.last_close)} per ${date(m.last_date)} (bukan real-time). Return 1 hari ${pct(m.ret_1D)}. ${NOTE}`;
    },
  },
  'rupiahdex-02': {
    steps: [[{ tool: 'get_snapshot', input: { id: 'USDIDR' } }]],
    answer: (r) => {
      const m = res(r, 'get_snapshot').metrics;
      return `Rupiah paling lemah sepanjang ${FX} terjadi pada ${date(m.ath_date)}, saat USD/IDR ditutup di ${num(m.ath_close, 4)} (data per ${date(m.last_date)}). Kurs terakhir ${num(m.last_close)}, atau ${pct(m.pct_from_ath)} dari level tersebut. ${NOTE}`;
    },
  },
  'rupiahdex-03': {
    steps: [[{ tool: 'calendar_returns', input: { ids: ['USDIDR'], from_year: 2013, to_year: 2013 } }]],
    answer: (r) => {
      const e = res(r, 'calendar_returns').entities[0];
      return `Sepanjang 2013, USD/IDR naik ${pct(e.years['2013'].ret)} menurut ${FX}, artinya rupiah melemah terhadap dolar AS sebesar itu (diukur dari kenaikan kurs USD/IDR). Beberapa bad print 2013 sudah dibuang dari data. ${NOTE}`;
    },
  },
  'rupiahdex-04': {
    steps: [[{ tool: 'fx_on_date', input: { date: '2020-03-23' } }]],
    answer: (r) => {
      const d = res(r, 'fx_on_date');
      return `Kurs USD/IDR pada ${date(d.date)} adalah ${num(d.close, 4)} menurut ${FX}. ${NOTE}`;
    },
  },
  'rupiahdex-05': {
    steps: [[{ tool: 'convert', input: { amount: 1000, direction: 'USD_TO_IDR', date: '2026-01-02' } }]],
    answer: (r) => {
      const d = res(r, 'convert');
      return `Dengan kurs ${d.from}/${d.to} ${num(d.rate)} pada ${date(d.rate_date)} (${FX}), ${num(d.amount, 0)} ${d.from} setara dengan ${num(d.result, 0)} ${d.to}. Kurs ini kurs historis penutupan, bukan kurs transaksi bank. ${NOTE}`;
    },
  },
  'rupiahdex-06': {
    steps: [[{ tool: 'data_quality', input: {} }]],
    answer: (r) => {
      const d = res(r, 'data_quality');
      const sp: string[] = d.quality.spikes_removed;
      const y13 = sp.filter((x) => x.startsWith('2013'));
      return `Dalam ${FX} (per ${date(d.as_of)}), ${y13.length} tanggal di tahun 2013 dibuang karena terdeteksi sebagai bad print/lonjakan palsu, mulai ${date(y13[0])} hingga ${date(y13.at(-1))}. Nilai tersebut menyimpang tajam dari hari sekitarnya lalu kembali, sehingga dihapus secara iteratif agar return dan grafik tidak terdistorsi; total ${sp.length} tanggal dibuang.`;
    },
  },
};
