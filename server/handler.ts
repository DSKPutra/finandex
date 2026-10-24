// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Runtime-agnostic API router (§5.3): Web Fetch API only (no fs / Node-specific APIs).
import { DEX_REGISTRY, visibleDex } from '../src/config/dex-registry';
import type { DexId } from '../src/config/dex-registry';
import { ChatRequest, LIMITS } from '../src/shared/chat-protocol';
import type { ErrorCode, SseEvent } from '../src/shared/chat-protocol';
import { orchestrate } from './chat/orchestrator';
import type { Llm } from './chat/llm';
import { ClaudeLlm } from './chat/llm';
import { encodeEvent, PING, SSE_HEADERS } from './chat/sse';
import { DataStore } from './data/store';
import type { Fetcher } from './data/store';
import { parseEnv } from './env';
import type { Env } from './env';
import { allowedOrigins, corsHeaders, originAllowed } from './security/cors';
import { SECURITY_HEADERS } from './security/headers';
import { MemoryCounter, RateLimiter, UpstashCounter } from './security/ratelimit';
import type { ManifestLike } from './tools/kit';

export type HandlerOptions = { fetcher?: Fetcher; llm?: Llm; limiter?: RateLimiter };

type State = { env: Env; store: DataStore; limiter: RateLimiter; manifest: () => Promise<ManifestLike> };
type Shared = { store: DataStore; manifest: () => Promise<ManifestLike> };
const stores = new Map<string, Shared>();
const limiters = new Map<string, RateLimiter>();

function state(raw: Record<string, string | undefined>, origin: string, opts: HandlerOptions): State {
  const env = parseEnv(raw);
  const base = env.DATA_BASE_URL || `${origin}/data`;
  const key = `${base}|${opts.fetcher ? 'custom' : 'fetch'}`;
  let shared = stores.get(key);
  if (!shared) {
    const store = new DataStore(base, opts.fetcher);
    let manifestP: Promise<ManifestLike> | undefined;
    shared = {
      store,
      manifest: () => (manifestP ??= store.json<ManifestLike>('manifest.json').catch((e: unknown) => {
        manifestP = undefined;
        throw e;
      })),
    };
    stores.set(key, shared);
  }
  let limiter = opts.limiter;
  if (!limiter) {
    const lk = `${env.UPSTASH_REDIS_REST_URL ?? 'memory'}|${env.DAILY_TOKEN_BUDGET}`;
    limiter = limiters.get(lk);
    if (!limiter) {
      const counter = env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN ? new UpstashCounter(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN) : new MemoryCounter();
      limiter = new RateLimiter(counter, env.DAILY_TOKEN_BUDGET);
      limiters.set(lk, limiter);
    }
  }
  return { env, store: shared.store, manifest: shared.manifest, limiter };
}

const json = (body: unknown, status: number, headers: Record<string, string>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY_HEADERS, ...headers } });

const errorBody = (code: ErrorCode, message: string, retryAfter?: number) => ({ error: { code, message, ...(retryAfter ? { retryAfter } : {}) } });

export async function handle(request: Request, rawEnv: Record<string, string | undefined>, ctx?: { waitUntil?: (p: Promise<unknown>) => void }, opts: HandlerOptions = {}): Promise<Response> {
  void ctx;
  const url = new URL(request.url);
  const s = state(rawEnv, url.origin, opts);
  const origin = request.headers.get('Origin');
  const allow = allowedOrigins(s.env.CORS_ALLOWED_ORIGINS);
  const cors = corsHeaders(origin, allow);
  const path = url.pathname.replace(/\/+$/, '');

  if (request.method === 'OPTIONS') return new Response(null, { status: originAllowed(origin, allow) ? 204 : 403, headers: { ...cors, ...SECURITY_HEADERS } });
  if (origin && !originAllowed(origin, allow)) return json(errorBody('BAD_REQUEST', 'Origin not allowed'), 403, SECURITY_HEADERS);

  try {
    if (path === '/api/health' && request.method === 'GET') {
      let data = 'unknown';
      try {
        data = (await s.manifest()).build_id;
      } catch {
        data = 'unavailable';
      }
      return json({ ok: true, data_build: data, chat: s.env.CHAT_MODE === 'live' && s.env.ANTHROPIC_API_KEY ? 'ai' : 'data' }, 200, cors);
    }
    if (path === '/api/version' && request.method === 'GET') return json({ app: 'Finandex', version: s.env.APP_VERSION, build: s.env.BUILD_ID, model: s.env.ANTHROPIC_MODEL }, 200, cors);
    if (path === '/api/dex' && request.method === 'GET') {
      return json({ distribution: s.env.VITE_DISTRIBUTION, dex: visibleDex(s.env.VITE_DISTRIBUTION).map((d) => ({ id: d.id, name: d.name, group: d.group, tagline: d.tagline, asOf: d.asOf, status: d.status, license: d.license })) }, 200, cors);
    }
    if (path === '/api/feedback' && request.method === 'POST') {
      const text = await request.text();
      if (text.length > 2048) return json(errorBody('BAD_REQUEST', 'Feedback too large'), 413, cors);
      // Anonymous and content-free by design: only a rating and the Dex id are accepted; nothing is stored.
      const ok = /^\{"dex":"[a-z0-9-]{3,30}","rating":(1|-1)\}$/.test(text.replace(/\s/g, ''));
      return json({ ok }, ok ? 202 : 400, cors);
    }
    if (path === '/api/chat' && request.method === 'POST') return await chat(request, s, cors, opts);
    if (path.startsWith('/api')) return json(errorBody('BAD_REQUEST', 'Unknown endpoint'), 404, cors);
    return json(errorBody('BAD_REQUEST', 'Not found'), 404, cors);
  } catch {
    return json(errorBody('INTERNAL', 'Terjadi kesalahan internal. / Internal error.'), 500, cors);
  }
}

async function chat(request: Request, s: State, cors: Record<string, string>, opts: HandlerOptions): Promise<Response> {
  const len = Number(request.headers.get('Content-Length') ?? 0);
  if (len > LIMITS.bodyBytes) return json(errorBody('BAD_REQUEST', 'Body too large (max 64 KB)'), 413, cors);
  const raw = await request.text();
  if (raw.length > LIMITS.bodyBytes) return json(errorBody('BAD_REQUEST', 'Body too large (max 64 KB)'), 413, cors);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(errorBody('BAD_REQUEST', 'Invalid JSON'), 400, cors);
  }
  const parsed = ChatRequest.safeParse(body);
  if (!parsed.success) return json(errorBody('BAD_REQUEST', parsed.error.issues.slice(0, 2).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')), 400, cors);
  const req = parsed.data;
  if (!visibleDex(s.env.VITE_DISTRIBUTION).some((d) => d.id === req.dex)) return json(errorBody('BAD_REQUEST', 'Dex not available in this build'), 400, cors);
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? request.headers.get('x-nf-client-connection-ip') ?? 'unknown';
  const lim = await s.limiter.check(req.clientId, ip);
  if (!lim.ok) {
    const msg = lim.code === 'BUDGET' ? 'Kuota harian chat telah habis. Coba lagi besok. / Daily chat budget reached.' : 'Terlalu banyak permintaan. Coba lagi sebentar lagi. / Too many requests, please retry later.';
    return json(errorBody(lim.code, msg, lim.retryAfter), 429, { ...cors, 'Retry-After': String(lim.retryAfter) });
  }
  let llm = opts.llm;
  let llmFor: ((dex: DexId) => Llm) | undefined;
  const live = !opts.llm && s.env.CHAT_MODE === 'live' && !!s.env.ANTHROPIC_API_KEY;
  if (!llm) {
    if (live) llm = new ClaudeLlm(s.env);
    else {
      // Data mode: no AI model configured (or CHAT_MODE=mock) → each Dex agent composes answers from its own tools.
      const { DataLlm } = await import('./chat/data-llm');
      const { KNOWN_QUESTIONS } = await import('./chat/known-questions');
      llm = new DataLlm(req.dex, s.store, req.locale, KNOWN_QUESTIONS);
      llmFor = (dex) => new DataLlm(dex, s.store, req.locale, KNOWN_QUESTIONS);
    }
  }
  const requestId = crypto.randomUUID();
  const abort = new AbortController();
  request.signal?.addEventListener('abort', () => abort.abort());
  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      let closed = false;
      const emit = (e: SseEvent) => {
        if (!closed) controller.enqueue(encodeEvent(e));
      };
      const ping = setInterval(() => !closed && controller.enqueue(PING), 15_000);
      try {
        await orchestrate(req, { llm: llm!, ...(llmFor ? { llmFor } : {}), live, store: s.store, manifest: s.manifest, deadlineMs: s.env.CHAT_DEADLINE_MS, distribution: s.env.VITE_DISTRIBUTION, appVersion: s.env.APP_VERSION, log: (r) => s.env.LOG_LEVEL === 'debug' && console.warn(JSON.stringify(r)) }, emit, abort.signal, requestId);
      } catch (e) {
        const aborted = abort.signal.aborted;
        const code: ErrorCode = aborted ? 'TIMEOUT' : (e as { status?: number })?.status === 429 ? 'RATE_LIMIT' : (e as { status?: number })?.status ? 'UPSTREAM' : 'INTERNAL';
        if (!aborted) emit({ event: 'error', data: { code, message: code === 'UPSTREAM' || code === 'RATE_LIMIT' ? 'Layanan AI sedang sibuk. Coba lagi. / The AI service is busy, please retry.' : 'Terjadi kesalahan. Coba lagi. / Something went wrong, please retry.' } });
      } finally {
        clearInterval(ping);
        closed = true;
        controller.close();
      }
    },
    cancel: () => abort.abort(),
  });
  return new Response(stream, { status: 200, headers: { ...SSE_HEADERS, ...SECURITY_HEADERS, ...cors } });
}

export { DEX_REGISTRY };
