// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Orchestration protocol (§8.2–8.3) with a scripted LLM: event order, tool_result placement, is_error paths, limits.
import { describe, expect, it } from 'vitest';
import { DEX_BY_ID } from '../../src/config/dex-registry.ts';
import { z } from 'zod';
import {
  lookupTool,
  MAX_TOOL_CALLS,
  orchestrate,
  runToolCall,
  type ContentBlock,
  type Llm,
  type LlmRequest,
  type LlmResult,
} from '../../server/chat/orchestrator.ts';
import type { SseEvent, SseSink } from '../../server/chat/sse.ts';
import { DEX_TOOLS } from '../../server/dex/index.ts';
import { defineTool, t, type Tool, type ToolContext } from '../../server/tools/types.ts';
import { fileStore } from '../../scripts/eval/fs-store.ts';

const store = fileStore();
const manifest = await store.json<ToolContext['manifest']>('manifest.json');

function sink(): SseSink & { events: SseEvent[] } {
  const events: SseEvent[] = [];
  return { events, send: (e) => events.push(e), close() {}, closed: false };
}

/** LLM that returns the given turns in order; records the requests. */
class Scripted implements Llm {
  readonly model = 'scripted';
  readonly reqs: LlmRequest[] = [];
  private i = 0;
  constructor(private readonly turns: ((req: LlmRequest) => LlmResult)[]) {}
  async turn(req: LlmRequest, onText: (d: string) => void): Promise<LlmResult> {
    this.reqs.push(structuredClone({ ...req, signal: undefined }) as unknown as LlmRequest);
    const r = this.turns[Math.min(this.i++, this.turns.length - 1)]!(req);
    for (const b of r.content) if (b.type === 'text') onText((b as { text: string }).text);
    return r;
  }
}
const usage = { input_tokens: 10, output_tokens: 5 };
const tools = (...calls: { name: string; input: unknown }[]): LlmResult => ({
  content: [
    { type: 'thinking', thinking: '', signature: 'sig' },
    ...calls.map((c, i) => ({ type: 'tool_use', id: `t${i}`, name: c.name, input: c.input })),
  ] as ContentBlock[],
  stop_reason: 'tool_use',
  usage,
  model: 'scripted',
});
const text = (t: string): LlmResult => ({
  content: [{ type: 'text', text: t }],
  stop_reason: 'end_turn',
  usage,
  model: 'scripted',
});

async function run(
  llm: Llm,
  dex = 'rupiahdex' as const,
  opts: Partial<{ deadlineMs: number; toolTimeoutMs: number; now: () => number }> = {},
) {
  const s = sink();
  const out = await orchestrate(
    { dex: DEX_BY_ID[dex], messages: [{ role: 'user', content: 'q' }], locale: 'id' },
    {
      llm,
      store,
      manifest,
      sink: s,
      requestId: 'r1',
      deadlineMs: opts.deadlineMs ?? 50_000,
      toolTimeoutMs: opts.toolTimeoutMs ?? 8000,
      maxTokens: 2048,
      signal: new AbortController().signal,
      ...(opts.now ? { now: opts.now } : {}),
    },
  );
  return { out, events: s.events };
}

describe('orchestrate', () => {
  it('streams meta → status → artifact/method → text → citation → done and loops tool results back', async () => {
    const llm = new Scripted([
      () => tools({ name: 'fx_on_date', input: { date: '2020-03-23' } }),
      () => text('Kurs pada 23 Maret 2020.'),
    ]);
    const { out, events } = await run(llm);
    const kinds = events.map((e) => e.event);
    expect(kinds[0]).toBe('meta');
    expect(kinds.at(-1)).toBe('done');
    expect(kinds).toContain('artifact');
    expect(kinds).toContain('method');
    expect(kinds).toContain('citation');
    expect(kinds.indexOf('artifact')).toBeLessThan(kinds.indexOf('text'));
    expect(out.toolsUsed).toEqual(['fx_on_date']);
    // second request: assistant content echoed unchanged (incl. thinking), then user with tool_result FIRST
    const m = llm.reqs[1]!.messages;
    expect(m.at(-2)).toMatchObject({ role: 'assistant' });
    expect((m.at(-2)!.content as ContentBlock[])[0]!.type).toBe('thinking');
    const userContent = m.at(-1)!.content as { type: string; is_error?: boolean }[];
    expect(userContent[0]!.type).toBe('tool_result');
    expect(userContent[0]!.is_error).toBeUndefined();
    expect(llm.reqs[0]!.system).toContain('RupiahDex');
    expect(llm.reqs[0]!.system).toContain('Dea Saka Kurnia Putra');
    const done = events.at(-1)!.data as { usage: { input_tokens: number } };
    expect(done.usage.input_tokens).toBe(20);
  });

  it('returns instructive is_error results for unknown tools, invalid input and ToolError', async () => {
    const llm = new Scripted([
      () =>
        tools(
          { name: 'no_such_tool', input: {} },
          { name: 'fx_on_date', input: { date: 42 } },
          { name: 'fx_on_date', input: { date: '1900-01-01' } },
        ),
      () => text('ok'),
    ]);
    await run(llm);
    const res = llm.reqs[1]!.messages.at(-1)!.content as { is_error?: boolean; content: string }[];
    expect(res.map((r) => r.is_error)).toEqual([true, true, true]);
    expect(res[0]!.content).toMatch(/Unknown tool/);
    expect(res[1]!.content).toMatch(/Invalid input/);
    expect(res[2]!.content.length).toBeGreaterThan(10);
  });

  it('accepts an unambiguous case-insensitive tool name', () => {
    expect(lookupTool(DEX_TOOLS.rupiahdex, 'FX_ON_DATE')?.name).toBe('fx_on_date');
  });

  it(`caps tool calls at ${MAX_TOOL_CALLS} per request`, async () => {
    const many = Array.from({ length: 15 }, () => ({ name: 'app_info', input: {} }));
    const { out } = await run(new Scripted([() => tools(...many), () => text('done')]));
    expect(out.runs.length).toBe(MAX_TOOL_CALLS);
    expect(out.stop).toBe('tool_budget');
  });

  it('stops at 8 turns and at the deadline', async () => {
    const loop = new Scripted([() => tools({ name: 'app_info', input: {} })]);
    const a = await run(loop);
    expect(loop.reqs.length).toBe(8);
    expect(a.out.stop).toBe('turn_budget');
    let t = 0;
    const b = await run(new Scripted([() => tools({ name: 'app_info', input: {} })]), 'rupiahdex', {
      deadlineMs: 100,
      now: () => (t += 60),
    });
    expect(b.out.stop).toBe('deadline');
    expect(b.events.at(-1)!.event).toBe('done');
  });

  it('handles refusals with a polite fixed message', async () => {
    const { out, events } = await run(
      new Scripted([() => ({ content: [], stop_reason: 'refusal', usage, model: 'x' })]),
    );
    expect(out.stop).toBe('refusal');
    expect(events.some((e) => e.event === 'text')).toBe(true);
  });

  it('times out slow tools with an is_error result', async () => {
    const slow = defineTool({
      name: 'slow',
      description: 'never finishes in time (test only)',
      input: z.strictObject({}),
      label: t('x', 'x'),
      numeric: false,
      run: () => new Promise((r) => setTimeout(() => r({ data: {} }), 200)),
    });
    const ctx: ToolContext = { dex: DEX_BY_ID.rupiahdex, store, locale: 'id', manifest };
    const r = await runToolCall(
      ctx,
      [slow as unknown as Tool<never>],
      { type: 'tool_use', id: 'x', name: 'slow', input: {} },
      { sink: sink(), toolTimeoutMs: 20 },
      new Map(),
    );
    expect(r.block.is_error).toBe(true);
    expect(r.block.content).toMatch(/timed out/);
  });
});
