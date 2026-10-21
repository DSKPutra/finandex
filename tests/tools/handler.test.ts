// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// HTTP handler & security (§8.1, §13.1): routes, validation, body limit, CORS, rate limits, sensitive-data guard.
import { describe, expect, it } from 'vitest';
import { parseSse } from '../../server/chat/sse.ts';
import type { Llm } from '../../server/chat/orchestrator.ts';
import { readEnv } from '../../server/env.ts';
import { createHandler } from '../../server/handler.ts';
import { originAllowed } from '../../server/security/cors.ts';
import { MemoryLimiter } from '../../server/security/ratelimit.ts';
import { fileStore } from '../../scripts/eval/fs-store.ts';

const store = fileStore();
const env = readEnv({ LOG_LEVEL: 'silent' });
const echo: Llm = {
  model: 'echo',
  turn: async (_r, on) => (
    on('halo'),
    {
      content: [{ type: 'text', text: 'halo' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 1, output_tokens: 1 },
      model: 'echo',
    }
  ),
};
const handler = (limiter = new MemoryLimiter(1e12)) => createHandler({ env, store, limiter, llm: () => echo });
const body = (o: Record<string, unknown> = {}) =>
  JSON.stringify({
    dex: 'rupiahdex',
    locale: 'id',
    clientId: crypto.randomUUID(),
    messages: [{ role: 'user', content: 'Berapa kurs terakhir?' }],
    ...o,
  });
const post = (b: string, headers: Record<string, string> = {}) =>
  new Request('http://x/api/chat', {
    method: 'POST',
    body: b,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

describe('handler', () => {
  it('serves health, version and dex list', async () => {
    const h = handler();
    expect((await (await h(new Request('http://x/api/health'))).json()).ok).toBe(true);
    const v = await (await h(new Request('http://x/api/version'))).json();
    expect(v.creator).toBe('Dea Saka Kurnia Putra');
    const d = await (await h(new Request('http://x/api/dex'))).json();
    expect(d.dex).toHaveLength(27);
    expect((await h(new Request('http://x/api/nope'))).status).toBe(404);
  });

  it('streams SSE for a valid chat request with security headers', async () => {
    const r = await handler()(post(body()));
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toMatch(/text\/event-stream/);
    expect(r.headers.get('cache-control')).toBe('no-store');
    expect(r.headers.get('x-content-type-options')).toBe('nosniff');
    const ev = parseSse(await r.text());
    expect(ev[0]!.event).toBe('meta');
    expect(ev.at(-1)!.event).toBe('done');
  });

  it('rejects invalid requests', async () => {
    const h = handler();
    expect((await h(post(body({ dex: 'evil' })))).status).toBe(400);
    expect((await h(post(body({ extra: 1 })))).status).toBe(400);
    expect((await h(post(body({ clientId: 'nope' })))).status).toBe(400);
    expect((await h(post(body({ messages: [{ role: 'user', content: 'x'.repeat(2001) }] })))).status).toBe(400);
    expect(
      (await h(post(body({ messages: Array.from({ length: 21 }, () => ({ role: 'user', content: 'x' })) })))).status,
    ).toBe(400);
    expect((await h(post('{not json'))).status).toBe(400);
    expect((await h(post('x'.repeat(70_000)))).status).toBe(413);
  });

  it('enforces CORS allowlist incl. wildcard subdomains', async () => {
    expect(originAllowed('https://foo.lovable.app', ['https://*.lovable.app'])).toBe(true);
    expect(originAllowed('https://evil.com/x.lovable.app', ['https://*.lovable.app'])).toBe(false);
    expect(originAllowed('https://lovable.app.evil.com', ['https://*.lovable.app'])).toBe(false);
    const h = handler();
    const ok = await h(post(body(), { Origin: 'http://localhost:5173' }));
    expect(ok.headers.get('access-control-allow-origin')).toBe('http://localhost:5173');
    expect((await h(post(body(), { Origin: 'https://evil.example' }))).status).toBe(403);
    expect(
      (await h(new Request('http://x/api/chat', { method: 'OPTIONS', headers: { Origin: 'capacitor://localhost' } })))
        .status,
    ).toBe(204);
  });

  it('rate-limits 20 requests per 10 minutes per client+IP with Retry-After', async () => {
    const h = handler(new MemoryLimiter(1e12));
    const id = crypto.randomUUID();
    for (let i = 0; i < 20; i++)
      expect((await h(post(body({ clientId: id }), { 'x-forwarded-for': '1.2.3.4' }))).status).toBe(200);
    const r = await h(post(body({ clientId: id }), { 'x-forwarded-for': '1.2.3.4' }));
    expect(r.status).toBe(429);
    expect(Number(r.headers.get('retry-after'))).toBeGreaterThan(0);
  });

  it('blocks when the daily token budget is exhausted', async () => {
    const lim = new MemoryLimiter(1);
    await lim.addTokens(5);
    const r = await handler(lim)(post(body()));
    expect(r.status).toBe(429);
    expect((await r.json()).error.code).toBe('BUDGET');
  });

  it('never forwards sensitive data to the model', async () => {
    let called = false;
    const spy: Llm = {
      model: 'spy',
      turn: async () => (
        (called = true),
        { content: [], stop_reason: 'end_turn', usage: { input_tokens: 0, output_tokens: 0 }, model: 'spy' }
      ),
    };
    const h = createHandler({ env, store, limiter: new MemoryLimiter(1e12), llm: () => spy });
    const seed = 'abandon ability able about above absent absorb abstract absurd abuse access accident';
    const r = await h(post(body({ messages: [{ role: 'user', content: `ini seed saya: ${seed}` }] })));
    const txt = await r.text();
    expect(called).toBe(false);
    expect(txt).toMatch(/sensitif/);
  });

  it('reports upstream failures as a friendly SSE error event', async () => {
    const bad: Llm = {
      model: 'bad',
      turn: async () => {
        throw new Error('boom');
      },
    };
    const h = createHandler({ env, store, limiter: new MemoryLimiter(1e12), llm: () => bad });
    const ev = parseSse(await (await h(post(body()))).text());
    const e = ev.find((x) => x.event === 'error');
    expect(e?.data).toMatchObject({ code: 'UPSTREAM' });
    expect(JSON.stringify(e)).not.toMatch(/boom|at /);
  });

  it('accepts feedback and maps the Netlify function path', async () => {
    const h = handler();
    const fb = (b: unknown) => h(new Request('http://x/.netlify/functions/api/feedback', { method: 'POST', body: JSON.stringify(b), headers: { 'Content-Type': 'application/json' } }));
    expect((await fb({ requestId: 'r', dex: 'rupiahdex', rating: 'up', clientId: crypto.randomUUID() })).status).toBe(202);
    expect((await fb({ requestId: 'r', dex: 'rupiahdex', rating: 'meh', clientId: crypto.randomUUID() })).status).toBe(400);
    expect((await h(new Request('http://x/api/feedback', { method: 'POST', body: 'x'.repeat(5000) }))).status).toBe(413);
    expect((await h(new Request('http://x/api/chat', { method: 'POST' }))).status).toBe(400);
  });

  it('passes UI context to the model and aborts cleanly', async () => {
    let sys = '';
    const spy: Llm = { model: 'spy', turn: async (r) => ((sys = r.system), { content: [{ type: 'text', text: 'x' }], stop_reason: 'end_turn', usage: { input_tokens: 0, output_tokens: 0 }, model: 'spy' }) };
    const h = createHandler({ env, store, limiter: new MemoryLimiter(1e12), llm: () => spy });
    await (await h(post(body({ context: { entity: 'USDIDR', view: 'chart', period: { start: '2024-01-01' } } })))).text();
    expect(sys).toContain('UI context');
    const ac = new AbortController();
    const r = await h(new Request('http://x/api/chat', { method: 'POST', body: body(), headers: { 'Content-Type': 'application/json' }, signal: ac.signal }));
    ac.abort();
    expect(r.status).toBe(200);
  });
});

