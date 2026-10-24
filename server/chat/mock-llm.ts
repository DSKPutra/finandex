// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Scripted LLM for tests, the offline demo (CHAT_MODE=mock), and `npm run eval:chat:mock` (§18.6).
// Turn 1 issues the scenario's tool calls; turn 2 composes the answer ONLY from the returned tool results.
import type { Locale } from '../../src/config/brand';
import type { Block, Llm, TurnRequest, TurnResult } from './llm';

export type ToolCall = { name: string; input: Record<string, unknown> };
/** Tool results by tool name, in call order (parsed JSON; errors as { __error }). */
export type Results = Record<string, unknown[]>;
export type Scenario = {
  calls: (question: string, dex: string) => ToolCall[];
  answer: (r: Results, locale: Locale, question: string) => string;
};
export type ScenarioResolver = (question: string, dex: string) => Scenario;

function lastUserText(messages: TurnRequest['messages']): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]!;
    if (m.role !== 'user') continue;
    if (typeof m.content === 'string') return m.content;
    const parts = (m.content as { type: string; text?: string }[]).filter((b) => b.type === 'text');
    if (parts.length) return parts[0]!.text ?? '';
  }
  return '';
}

export class MockLlm implements Llm {
  readonly model = 'mock-llm';
  constructor(
    private readonly resolve: ScenarioResolver,
    private readonly locale: Locale = 'id',
    private readonly dex = '',
  ) {}

  async turn(req: TurnRequest): Promise<TurnResult> {
    const lastMsg = req.messages.at(-1)!;
    const isToolResultTurn = Array.isArray(lastMsg.content) && (lastMsg.content as { type: string }[]).some((b) => b.type === 'tool_result');
    const question = lastUserText(req.messages.filter((m) => !(Array.isArray(m.content) && (m.content as { type: string }[]).some((b) => b.type === 'tool_result'))));
    const dex = this.dex || (/Dex: .* \(([a-z0-9-]+)\)/.exec(req.system)?.[1] ?? '');
    const locale: Locale = /Format angka sesuai locale/.test(req.system) ? 'id' : /Format numbers for the locale/.test(req.system) ? 'en' : this.locale;
    const sc = this.resolve(question, dex);
    if (!isToolResultTurn) {
      const calls = sc.calls(question, dex).filter((c) => req.tools.some((t) => t.name === c.name));
      if (calls.length) {
        const content: Block[] = calls.map((c, i) => ({ type: 'tool_use', id: `toolu_mock_${i}`, name: c.name, input: c.input }));
        return { content, stop_reason: 'tool_use', usage: { input_tokens: 0, output_tokens: 0 }, model: this.model };
      }
    }
    const results: Results = {};
    if (isToolResultTurn) {
      const prevAssistant = req.messages.at(-2)!;
      const uses = (prevAssistant.content as Block[]).filter((b): b is Extract<Block, { type: 'tool_use' }> => b.type === 'tool_use');
      for (const r of lastMsg.content as { type: string; tool_use_id: string; content: string; is_error?: boolean }[]) {
        const use = uses.find((u) => u.id === r.tool_use_id);
        if (!use) continue;
        let val: unknown;
        try {
          val = r.is_error ? { __error: r.content } : JSON.parse(r.content);
        } catch {
          val = { __error: r.content };
        }
        (results[use.name] ??= []).push(val);
      }
    }
    let text: string;
    try {
      text = sc.answer(results, locale, question);
    } catch (e) {
      text = `[mock composer error: ${(e as Error).message}]`;
    }
    for (const chunk of text.match(/[\s\S]{1,80}/g) ?? []) req.onText(chunk);
    return { content: [{ type: 'text', text }], stop_reason: 'end_turn', usage: { input_tokens: 0, output_tokens: 0 }, model: this.model };
  }
}

/** Offline demo behaviour: explain the dataset; answer the creator question via app_info. */
export const genericScenario: ScenarioResolver = (question) => {
  const creator = /siapa (pembuat|yang membuat)|who (made|built|created)/i.test(question);
  return {
    calls: () => (creator ? [{ name: 'app_info', input: {} }] : [{ name: 'dataset_info', input: {} }]),
    answer: (r, locale) => {
      if (creator) return locale === 'id' ? 'Finandex dirancang dan dikembangkan oleh Dea Saka Kurnia Putra.' : 'Finandex is designed and developed by Dea Saka Kurnia Putra.';
      const d = (r.dataset_info?.[0] ?? {}) as { dex?: string; as_of?: string; source_files?: { file: string }[] };
      return locale === 'id'
        ? `Mode demo offline: saya hanya dapat menjelaskan dataset ${d.dex ?? ''} (data per ${d.as_of ?? '-'}; sumber: ${(d.source_files ?? []).map((f) => f.file).join(', ')}). Aktifkan layanan AI untuk jawaban lengkap. Data tidak real-time dan bukan rekomendasi investasi.`
        : `Offline demo mode: I can only describe the ${d.dex ?? ''} dataset (as of ${d.as_of ?? '-'}; sources: ${(d.source_files ?? []).map((f) => f.file).join(', ')}). Enable the AI service for full answers. Data is not real-time and not investment advice.`;
    },
  };
};
