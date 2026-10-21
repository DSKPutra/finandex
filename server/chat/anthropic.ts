// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Claude adapter for the orchestrator: streaming Messages API, prompt caching on system + tools, no sampling params,
// adaptive thinking (model default) at a configurable effort, optional server-side refusal fallback.
import Anthropic from '@anthropic-ai/sdk';
import type { Env } from '../env.ts';
import { LlmError, type ContentBlock, type Llm, type LlmRequest, type LlmResult } from './orchestrator.ts';

const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export class AnthropicLlm implements Llm {
  readonly model: string;
  private readonly client: Anthropic;

  constructor(private readonly env: Env) {
    if (!env.ANTHROPIC_API_KEY) throw new LlmError('UPSTREAM', 'ANTHROPIC_API_KEY is not configured');
    this.model = env.ANTHROPIC_MODEL;
    // one retry for 429/529 (the SDK backs off with jitter and honours retry-after)
    this.client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, maxRetries: 1, timeout: env.CHAT_DEADLINE_MS });
  }

  async turn(req: LlmRequest, onText: (delta: string) => void): Promise<LlmResult> {
    const params = {
      model: this.model,
      max_tokens: req.maxTokens,
      system: [{ type: 'text' as const, text: req.system, cache_control: { type: 'ephemeral' as const } }],
      tools: req.tools as unknown as Anthropic.Beta.Messages.BetaToolUnion[],
      tool_choice: { type: 'auto' as const },
      output_config: { effort: this.env.CHAT_EFFORT },
      messages: req.messages as Anthropic.Beta.Messages.BetaMessageParam[],
      ...(this.env.ANTHROPIC_SERVER_FALLBACK ? { betas: [FALLBACK_BETA], fallbacks: 'default' as const } : {}),
    };
    try {
      const stream = this.client.beta.messages.stream(params, { signal: req.signal });
      stream.on('text', (delta) => onText(delta));
      const msg = await stream.finalMessage();
      return {
        // echo every block back unchanged (thinking blocks are bound to this conversation)
        content: msg.content as unknown as ContentBlock[],
        stop_reason: msg.stop_reason,
        usage: {
          input_tokens:
            msg.usage.input_tokens +
            (msg.usage.cache_read_input_tokens ?? 0) +
            (msg.usage.cache_creation_input_tokens ?? 0),
          output_tokens: msg.usage.output_tokens,
        },
        model: msg.model,
      };
    } catch (e) {
      throw classify(e);
    }
  }
}

export function classify(e: unknown): LlmError {
  if (e instanceof LlmError) return e;
  if (e instanceof Anthropic.RateLimitError) {
    const ra = Number(e.headers?.get?.('retry-after'));
    return new LlmError('RATE_LIMIT', 'upstream rate limit', Number.isFinite(ra) ? ra : 30);
  }
  if (e instanceof Anthropic.APIConnectionTimeoutError) return new LlmError('TIMEOUT', 'upstream timeout');
  if (e instanceof Anthropic.BadRequestError) return new LlmError('BAD_REQUEST', 'upstream rejected the request');
  if (e instanceof Anthropic.APIUserAbortError) return new LlmError('TIMEOUT', 'aborted');
  if (e instanceof Anthropic.APIError) return new LlmError('UPSTREAM', `upstream error ${e.status ?? ''}`.trim());
  return new LlmError('UPSTREAM', 'upstream error');
}
