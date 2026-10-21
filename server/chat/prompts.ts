// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// System prompt assembly (§8.3): global.md(locale) + <dex>.md(locale) + dataset card.
import type { DexEntry } from '../../src/config/dex-registry.ts';
import type { Locale } from '../../src/shared/format.ts';
import { DATASET_NOTES } from '../dex/dataset-notes.ts';
import { PROMPTS } from './prompts.generated.ts';

export function datasetCard(dex: DexEntry, locale: Locale, asOf: string | null, status: string): string {
  const n = DATASET_NOTES[dex.id];
  const h =
    locale === 'id'
      ? {
          t: 'Kartu dataset',
          ds: 'Dataset',
          st: 'Status',
          as: 'Data per',
          r: 'Aturan pembersihan',
          l: 'Keterbatasan',
          s: 'Sampel',
        }
      : {
          t: 'Dataset card',
          ds: 'Dataset',
          st: 'Status',
          as: 'Data as of',
          r: 'Cleaning rules',
          l: 'Limitations',
          s: 'Sample',
        };
  return [
    `## ${h.t}`,
    `- ${h.ds}: ${n.dataset}`,
    `- ${h.st}: ${status}${dex.statusNote ? ` — ${dex.statusNote[locale]}` : ''}`,
    `- ${h.as}: ${asOf ?? dex.asOf}`,
    ...(dex.sample ? [`- ${h.s}: ${Math.round(dex.sample * 100)}%`] : []),
    `- ${h.r}:`,
    ...n.rules.map((r) => `  - ${r[locale]}`),
    `- ${h.l}:`,
    ...n.limits.map((r) => `  - ${r[locale]}`),
  ].join('\n');
}

export function systemPrompt(dex: DexEntry, locale: Locale, asOf: string | null, status: string): string {
  const g = PROMPTS.global?.[locale];
  const d = PROMPTS[dex.id]?.[locale];
  if (!g) throw new Error('global system prompt missing');
  const head = g
    .replaceAll('{DEX_NAME}', dex.name)
    .replaceAll('{DEX_SCOPE}', dex.scope[locale])
    .replaceAll('{AS_OF}', asOf ?? dex.asOf)
    .replaceAll('{LOCALE}', locale === 'id' ? 'id-ID' : 'en');
  return [head, d ?? '', datasetCard(dex, locale, asOf, status)].filter(Boolean).join('\n\n');
}
