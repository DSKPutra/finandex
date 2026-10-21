// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// WCAG 2.2 AA contrast gate (§10.3): every text/background pair of both themes (and colour-blind mode) ≥ 4.5:1 for
// body text; chart palette colours ≥ 3:1 against the surfaces they are drawn on (non-text graphics).
import { CHART_PALETTE, CHART_PALETTE_LIGHT, TOKENS } from '../../src/config/brand.ts';

function lum(hex: string): number {
  const v = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(v.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}
export function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x! + 0.05) / (y! + 0.05);
}

const fails: string[] = [];
const check = (label: string, fg: string, bg: string, min: number) => {
  const r = ratio(fg, bg);
  if (r < min) fails.push(`${label}: ${fg} on ${bg} = ${r.toFixed(2)} < ${min}`);
};
for (const mode of ['dark', 'light'] as const) {
  const t = TOKENS[mode];
  for (const bg of ['bg', 'surface', 'surface2'] as const)
    for (const fg of ['text', 'textMuted', 'brandText', 'positive', 'negative', 'warning', 'info'] as const)
      check(`${mode} ${fg}/${bg}`, t[fg], t[bg], 4.5);
  check(`${mode} on-brand button`, '#0A0F0C', t.brand, 4.5);
  for (const c of mode === 'dark' ? CHART_PALETTE : CHART_PALETTE_LIGHT)
    for (const bg of ['surface', 'surface2'] as const) check(`${mode} chart ${c}/${bg}`, c, t[bg], 3);
}
for (const [k, c] of Object.entries(TOKENS.colorblind)) check(`dark colorblind ${k}`, c, TOKENS.dark.surface, 4.5);
check('light colorblind positive', '#1565C0', TOKENS.light.surface, 4.5);
check('light colorblind negative', '#A15C00', TOKENS.light.surface, 4.5);
if (fails.length) {
  console.error(`check:contrast FAILED:\n  ${fails.join('\n  ')}`);
  process.exit(1);
}
console.log('check:contrast OK');
