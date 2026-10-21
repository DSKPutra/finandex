// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// `npm run data:build` — run every ETL module (§7), validate, write public/data/** and public/data/manifest.json.
// Modules whose inputs are missing are recorded as `pending-data` (never invented).
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DEX_REGISTRY, type DexId } from '../../src/config/dex-registry.ts';
import { FORBIDDEN_SOCIAL_KEYS, findUnsafe, ManifestSchema, schemaFor, type Manifest } from '../../src/shared/data-contracts.ts';
import { clean, cleanFull, GOLDEN_OUT, INPUTS, PUBLIC_DATA, ROOT, writeBinary, writeJson, type WrittenFile } from './lib/io.ts';
import { missing, type BuildContext, type ModuleResult } from './lib/module.ts';
import { MODULES } from './modules.ts';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const distribution = (process.env.VITE_DISTRIBUTION === 'commercial' ? 'commercial' : 'noncommercial') as 'commercial' | 'noncommercial';
const ncHidden = new Set(DEX_REGISTRY.filter((d) => distribution === 'commercial' && d.commercialUseAllowed === false).map((d) => d.id));

interface ManifestInput {
  no: number;
  file: string;
  sha256: string;
}
const manifestInputs = JSON.parse(readFileSync(join(ROOT, 'kit/manifest/input_files_manifest.json'), 'utf8')) as ManifestInput[];

function relOut(p: string): string {
  return p.slice(PUBLIC_DATA.length + 1).replace(/\\/g, '/');
}

async function main() {
  const t0 = Date.now();
  rmSync(PUBLIC_DATA, { recursive: true, force: true });
  rmSync(GOLDEN_OUT, { recursive: true, force: true });
  const ctx: BuildContext = { shared: new Map(), log: (m) => console.log('   ' + m) };
  const results: { name: string; res: ModuleResult; written: WrittenFile[] }[] = [];
  for (const mod of MODULES) {
    const miss = missing(mod.requires());
    const t = Date.now();
    if (miss.length) {
      console.log(`· ${mod.name}: pending-data (missing ${miss.map((m) => m.replace(ROOT + '/', '')).join(', ')})`);
      results.push({ name: mod.name, res: { dex: mod.dex, status: 'pending-data', missingInputs: mod.inputs, asOf: null, golden: {}, files: {} }, written: [] });
      continue;
    }
    if (mod.dex.every((d) => ncHidden.has(d))) {
      console.log(`· ${mod.name}: skipped (non-commercial dataset hidden in the commercial build)`);
      results.push({ name: mod.name, res: { dex: mod.dex, status: 'pending-data', missingInputs: [], asOf: null, golden: {}, files: {} }, written: [] });
      continue;
    }
    const res = await mod.build(ctx);
    const written: WrittenFile[] = [];
    for (const [rel, obj] of Object.entries(res.files)) {
      const abs = join(PUBLIC_DATA, rel);
      if (typeof obj === 'string') {
        mkdirSync(dirname(abs), { recursive: true });
        writeFileSync(abs, obj);
        written.push({ path: abs, bytes: Buffer.byteLength(obj), sha256: createHash('sha256').update(obj).digest('hex') });
        continue;
      }
      const c = clean(obj);
      const bad = findUnsafe(c);
      if (bad) throw new Error(`${rel}: non JSON-safe value at ${bad}`);
      const schema = schemaFor(rel);
      if (schema) {
        const r = schema.safeParse(c);
        if (!r.success) throw new Error(`${rel}: schema violation ${r.error.issues.slice(0, 3).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
      }
      if (/(fintech|personalfinance)\//.test(rel)) {
        const txt = JSON.stringify(c);
        for (const k of FORBIDDEN_SOCIAL_KEYS) if (txt.includes(`"${k}"`)) throw new Error(`${rel}: forbidden social key ${k}`);
      }
      written.push(writeJson(abs, c));
    }
    for (const [rel, buf] of Object.entries(res.binaries ?? {})) written.push(writeBinary(join(PUBLIC_DATA, rel), buf));
    for (const [rel, obj] of Object.entries(res.golden)) writeJson(join(GOLDEN_OUT, rel), cleanFull(obj));
    const bytes = written.reduce((a, w) => a + w.bytes, 0);
    console.log(`✓ ${mod.name}: ${res.status} as_of=${res.asOf ?? '—'} · ${written.length} files · ${(bytes / 1e6).toFixed(1)} MB · ${Date.now() - t} ms`);
    results.push({ name: mod.name, res, written });
  }

  const dex = {} as Manifest['dex'];
  for (const entry of DEX_REGISTRY) {
    const rs = results.filter((r) => r.res.dex.includes(entry.id as DexId));
    const built = rs.filter((r) => r.res.status === 'built');
    const missingInputs = [...new Set(rs.flatMap((r) => r.res.missingInputs ?? []))].sort((a, b) => a - b);
    const status = ncHidden.has(entry.id) ? 'pending-data' : !built.length ? 'pending-data' : missingInputs.length ? 'partial' : 'live';
    const asOfs = built.map((r) => r.res.asOf).filter((x): x is string => Boolean(x));
    dex[entry.id] = {
      status,
      as_of: asOfs.sort().at(-1) ?? (built.length ? entry.asOf : null),
      missing_inputs: missingInputs,
      files: built.flatMap((r) => r.written.map((w) => ({ path: relOut(w.path), bytes: w.bytes, sha256: w.sha256 }))),
      quality: Object.assign({}, ...built.map((r) => r.res.quality ?? {})),
    };
  }
  const manifest: Manifest = {
    build_id: randomUUID(),
    built_at: new Date().toISOString(),
    distribution,
    inputs: manifestInputs.map((i) => ({ no: i.no, file: i.file, sha256: i.sha256, present: existsSync(join(INPUTS, i.file)) })),
    dex,
  };
  ManifestSchema.parse(manifest);
  // the manifest lists every file, so keep a slim copy for clients (without per-file entries of heavy/)
  writeJson(join(PUBLIC_DATA, 'manifest.full.json'), manifest);
  const slim = { ...manifest, dex: Object.fromEntries(Object.entries(manifest.dex).map(([k, v]) => [k, { ...v, files: v.files.filter((f) => f.path.startsWith('core/')) }])) };
  writeJson(join(PUBLIC_DATA, 'manifest.json'), slim);
  const total = results.flatMap((r) => r.written).reduce((a, w) => a + w.bytes, 0);
  console.log(`\nmanifest: ${Object.values(dex).filter((d) => d.status === 'live').length} live · ${Object.values(dex).filter((d) => d.status === 'partial').length} partial · ${Object.values(dex).filter((d) => d.status === 'pending-data').length} pending-data · ${(total / 1e6).toFixed(1)} MB · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
