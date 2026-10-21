// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for VCNetworkDex (§9): Graf Jaringan · Pasangan Teratas · Investor.
import { clean, int, L, type DexViews } from './types.ts';

const LIMITS = L(
  'Sampel 25% pasangan co-investor; derajat dan jumlah deal adalah hitungan sampel. Bukan janji pendanaan.',
  '25% sample of co-investor pairs; degrees and deal counts are sample counts. No funding promise.',
);
const inv = { kind: 'text' as const, key: 'investor', label: L('Investor', 'Investor'), default: 'Sequoia Capital' };

export const views: DexViews = {
  graph: {
    intro: LIMITS,
    entityKey: 'investor',
    controls: [
      inv,
      {
        kind: 'select',
        key: 'nodes',
        label: L('Maks. simpul', 'Max nodes'),
        options: ['10', '20', '30', '50'].map((n) => ({ value: n, label: n })),
        default: '30',
      },
    ],
    calls: (v) => [
      { tool: 'ego_graph', input: { investor: v.investor?.trim() || 'Sequoia Capital', max_nodes: int(v.nodes, 30) } },
    ],
  },
  pairs: {
    intro: L(
      'Pasangan dengan deal bersama terbanyak, opsional per sektor/negara bersama.',
      'Pairs with the most shared deals, optionally by shared sector/country.',
    ),
    controls: [
      {
        kind: 'text',
        key: 'sector',
        label: L('Sektor bersama', 'Shared sector'),
        default: '',
        placeholder: 'Fintech…',
      },
      {
        kind: 'text',
        key: 'country',
        label: L('Negara bersama', 'Shared country'),
        default: '',
        placeholder: 'India…',
      },
    ],
    calls: (v) => [
      { tool: 'top_pairs', input: clean({ sector: v.sector?.trim(), country: v.country?.trim(), limit: 20 }) },
      { tool: 'network_stats', input: {} },
      { tool: 'sector_country_links', input: clean({ sector: v.sector?.trim(), country: v.country?.trim() }) },
    ],
  },
  investors: {
    intro: L(
      'Partner co-investasi satu investor dalam sampel, diurutkan menurut deal bersama.',
      'Co-investment partners of one investor in the sample, ranked by shared deals.',
    ),
    entityKey: 'investor',
    controls: [inv],
    calls: (v) => {
      const i = v.investor?.trim() || 'Sequoia Capital';
      return [
        { tool: 'investor_partners', input: { investor: i, limit: 20 } },
        { tool: 'network_stats', input: { investor: i } },
      ];
    },
  },
};
