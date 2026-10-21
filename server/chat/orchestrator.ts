// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Chat orchestration loop (§8.3): up to 8 model turns, ≤ 12 tool calls per request, deterministic read-only tools with
// an 8 s timeout, artifacts/method streamed as SSE events, instructive is_error results on failure.
import { ArtifactSchema, MethodSchema } from '../../src/shared/chart-spec.ts';
import type { DexEntry } from '../../src/config/dex-registry.ts';
import type { Locale } from '../../src/shared/format.ts';
import type { DataStore } from '../data/store.ts';
import { toolsFor } from '../dex/index.ts';
import {
  modelCopy,
  toInputSchema,
  ToolError,
  type Citation,
  type ManifestDex,
  type Tool,
  type ToolContext,
} from '../tools/types.ts';
import { log } from '../log.ts';
import { systemPrompt } from './prompts.ts';
import type { SseSink } from './sse.ts';

// ------------------------------------------------------------------------------------------------ LLM abstraction
export type TextBlock = { type: 'text'; text: string };
export type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: unknown };
/** Any block the model returned; unknown block types (thinking, fallback, …) are echoed back unchanged. */
export type ContentBlock = TextBlock | ToolUseBlock | ({ type: string } & Record<string, unknown>);
export type ToolResultBlock = { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };
export type Message =
  | { role: 'user'; content: string | (ToolResultBlock | TextBlock)[] }
  | { role: 'assistant'; content: string | ContentBlock[] };

export interface ToolDef {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
  strict: true;
  cache_control?: { type: 'ephemeral' };
}

export interface LlmRequest {
  system: string;
  tools: ToolDef[];
  messages: Message[];
  maxTokens: number;
  signal: AbortSignal;
}
export interface LlmResult {
  content: ContentBlock[];
  stop_reason: string | null;
  usage: { input_tokens: number; output_tokens: number };
  model: string;
}
export interface Llm {
  readonly model: string;
  /** Run one model turn, calling onText for each streamed text delta. */
  turn(req: LlmRequest, onText: (delta: string) => void): Promise<LlmResult>;
}

/** Upstream failure classified for the SSE `error` event. */
export class LlmError extends Error {
  constructor(
    public readonly code: 'RATE_LIMIT' | 'UPSTREAM' | 'TIMEOUT' | 'BAD_REQUEST',
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
  }
}

// ------------------------------------------------------------------------------------------------ inputs
export interface ChatInput {
  dex: DexEntry;
  messages: { role: 'user' | 'assistant'; content: string }[];
  locale: Locale;
  context?:
    | {
        entity?: string | undefined;
        view?: string | undefined;
        period?: { start?: string | undefined; end?: string | undefined } | undefined;
      }
    | undefined;
}

export interface OrchestratorDeps {
  llm: Llm;
  store: DataStore;
  manifest: ToolContext['manifest'];
  sink: SseSink;
  requestId: string;
  deadlineMs: number;
  toolTimeoutMs: number;
  maxTokens: number;
  signal: AbortSignal;
  now?: () => number;
}

export const MAX_TURNS = 8;
export const MAX_TOOL_CALLS = 12;

const MSG = {
  deadline: {
    id: '\n\n_Maaf, waktu pemrosesan habis. Silakan ulangi pertanyaan yang lebih spesifik._',
    en: '\n\n_Sorry, processing time ran out. Please ask a more specific question._',
  },
  refusal: {
    id: 'Maaf, saya tidak dapat membantu permintaan ini. Silakan ajukan pertanyaan tentang data di Dex ini.',
    en: 'Sorry, I cannot help with this request. Please ask about the data in this Dex.',
  },
  budget: {
    id: '\n\n_Batas jumlah langkah tercapai; jawaban di atas memakai hasil yang sudah ada._',
    en: '\n\n_Step limit reached; the answer above uses the results gathered so far._',
  },
  thinking: { id: 'Memahami pertanyaan…', en: 'Understanding the question…' },
};

export function toolDefs(tools: Tool<never>[]): ToolDef[] {
  return tools.map((t, i) => ({
    name: t.name,
    description: t.description,
    input_schema: toInputSchema(t.input),
    strict: true as const,
    ...(i === tools.length - 1 ? { cache_control: { type: 'ephemeral' as const } } : {}),
  }));
}

/** Tolerant lookup: exact name, else an unambiguous case-insensitive match (§ tolerant tool-call handling). */
export function lookupTool(tools: Tool<never>[], name: string): Tool<never> | undefined {
  const exact = tools.find((t) => t.name === name);
  if (exact) return exact;
  const ci = tools.filter((t) => t.name.toLowerCase() === name.toLowerCase());
  return ci.length === 1 ? ci[0] : undefined;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () =>
        reject(
          new ToolError(`Tool timed out after ${ms} ms. Try a narrower query (fewer entities or a shorter period).`),
        ),
      ms,
    );
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e: unknown) => (clearTimeout(t), reject(e instanceof Error ? e : new Error(String(e)))),
    );
  });
}

export interface ToolRun {
  name: string;
  input: unknown;
  ok: boolean;
  content: string;
  artifacts: number;
  method: boolean;
}

/** Execute one tool call and stream its artifacts/method. Never throws. */
export async function runToolCall(
  ctx: ToolContext,
  tools: Tool<never>[],
  call: ToolUseBlock,
  deps: Pick<OrchestratorDeps, 'sink' | 'toolTimeoutMs'>,
  citations: Map<string, Citation>,
): Promise<ToolRun & { block: ToolResultBlock }> {
  const tool = lookupTool(tools, call.name);
  const fail = (msg: string): ToolRun & { block: ToolResultBlock } => ({
    name: call.name,
    input: call.input,
    ok: false,
    content: msg,
    artifacts: 0,
    method: false,
    block: { type: 'tool_result', tool_use_id: call.id, content: msg, is_error: true },
  });
  if (!tool) return fail(`Unknown tool "${call.name}". Available tools: ${tools.map((t) => t.name).join(', ')}.`);
  const parsed = tool.input.safeParse(call.input);
  if (!parsed.success)
    return fail(
      `Invalid input for ${tool.name}: ${parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ')}. Fix the arguments and call again.`,
    );
  deps.sink.send({ event: 'status', data: { code: 'tool', tool: tool.name, label: tool.label[ctx.locale] } });
  try {
    const out = await withTimeout(tool.run(ctx, parsed.data as never), deps.toolTimeoutMs);
    let artifacts = 0;
    for (const a of out.ui ?? []) {
      const ok = ArtifactSchema.safeParse(a);
      if (ok.success) {
        deps.sink.send({ event: 'artifact', data: ok.data });
        artifacts++;
      } else log('warn', 'invalid_artifact', { tool: tool.name, issue: ok.error.issues[0]?.message });
    }
    let hasMethod = false;
    if (out.method) {
      const m = MethodSchema.safeParse(out.method);
      if (m.success) {
        deps.sink.send({ event: 'method', data: m.data });
        hasMethod = true;
      } else log('warn', 'invalid_method', { tool: tool.name });
    }
    for (const c of out.citations ?? [
      { dex: ctx.dex.id, dataset: out.method?.dataset ?? ctx.dex.name, as_of: out.method?.as_of ?? null },
    ])
      citations.set(JSON.stringify(c), c);
    const content = modelCopy(out.data);
    return {
      name: tool.name,
      input: parsed.data,
      ok: true,
      content,
      artifacts,
      method: hasMethod,
      block: { type: 'tool_result', tool_use_id: call.id, content },
    };
  } catch (e) {
    if (e instanceof ToolError) return fail(e.message);
    log('error', 'tool_failed', { tool: tool.name, err: e instanceof Error ? e.name : 'unknown' });
    return fail(
      `Tool ${tool.name} failed while reading the data. Try different arguments, or tell the user the data could not be read.`,
    );
  }
}

export interface ChatOutcome {
  toolsUsed: string[];
  runs: ToolRun[];
  usage: { input_tokens: number; output_tokens: number };
  text: string;
  stop: 'end' | 'deadline' | 'tool_budget' | 'turn_budget' | 'refusal' | 'aborted';
}

/** The §8.3 loop. Emits meta/status/text/artifact/method/citation/done (errors are emitted by the caller). */
export async function orchestrate(input: ChatInput, deps: OrchestratorDeps): Promise<ChatOutcome> {
  const now = deps.now ?? Date.now;
  const t0 = now();
  const md: ManifestDex | undefined = deps.manifest?.dex[input.dex.id];
  const asOf = md?.as_of ?? input.dex.asOf;
  const ctx: ToolContext = { dex: input.dex, store: deps.store, locale: input.locale, manifest: deps.manifest };
  const tools = toolsFor(input.dex.id);
  const defs = toolDefs(tools);
  let system = systemPrompt(input.dex, input.locale, asOf, md?.status ?? input.dex.status);
  if (input.context && (input.context.entity || input.context.view || input.context.period))
    system += `\n\n## UI context\n${JSON.stringify(input.context)}`;

  const messages: Message[] = input.messages.map((m) => ({ role: m.role, content: m.content }) as Message);
  const usage = { input_tokens: 0, output_tokens: 0 };
  const runs: ToolRun[] = [];
  const citations = new Map<string, Citation>();
  let text = '';
  let stop: ChatOutcome['stop'] = 'end';
  const emit = (delta: string) => {
    text += delta;
    deps.sink.send({ event: 'text', data: { delta } });
  };

  deps.sink.send({
    event: 'meta',
    data: { requestId: deps.requestId, dex: input.dex.id, as_of: asOf, model: deps.llm.model },
  });
  deps.sink.send({ event: 'status', data: { code: 'thinking', label: MSG.thinking[input.locale] } });

  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    if (deps.signal.aborted) {
      stop = 'aborted';
      break;
    }
    const res = await deps.llm.turn(
      { system, tools: defs, messages, maxTokens: deps.maxTokens, signal: deps.signal },
      emit,
    );
    usage.input_tokens += res.usage.input_tokens;
    usage.output_tokens += res.usage.output_tokens;
    if (res.stop_reason === 'refusal') {
      if (!text.trim()) emit(MSG.refusal[input.locale]);
      stop = 'refusal';
      break;
    }
    if (res.stop_reason !== 'tool_use') break;
    const calls = res.content.filter((b): b is ToolUseBlock => b.type === 'tool_use');
    const results: ToolResultBlock[] = [];
    for (const call of calls) {
      if (runs.length >= MAX_TOOL_CALLS) {
        results.push({
          type: 'tool_result',
          tool_use_id: call.id,
          content: `Tool-call limit (${MAX_TOOL_CALLS}) reached; answer with the results you already have.`,
          is_error: true,
        });
        stop = 'tool_budget';
        continue;
      }
      const r = await runToolCall(ctx, tools, call, deps, citations);
      runs.push(r);
      results.push(r.block);
    }
    messages.push({ role: 'assistant', content: res.content });
    messages.push({ role: 'user', content: results });
    if (now() - t0 > deps.deadlineMs) {
      emit(MSG.deadline[input.locale]);
      stop = 'deadline';
      break;
    }
    if (turn === MAX_TURNS) {
      emit(MSG.budget[input.locale]);
      stop = 'turn_budget';
    }
  }

  for (const c of citations.values()) deps.sink.send({ event: 'citation', data: c });
  const toolsUsed = [...new Set(runs.map((r) => r.name))];
  deps.sink.send({ event: 'done', data: { usage, tools_used: toolsUsed, elapsed_ms: now() - t0 } });
  return { toolsUsed, runs, usage, text, stop };
}
