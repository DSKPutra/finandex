// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Mock-eval scenarios (group: crypto-fin).
import type { ScenarioSet } from '../types.ts';
import { date, full, num, pct, pctUnits, res } from './fmt.ts';

const CG = 'snapshot CoinGecko';
const LL = 'data DefiLlama';
const CB = 'dataset Central Bank Balance Sheets & Global Liquidity';

export const scenarios: ScenarioSet = {
  // ------------------------------------------------------------------ cryptdex
  'cryptdex-01': {
    steps: [[{ tool: 'get_snapshot', input: { id: 'ETH' } }]],
    answer: (r) => {
      const m = res(r, 'get_snapshot').metrics;
      return `Return 1 tahun Ethereum (ETH) adalah ${pct(m.ret_1Y)}, dihitung dari harga penutupan harian sampai ${date(m.last_date)} (dataset Crypto Prices Historical Data). Ini data historis, bukan proyeksi.`;
    },
  },
  'cryptdex-02': {
    steps: [[{ tool: 'market_snapshot', input: {} }]],
    answer: (r) => {
      const d = res(r, 'market_snapshot');
      return `Pada ${CG} tanggal ${date(d.snapshot_date)}, dominasi Bitcoin adalah ${pct(d.btc_dominance)} dari total kapitalisasi ${d.coins} koin teratas dalam snapshot (bukan seluruh pasar kripto). Sebagai pembanding, dominasi Ethereum ${pct(d.eth_dominance)}.`;
    },
  },
  'cryptdex-03': {
    steps: [[{ tool: 'market_snapshot', input: {} }]],
    answer: (r) => {
      const d = res(r, 'market_snapshot');
      return `Pada ${CG} ${date(d.snapshot_date)}, porsi kapitalisasi pasar stablecoin adalah ${pct(d.stablecoin_share)} dari ${d.coins} koin dalam snapshot (US$ ${full(d.stablecoin_market_cap_usd)}). Stablecoin diidentifikasi secara heuristik (harga sekitar US$1 dan nama/simbol mengandung usd/dollar/stable), karena dataset tidak punya kategori resmi.`;
    },
  },
  'cryptdex-04': {
    steps: [[{ tool: 'get_snapshot', input: { id: 'TON' } }]],
    answer: (r) => {
      const h: { ticker: string; from: string; to: string }[] = res(r, 'get_snapshot').metrics.ticker_history;
      const [a, b] = [h[0]!, h.at(-1)!];
      return `Di dataset harga kripto, ticker ${a.ticker} berganti menjadi ${b.ticker} mulai ${date(b.from)} (${a.ticker} dipakai sampai ${date(a.to)}). Harganya bersambung, jadi Finandex memperlakukannya sebagai satu aset (${a.ticker} → ${b.ticker}) dengan riwayat ticker.`;
    },
  },
  'cryptdex-05': {
    steps: [[{ tool: 'defi_overview', input: {} }]],
    answer: (r) => {
      const d = res(r, 'defi_overview');
      return `Per ${date(d.as_of)} (${LL}), total TVL DeFi adalah US$ ${full(d.tvl_usd)}, atau ${pct(d.tvl_pct_of_ath)} dari puncaknya US$ ${full(d.tvl_ath_usd)} pada ${date(d.tvl_ath_date)}. Dalam 1 tahun TVL berubah ${pct(d.tvl_ret_1Y)}.`;
    },
  },
  'cryptdex-06': {
    steps: [[{ tool: 'defi_overview', input: {} }]],
    answer: (r) => {
      const d = res(r, 'defi_overview');
      return `Per ${date(d.as_of)} (${LL}), total suplai stablecoin adalah US$ ${full(d.stablecoin_supply_usd)}. Puncaknya US$ ${full(d.stablecoin_ath_usd)} tercapai pada ${date(d.stablecoin_ath_date)}.`;
    },
  },
  'cryptdex-07': {
    steps: [[{ tool: 'defi_overview', input: {} }]],
    answer: (r) => {
      const d = res(r, 'defi_overview');
      return `Karena aset yang sama dihitung ganda di beberapa protokol (misalnya token staking yang dijaminkan lagi di protokol lending). Per ${date(d.as_of)} (${LL}), jumlah TVL semua protokol (tanpa CEX) sekitar ${num(d.double_counting_ratio, 2)}× TVL DeFi headline US$ ${full(d.tvl_usd)}, jadi jumlah per protokol hanya cocok untuk membandingkan, bukan sebagai total pasar.`;
    },
  },
  'cryptdex-08': {
    steps: [[{ tool: 'yield_pools', input: { stablecoin: true } }]],
    answer: (r) => {
      const d = res(r, 'yield_pools');
      return `Per ${date(d.as_of)} (${LL}, pool ≥ US$1 juta TVL), median APY pool stablecoin adalah ${pctUnits(d.median_apy_pct)} dari ${num(d.pools, 0)} pool, dengan persentil-90 ${pctUnits(d.p90_apy_pct)}. APY tidak dijamin dan sebagian berasal dari reward token; ada risiko smart contract dan de-peg. Ini bukan rekomendasi investasi.`;
    },
  },
  'cryptdex-09': {
    steps: [[{ tool: 'fees_revenue', input: { group_by: 'protocol', metric: 'total24h', limit: 5 } }]],
    answer: (r) => {
      const d = res(r, 'fees_revenue');
      const [a, b] = d.results;
      return `Pada snapshot ${date(d.snapshot_date)} (dataset Daily DeFi Fees & Revenue, ${num(d.protocols, 0)} protokol setelah dedupe), fee 24 jam terbesar dimiliki ${a.key} sebesar US$ ${full(a.value)}, disusul ${b.key} (US$ ${full(b.value)}).`;
    },
  },
  'cryptdex-10': {
    steps: [[{ tool: 'bots_kb', input: { record_type: 'bot_profile', limit: 5 } }]],
    answer: (r) => {
      const d = res(r, 'bots_kb');
      return `Knowledge base bot trading (Crypto Trading Bots & AI Agents Dataset v5) berisi ${num(d.bot_profiles, 0)} profil bot dari total ${num(d.total_records, 0)} record. Informasi ini hanya untuk referensi, bukan rekomendasi untuk memakai bot tertentu.`;
    },
  },
  'cryptdex-11': {
    steps: [[{ tool: 'security_checklist', input: {} }]],
    answer: (r) => {
      const c: string[] = res(r, 'security_checklist').checklist;
      return `Tolong jangan kirim seed phrase atau private key Anda ke siapa pun, termasuk ke saya atau bot mana pun; siapa pun yang memegangnya bisa menguras dompet Anda, jadi jika sudah terlanjur dibagikan, segera pindahkan dana ke dompet baru. Saya juga tidak merekomendasikan bot tertentu dan tidak bisa menilai mana yang aman. Checklist keamanan: ${c.slice(1, 4).join(' ')}`;
    },
  },
  // ------------------------------------------------------------------ centralbankdex
  'centralbankdex-01': {
    steps: [[{ tool: 'balance_sheets', input: { series: ['fed'] } }]],
    answer: (r) => {
      const x = res(r, 'balance_sheets').results[0];
      return `Total aset The Fed terakhir adalah ${num(x.latest.value, 0)} (satuan: ${x.units}, yaitu sekitar US$ ${num(x.latest.value / 1e6, 2)} triliun) per ${date(x.latest.date)} (${CB}, data FRED).`;
    },
  },
  'centralbankdex-02': {
    steps: [[{ tool: 'balance_sheets', input: { series: ['fed'] } }]],
    answer: (r) => {
      const x = res(r, 'balance_sheets').results[0];
      return `Neraca The Fed mencapai puncaknya pada ${date(x.peak.date)} dengan total aset ${num(x.peak.value, 0)} (satuan: ${x.units}, sekitar US$ ${num(x.peak.value / 1e6, 2)} triliun; ${CB}). Per ${date(x.latest.date)} nilainya ${num(x.latest.value, 0)} (${x.units}).`;
    },
  },
  'centralbankdex-03': {
    steps: [[{ tool: 'country_money', input: { country: 'IDN', indicator: 'broad_money_growth' } }]],
    answer: (r) => {
      const d = res(r, 'country_money');
      return `Pertumbuhan uang beredar dalam arti luas (broad money) ${d.country} terbaru adalah ${pctUnits(d.latest.value_pct)} per tahun pada tahun ${d.latest.year} (data tahunan World Bank, ${CB}).`;
    },
  },
  'centralbankdex-04': {
    steps: [[{ tool: 'us_rates', input: { series: ['policy', 'spread_10y_2y'] } }]],
    answer: (r) => {
      const [p, s] = res(r, 'us_rates').results;
      return `Per ${date(p.latest.date)} (${CB}), suku bunga kebijakan AS adalah ${pctUnits(p.latest.value)}, dan spread imbal hasil Treasury 10Y−2Y adalah ${num(s.latest.value, 2)} poin persentase per ${date(s.latest.date)}, ${s.latest.value < 0 ? 'artinya kurva imbal hasil sedang terbalik (inversi).' : 'artinya kurva imbal hasil sedang tidak terbalik.'}`;
    },
  },
};
