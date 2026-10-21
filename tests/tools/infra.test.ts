// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Server infrastructure: DataStore cache/ETag, env parsing, rate limiters, SSE stream, Claude adapter request shape.
import Anthropic from '@anthropic-ai/sdk';
import { describe, expect, it } from 'vitest';
import { AnthropicLlm, classify } from '../../server/chat/anthropic.ts';
import { LlmError } from '../../server/chat/orchestrator.ts';
import { encodeEvent, parseSse, sseStream } from '../../server/chat/sse.ts';
import { DataNotFoundError, DataStore } from '../../server/data/store.ts';
import { readEnv } from '../../server/env.ts';
import { log, setLogLevel } from '../../server/log.ts';
import { parseOrigins } from '../../server/security/cors.ts';
import { MemoryLimiter, UpstashLimiter, WINDOW_MAX } from '../../server/security/ratelimit.ts';

describe('DataStore', () => {
  it('caches, revalidates with ETag, separates read kinds and reports 404', async () => {
    const calls: { url: string; inm?: string }[] = [];
    const f = async (url: string, init?: { headers?: Record<string, string> }) => {
      calls.push({ url, ...(init?.headers?.['If-None-Match'] ? { inm: init.headers['If-None-Match'] } : {}) });
      if (url.endsWith('missing.json')) return new Response('no', { status: 404 });
      if (url.endsWith('broken.json')) return new Response('err', { status: 500 });
      if (init?.headers?.['If-None-Match'] === '"v1"') return new Response(null, { status: 304 });
      return new Response('{"a":1}', { status: 200, headers: { ETag: '"v1"' } });
    };
    let now = 0;
    const realNow = Date.now;
    Date.now = () => now;
    try {
      const s = new DataStore('http://d/data/', f, 1024 * 1024, 1000);
      expect(await s.json('x.json')).toEqual({ a: 1 });
      expect(await s.json('x.json')).toEqual({ a: 1 });
      expect(calls.length).toBe(1);
      expect(await s.text('x.json')).toBe('{"a":1}');
      expect((await s.binary('x.json')).byteLength).toBe(7);
      now = 5000; // past ttl → conditional request
      expect(await s.json('x.json')).toEqual({ a: 1 });
      expect(calls.at(-1)!.inm).toBe('"v1"');
      await expect(s.json('missing.json')).rejects.toBeInstanceOf(DataNotFoundError);
      await expect(s.json('broken.json')).rejects.toThrow(/500/);
      expect(await s.has('missing.json')).toBe(false);
      expect(await s.has('x.json')).toBe(true);
      expect(calls[0]!.url).toBe('http://d/data/x.json');
      expect(s.stats().entries).toBeGreaterThan(0);
    } finally {
      Date.now = realNow;
    }
  });

  it('evicts least-recently-used entries over the byte budget and dedupes in-flight loads', async () => {
    let n = 0;
    const f = async () => (n++, new Response(JSON.stringify({ pad: 'x'.repeat(100) })));
    const s = new DataStore('http://d', f, 300);
    await Promise.all([s.json('a'), s.json('a')]);
    expect(n).toBe(1);
    await s.json('b');
    await s.json('c');
    expect(s.stats().bytes).toBeLessThanOrEqual(300);
  });
});

describe('env', () => {
  it('applies defaults and parses booleans/ints', () => {
    const e = readEnv({});
    expect(e.ANTHROPIC_MODEL).toBe('claude-sonnet-5-5');
    expect(e.ANTHROPIC_MODEL_FAST).toBe('claude-haiku-5-5');
    expect(e.ANTHROPIC_SERVER_FALLBACK).toBe(true);
    expect(e.CHAT_DEADLINE_MS).toBe(50_000);
    const f = readEnv({ ANTHROPIC_SERVER_FALLBACK: '0', CHAT_MAX_TOKENS: '1024', CHAT_EFFORT: 'medium', EMPTY: '' });
    expect(f.ANTHROPIC_SERVER_FALLBACK).toBe(false);
    expect(f.CHAT_MAX_TOKENS).toBe(1024);
    expect(() => readEnv({ CHAT_EFFORT: 'turbo' })).toThrow();
    expect(parseOrigins('https://a.com, https://b.com', 'https://p.com')).toEqual([
      'https://a.com',
      'https://b.com',
      'https://p.com',
    ]);
    expect(parseOrigins(undefined).length).toBeGreaterThan(3);
  });
});

describe('rate limiters', () => {
  it('memory limiter: window, daily cap, token budget', async () => {
    let now = Date.UTC(2026, 0, 1, 12);
    const m = new MemoryLimiter(100, () => now);
    for (let i = 0; i < WINDOW_MAX; i++) expect((await m.hit('k')).ok).toBe(true);
    const blocked = await m.hit('k');
    expect(blocked.ok).toBe(false);
    now += 601_000;
    expect((await m.hit('k')).ok).toBe(true);
    for (let w = 0; w < 12; w++) {
      now += 601_000;
      for (let i = 0; i < WINDOW_MAX; i++) await m.hit('k');
    }
    const day = await m.hit('k');
    expect(day.ok).toBe(false);
    expect(await m.tokensLeft()).toBe(true);
    await m.addTokens(150);
    expect(await m.tokensLeft()).toBe(false);
  });

  it('upstash limiter sends pipelined INCR/EXPIRE and interprets counts', async () => {
    const sent: unknown[] = [];
    let counter = 0;
    const f = (async (_url: string, init: RequestInit) => {
      const cmds = JSON.parse(String(init.body)) as unknown[][];
      sent.push(cmds);
      return new Response(
        JSON.stringify(cmds.map((c) => ({ result: c[0] === 'INCR' ? ++counter : c[0] === 'INCRBY' ? 7 : 1 }))),
      );
    }) as unknown as typeof fetch;
    const u = new UpstashLimiter('https://redis.example', 'tok', 5, () => Date.UTC(2026, 0, 1), f);
    expect((await u.hit('k')).ok).toBe(true);
    counter = 500;
    expect((await u.hit('k')).ok).toBe(false);
    expect(await u.tokensLeft()).toBe(false);
    await u.addTokens(3);
    expect(JSON.stringify(sent[0])).toContain('EXPIRE');
    const bad = new UpstashLimiter(
      'https://r',
      't',
      5,
      Date.now,
      (async () => new Response('x', { status: 500 })) as unknown as typeof fetch,
    );
    await expect(bad.hit('k')).rejects.toThrow(/upstash/);
  });
});

describe('SSE', () => {
  it('encodes, streams with heartbeat, and parses back', async () => {
    const { stream, sink } = sseStream(5);
    sink.send({ event: 'text', data: { delta: 'a' } });
    await new Promise((r) => setTimeout(r, 15));
    sink.close();
    sink.close();
    sink.send({ event: 'text', data: { delta: 'ignored' } });
    expect(sink.closed).toBe(true);
    const txt = await new Response(stream).text();
    expect(txt).toContain(': ping');
    expect(parseSse(txt)).toEqual([{ event: 'text', data: { delta: 'a' } }]);
    expect(
      new TextDecoder().decode(
        encodeEvent({
          event: 'done',
          data: { usage: { input_tokens: 1, output_tokens: 2 }, tools_used: [], elapsed_ms: 3 },
        }),
      ),
    ).toMatch(/^event: done\ndata: /);
    const c = sseStream(1000);
    await c.stream.cancel();
    expect(c.sink.closed).toBe(true);
  });
});

describe('log', () => {
  it('respects the level threshold', () => {
    setLogLevel('silent');
    log('error', 'x');
    setLogLevel('debug');
    log('debug', 'shown', { a: 1 });
    log('warn', 'shown');
    setLogLevel('info');
  });
});

describe('Claude adapter', () => {
  const sseBody = (events: [string, unknown][]) =>
    events.map(([e, d]) => `event: ${e}\ndata: ${JSON.stringify(d)}\n\n`).join('');
  const message = (stop: string, content: unknown[]) =>
    sseBody([
      [
        'message_start',
        {
          type: 'message_start',
          message: {
            id: 'm',
            type: 'message',
            role: 'assistant',
            model: 'claude-sonnet-5-5',
            content: [],
            stop_reason: null,
            stop_sequence: null,
            usage: { input_tokens: 11, output_tokens: 0, cache_read_input_tokens: 4 },
          },
        },
      ],
      ...content.flatMap((c, i): [string, unknown][] => [
        [
          'content_block_start',
          {
            type: 'content_block_start',
            index: i,
            content_block: (c as { type: string }).type === 'text' ? { type: 'text', text: '' } : c,
          },
        ],
        ...((c as { type: string }).type === 'text'
          ? ([
              [
                'content_block_delta',
                {
                  type: 'content_block_delta',
                  index: i,
                  delta: { type: 'text_delta', text: (c as { text: string }).text },
                },
              ],
            ] as [string, unknown][])
          : []),
        ['content_block_stop', { type: 'content_block_stop', index: i }],
      ]),
      [
        'message_delta',
        { type: 'message_delta', delta: { stop_reason: stop, stop_sequence: null }, usage: { output_tokens: 7 } },
      ],
      ['message_stop', { type: 'message_stop' }],
    ]);

  it('sends a streaming request without sampling params, with caching, effort and fallback', async () => {
    let body: Record<string, unknown> = {};
    let headers: Headers = new Headers();
    const f = (async (_u: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      headers = new Headers(init.headers);
      return new Response(message('end_turn', [{ type: 'text', text: 'Halo dunia' }]), {
        headers: { 'content-type': 'text/event-stream' },
      });
    }) as unknown as typeof fetch;
    const llm = new AnthropicLlm(readEnv({ ANTHROPIC_API_KEY: 'sk-test' }), { fetch: f });
    const deltas: string[] = [];
    const r = await llm.turn(
      {
        system: 'S',
        tools: [
          {
            name: 'x',
            description: 'd',
            input_schema: { type: 'object', properties: {}, additionalProperties: false },
            strict: true,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: 'hi' }],
        maxTokens: 2048,
        signal: new AbortController().signal,
      },
      (d) => deltas.push(d),
    );
    expect(deltas.join('')).toBe('Halo dunia');
    expect(r.stop_reason).toBe('end_turn');
    expect(r.usage).toEqual({ input_tokens: 15, output_tokens: 7 });
    expect(body.model).toBe('claude-sonnet-5-5');
    expect(body.stream).toBe(true);
    expect(body.max_tokens).toBe(2048);
    for (const k of ['temperature', 'top_p', 'top_k']) expect(body).not.toHaveProperty(k);
    expect(body.fallbacks).toBe('default');
    expect(body.tool_choice).toEqual({ type: 'auto' });
    expect(body.output_config).toEqual({ effort: 'low' });
    expect((body.system as { cache_control: unknown }[])[0]!.cache_control).toEqual({ type: 'ephemeral' });
    expect(headers.get('anthropic-beta')).toContain('server-side-fallback-2026-07-01');
  });

  it('omits the fallback beta when disabled and maps errors', async () => {
    let body: Record<string, unknown> = {};
    const f = (async (_u: string, init: RequestInit) => (
      (body = JSON.parse(String(init.body))),
      new Response(message('tool_use', [{ type: 'tool_use', id: 't1', name: 'x', input: {} }]), {
        headers: { 'content-type': 'text/event-stream' },
      })
    )) as unknown as typeof fetch;
    const llm = new AnthropicLlm(readEnv({ ANTHROPIC_API_KEY: 'sk-test', ANTHROPIC_SERVER_FALLBACK: 'false' }), {
      fetch: f,
    });
    const r = await llm.turn(
      {
        system: 'S',
        tools: [],
        messages: [{ role: 'user', content: 'hi' }],
        maxTokens: 100,
        signal: new AbortController().signal,
      },
      () => {},
    );
    expect(body).not.toHaveProperty('fallbacks');
    expect(r.content[0]!.type).toBe('tool_use');
    const rl = (async () =>
      new Response(JSON.stringify({ type: 'error', error: { type: 'rate_limit_error', message: 'x' } }), {
        status: 429,
        headers: { 'retry-after': '0' },
      })) as unknown as typeof fetch;
    const llm2 = new AnthropicLlm(readEnv({ ANTHROPIC_API_KEY: 'sk-test' }), { fetch: rl });
    await expect(
      llm2.turn(
        {
          system: 'S',
          tools: [],
          messages: [{ role: 'user', content: 'hi' }],
          maxTokens: 100,
          signal: new AbortController().signal,
        },
        () => {},
      ),
    ).rejects.toMatchObject({ code: 'RATE_LIMIT' });
    expect(() => new AnthropicLlm(readEnv({}))).toThrow(LlmError);
    expect(classify(new Error('x')).code).toBe('UPSTREAM');
    expect(classify(new LlmError('TIMEOUT', 't')).code).toBe('TIMEOUT');
    expect(classify(new Anthropic.APIConnectionTimeoutError()).code).toBe('TIMEOUT');
    expect(classify(new Anthropic.APIUserAbortError()).code).toBe('TIMEOUT');
    expect(classify(new Anthropic.BadRequestError(400, undefined, 'bad', new Headers())).code).toBe('BAD_REQUEST');
    expect(classify(new Anthropic.InternalServerError(500, undefined, 'x', new Headers())).code).toBe('UPSTREAM');
  });
});
