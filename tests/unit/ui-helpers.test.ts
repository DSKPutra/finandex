// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Pure UI helpers: chart option builder, schema → form, CSV export, answer split, filters, runtime URLs.
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { canLog, describeSpec, specRows, toOption } from '../../src/components/chart/option';
import type { ChartColors } from '../../src/components/chart/option';
import { axisValue, formatValue } from '../../src/components/chart/format';
import { filterRows, sortRows } from '../../src/components/DataTable';
import { DEX_REGISTRY } from '../../src/config/dex-registry';
import { DATA_NOTES } from '../../src/config/data-notes';
import { resetBasesForTests, resolveBases, PRODUCTION_ORIGIN } from '../../src/config/runtime';
import { splitAnswer } from '../../src/features/chat/AnswerCard';
import { disclaimerKey } from '../../src/features/chat/ChatPanel';
import { toRequestMessages } from '../../src/features/chat/useChat';
import { decimalsFor } from '../../src/features/dex/GlobalMarkets';
import { tabForTool, TABS } from '../../src/features/dex/panels';
import { buildInput, defaultFor, fieldOf, fieldsOf, formatFieldValue, parseFieldValue } from '../../src/features/dex/schema-form';
import { filterDex } from '../../src/features/home/FeatureMap';
import { slugFile, toCsv } from '../../src/lib/export';
import en from '../../src/i18n/en.json';
import id from '../../src/i18n/id.json';
import { ChartSpec, LIMITS } from '../../src/shared/chat-protocol';

const C: ChartColors = { text: '#fff', muted: '#999', border: '#333', surface: '#111', positive: '#0f0', negative: '#f00', brand: '#0f0', info: '#00f', warning: '#fa0' };

describe('chart option builder', () => {
  it('builds every spec type without throwing and keeps data intact', () => {
    const specs: ChartSpec[] = [
      { type: 'line', x: ['2024-01-02', '2024-01-03'], series: [{ name: 'a', data: [1, 2] }], yUnit: 'pct', zeroLine: true, marks: [{ x: '2024-01-03', label: 'peak' }], logAllowed: true },
      { type: 'candle', x: ['2024-01-02'], ohlc: [[1, 3, 0.5, 2]], name: 'x' },
      { type: 'bar', categories: ['a', 'b'], series: [{ name: 's', data: [1, null] }], horizontal: true, medianLine: 1, yUnit: 'currency', currency: 'USD' },
      { type: 'heatmap', x: ['a', 'b'], y: ['a', 'b'], values: [[1, -0.5], [null, 1]], range: [-1, 1], unit: 'number', partial: ['b'] },
      { type: 'graph', nodes: [{ id: 'a', label: 'A', size: 2, group: 'g' }, { id: 'b', label: 'B', size: 1 }], edges: [{ source: 'a', target: 'b', weight: 3 }] },
      { type: 'map', level: 'world', values: [{ key: 'IDN', value: 1, label: 'Indonesia' }, { key: 'X', value: null }], unit: '%' },
      { type: 'map', level: 'points', points: [{ lat: -6, lon: 106, label: 'p', value: 1 }], unit: 'IDR' },
      { type: 'table', columns: [{ key: 'a', label: 'A' }], rows: [{ a: 1 }] },
      { type: 'quote', doc_id: 'd', doc_title: 'D', pasal: 'Pasal 1', page: 1, text: 't' },
      { type: 'card', tone: 'info', body: 'b', items: ['i'] },
    ];
    for (const s of specs) {
      expect(ChartSpec.safeParse(s).success).toBe(true);
      const o = toOption(s, C, 'id');
      expect(o).toBeTypeOf('object');
      expect(describeSpec(s, 'T', 'en').length).toBeGreaterThan(0);
      expect(specRows(s).columns.length).toBeGreaterThan(0);
    }
    const candle = toOption(specs[1]!, C, 'en') as { series: { data: unknown[] }[] };
    expect(candle.series[0]!.data[0]).toEqual([1, 2, 0.5, 3]); // o, c, l, h
    const line = toOption(specs[0]!, C, 'en', { log: true }) as { yAxis: { type: string } };
    expect(line.yAxis.type).toBe('log');
  });
  it('disables log scale for non-positive series', () => {
    expect(canLog([{ data: [1, 2, null] }])).toBe(true);
    expect(canLog([{ data: [1, -37.63] }])).toBe(false);
    const o = toOption({ type: 'line', x: ['a', 'b'], series: [{ name: 'wti', data: [1, -1] }], logAllowed: true }, C, 'en', { log: true }) as { yAxis: { type: string } };
    expect(o.yAxis.type).toBe('value');
  });
  it('formats values per locale and unit', () => {
    expect(formatValue(0.1235, 'pct', 'id')).toBe('12,35%');
    expect(formatValue(0.1235, 'pct', 'en')).toBe('12.35%');
    expect(formatValue(null, 'pct', 'en')).toBe('–');
    expect(formatValue(true, undefined, 'id')).toBe('Ya');
    expect(formatValue('x', undefined, 'en')).toBe('x');
    expect(formatValue(191321, undefined, 'id')).toBe('191.321');
    expect(formatValue(2_500_000, undefined, 'en')).toMatch(/M$/);
    expect(formatValue(1.5, undefined, 'en')).toBe('1.50');
    expect(formatValue(0.00123, undefined, 'en')).toBe('0.0012');
    expect(formatValue(Infinity, undefined, 'en')).toBe('–');
    expect(axisValue(0.5, 'pct', 'en')).toBe('50%');
    expect(axisValue(12345, 'number', 'en')).toMatch(/K$/);
  });
});

describe('schema → form', () => {
  const S = z.object({
    metric: z.enum(['ret_1Y', 'ret_YTD']),
    region: z.enum(['a', 'b']).nullable(),
    limit: z.number().int().min(1).max(25),
    year: z.number().int().nullable(),
    start: z.string().nullable(),
    query: z.string().min(1),
    flag: z.boolean(),
    ids: z.array(z.string()).max(5),
    nums: z.array(z.number()),
    filters: z.object({ country: z.string().nullable(), seniority: z.string().nullable() }).strict(),
    groups: z.array(z.object({ label: z.string(), filters: z.object({ country: z.string().nullable() }) })),
  });
  it('derives fields, bounds, and defaults', () => {
    const f = fieldsOf(S);
    expect(f.map((x) => x.kind)).toEqual(['enum', 'enum', 'number', 'number', 'string', 'string', 'boolean', 'list', 'list', 'object', 'list']);
    const lim = f[2]!;
    expect(lim.kind === 'number' && lim.max === 25 && lim.min === 1).toBe(true);
    expect(defaultFor(f[0]!)).toBe('ret_1Y');
    expect(defaultFor(f[1]!)).toBeNull();
    expect(defaultFor(f[2]!)).toBe(20);
    expect(defaultFor(f[3]!)).toBe(2024);
    expect(defaultFor(f[6]!)).toBe(false);
    expect(defaultFor(f[9]!)).toEqual({ country: null, seniority: null });
    expect(fieldOf('x', z.unknown()).kind).toBe('unsupported');
  });
  it('builds valid inputs: clamps numbers, fills nested objects and list items, applies entity', () => {
    const input = buildInput(fieldsOf(S), { limit: 99, query: 'q', filters: { country: 'US' }, groups: [{ label: 'US', filters: {} }] }, { keys: ['query'], value: 'AAPL' });
    expect(input.limit).toBe(25);
    expect(input.query).toBe('AAPL');
    expect(input.filters).toEqual({ country: 'US', seniority: null });
    expect(input.groups).toEqual([{ label: 'US', filters: { country: null } }]);
    expect(S.safeParse(input).success).toBe(true);
  });
  it('parses and formats raw control values', () => {
    const f = fieldsOf(S);
    expect(parseFieldValue(f[2]!, '7')).toBe(7);
    expect(parseFieldValue(f[3]!, '')).toBeNull();
    expect(parseFieldValue(f[2]!, 'abc')).toBe(0);
    expect(parseFieldValue(f[1]!, '')).toBeNull();
    expect(parseFieldValue(f[7]!, 'a, b ,')).toEqual(['a', 'b']);
    expect(parseFieldValue(f[8]!, '1, x, 2')).toEqual([1, 2]);
    expect(parseFieldValue(f[6]!, 'true')).toBe(true);
    expect(formatFieldValue(['a', 'b'])).toBe('a, b');
    expect(formatFieldValue(null)).toBe('');
  });
});

describe('panels & tabs', () => {
  it('maps tools back to tabs', () => {
    expect(tabForTool('nasdaqdex', 'pulse')).toBe('pulse');
    expect(tabForTool('nasdaqdex', 'nope')).toBeUndefined();
    expect(Object.keys(TABS)).toHaveLength(29);
  });
  it('every Dex has data notes with at least one rule', () => {
    for (const d of DEX_REGISTRY) expect(DATA_NOTES[d.id].rules.length, d.id).toBeGreaterThan(0);
  });
});

describe('exports & chat helpers', () => {
  it('writes CSV with watermark, escaping, and formula-injection guard', () => {
    const csv = toCsv(['a', 'b'], [['=cmd()', 'x,"y"'], [-1.5, null]], { source: 'f.csv', asOf: '2024-01-02' });
    expect(csv.startsWith('﻿# Finandex · © Dea Saka Kurnia Putra')).toBe(true);
    expect(csv).toContain("'=cmd()");
    expect(csv).toContain('"x,""y"""');
    expect(csv).toContain('-1.5,');
    expect(csv).toContain('# Source: f.csv · as of 2024-01-02');
    expect(slugFile('Return 1Y — Gold!', 'png')).toBe('finandex-return-1y-gold.png');
  });
  it('splits the core answer from the analysis list', () => {
    expect(splitAnswer('Inti.\n\n- a\n- b')).toEqual({ core: 'Inti.', analysis: '- a\n- b' });
    expect(splitAnswer('Hanya inti.')).toEqual({ core: 'Hanya inti.', analysis: '' });
  });
  it('limits request messages to the protocol', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ role: (i % 2 ? 'assistant' : 'user') as 'user' | 'assistant', content: `m${i}${'x'.repeat(i === 29 ? 5000 : 0)}` }));
    const out = toRequestMessages([...many, { role: 'assistant', content: '  ' }]);
    expect(out).toHaveLength(LIMITS.messages);
    expect(out.at(-1)!.content.length).toBe(LIMITS.messageChars);
  });
  it('chooses Dex-specific disclaimers', () => {
    expect(disclaimerKey('mylaiwyer')).toBe('disclaimer.mylaiwyer');
    expect(disclaimerKey('finlaiwyer')).toBe('disclaimer.finlaiwyer');
    expect(disclaimerKey('antiscamdex')).toBe('disclaimer.antiscamdex');
    expect(disclaimerKey('cryptdex')).toBe('disclaimer.cryptoBot');
    expect(disclaimerKey('salarydex')).toBe('disclaimer.sample');
    expect(disclaimerKey('nasdaqdex')).toBe('disclaimer.short');
  });
  it('filters Dex for the feature map', () => {
    const all = [...DEX_REGISTRY];
    expect(filterDex(all, { q: '', group: null, indonesia: false, hideNc: false })).toHaveLength(29);
    expect(filterDex(all, { q: '', group: null, indonesia: false, hideNc: true })).toHaveLength(23);
    expect(filterDex(all, { q: 'rupiah', group: null, indonesia: false, hideNc: false }).map((d) => d.id)).toContain('rupiahdex');
    expect(filterDex(all, { q: '', group: 'law', indonesia: true, hideNc: false }).map((d) => d.id)).toEqual(['mylaiwyer', 'finlaiwyer', 'antiscamdex']);
  });
  it('sorts and filters table rows (nulls last)', () => {
    const rows = [{ a: 2, b: 'x' }, { a: null, b: 'y' }, { a: 1, b: 'z' }];
    expect(sortRows(rows, 'a', 'asc').map((r) => r.a)).toEqual([1, 2, null]);
    expect(sortRows(rows, 'a', 'desc').map((r) => r.a)).toEqual([2, 1, null]);
    expect(sortRows(rows, 'b', 'desc').map((r) => r.b)).toEqual(['z', 'y', 'x']);
    expect(sortRows(rows, null, 'asc')).toBe(rows);
    expect(filterRows(rows, [{ key: 'b', label: 'B' }], 'Y')).toHaveLength(1);
  });
  it('uses FX/sub-1 precision', () => {
    expect(decimalsFor('Currency', 1.12)).toBe(4);
    expect(decimalsFor('Cryptocurrency', 0.2)).toBe(4);
    expect(decimalsFor('Cryptocurrency', 80000)).toBe(2);
  });
});

describe('i18n', () => {
  const keys = (o: unknown, p = ''): string[] => (o && typeof o === 'object' && !Array.isArray(o) ? Object.entries(o).flatMap(([k, v]) => keys(v, `${p}${k}.`)) : [p.slice(0, -1)]);
  it('id and en have the same keys and ≥ 6 chips per Dex', () => {
    expect(keys(id).sort()).toEqual(keys(en).sort());
    for (const d of DEX_REGISTRY) {
      expect((id.chips as Record<string, string[]>)[d.id]!.length, d.id).toBeGreaterThanOrEqual(6);
      expect((en.chips as Record<string, string[]>)[d.id]!.length, d.id).toBeGreaterThanOrEqual(6);
    }
  });
  it('keeps the exact §12.2 / §12.5 wording', () => {
    expect(id.disclaimer.general).toBe('Finandex menyajikan data historis untuk tujuan informasi dan edukasi. Bukan rekomendasi investasi, ajakan membeli/menjual efek atau aset kripto, maupun nasihat keuangan atau hukum. Kinerja masa lalu tidak menjamin kinerja masa depan. Data tidak real-time dan dapat mengandung kesalahan dari sumbernya.');
    expect(id.disclaimer.law).toBe('Informasi hukum berdasarkan dokumen yang tersedia, bukan nasihat hukum dan tidak menggantikan advokat. Untuk kasus nyata, hubungi advokat atau Lembaga Bantuan Hukum. Dalam keadaan darurat, hubungi 112.');
    expect(id.disclaimer.trademark).toContain('Finandex tidak berafiliasi dengan, disponsori, atau didukung oleh Nasdaq, Inc.');
  });
});

describe('runtime URL resolution (§15.6)', () => {
  it('uses same-origin data when /data/manifest.json exists, else production', async () => {
    resetBasesForTests();
    const ok = await resolveBases((async () => new Response('', { status: 200 })) as typeof fetch);
    expect(ok.data.endsWith('/data')).toBe(true);
    expect(ok.data.startsWith(PRODUCTION_ORIGIN)).toBe(false);
    resetBasesForTests();
    const miss = await resolveBases((async () => new Response('', { status: 404 })) as typeof fetch);
    expect(miss).toEqual({ api: PRODUCTION_ORIGIN, data: `${PRODUCTION_ORIGIN}/data` });
    resetBasesForTests();
    const err = await resolveBases((async () => {
      throw new Error('offline');
    }) as typeof fetch);
    expect(err.api).toBe(PRODUCTION_ORIGIN);
    resetBasesForTests();
  });
});

describe('whitepaper', () => {
  it('kit editions have matching id/en chapters and the reader parses them', async () => {
    const { prepareMarkdown, chaptersOf } = await import('../../src/pages/Whitepaper');
    const { readFileSync, existsSync, statSync } = await import('node:fs');
    const id = chaptersOf(prepareMarkdown(readFileSync('kit/whitepaper/FINANDEX_WHITEPAPER_ID.md', 'utf8')));
    const en = chaptersOf(prepareMarkdown(readFileSync('kit/whitepaper/FINANDEX_WHITEPAPER_EN.md', 'utf8')));
    expect(id.length).toBeGreaterThan(3);
    expect(id.length).toBe(en.length);
    for (const f of ['Finandex_Whitepaper_ID.pdf', 'Finandex_Whitepaper_EN.pdf', 'Finandex_Platform_Overview.pptx']) {
      expect(existsSync(`kit/whitepaper/${f}`), f).toBe(true);
      expect(statSync(`kit/whitepaper/${f}`).size).toBeGreaterThan(50_000);
    }
  });
  it('prepareMarkdown strips front matter and turns figure HTML into images', async () => {
    const { prepareMarkdown } = await import('../../src/pages/Whitepaper');
    const out = prepareMarkdown('---\na: 1\n---\n<div class="figure"><img src="assets/x.png" alt="X" /><p class="caption">Cap</p></div>');
    expect(out).toBe('![X](/whitepaper/assets/x.png)\n\n*Cap*');
  });
});
