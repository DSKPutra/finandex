// © 2026 Dea Saka Kurnia Putra. All rights reserved.
import { describe, expect, it } from 'vitest';
import { findUnsafe, schemaFor, SeriesFileSchema } from '../../src/shared/data-contracts.ts';
import { copyrightLine, COPYRIGHT_EN, COPYRIGHT_ID } from '../../src/config/brand.ts';
import { DEX_REGISTRY, DEX_IDS, isDexId, visibleDex, DEX_BY_ID } from '../../src/config/dex-registry.ts';
import { DEX_GROUPS } from '../../src/config/dex-groups.ts';

describe('data contracts', () => {
  it('finds NaN/Infinity/undefined anywhere', () => {
    expect(findUnsafe({ a: [1, { b: 2 }] })).toBeNull();
    expect(findUnsafe({ a: [1, { b: NaN }] })).toBe('.a[1].b');
    expect(findUnsafe(Infinity)).toBe('(root)');
    expect(findUnsafe({ f: undefined })).toBe('.f');
    expect(findUnsafe(() => 1)).toBe('(root)');
  });
  it('maps paths to schemas', () => {
    expect(schemaFor('core/global/series/GSPC.json')).toBe(SeriesFileSchema);
    expect(schemaFor('heavy/salary/rows.f.json')).not.toBeNull();
    expect(schemaFor('core/global/catalog.json')).toBeNull();
  });
});

describe('brand & registry', () => {
  it('copyright line goes dynamic after 2026', () => {
    expect(copyrightLine('en', 2026)).toBe(COPYRIGHT_EN);
    expect(copyrightLine('id', 2025)).toBe(COPYRIGHT_ID);
    expect(copyrightLine('en', 2028)).toBe('© 2026–2028 Dea Saka Kurnia Putra. All rights reserved.');
  });
  it('27 Dex in 8 fixed categories; chat first & data last', () => {
    expect(DEX_REGISTRY.length).toBe(27);
    expect(new Set(DEX_IDS).size).toBe(27);
    expect(DEX_GROUPS.map((g) => g.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const d of DEX_REGISTRY) {
      expect(d.tabs[0]!.id).toBe('chat');
      expect(d.tabs.at(-1)!.id).toBe('data');
      expect(DEX_GROUPS.some((g) => g.id === d.group)).toBe(true);
    }
    const counts = Object.fromEntries(DEX_GROUPS.map((g) => [g.id, DEX_REGISTRY.filter((d) => d.group === g.id).length]));
    expect(counts).toEqual({ 'global-markets': 5, indonesia: 4, 'crypto-macro': 3, 'startup-vc': 4, 'cost-of-living': 4, social: 4, sentiment: 2, law: 1 });
    expect(isDexId('cryptdex')).toBe(true);
    expect(isDexId('nope')).toBe(false);
    expect(DEX_BY_ID.mylaiwyer.name).toBe('My LAIwyer');
  });
  it('commercial build hides NC Dex', () => {
    const nc = visibleDex('commercial').map((d) => d.id);
    for (const id of ['salarydex', 'startupdex', 'vcdex', 'vcnetworkdex', 'opencompanydex', 'ipodex']) expect(nc).not.toContain(id);
    expect(visibleDex('noncommercial').length).toBe(27);
  });
});
