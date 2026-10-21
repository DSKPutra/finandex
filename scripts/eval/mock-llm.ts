// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Scripted LLM for the mock eval: emits the scenario's tool calls turn by turn, then the rendered answer.
import type { Locale } from '../../src/shared/format.ts';
import type {
  ContentBlock,
  Llm,
  LlmRequest,
  LlmResult,
  Message,
  ToolResultBlock,
  ToolUseBlock,
} from '../../server/chat/orchestrator.ts';
import type { Scenario, ToolResult } from './types.ts';

export class ScenarioLlm implements Llm {
  readonly model = 'mock-scenario';
  private step = 0;
  private pending: ToolUseBlock[] = [];
  readonly results: ToolResult[] = [];
  /** every request the orchestrator sent (for protocol assertions) */
  readonly requests: LlmRequest[] = [];

  constructor(
    private readonly sc: Scenario,
    private readonly locale: Locale,
  ) {}

  private collect(messages: Message[]): void {
    const last = messages.at(-1);
    if (!last || last.role !== 'user' || typeof last.content === 'string') return;
    for (const b of last.content) {
      if (b.type !== 'tool_result') continue;
      const tr = b as ToolResultBlock;
      const call = this.pending.find((p) => p.id === tr.tool_use_id);
      if (!call) continue;
      let data: unknown;
      try {
        data = tr.is_error ? { error: tr.content } : JSON.parse(tr.content);
      } catch {
        data = { raw: tr.content };
      }
      this.results.push({ tool: call.name, input: call.input as Record<string, unknown>, ok: !tr.is_error, data });
    }
  }

  async turn(req: LlmRequest, onText: (d: string) => void): Promise<LlmResult> {
    this.requests.push(req);
    this.collect(req.messages);
    const usage = { input_tokens: 0, output_tokens: 0 };
    if (this.step < this.sc.steps.length) {
      const s = this.sc.steps[this.step++]!;
      const calls = typeof s === 'function' ? s(this.results) : s;
      if (calls.length) {
        this.pending = calls.map((c, i) => ({
          type: 'tool_use',
          id: `toolu_mock_${this.step}_${i}`,
          name: c.tool,
          input: c.input,
        }));
        return { content: this.pending as ContentBlock[], stop_reason: 'tool_use', usage, model: this.model };
      }
    }
    const text = this.sc.answer(this.results, this.locale);
    // stream in a few chunks like a real model
    for (const part of text.match(/[\s\S]{1,80}/g) ?? []) onText(part);
    return { content: [{ type: 'text', text }], stop_reason: 'end_turn', usage, model: this.model };
  }
}
