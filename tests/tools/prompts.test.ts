// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// System prompts (§8.6–8.7): one file per Dex with both locales and the 5 mandatory sections; bundle in sync.
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { DEX_BY_ID, DEX_REGISTRY } from '../../src/config/dex-registry.ts';
import { PROMPTS } from '../../server/chat/prompts.generated.ts';
import { systemPrompt } from '../../server/chat/prompts.ts';

describe('system prompts', () => {
  it('generated bundle is in sync with the .md files', () => {
    expect(() =>
      execFileSync('npx', ['tsx', 'scripts/chat/bundle-prompts.ts', '--check'], { stdio: 'pipe' }),
    ).not.toThrow();
  });
  for (const d of DEX_REGISTRY) {
    it(`${d.id} has 5 sections in id and en`, () => {
      const p = PROMPTS[d.id];
      expect(p).toBeDefined();
      for (const s of [
        'Persona',
        'Cakupan & keterbatasan',
        'Kapan memakai tool apa',
        'Istilah domain',
        'Contoh jawaban baik',
      ])
        expect(p!.id).toContain(`## ${s}`);
      for (const s of [
        'Persona',
        'Scope & limitations',
        'When to use which tool',
        'Domain terms',
        'Example of a good answer',
      ])
        expect(p!.en).toContain(`## ${s}`);
    });
  }
  it('assembles global + dex + dataset card with placeholders filled', () => {
    const s = systemPrompt(DEX_BY_ID.costlivingdex, 'id', '2024-06-15', 'live');
    expect(s).toContain('Anda adalah CostLivingDex');
    expect(s).not.toMatch(/\{(DEX_NAME|DEX_SCOPE|AS_OF|LOCALE)\}/);
    expect(s).toContain('Kartu dataset');
    expect(s.toLowerCase()).toContain('sintetis');
    expect(systemPrompt(DEX_BY_ID.costlivingdex, 'en', null, 'live')).toContain('You are CostLivingDex');
  });
});
