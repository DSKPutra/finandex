// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for RupiahDex (§9): Kurs · Konverter Historis · Statistik Tahunan · Peristiwa.
import { RUPIAH_EVENTS } from '../../../server/dex/ts-adapters.ts';
import { clean, int, L, type DexViews } from './types.ts';

const RANGES = [
  { value: '1Y', label: L('1 tahun', '1 year') },
  { value: '2Y', label: L('2 tahun (candlestick)', '2 years (candlestick)') },
  { value: '5Y', label: L('5 tahun', '5 years') },
  { value: 'MAX', label: L('Semua', 'All') },
];
const startFor = (r: string) => {
  const y = new Date().getUTCFullYear();
  return r === 'MAX' ? '' : `${y - Number(r.replace('Y', ''))}-01-01`;
};

export const views: DexViews = {
  rate: {
    intro: L(
      'Kurs USD/IDR harian (naik = rupiah melemah). Bad print 2013 & 2024 dibuang.',
      'Daily USD/IDR (up = rupiah weaker). Bad prints in 2013 & 2024 are removed.',
    ),
    controls: [{ kind: 'select', key: 'range', label: L('Rentang', 'Range'), options: RANGES, default: '5Y' }],
    calls: (v) => [
      { tool: 'get_snapshot', input: { id: 'USDIDR' } },
      { tool: 'get_history', input: clean({ id: 'USDIDR', start: startFor(v.range!) }) },
      { tool: 'drawdowns', input: { id: 'USDIDR', top_n: 5 } },
    ],
  },
  converter: {
    intro: L(
      'Konversi memakai close pada atau sebelum tanggal yang dipilih.',
      'Conversion uses the close on or before the chosen date.',
    ),
    controls: [
      { kind: 'text', key: 'amount', label: L('Jumlah', 'Amount'), default: '1000' },
      {
        kind: 'select',
        key: 'direction',
        label: L('Arah', 'Direction'),
        options: [
          { value: 'USD_TO_IDR', label: 'USD → IDR' },
          { value: 'IDR_TO_USD', label: 'IDR → USD' },
        ],
        default: 'USD_TO_IDR',
      },
      { kind: 'text', key: 'date', label: L('Tanggal (YYYY-MM-DD)', 'Date (YYYY-MM-DD)'), default: '2026-01-02' },
    ],
    calls: (v) => [
      { tool: 'convert', input: { amount: Math.max(1, int(v.amount, 1000)), direction: v.direction, date: v.date } },
    ],
  },
  yearly: {
    calls: () => [
      { tool: 'yearly_average', input: {} },
      { tool: 'calendar_returns', input: { ids: ['USDIDR'] } },
      { tool: 'compare_sources', input: {} },
    ],
  },
  events: {
    controls: [
      {
        kind: 'select',
        key: 'event',
        label: L('Peristiwa', 'Event'),
        options: RUPIAH_EVENTS.map((e) => ({ value: e.id, label: e.label })),
        default: RUPIAH_EVENTS[0]!.id,
      },
    ],
    calls: (v) => [{ tool: 'event_window', input: { event_id: v.event } }],
  },
};
