// © 2026 Dea Saka Kurnia Putra. All rights reserved.
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseSseFrame } from '../../src/shared/chat-protocol';
import type { SseEvent } from '../../src/shared/chat-protocol';
import { genericScenario, MockLlm } from '../../server/chat/mock-llm';
import { datasetCard, globalPrompt, systemPrompt } from '../../server/chat/prompts';
import { encodeEvent } from '../../server/chat/sse';
import { DataNotFoundError, DataStore } from '../../server/data/store';
import { parseEnv } from '../../server/env';
import { handle } from '../../server/handler';
import { allowedOrigins, corsHeaders, originAllowed } from '../../server/security/cors';
import { MemoryCounter, RateLimiter } from '../../server/security/ratelimit';
import { apiSchema, downsample, modelCopy } from '../../server/tools/kit';
import { z } from 'zod';
import { LOCAL_BASE, localFetcher } from '../../scripts/eval/local-store';

const ENV = { CHAT_MODE: 'mock', DATA_BASE_URL: LOCAL_BASE } as Record<string, string>;
const fetcher = localFetcher();
const body = (o: unknown) => JSON.stringify(o);
const CLIENT = '7a0d1c4e-2f6b-4c1a-9e3d-5b8f2a1c0d9e';

async function readSse(res: Response): Promise<SseEvent[]> {
  const text = await res.text();
  return text.split('\n\n').map((f) => parseSseFrame(f)).filter((e): e is SseEvent => e !== null);
}

describe('security', () => {
  it('CORS allowlist with wildcard subdomains', () => {
    const allow = allowedOrigins('');
    expect(originAllowed('https://abc.lovable.app', allow)).toBe(true);
    expect(originAllowed('capacitor://localhost', allow)).toBe(true);
    expect(originAllowed('https://evil.example', allow)).toBe(false);
    expect(originAllowed('https://lovable.app.evil.com', allow)).toBe(false);
    expect(originAllowed(null, allow)).toBe(true);
    expect(allowedOrigins('https://a.com, https://b.com')).toEqual(['https://a.com', 'https://b.com']);
    expect(corsHeaders('https://evil.example', allow)).toEqual({});
    expect(corsHeaders('http://localhost:5173', allow)['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
  });
  it('rate limits per client+IP and enforces the token budget', async () => {
    let t = 0;
    const rl = new RateLimiter(new MemoryCounter(() => t), 100);
    for (let i = 0; i < 20; i++) expect((await rl.check('c', 'ip')).ok).toBe(true);
    const blocked = await rl.check('c', 'ip');
    expect(blocked).toEqual({ ok: false, code: 'RATE_LIMIT', retryAfter: 600 });
    expect((await rl.check('other', 'ip')).ok).toBe(true);
    t += 601_000;
    expect((await rl.check('c', 'ip')).ok).toBe(true);
    await rl.addTokens(150);
    expect((await rl.check('x', 'y')).ok).toBe(false);
  });
  it('parses env with safe defaults', () => {
    const e = parseEnv({ CHAT_DEADLINE_MS: '1000', ANTHROPIC_API_KEY: '' });
    expect(e.CHAT_DEADLINE_MS).toBe(1000);
    expect(e.ANTHROPIC_MODEL).toBe('claude-sonnet-5-5');
    expect(e.ANTHROPIC_API_KEY).toBeUndefined();
  });
});

describe('data store', () => {
  it('caches, evicts, rejects traversal, and reports missing files', async () => {
    let calls = 0;
    const s = new DataStore('mem://x', async (u) => {
      calls++;
      if (u.endsWith('missing.json')) return new Response('', { status: 404 });
      return new Response(JSON.stringify({ u, pad: 'x'.repeat(1000) }));
    }, 3000);
    await s.json('a.json');
    await s.json('a.json');
    expect(calls).toBe(1);
    await s.json('b.json');
    await s.json('c.json');
    await s.json('a.json');
    expect(calls).toBeGreaterThan(3);
    await expect(s.json('../etc/passwd')).rejects.toThrow(/Invalid data path/);
    await expect(s.json('missing.json')).rejects.toBeInstanceOf(DataNotFoundError);
    expect(await s.text('t.txt')).toContain('t.txt');
    expect((await s.binary('b.bin')).byteLength).toBeGreaterThan(0);
  });
});

describe('tool kit', () => {
  it('builds strict API schemas without unsupported constraints', () => {
    const sch = apiSchema(z.object({ n: z.number().int().min(1).max(5), s: z.string().max(4).nullable(), a: z.array(z.string()).min(2).max(5) }).strict());
    const txt = JSON.stringify(sch);
    expect(txt).not.toMatch(/maximum|minimum|maxLength|maxItems|\$schema/);
    expect(sch.additionalProperties).toBe(false);
    expect(sch.required).toEqual(['n', 's', 'a']);
  });
  it('downsamples long series and truncates model copies', () => {
    const x = Array.from({ length: 2000 }, (_, i) => String(i));
    const y = x.map((_, i) => Math.sin(i / 50));
    const d = downsample(x, [y], 400);
    expect(d.x).toHaveLength(400);
    expect(d.x[0]).toBe('0');
    expect(d.x.at(-1)).toBe('1999');
    expect(downsample(['a'], [[1]], 400).x).toEqual(['a']);
    const big = { rows: Array.from({ length: 5000 }, (_, i) => ({ i, s: 'xxxxxxxxxx' })) };
    const c = modelCopy(big, 20_000);
    expect(c.length).toBeLessThanOrEqual(20_000);
    expect(() => JSON.parse(c)).not.toThrow();
    expect(modelCopy('x'.repeat(30_000), 1000)).toMatch(/truncated/);
  });
  it('encodes SSE frames that the client parser reads back', () => {
    const f = new TextDecoder().decode(encodeEvent({ event: 'text', data: { delta: 'halo\nbaris' } }));
    expect(parseSseFrame(f.trim())).toEqual({ event: 'text', data: { delta: 'halo\nbaris' } });
    expect(parseSseFrame(': ping')).toBeNull();
  });
  it('assembles system prompts per locale with the dataset card', () => {
    expect(globalPrompt('id')).toMatch(/^Anda adalah \{DEX_NAME\}/);
    expect(globalPrompt('en')).toMatch(/^You are \{DEX_NAME\}/);
    const sp = systemPrompt('rupiahdex', 'id', { build_id: 'x', dex: { rupiahdex: { as_of: '2026-10-20', quality: {} } } });
    expect(sp).toContain('Anda adalah RupiahDex');
    expect(sp).toContain('Data per 2026-10-20');
    expect(sp).toContain('USDIDR_daily_exchange_rate.zip');
    expect(datasetCard('salarydex', null)).toContain('SAMPLE');
  });
});

describe.runIf(existsSync('public/data/manifest.json'))('handler', () => {
  const post = (b: string, headers: Record<string, string> = {}) =>
    handle(new Request('https://finandex.test/api/chat', { method: 'POST', body: b, headers: { 'Content-Type': 'application/json', ...headers } }), ENV, undefined, { fetcher });

  it('health, version, dex, feedback, 404', async () => {
    const h = await handle(new Request('https://finandex.test/api/health'), ENV, undefined, { fetcher });
    expect(h.status).toBe(200);
    expect(((await h.json()) as { ok: boolean }).ok).toBe(true);
    expect((await handle(new Request('https://finandex.test/api/version'), ENV, undefined, { fetcher })).status).toBe(200);
    const d = (await (await handle(new Request('https://finandex.test/api/dex'), ENV, undefined, { fetcher })).json()) as { dex: unknown[] };
    expect(d.dex).toHaveLength(29);
    const c = (await (await handle(new Request('https://finandex.test/api/dex'), { ...ENV, VITE_DISTRIBUTION: 'commercial' }, undefined, { fetcher })).json()) as { dex: unknown[] };
    expect(c.dex).toHaveLength(23);
    expect((await handle(new Request('https://finandex.test/api/feedback', { method: 'POST', body: '{"dex":"rupiahdex","rating":1}' }), ENV, undefined, { fetcher })).status).toBe(202);
    expect((await handle(new Request('https://finandex.test/api/feedback', { method: 'POST', body: '{"text":"hi"}' }), ENV, undefined, { fetcher })).status).toBe(400);
    expect((await handle(new Request('https://finandex.test/api/nope'), ENV, undefined, { fetcher })).status).toBe(404);
  });
  it('rejects foreign origins and answers preflight for allowed ones', async () => {
    const bad = await handle(new Request('https://finandex.test/api/health', { headers: { Origin: 'https://evil.example' } }), ENV, undefined, { fetcher });
    expect(bad.status).toBe(403);
    const pre = await handle(new Request('https://finandex.test/api/chat', { method: 'OPTIONS', headers: { Origin: 'capacitor://localhost' } }), ENV, undefined, { fetcher });
    expect(pre.status).toBe(204);
    expect(pre.headers.get('Access-Control-Allow-Origin')).toBe('capacitor://localhost');
  });
  it('validates chat requests', async () => {
    expect((await post('{bad json')).status).toBe(400);
    expect((await post(body({ dex: 'nope', messages: [{ role: 'user', content: 'hi' }], locale: 'id', clientId: CLIENT }))).status).toBe(400);
    expect((await post(body({ dex: 'rupiahdex', messages: [{ role: 'assistant', content: 'hi' }], locale: 'id', clientId: CLIENT }))).status).toBe(400);
    expect((await post(body({ dex: 'rupiahdex', messages: [{ role: 'user', content: 'x'.repeat(2500) }], locale: 'id', clientId: CLIENT }))).status).toBe(400);
    expect((await post('x'.repeat(70_000))).status).toBe(413);
    expect((await post('{}', { 'Content-Length': '999999' })).status).toBe(413);
    expect((await handle(new Request('https://finandex.test/api/chat', { method: 'POST', body: body({ dex: 'salarydex', messages: [{ role: 'user', content: 'hi' }], locale: 'id', clientId: CLIENT }) }), { ...ENV, VITE_DISTRIBUTION: 'commercial' }, undefined, { fetcher })).status).toBe(400);
    const noKey = await handle(new Request('https://finandex.test/api/chat', { method: 'POST', body: body({ dex: 'rupiahdex', messages: [{ role: 'user', content: 'hi' }], locale: 'id', clientId: CLIENT }) }), { DATA_BASE_URL: LOCAL_BASE, CHAT_MODE: 'live' }, undefined, { fetcher });
    expect(noKey.status).toBe(200); // data mode: answered from the Dex tools without an AI model
    expect(noKey.headers.get('Content-Type')).toMatch(/text\/event-stream/);
  });
  it('streams SSE in protocol order with artifacts, method and citations', async () => {
    const llm = new MockLlm(() => ({ calls: () => [{ name: 'get_snapshot', input: { id: 'USDIDR' } }], answer: (r) => `Kurs: ${JSON.stringify((r.get_snapshot?.[0] as { metrics: { last_close: number } }).metrics.last_close)}` }), 'id', 'rupiahdex');
    const res = await handle(new Request('https://finandex.test/api/chat', { method: 'POST', body: body({ dex: 'rupiahdex', messages: [{ role: 'user', content: 'kurs terakhir?' }], locale: 'id', clientId: CLIENT, context: { entity: 'USDIDR', view: 'rate', period: { start: '2024-01-01' } } }) }), ENV, undefined, { fetcher, llm });
    expect(res.headers.get('Content-Type')).toMatch(/text\/event-stream/);
    const ev = await readSse(res);
    expect(ev[0]!.event).toBe('meta');
    expect(ev.at(-1)!.event).toBe('done');
    const kinds = ev.map((e) => e.event);
    expect(kinds).toContain('status');
    expect(kinds).toContain('artifact');
    expect(kinds).toContain('method');
    expect(kinds).toContain('citation');
    expect(kinds.indexOf('artifact')).toBeLessThan(kinds.lastIndexOf('text'));
    expect(ev.filter((e) => e.event === 'text').map((e) => (e.data as { delta: string }).delta).join('')).toMatch(/Kurs: \d+/);
  });
  it('blocks sensitive data before any model call and returns 429 when limited', async () => {
    const seed = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    const ev = await readSse(await post(body({ dex: 'cryptdex', messages: [{ role: 'user', content: `ini seed saya ${seed}` }], locale: 'id', clientId: CLIENT })));
    expect(ev.find((e) => e.event === 'text')!.data).toMatchObject({ delta: expect.stringMatching(/data sensitif/) });
    expect(ev.find((e) => e.event === 'done')!.data).toMatchObject({ tools_used: [] });
    const limiter = new RateLimiter(new MemoryCounter(), 1e9);
    for (let i = 0; i < 20; i++) await limiter.check(CLIENT, 'unknown');
    const res = await handle(new Request('https://finandex.test/api/chat', { method: 'POST', body: body({ dex: 'rupiahdex', messages: [{ role: 'user', content: 'hi' }], locale: 'id', clientId: CLIENT }) }), ENV, undefined, { fetcher, limiter });
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('600');
  });
  it('mock demo mode answers the creator question via app_info', async () => {
    const llm = new MockLlm(genericScenario, 'id', 'rupiahdex');
    const ev = await readSse(await handle(new Request('https://finandex.test/api/chat', { method: 'POST', body: body({ dex: 'rupiahdex', messages: [{ role: 'user', content: 'Siapa pembuat aplikasi ini?' }], locale: 'id', clientId: CLIENT }) }), ENV, undefined, { fetcher, llm }));
    expect(ev.filter((e) => e.event === 'text').map((e) => (e.data as { delta: string }).delta).join('')).toContain('Dea Saka Kurnia Putra');
  });
});
