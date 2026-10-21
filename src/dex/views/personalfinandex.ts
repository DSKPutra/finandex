// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for PersonalFinanDex (§9): Sentimen · Topik · Jelajah Diskusi · Tren (same social tools as FintechDex).
import { socialViews } from './fintechdex.ts';
import { L, type DexViews } from './types.ts';

const base = socialViews(L('Topik diskusi', 'Discussion topics'));
const NOT_ADVICE = L(' Diskusi publik, bukan nasihat keuangan.', ' Public discussion, not financial advice.');

export const views: DexViews = {
  ...base,
  sentiment: {
    ...base.sentiment!,
    intro: L(
      base.sentiment!.intro!.id +
        NOT_ADVICE.id +
        ' Listing token (dexscreener, pump.fun) dikecualikan dari agregat default.',
      base.sentiment!.intro!.en +
        NOT_ADVICE.en +
        ' Token listings (dexscreener, pump.fun) are excluded from default aggregates.',
    ),
  },
  browse: {
    ...base.browse!,
    controls: base.browse!.controls!.map((c) =>
      c.key === 'query' ? { ...c, default: 'FIRE', placeholder: 'FIRE, budget, index fund…' } : c,
    ),
    calls: (v) => base.browse!.calls({ ...v, query: v.query?.trim() || 'FIRE' }),
  },
};
