// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// `npm run icons:generate`: app & Dex icons in the "Spektrum" palette (owner feedback 2026-10-25: no neon green). Reads the
// original glyphs from kit/brand/icons/*.svg (kept unchanged) and writes public/icons/*.svg (+ the PNG sizes that exist
// there) with a tile in the Dex category colour, white glyphs and a pastel accent instead of the neon glow.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { DEX_GROUP_IDS } from '../../src/config/dex-groups';
import { DEX_REGISTRY } from '../../src/config/dex-registry';

const SRC = 'kit/brand/icons';
const OUT = 'public/icons';
// [tile top, tile bottom, accent] per category (order = DEX_GROUP_IDS), and the brand tile for Finandex itself.
const GROUP_TILES: [string, string, string][] = [
  ['#2B4FC7', '#172554', '#BFDBFE'], // global markets — blue
  ['#B4471A', '#4A1608', '#FED7AA'], // Indonesia — orange
  ['#6A35C9', '#2E1065', '#DDD6FE'], // crypto & macro — violet
  ['#1A6F86', '#082F3C', '#A5F3FC'], // startup & VC — cyan
  ['#9A5B12', '#451A03', '#FDE68A'], // living & work — amber
  ['#97239F', '#4A044E', '#F5D0FE'], // social & development — fuchsia
  ['#B3254A', '#4C0519', '#FECDD3'], // sentiment & personal finance — rose
  ['#45526A', '#0F172A', '#E2E8F0'], // law — slate
];
const BRAND_TILE: [string, string, string] = ['#4F46E5', '#1E1B4B', '#C7D2FE'];

function tileFor(name: string): [string, string, string] {
  if (name === 'finandex' || name === 'finandex-ai') return BRAND_TILE;
  const dex = DEX_REGISTRY.find((d) => d.icon === name || d.id === name);
  if (!dex) throw new Error(`icon ${name}: no Dex with this icon`);
  return GROUP_TILES[DEX_GROUP_IDS.indexOf(dex.group)]!;
}

export function recolor(svg: string, [top, bottom, accent]: [string, string, string]): string {
  return svg
    .replace(/stop-color="#121B15"/gi, `stop-color="${top}"`)
    .replace(/stop-color="#040705"/gi, `stop-color="${bottom}"`)
    .replace(/#08100B/gi, bottom)
    .replace(/(<stop offset="0" stop-color=)"#19F23A" stop-opacity="0\.16"/gi, `$1"#FFFFFF" stop-opacity="0.14"`)
    .replace(/stop-color="#19F23A"/gi, 'stop-color="#FFFFFF"')
    .replace(/ filter="url\(#glow\)"/g, '')
    .replace(/#19F23A/gi, accent)
    .replace(/#EEF3EF/gi, '#FFFFFF');
}

async function main() {
  const svgs = readdirSync(SRC).filter((f) => f.endsWith('.svg'));
  for (const f of svgs) {
    const name = f.replace(/\.svg$/, '');
    const out = recolor(readFileSync(join(SRC, f), 'utf8'), tileFor(name));
    if (/#19F23A/i.test(out)) throw new Error(`${f}: neon left after recolour`);
    writeFileSync(join(OUT, f), out);
    for (const size of [192, 512, 1024]) {
      const png = join(OUT, `${name}-${size}.png`);
      if (existsSync(png)) await sharp(Buffer.from(out)).resize(size, size).png().toFile(png);
    }
  }
  console.log(`icons: ${svgs.length} SVG recoloured → ${OUT}`);
}

if (process.argv[1]?.endsWith('make-icons.ts')) await main();
