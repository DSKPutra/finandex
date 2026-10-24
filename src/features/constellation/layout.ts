// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Deterministic layout of the Index Constellation (§10.0.1): one core (Finandex AI) and every other Dex in 8 category
// clusters on a ring. Positions depend only on the registry (seeded per id) — never random per load. Visual = information:
// brightness = freshness of the as-of date, ring = status (live solid / partial dashed / pending-data empty).
import type { DexGroupId } from '../../config/dex-groups';

export const VIEW = { w: 1000, h: 600 } as const;
export type CNode = { id: string; name: string; group: DexGroupId; gi: number; x: number; y: number; brightness: number; status: 'live' | 'partial' | 'pending-data'; core: boolean };
export type CEdge = { a: string; b: string; kind: 'core' | 'group' | 'relation'; gi: number };

/** Cross-Dex relations drawn as constellation lines (open_dex pairs, §10.0.1). */
export const RELATIONS: [string, string][] = [
  ['finlaiwyer', 'antiscamdex'],
  ['finlaiwyer', 'mylaiwyer'],
  ['antiscamdex', 'mylaiwyer'],
  ['idxdex', 'ipodex'],
  ['rupiahdex', 'idfinandex'],
  ['housingdex', 'idhousingdex'],
  ['cryptdex', 'fintechdex'],
  ['centralbankdex', 'idfinandex'],
];

/** FNV-1a 32-bit hash → [0, 1) (the per-id seed). */
export function seed(id: string, salt = 0): number {
  let h = 0x811c9dc5 ^ salt;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) / 0x100000000;
}

/** Freshness 0.25–1 from an ISO as-of date relative to the newest as-of; non-date labels get 0.45. */
export function freshness(asOf: string | undefined, newest: string): number {
  if (!asOf || !/^\d{4}-\d{2}-\d{2}/.test(asOf)) return 0.45;
  const days = (Date.parse(newest) - Date.parse(asOf.slice(0, 10))) / 86_400_000;
  return Math.max(0.25, Math.min(1, 1 - days / 900));
}

export function layout(
  dex: { id: string; name: string; group: DexGroupId; status: 'live' | 'partial' | 'pending-data' }[],
  groups: readonly DexGroupId[],
  asOf: Record<string, string | undefined>,
): { nodes: CNode[]; edges: CEdge[] } {
  const dates = Object.values(asOf).filter((x): x is string => !!x && /^\d{4}-\d{2}-\d{2}/.test(x)).map((x) => x.slice(0, 10)).sort();
  const newest = dates.at(-1) ?? '2026-10-23';
  const cx = VIEW.w / 2;
  const cy = VIEW.h / 2;
  const nodes: CNode[] = [];
  const core = dex.find((d) => d.id === 'finandex-ai');
  if (core) nodes.push({ id: core.id, name: core.name, group: core.group, gi: 0, x: cx, y: cy, brightness: freshness(asOf[core.id], newest), status: core.status, core: true });
  groups.forEach((g, gi) => {
    const members = dex.filter((d) => d.group === g && d.id !== 'finandex-ai');
    const ang = -Math.PI / 2 + (gi / groups.length) * Math.PI * 2;
    const ccx = cx + Math.cos(ang) * 330;
    const ccy = cy + Math.sin(ang) * 205;
    members.forEach((d, i) => {
      const a = ang + Math.PI + ((i + 0.5) / Math.max(1, members.length)) * Math.PI * 2 + (seed(d.id) - 0.5) * 0.5;
      const r = members.length === 1 ? 0 : 46 + seed(d.id, 7) * 26;
      nodes.push({ id: d.id, name: d.name, group: g, gi, x: Math.round(ccx + Math.cos(a) * r * 1.25), y: Math.round(ccy + Math.sin(a) * r), brightness: freshness(asOf[d.id], newest), status: d.status, core: false });
    });
  });
  const edges: CEdge[] = [];
  groups.forEach((g, gi) => {
    const m = nodes.filter((n) => n.group === g && !n.core);
    if (!m.length) return;
    // Core → nearest member of each cluster, then a chain through the cluster (ordered by angle around its centre).
    const near = [...m].sort((p, q) => Math.hypot(p.x - cx, p.y - cy) - Math.hypot(q.x - cx, q.y - cy))[0]!;
    if (core) edges.push({ a: core.id, b: near.id, kind: 'core', gi });
    const mx = m.reduce((s, n) => s + n.x, 0) / m.length;
    const my = m.reduce((s, n) => s + n.y, 0) / m.length;
    const ring = [...m].sort((p, q) => Math.atan2(p.y - my, p.x - mx) - Math.atan2(q.y - my, q.x - mx));
    for (let i = 0; i < ring.length - 1; i++) edges.push({ a: ring[i]!.id, b: ring[i + 1]!.id, kind: 'group', gi });
    if (ring.length > 2) edges.push({ a: ring.at(-1)!.id, b: ring[0]!.id, kind: 'group', gi });
  });
  const ids = new Set(nodes.map((n) => n.id));
  for (const [a, b] of RELATIONS) if (ids.has(a) && ids.has(b)) edges.push({ a, b, kind: 'relation', gi: -1 });
  return { nodes, edges };
}

/** Nearest node in an arrow-key direction (keyboard navigation between nodes). */
export function neighbour(nodes: CNode[], from: string, dir: 'left' | 'right' | 'up' | 'down'): string {
  const f = nodes.find((n) => n.id === from);
  if (!f) return nodes[0]?.id ?? from;
  const v = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir];
  let best: { id: string; score: number } | null = null;
  for (const n of nodes) {
    if (n.id === from) continue;
    const dx = n.x - f.x;
    const dy = n.y - f.y;
    const along = dx * v[0]! + dy * v[1]!;
    if (along <= 0) continue;
    const across = Math.abs(dx * v[1]! - dy * v[0]!);
    const score = along + across * 2;
    if (!best || score < best.score) best = { id: n.id, score };
  }
  return best?.id ?? from;
}
