// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Dependency licence gate (§5): production dependencies only MIT / Apache-2.0 / BSD / ISC / 0BSD / OFL (fonts), plus
// public-domain dedications (Unlicense, CC0) recorded in docs/DECISIONS.md. Dev tooling may also use weak/file-level
// copyleft or permissive data licences (MPL-2.0, BlueOak, Python-2.0, CC-BY-4.0) but never GPL/AGPL/LGPL/SSPL/EUPL.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const lock = JSON.parse(readFileSync(join(import.meta.dirname, '../../package-lock.json'), 'utf8')) as {
  packages: Record<string, { license?: string; dev?: boolean; devOptional?: boolean; version?: string }>;
};
const PROD = /^(MIT|Apache-2\.0|BSD|BSD-2-Clause|BSD-3-Clause|ISC|0BSD|OFL-1\.1|Unlicense|CC0-1\.0)$/;
const DEV_EXTRA = /^(MPL-2\.0|BlueOak-1\.0\.0|Python-2\.0|CC-BY-4\.0)$/;
const BANNED = /\b(A?GPL|LGPL|SSPL|EUPL)/i;

/** Old packages declare `licenses: [{ type }]`, which package-lock does not record. */
function legacyLicense(path: string): string | null {
  const f = join(import.meta.dirname, '../..', path, 'package.json');
  if (!existsSync(f)) return null;
  const pj = JSON.parse(readFileSync(f, 'utf8')) as {
    license?: string | { type?: string };
    licenses?: { type?: string }[];
  };
  if (typeof pj.license === 'object' && pj.license?.type) return pj.license.type;
  return (
    pj.licenses
      ?.map((l) => l.type)
      .filter(Boolean)
      .join(' OR ') || null
  );
}

const ok = (expr: string, re: RegExp) =>
  expr
    .replace(/[()]/g, '')
    .split(/\s+OR\s+/)
    .some((x) => re.test(x.trim())) && !BANNED.test(expr);
const bad: string[] = [];
for (const [path, p] of Object.entries(lock.packages)) {
  if (!path) continue;
  const lic = p.license ?? legacyLicense(path) ?? 'UNKNOWN';
  const dev = p.dev || p.devOptional;
  if (!(ok(lic, PROD) || (dev && ok(lic, DEV_EXTRA))))
    bad.push(`${path.replace(/^.*node_modules\//, '')}@${p.version} — ${lic}${dev ? ' (dev)' : ''}`);
}
if (bad.length) {
  console.error(`check:licenses FAILED (${bad.length}):\n  ${bad.join('\n  ')}`);
  process.exit(1);
}
console.log(`check:licenses OK (${Object.keys(lock.packages).length - 1} packages)`);
