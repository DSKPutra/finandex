// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for CryptDex (§9): Pasar Kripto · Harga Historis · DeFi · Yield · Fees & Revenue · Bot & AI Agent.
import { clean, L, type DexViews } from './types.ts';

const COINS = [
  'BTC',
  'ETH',
  'BNB',
  'SOL',
  'XRP',
  'ADA',
  'DOGE',
  'TRX',
  'TON',
  'AVAX',
  'DOT',
  'LINK',
  'LTC',
  'BCH',
  'NEAR',
  'UNI',
  'SHIB',
  'LEO',
];
const RISK = 'APY tidak dijamin; ada risiko smart contract, de-peg, dan reward token. Bukan rekomendasi.';
const RISK_EN = 'APY is not guaranteed; smart-contract, de-peg and reward-token risks apply. Not a recommendation.';

export const views: DexViews = {
  market: {
    intro: L(
      'Snapshot tunggal CoinGecko (250 koin): dominasi BTC/ETH dan porsi stablecoin (heuristik) relatif terhadap 250 koin, bukan seluruh pasar.',
      'Single CoinGecko snapshot (250 coins): BTC/ETH dominance and stablecoin share (heuristic) relative to the 250 coins, not the whole market.',
    ),
    controls: [
      {
        kind: 'select',
        key: 'metric',
        label: L('Peringkat', 'Ranking'),
        options: [
          { value: 'market_cap_usd', label: L('Kapitalisasi pasar', 'Market cap') },
          { value: 'price_change_pct_24h', label: L('Perubahan 24 jam', '24h change') },
          { value: 'price_change_pct_7d', label: L('Perubahan 7 hari', '7d change') },
          { value: 'price_change_pct_30d', label: L('Perubahan 30 hari', '30d change') },
          { value: 'ath_change_pct', label: L('Jarak dari ATH', 'Distance from ATH') },
        ],
        default: 'market_cap_usd',
      },
      {
        kind: 'select',
        key: 'order',
        label: L('Urutan', 'Order'),
        options: [
          { value: 'desc', label: L('Tertinggi', 'Highest') },
          { value: 'asc', label: L('Terendah', 'Lowest') },
        ],
        default: 'desc',
      },
      {
        kind: 'select',
        key: 'top100',
        label: L('Cakupan', 'Universe'),
        options: [
          { value: '', label: L('250 koin', '250 coins') },
          { value: 'yes', label: L('Top 100 saja', 'Top 100 only') },
        ],
        default: '',
      },
    ],
    calls: (v) => [
      { tool: 'market_snapshot', input: {} },
      {
        tool: 'rank_snapshot',
        input: clean({ metric: v.metric, order: v.order, top100_only: v.top100 === 'yes' ? true : '', limit: 20 }),
      },
    ],
  },
  history: {
    intro: L(
      'Harga historis 18 koin (USD): grafik, return kalender, drawdown, dan korelasi. TON berganti ticker menjadi GRAM (satu aset).',
      'Price history of 18 coins (USD): chart, calendar returns, drawdowns and correlation. TON changed ticker to GRAM (one asset).',
    ),
    entityKey: 'coin',
    controls: [
      {
        kind: 'select',
        key: 'coin',
        label: L('Koin', 'Coin'),
        options: COINS.map((c) => ({ value: c, label: c })),
        default: 'BTC',
      },
      { kind: 'text', key: 'start', label: L('Mulai (YYYY-MM-DD)', 'Start (YYYY-MM-DD)'), default: '' },
      {
        kind: 'select',
        key: 'peer',
        label: L('Bandingkan dengan', 'Compare with'),
        options: COINS.map((c) => ({ value: c, label: c })),
        default: 'ETH',
      },
    ],
    calls: (v) => {
      const id = v.coin || 'BTC';
      const peer = v.peer && v.peer !== id ? v.peer : id === 'ETH' ? 'BTC' : 'ETH';
      return [
        { tool: 'get_snapshot', input: { id } },
        { tool: 'get_history', input: clean({ id, start: v.start }) },
        { tool: 'calendar_returns', input: { ids: [id] } },
        { tool: 'drawdowns', input: { id, top_n: 5 } },
        { tool: 'correlation', input: { ids: [id, peer], years: 3 } },
      ];
    },
  },
  defi: {
    intro: L(
      'TVL DeFi headline (DefiLlama), TVL per chain, protokol, stablecoin, dan volume DEX. Jumlah TVL protokol dihitung ganda — hanya untuk perbandingan; bulan DEX berjalan dikeluarkan.',
      'Headline DeFi TVL (DefiLlama), TVL by chain, protocols, stablecoins and DEX volume. Protocol TVLs double-count — compare only; the current DEX month is excluded.',
    ),
    controls: [
      {
        kind: 'select',
        key: 'view',
        label: L('Rincian', 'Breakdown'),
        options: [
          { value: 'chains', label: L('Per chain', 'By chain') },
          { value: 'protocols', label: L('Protokol', 'Protocols') },
          { value: 'categories', label: L('Kategori protokol', 'Protocol categories') },
          { value: 'stablecoins', label: 'Stablecoin' },
          { value: 'dex', label: L('Volume DEX', 'DEX volume') },
        ],
        default: 'chains',
      },
      {
        kind: 'text',
        key: 'chain',
        label: L('Riwayat chain (opsional)', 'Chain history (optional)'),
        default: '',
        placeholder: 'Ethereum',
      },
    ],
    calls: (v) => [
      { tool: 'defi_overview', input: {} },
      v.view === 'protocols'
        ? { tool: 'protocols', input: { limit: 15 } }
        : v.view === 'categories'
          ? { tool: 'protocols', input: { category: '__all__', limit: 15 } }
          : v.view === 'stablecoins'
            ? { tool: 'stablecoins', input: { top: 15 } }
            : v.view === 'dex'
              ? { tool: 'dex_activity', input: { months: 36 } }
              : { tool: 'chain_tvl', input: { mode: 'latest', limit: 15 } },
      ...(v.chain ? [{ tool: 'chain_tvl', input: { mode: 'history', chain: v.chain } }] : []),
    ],
  },
  yield: {
    intro: L(
      `Pool yield DefiLlama (≥ US$1 juta TVL; APY dalam persen). ${RISK}`,
      `DefiLlama yield pools (≥ US$1M TVL; APY in percent). ${RISK_EN}`,
    ),
    controls: [
      {
        kind: 'select',
        key: 'stable',
        label: L('Jenis pool', 'Pool type'),
        options: [
          { value: '', label: L('Semua', 'All') },
          { value: 'yes', label: 'Stablecoin' },
          { value: 'no', label: L('Non-stablecoin', 'Non-stablecoin') },
        ],
        default: 'yes',
      },
      { kind: 'text', key: 'chain', label: L('Chain', 'Chain'), default: '', placeholder: 'Ethereum' },
    ],
    calls: (v) => [
      {
        tool: 'yield_pools',
        input: clean({
          stablecoin: v.stable === 'yes' ? true : v.stable === 'no' ? false : '',
          chain: v.chain,
          limit: 15,
        }),
      },
      { tool: 'yield_snapshot', input: clean({ stablecoin: v.stable === 'yes' ? true : '' }) },
    ],
  },
  fees: {
    intro: L(
      'Fee & revenue protokol pada snapshot terbaru setelah dedupe, serta tren harian satu protokol (≈ 32 snapshot).',
      'Protocol fees & revenue at the latest snapshot after dedupe, plus the daily trend of one protocol (≈ 32 snapshots).',
    ),
    entityKey: 'protocol',
    controls: [
      {
        kind: 'select',
        key: 'metric',
        label: L('Ukuran', 'Metric'),
        options: [
          { value: 'total24h', label: L('Fee 24 jam', 'Fees 24h') },
          { value: 'total7d', label: L('Fee 7 hari', 'Fees 7d') },
          { value: 'total30d', label: L('Fee 30 hari', 'Fees 30d') },
          { value: 'total1y', label: L('Fee 1 tahun', 'Fees 1y') },
          { value: 'daily_revenue', label: L('Revenue harian', 'Daily revenue') },
        ],
        default: 'total24h',
      },
      {
        kind: 'select',
        key: 'group_by',
        label: L('Kelompokkan', 'Group by'),
        options: [
          { value: 'protocol', label: L('Protokol', 'Protocol') },
          { value: 'category', label: L('Kategori', 'Category') },
        ],
        default: 'protocol',
      },
      { kind: 'text', key: 'protocol', label: L('Tren protokol', 'Protocol trend'), default: 'Tether' },
    ],
    calls: (v) => [
      { tool: 'fees_revenue', input: { metric: v.metric, group_by: v.group_by, limit: 15 } },
      ...(v.protocol ? [{ tool: 'fees_trend', input: { name: v.protocol } }] : []),
    ],
  },
  bots: {
    intro: L(
      'Knowledge base bot trading & AI agent — informasi dan edukasi saja, tanpa rekomendasi dan tanpa tautan referral. Jangan pernah membagikan seed phrase atau private key.',
      'Trading-bot & AI-agent knowledge base — information and education only, no recommendations and no referral links. Never share your seed phrase or private key.',
    ),
    controls: [
      {
        kind: 'select',
        key: 'record_type',
        label: L('Jenis record', 'Record type'),
        options: [
          { value: 'bot_profile', label: L('Profil bot', 'Bot profile') },
          { value: 'verified_fact', label: L('Fakta terverifikasi', 'Verified fact') },
          { value: 'qa_pair', label: 'Q&A' },
          { value: 'llm_consensus', label: L('Konsensus LLM', 'LLM consensus') },
          { value: 'chain_profile', label: L('Profil chain', 'Chain profile') },
          { value: 'real_test_data', label: L('Data uji nyata', 'Real test data') },
        ],
        default: 'bot_profile',
      },
      { kind: 'text', key: 'query', label: L('Cari', 'Search'), default: '' },
    ],
    calls: (v) => [
      { tool: 'security_checklist', input: {} },
      { tool: 'bots_kb', input: clean({ record_type: v.record_type, query: v.query, limit: 10 }) },
    ],
  },
};
