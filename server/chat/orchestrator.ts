// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Chat orchestration (§8.3, AGENTIC_AI_PROMPT §5): /api/chat runs the multi-agent pipeline in server/agents/run.ts —
// Guard → Conductor plan → Dex agents (each the §8.3 loop: tools are deterministic, read-only, 8 s timeout) →
// Verifier → Guard → done. This module keeps the shared tool runner and the safety texts.
import type { DexId } from '../../src/config/dex-registry';
import { LIMITS } from '../../src/shared/chat-protocol';
import type { ChatRequest, SseEvent } from '../../src/shared/chat-protocol';
import type { DataStore } from '../data/store';
import { ToolError } from '../tools/kit';
import type { ManifestLike, ToolCtx, ToolDef } from '../tools/kit';
import type { Llm } from './llm';

export type OrchestratorDeps = {
  llm: Llm;
  /** Per-agent model (data mode builds one composer per Dex); defaults to `llm`. */
  llmFor?: (dex: DexId) => Llm;
  /** An AI model is configured: the Conductor plans with it and agents load skills with `load_skill`. */
  live?: boolean;
  store: DataStore;
  manifest: () => Promise<ManifestLike>;
  deadlineMs: number;
  distribution: 'noncommercial' | 'commercial';
  appVersion: string;
  now?: () => number;
  log?: (rec: Record<string, unknown>) => void;
};

export type ToolUse = { id: string; name: string; input: unknown };

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new ToolError(`${label} timed out after ${ms} ms; try a narrower request.`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Run one tool call; never throws — errors become instructive `is_error` results. */
export async function runTool(tools: ToolDef[], use: ToolUse, ctx: ToolCtx) {
  const def = tools.find((t) => t.name === use.name);
  if (!def) return { error: `Tool "${use.name}" is not available in this Dex. Available: ${tools.map((t) => t.name).join(', ')}` };
  const parsed = def.input.safeParse(use.input);
  if (!parsed.success) return { error: `Invalid input for ${use.name}: ${parsed.error.issues.slice(0, 3).map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}` };
  try {
    return { result: await withTimeout(def.run(parsed.data, ctx), LIMITS.toolTimeoutMs, use.name) };
  } catch (e) {
    if (e instanceof ToolError) return { error: e.message };
    const msg = e instanceof Error && /Data file not available/.test(e.message) ? 'The data file for this request is not available right now; try another question.' : 'The tool failed unexpectedly; try rephrasing or a different entity.';
    return { error: msg };
  }
}

export const SENSITIVE_REPLY = {
  id: 'Pesan Anda tampaknya memuat data sensitif (OTP/PIN, nomor rekening atau kartu, NIK, seed phrase, atau private key). Demi keamanan, Finandex tidak memproses data tersebut. Hapus data itu dari pesan dan jangan pernah membagikan OTP, PIN, seed phrase, atau private key kepada siapa pun — bank, OJK, dan IASC tidak pernah memintanya.',
  en: 'Your message appears to contain sensitive data (OTP/PIN, account or card number, national ID, seed phrase, or private key). For your safety, Finandex does not process it. Please remove it and never share an OTP, PIN, seed phrase, or private key with anyone — banks, OJK, and IASC never ask for them.',
};
/** Extra line for the law & consumer-protection Dex (§12.6: Finandex never collects or forwards reports). */
export const SENSITIVE_LAW_NOTE = {
  id: ' Finandex tidak meneruskan laporan dan bukan IASC; laporan resmi hanya di iasc.ojk.go.id, diisi sendiri oleh Anda. Untuk menyiapkan laporan tanpa mengirim data, pakai "Siapkan Laporan" di AntiScamDex (tersimpan hanya di perangkat).',
  en: ' Finandex does not forward reports and is not IASC; official reports only at iasc.ojk.go.id, filed by you. To prepare a report without sending data, use "Prepare a Report" in AntiScamDex (stored only on your device).',
};

export async function orchestrate(req: ChatRequest, deps: OrchestratorDeps, emit: (e: SseEvent) => void, signal: AbortSignal, requestId: string): Promise<void> {
  const { orchestrateAgents } = await import('../agents/run');
  await orchestrateAgents(req, deps, emit, signal, requestId);
}
