// © 2026 Dea Saka Kurnia Putra. All rights reserved.
/// <reference types="vite/client" />
// Browser data access: the same DataStore and the same deterministic tools as the server (§6.1), so every tab shows
// numbers identical to the chatbot. Tool modules are code-split per Dex.
import { useQuery } from '@tanstack/react-query';
import { DEX_BY_ID, type DexId } from '../config/dex-registry.ts';
import { DataStore } from '../../server/data/store.ts';
import { ToolError, type Tool, type ToolContext, type ToolOutput } from '../../server/tools/types.ts';
import type { Locale } from '../i18n/index.ts';

import { resolveRuntime, type Runtime } from '../config/runtime.ts';

export let API_BASE = '';
export { DISTRIBUTION } from '../config/visible-dex.ts';

export let store = new DataStore(`${location.origin}/data`);
export let runtime: Runtime = { apiBase: '', dataBase: `${location.origin}/data`, source: 'same-origin' };

/** Resolve API/data origins once at start-up; data access awaits `ready` (rendering does not). */
let readyResolve!: (r: Runtime) => void;
export const ready: Promise<Runtime> = new Promise((r) => (readyResolve = r));
export async function initRuntime(): Promise<Runtime> {
  runtime = await resolveRuntime();
  API_BASE = runtime.apiBase;
  // native builds bundle data/core only; heavy files come from VITE_HEAVY_DATA_BASE_URL (production) (§14)
  const heavy = (import.meta.env.VITE_HEAVY_DATA_BASE_URL as string | undefined)?.replace(/\/$/, '');
  const base = runtime.dataBase;
  store = new DataStore(base, (u, i) =>
    fetch(heavy && u.startsWith(`${base}/heavy/`) ? `${heavy}${u.slice(base.length)}` : u, i),
  );
  readyResolve(runtime);
  return runtime;
}
export type Manifest = NonNullable<ToolContext['manifest']> & { built_at?: string; distribution?: string };

export function useManifest() {
  return useQuery({
    queryKey: ['manifest'],
    queryFn: async () => (await ready, store.json<Manifest>('manifest.json')),
    staleTime: 10 * 60_000,
  });
}

const LOADERS: Record<DexId, () => Promise<{ tools: Tool<never>[] }>> = {
  'finandex-ai': () => import('../../server/dex/finandex-ai/tools.ts'),
  nasdaqdex: () => import('../../server/dex/nasdaqdex/tools.ts'),
  snp500dex: () => import('../../server/dex/snp500dex/tools.ts'),
  commercedex: () => import('../../server/dex/commercedex/tools.ts'),
  ipodex: () => import('../../server/dex/ipodex/tools.ts'),
  idfinandex: () => import('../../server/dex/idfinandex/tools.ts'),
  rupiahdex: () => import('../../server/dex/rupiahdex/tools.ts'),
  idxdex: () => import('../../server/dex/idxdex/tools.ts'),
  reksadex: () => import('../../server/dex/reksadex/tools.ts'),
  cryptdex: () => import('../../server/dex/cryptdex/tools.ts'),
  centralbankdex: () => import('../../server/dex/centralbankdex/tools.ts'),
  inflationdex: () => import('../../server/dex/inflationdex/tools.ts'),
  startupdex: () => import('../../server/dex/startupdex/tools.ts'),
  vcdex: () => import('../../server/dex/vcdex/tools.ts'),
  vcnetworkdex: () => import('../../server/dex/vcnetworkdex/tools.ts'),
  opencompanydex: () => import('../../server/dex/opencompanydex/tools.ts'),
  salarydex: () => import('../../server/dex/salarydex/tools.ts'),
  costlivingdex: () => import('../../server/dex/costlivingdex/tools.ts'),
  idhousingdex: () => import('../../server/dex/idhousingdex/tools.ts'),
  idfooddeliverydex: () => import('../../server/dex/idfooddeliverydex/tools.ts'),
  povertydex: () => import('../../server/dex/povertydex/tools.ts'),
  populationdex: () => import('../../server/dex/populationdex/tools.ts'),
  homelessnessdex: () => import('../../server/dex/homelessnessdex/tools.ts'),
  housingdex: () => import('../../server/dex/housingdex/tools.ts'),
  fintechdex: () => import('../../server/dex/fintechdex/tools.ts'),
  personalfinandex: () => import('../../server/dex/personalfinandex/tools.ts'),
  mylaiwyer: () => import('../../server/dex/mylaiwyer/tools.ts'),
};

export interface Call {
  tool: string;
  input: Record<string, unknown>;
}
export type CallResult = { ok: true; out: ToolOutput } | { ok: false; error: string; pending: boolean };

export async function runTool(dex: DexId, call: Call, locale: Locale, manifest: Manifest | null): Promise<CallResult> {
  await ready;
  const { tools } = await LOADERS[dex]();
  const tool = tools.find((t) => t.name === call.tool);
  if (!tool) return { ok: false, error: `unknown tool ${call.tool}`, pending: false };
  const parsed = tool.input.safeParse(call.input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'invalid input', pending: false };
  try {
    const out = await tool.run({ dex: DEX_BY_ID[dex], store, locale, manifest }, parsed.data as never);
    return { ok: true, out };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: msg,
      pending: e instanceof ToolError && /pending-data|not available yet|belum tersedia/i.test(msg),
    };
  }
}

/** React Query wrapper for a list of tool calls (one tab / panel). */
export function useToolCalls(dex: DexId, calls: Call[], locale: Locale) {
  const manifest = useManifest();
  return useQuery({
    queryKey: ['tools', dex, locale, calls],
    queryFn: () => Promise.all(calls.map((c) => runTool(dex, c, locale, manifest.data ?? null))),
    enabled: !manifest.isLoading,
    staleTime: 10 * 60_000,
  });
}
