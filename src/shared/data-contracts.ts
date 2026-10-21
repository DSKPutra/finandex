// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Data contracts (§7.4): TypeScript types + zod schemas shared by ETL (write), server (read) and client (read).
import { z } from 'zod';
import { DEX_IDS } from '../config/dex-registry.ts';

export const CalDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const numOrNull = z.number().finite().nullable();

/** Columnar price series (§7.3). */
export const SeriesFileSchema = z.object({
  id: z.string(),
  as_of: CalDateSchema,
  fields: z.array(z.string()),
  /** index into d where o/h/l start (OHLC kept for the trailing 2 years only) */
  ohlc_from: z.number().int().nonnegative(),
  d: z.array(CalDateSchema),
  o: z.array(numOrNull).optional(),
  h: z.array(numOrNull).optional(),
  l: z.array(numOrNull).optional(),
  c: z.array(numOrNull),
  ac: z.array(numOrNull).optional(),
  v: z.array(numOrNull).optional(),
  /** sparse [rowIndex, amount] events */
  div: z.array(z.tuple([z.number().int(), z.number()])).optional(),
  split: z.array(z.tuple([z.number().int(), z.number()])).optional(),
  quality: z.unknown().optional(),
});
export type SeriesFile = z.infer<typeof SeriesFileSchema>;

export const ColumnarTableSchema = z.object({
  columns: z.array(z.string()),
  dict: z.record(z.string(), z.array(z.string().nullable())),
  rows: z.array(z.array(z.unknown())),
});
export type ColumnarTableFile = z.infer<typeof ColumnarTableSchema>;

export const ManifestFileEntrySchema = z.object({ path: z.string(), bytes: z.number().int().nonnegative(), sha256: z.string().length(64) });
export const ManifestSchema = z.object({
  build_id: z.string(),
  built_at: z.string(),
  distribution: z.enum(['noncommercial', 'commercial']),
  inputs: z.array(z.object({ no: z.number().int(), file: z.string(), sha256: z.string().length(64), present: z.boolean() })),
  dex: z.record(
    z.enum(DEX_IDS),
    z.object({
      status: z.enum(['live', 'partial', 'pending-data']),
      as_of: z.string().nullable(),
      missing_inputs: z.array(z.number().int()),
      files: z.array(ManifestFileEntrySchema),
      quality: z.unknown().optional(),
    }),
  ),
});
export type Manifest = z.infer<typeof ManifestSchema>;

/** Recursively assert a value is JSON-safe (no NaN/Infinity/undefined/functions). Returns the first offending path. */
export function findUnsafe(v: unknown, path = ''): string | null {
  if (typeof v === 'number') return Number.isFinite(v) ? null : path || '(root)';
  if (v === null || typeof v === 'string' || typeof v === 'boolean') return null;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      const r = findUnsafe(v[i], `${path}[${i}]`);
      if (r) return r;
    }
    return null;
  }
  if (typeof v === 'object') {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      const r = findUnsafe(x, `${path}.${k}`);
      if (r) return r;
    }
    return null;
  }
  return path || '(root)';
}

/** Social-media datasets must never carry author identity (§13.2). */
export const FORBIDDEN_SOCIAL_KEYS = ['author', 'author_followers', 'mentions', 'author_handle', 'username'];

/** Select a schema for a public/data path (others are checked by findUnsafe only). */
export function schemaFor(path: string): z.ZodType | null {
  if (/\/series\/[^/]+\.json$/.test(path) || path === 'core/rupiah/series.json') return SeriesFileSchema;
  if (/heavy\/(salary|startup|opencompany|vcdirectory|vcnetwork|food|housing|ipo|fintech|personalfinance|population|homelessness|housingnews)\/[^/]+\.json$/.test(path)) return ColumnarTableSchema;
  return null;
}
