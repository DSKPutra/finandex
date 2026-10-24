// © 2026 Dea Saka Kurnia Putra. All rights reserved.
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEX_GROUPS } from '../../src/config/dex-groups';
import { DEX_IDS, DEX_REGISTRY, getDex, isDexId, visibleDex } from '../../src/config/dex-registry';

const EXPECTED_GROUPS: Record<string, string[]> = {
  'global-markets': ['finandex-ai', 'nasdaqdex', 'snp500dex', 'commercedex', 'ipodex'],
  'indonesia-markets': ['idfinandex', 'rupiahdex', 'idxdex', 'reksadex'],
  'crypto-macro': ['cryptdex', 'centralbankdex', 'inflationdex'],
  'startup-business': ['startupdex', 'vcdex', 'vcnetworkdex', 'opencompanydex'],
  'living-work': ['salarydex', 'costlivingdex', 'idhousingdex', 'idfooddeliverydex'],
  'social-development': ['povertydex', 'populationdex', 'homelessnessdex', 'housingdex'],
  'sentiment-personal': ['fintechdex', 'personalfinandex'],
  law: ['mylaiwyer', 'finlaiwyer', 'antiscamdex'],
};

describe('dex registry (§1, §6.2, §10.2)', () => {
  it('has 29 unique Dex in registry order', () => {
    expect(DEX_REGISTRY).toHaveLength(29);
    expect(DEX_REGISTRY.map((d) => d.id)).toEqual([...DEX_IDS]);
    expect(DEX_REGISTRY.map((d) => d.order)).toEqual(Array.from({ length: 29 }, (_, i) => i + 1));
  });
  it('groups match §10.2 in fixed order', () => {
    expect(DEX_GROUPS.map((g) => g.id)).toEqual(Object.keys(EXPECTED_GROUPS));
    for (const g of DEX_GROUPS) {
      expect(DEX_REGISTRY.filter((d) => d.group === g.id).map((d) => d.id)).toEqual(EXPECTED_GROUPS[g.id]);
    }
  });
  it('tabs start with chat and end with data; ids unique per Dex', () => {
    for (const d of DEX_REGISTRY) {
      expect(d.tabs[0]?.id).toBe('chat');
      expect(d.tabs.at(-1)?.id).toBe('data');
      expect(new Set(d.tabs.map((t) => t.id)).size).toBe(d.tabs.length);
    }
  });
  it('every icon exists in the kit', () => {
    for (const d of DEX_REGISTRY) expect(existsSync(`kit/brand/icons/${d.icon}.svg`)).toBe(true);
  });
  it('NC Dex are hidden in the commercial build only', () => {
    const nc = DEX_REGISTRY.filter((d) => d.license === 'CC BY-NC 4.0').map((d) => d.id).sort();
    expect(nc).toEqual(['ipodex', 'opencompanydex', 'salarydex', 'startupdex', 'vcdex', 'vcnetworkdex']);
    expect(visibleDex('noncommercial')).toHaveLength(29);
    expect(visibleDex('commercial').map((d) => d.id)).not.toContain('salarydex');
    expect(visibleDex('commercial')).toHaveLength(23);
  });
  it('looks up ids', () => {
    expect(getDex('rupiahdex')?.name).toBe('RupiahDex');
    expect(getDex('nope')).toBeUndefined();
    expect(isDexId('mylaiwyer')).toBe(true);
    expect(isDexId('x')).toBe(false);
  });
});
