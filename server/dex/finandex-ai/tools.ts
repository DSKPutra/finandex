// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Finandex AI tools (§8.5): event_window, cross_dex_lookup.
import { z } from 'zod';
import { getDex } from '../../../src/config/dex-registry';
import type { DexId } from '../../../src/config/dex-registry';
import { normaliseKey } from '../../../src/shared/text';
import type { TsAdapter } from '../adapters';
import { eventWindowTool } from '../event-window';
import { datasetLabel } from '../shared-tools';
import { artifact, defineTool, tr } from '../../tools/kit';
import type { ToolDef } from '../../tools/kit';
import { EVENTS } from './events';

const ROUTES: { dex: DexId; keys: string[] }[] = [
  { dex: 'idfinandex', keys: ['ihsg', 'jci', 'bi rate', 'suku bunga bi', 'inflasi indonesia', 'makro indonesia'] },
  { dex: 'rupiahdex', keys: ['usd/idr', 'usdidr', 'rupiah', 'kurs', 'idr'] },
  { dex: 'idxdex', keys: ['saham indonesia', 'bei', 'idx', 'bbca', 'bbri', 'tlkm', 'goto', 'emiten', 'ipo indonesia'] },
  { dex: 'nasdaqdex', keys: ['nasdaq saham', 'saham nasdaq', 'nvda', 'aapl', 'tsla', 'msft', 'amzn', 'googl', 'meta'] },
  { dex: 'snp500dex', keys: ['dividen', 'dividend', 'stock split', 'saham s&p'] },
  { dex: 'commercedex', keys: ['e-commerce', 'ecommerce', 'marketplace', 'sea limited', 'shopee', 'tokopedia', 'mercadolibre', 'coupang'] },
  { dex: 'cryptdex', keys: ['defi', 'tvl', 'stablecoin', 'altcoin', 'solana', 'bot trading', 'yield'] },
  { dex: 'centralbankdex', keys: ['the fed', 'bank sentral', 'central bank', 'ecb', 'boj', 'neraca fed', 'kurva imbal hasil'] },
  { dex: 'mylaiwyer', keys: ['hukum', 'pasal', 'uud', 'kuhap', 'kuhp', 'undang-undang'] },
  { dex: 'reksadex', keys: ['reksa dana', 'mutual fund', 'manajer investasi'] },
  { dex: 'inflationdex', keys: ['inflasi negara', 'inflation by country', 'biaya hidup negara'] },
];

export function tools(ad: TsAdapter): ToolDef[] {
  return [
    eventWindowTool('finandex-ai', ad, EVENTS, true),
    defineTool({
      name: 'cross_dex_lookup',
      description: 'Suggest which Finandex Dex holds data for a topic this dataset does not cover (e.g. IHSG, USD/IDR, Indonesian stocks, dividends, DeFi, central banks, law). Returns open_dex suggestions as buttons.',
      input: z.object({ query: z.string().min(1).max(200) }).strict(),
      label: { id: 'Mencari Dex yang tepat…', en: 'Finding the right Dex…' },
      run: async ({ query }, ctx) => {
        const q = normaliseKey(query);
        const hits = ROUTES.filter((r) => r.keys.some((k) => q.includes(k))).map((r) => r.dex);
        const m = await ctx.manifest();
        const ui = hits.slice(0, 3).map((dexId) => {
          const d = getDex(dexId)!;
          return artifact('card', d.name, { type: 'card', tone: 'link', body: d.tagline[ctx.locale], link: { dexId, label: tr(ctx.locale, `Buka ${d.name}`, `Open ${d.name}`) } }, { dex: dexId, dataset: datasetLabel(dexId), as_of: m.dex[dexId]?.as_of ?? d.asOf });
        });
        return { data: { query, suggestions: hits.map((d) => ({ dexId: d, name: getDex(d)!.name })) }, ui };
      },
    }),
  ];
}
