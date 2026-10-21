// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Generate dist/oss-licenses.json (production dependency tree: name, version, license) for /legal/licenses.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../..');

export function prodPackages(): { name: string; version: string; license: string }[] {
  const lock = JSON.parse(readFileSync(join(ROOT, 'package-lock.json'), 'utf8')) as {
    packages: Record<string, { version?: string; license?: string; dev?: boolean; devOptional?: boolean }>;
  };
  const out = new Map<string, { name: string; version: string; license: string }>();
  for (const [path, p] of Object.entries(lock.packages)) {
    if (!path.startsWith('node_modules/') || p.dev || p.devOptional) continue;
    const name = path.slice(path.lastIndexOf('node_modules/') + 13);
    out.set(`${name}@${p.version}`, { name, version: p.version ?? '?', license: p.license ?? 'UNKNOWN' });
  }
  return [...out.values()].sort((a, b) => a.name.localeCompare(b.name));
}

if (process.argv[1]?.endsWith('oss-licenses.ts')) {
  const dist = join(ROOT, 'dist');
  if (!existsSync(dist)) throw new Error('run vite build first');
  const pk = prodPackages();
  writeFileSync(join(dist, 'oss-licenses.json'), JSON.stringify(pk));
  console.log(`oss-licenses.json: ${pk.length} packages`);
}
