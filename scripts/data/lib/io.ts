// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// JSON output helpers: no NaN/Infinity (→ null), ≤ 10 significant digits, deterministic formatting.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { sig10 } from '../../../src/shared/analytics/stats.ts';

export const ROOT = process.cwd();
export const EXTRACTED = join(ROOT, 'data/extracted');
export const INPUTS = join(ROOT, 'data/inputs');
export const PUBLIC_DATA = join(ROOT, 'public/data');
export const GOLDEN_OUT = join(ROOT, 'data/cache/golden-ts');

/** Deep-clean a value for JSON: NaN/±Inf → null, numbers → 10 significant digits, undefined keys dropped. */
export function clean(v: unknown): unknown {
  if (typeof v === 'number') return Number.isFinite(v) ? sig10(v) : null;
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === 'object') {
    if (v instanceof Float64Array || v instanceof Float32Array) return Array.from(v, (x) => clean(x));
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) if (x !== undefined) o[k] = clean(x);
    return o;
  }
  return v;
}

/** Same as clean() but keeps full precision (golden comparison artefacts). */
export function cleanFull(v: unknown): unknown {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (Array.isArray(v)) return v.map(cleanFull);
  if (v && typeof v === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) if (x !== undefined) o[k] = cleanFull(x);
    return o;
  }
  return v;
}

export interface WrittenFile {
  path: string;
  bytes: number;
  sha256: string;
}

export function writeJson(absPath: string, obj: unknown, pretty = false): WrittenFile {
  mkdirSync(dirname(absPath), { recursive: true });
  const txt = JSON.stringify(clean(obj), null, pretty ? 1 : undefined);
  writeFileSync(absPath, txt);
  return { path: absPath, bytes: Buffer.byteLength(txt), sha256: createHash('sha256').update(txt).digest('hex') };
}

export function writeBinary(absPath: string, buf: Uint8Array): WrittenFile {
  mkdirSync(dirname(absPath), { recursive: true });
  writeFileSync(absPath, buf);
  return { path: absPath, bytes: buf.byteLength, sha256: createHash('sha256').update(buf).digest('hex') };
}

export function x(...p: string[]): string {
  return join(EXTRACTED, ...p);
}
