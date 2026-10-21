// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// ETL module contract. Every Dex builder returns golden-shaped objects (compared with kit/golden/**)
// plus the app data files written under public/data/**.
import { existsSync } from 'node:fs';
import type { DexId } from '../../../src/config/dex-registry.ts';
import type { Series } from '../../../src/shared/analytics/series.ts';

export interface BuildContext {
  /** shared series produced by earlier modules (e.g. ^IXIC, ^GSPC, IHSG, USD/IDR month-end) */
  shared: Map<string, Series>;
  log: (msg: string) => void;
}

export interface ModuleResult {
  dex: DexId[];
  status: 'built' | 'pending-data';
  missingInputs?: number[];
  asOf: string | null;
  /** key = path relative to kit/golden (e.g. "global/golden_metrics.json") */
  golden: Record<string, unknown>;
  /** key = path relative to public/data (e.g. "core/global/catalog.json") */
  files: Record<string, unknown>;
  /** binary files (Float32 matrices) relative to public/data */
  binaries?: Record<string, Uint8Array>;
  quality?: Record<string, unknown>;
}

export interface DexModule {
  name: string;
  dex: DexId[];
  inputs: number[];
  /** absolute paths that must exist for the module to build */
  requires: () => string[];
  build: (ctx: BuildContext) => Promise<ModuleResult>;
}

export function missing(paths: string[]): string[] {
  return paths.filter((p) => !existsSync(p));
}

export function pending(mod: DexModule, missingInputs: number[]): ModuleResult {
  return { dex: mod.dex, status: 'pending-data', missingInputs, asOf: null, golden: {}, files: {} };
}
