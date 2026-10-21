// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for IDXDex (§9): Saham · Fundamental · IPO Center · Direktori Emiten.
import { clean, int, L, type DexViews } from './types.ts';

const PRICE = 'Harga s/d 2024-05-17.';
const PRICE_EN = 'Prices up to 2024-05-17.';

export const views: DexViews = {
  stocks: {
    intro: L(
      `Grafik harga, return, drawdown, beta terhadap IHSG, dan likuiditas satu saham BEI. ${PRICE} Banyak saham tidak likuid (volume nol).`,
      `Price chart, returns, drawdowns, beta vs IHSG and liquidity of one IDX stock. ${PRICE_EN} Many stocks are illiquid (zero volume).`,
    ),
    entityKey: 'ticker',
    controls: [
      { kind: 'text', key: 'ticker', label: L('Kode saham', 'Ticker'), default: 'BBCA', placeholder: 'BBCA' },
      { kind: 'text', key: 'start', label: L('Mulai (YYYY-MM-DD)', 'Start (YYYY-MM-DD)'), default: '2019-01-01' },
      {
        kind: 'select',
        key: 'years',
        label: L('Jendela beta', 'Beta window'),
        options: [
          { value: '1', label: L('1 tahun', '1 year') },
          { value: '3', label: L('3 tahun', '3 years') },
          { value: '5', label: L('5 tahun', '5 years') },
        ],
        default: '3',
      },
    ],
    calls: (v) => {
      const id = (v.ticker ?? 'BBCA').toUpperCase();
      const years = int(v.years, 3);
      return [
        { tool: 'get_snapshot', input: { id } },
        { tool: 'get_history', input: clean({ id, start: v.start }) },
        { tool: 'calendar_returns', input: { ids: [id] } },
        { tool: 'drawdowns', input: { id, top_n: 5 } },
        { tool: 'beta_vs_ihsg', input: { ticker: id, years: years === 1 || years === 5 ? years : 3 } },
        { tool: 'liquidity', input: { ticker: id } },
      ];
    },
  },
  fundamentals: {
    intro: L(
      `Laporan keuangan FY2020–2023, ROE/NPM/DER, dan valuasi (PER, PBV) pada FY terbaru. ${PRICE} DER kurang relevan untuk bank.`,
      `Financial statements FY2020–2023, ROE/NPM/DER and valuation (PER, PBV) on the latest FY. ${PRICE_EN} DER is less meaningful for banks.`,
    ),
    entityKey: 'ticker',
    controls: [
      { kind: 'text', key: 'ticker', label: L('Kode saham', 'Ticker'), default: 'BBCA' },
      {
        kind: 'select',
        key: 'sort_by',
        label: L('Penyaringan: urutkan', 'Screen: sort by'),
        options: [
          { value: 'market_cap_idr', label: L('Kapitalisasi pasar', 'Market cap') },
          { value: 'roe', label: 'ROE' },
          { value: 'per', label: 'PER' },
          { value: 'pbv', label: 'PBV' },
          { value: 'npm', label: 'NPM' },
        ],
        default: 'market_cap_idr',
      },
      { kind: 'text', key: 'roe_min', label: L('ROE minimum (mis. 0.15)', 'Minimum ROE (e.g. 0.15)'), default: '' },
    ],
    calls: (v) => {
      const t = (v.ticker ?? 'BBCA').toUpperCase();
      const roe = Number(v.roe_min);
      return [
        { tool: 'fundamentals', input: { ticker: t } },
        { tool: 'valuation', input: { ticker: t } },
        {
          tool: 'screen_fundamentals',
          input: clean({ sort_by: v.sort_by, roe_min: v.roe_min && Number.isFinite(roe) ? roe : '', limit: 15 }),
        },
      ];
    },
  },
  ipo: {
    intro: L(
      'Statistik e-IPO 2021–2026: return hari pertama (D1), per tahun, sektor, papan, participant admin, atau underwriter.',
      'e-IPO statistics 2021–2026: first-day (D1) return by year, sector, board, participant admin or underwriter.',
    ),
    controls: [
      {
        kind: 'select',
        key: 'group_by',
        label: L('Kelompokkan', 'Group by'),
        options: [
          { value: 'year', label: L('Tahun', 'Year') },
          { value: 'sector', label: L('Sektor', 'Sector') },
          { value: 'board', label: L('Papan', 'Board') },
          { value: 'participant_admin', label: 'Participant admin' },
          { value: 'underwriter', label: 'Underwriter' },
          { value: 'none', label: L('Semua', 'All') },
        ],
        default: 'year',
      },
      {
        kind: 'select',
        key: 'status',
        label: L('Status daftar', 'List status'),
        options: [
          { value: 'Closed', label: 'Closed' },
          { value: 'Offering', label: 'Offering' },
          { value: 'Canceled', label: 'Canceled' },
        ],
        default: 'Closed',
      },
      { kind: 'text', key: 'year', label: L('Tahun listing', 'Listing year'), default: '' },
    ],
    calls: (v) => [
      { tool: 'ipo_stats', input: { group_by: v.group_by } },
      { tool: 'ipo_list', input: clean({ status: v.status, year: v.year ? int(v.year, 2024) : '', limit: 30 }) },
    ],
  },
  directory: {
    intro: L(
      `Peringkat emiten BEI menurut metrik harga, risiko, fundamental, atau likuiditas. Sektor hanya tersedia untuk emiten e-IPO (2021+). ${PRICE}`,
      `IDX issuers ranked by price, risk, fundamental or liquidity metrics. Sector is only available for e-IPO issuers (2021+). ${PRICE_EN}`,
    ),
    controls: [
      {
        kind: 'select',
        key: 'metric',
        label: L('Metrik', 'Metric'),
        options: [
          { value: 'market_cap_idr', label: L('Kapitalisasi pasar', 'Market cap') },
          { value: 'ret_1Y', label: L('Return 1 tahun', '1Y return') },
          { value: 'ret_YTD', label: 'Return YTD' },
          { value: 'vol_1Y', label: L('Volatilitas 1 tahun', '1Y volatility') },
          { value: 'roe', label: 'ROE' },
          { value: 'per', label: 'PER' },
          { value: 'avg_value_traded_20d_idr', label: L('Nilai transaksi 20 hari', '20-day traded value') },
          { value: 'beta_3Y_vs_IHSG', label: L('Beta 3 tahun', '3Y beta') },
        ],
        default: 'market_cap_idr',
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
    ],
    calls: (v) => [{ tool: 'rank', input: { metric: v.metric, order: v.order, limit: 25 } }],
  },
};
