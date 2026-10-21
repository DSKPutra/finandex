// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Web build for Capacitor (§14): API + heavy data from production, data/core bundled; strips dist/data/heavy.
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { join } from 'node:path';

const origin = process.env.PRODUCTION_ORIGIN ?? 'https://finandex.vercel.app';
execFileSync('npx', ['vite', 'build'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_API_BASE_URL: process.env.VITE_API_BASE_URL ?? origin,
    VITE_HEAVY_DATA_BASE_URL: `${origin}/data`,
    VITE_PRODUCTION_ORIGIN: origin,
  },
});
rmSync(join(import.meta.dirname, '../../dist/data/heavy'), { recursive: true, force: true });
console.log('native web build ready (dist/, heavy data served from', origin + ')');
