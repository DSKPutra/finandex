// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Runtime-agnostic API handler (Web Request → Response), shared by the Vercel and Netlify adapters.
// Routes: GET /api/health, GET /api/version, GET /api/dex, POST /api/chat (SSE), POST /api/feedback.
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { DEX_BY_ID, DEX_REGISTRY, isDexId } from '../src/config/dex-registry.ts';
import { CREATOR } from '../src/config/brand.ts';
import { detectSensitive } from '../src/shared/text.ts';
import { AnthropicLlm, classify } from './chat/anthropic.ts';
import { LlmError, orchestrate, type Llm } from './chat/orchestrator.ts';
import { sseStream } from './chat/sse.ts';
import { DataStore } from './data/store.ts';
import { APP_VERSION } from './dex/shared-tools.ts';
import { readEnv, type Env } from './env.ts';
import { log, setLogLevel } from './log.ts';
import { corsHeaders, parseOrigins } from './security/cors.ts';
import { SECURITY_HEADERS } from './security/headers.ts';
import { MemoryLimiter, UpstashLimiter, type Limiter } from './security/ratelimit.ts';
import { ChatRequestSchema, FeedbackSchema, readJsonBody } from './security/validate.ts';
import type { ToolContext } from './tools/types.ts';

const BIP39 = new Set(wordlist);

export interface HandlerDeps {
  env?: Env;
  /** inject an LLM (mock eval / tests); defaults to Claude */
  llm?: (env: Env) => Llm;
  store?: DataStore;
  limiter?: Limiter;
  now?: () => number;
}

const SENSITIVE_REPLY = {
  id: 'Pesan Anda tampaknya memuat data sensitif (mis. seed phrase, private key, nomor kartu, atau NIK). Demi keamanan, pesan itu tidak diproses. Hapus data tersebut dan jangan pernah membagikannya kepada siapa pun, termasuk chatbot.',
  en: 'Your message appears to contain sensitive data (e.g. a seed phrase, private key, card number or national ID). For your safety it was not processed. Delete that data and never share it with anyone, including chatbots.',
};
const FRIENDLY = {
  RATE_LIMIT: {
    id: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.',
    en: 'Too many requests. Please try again shortly.',
  },
  BUDGET: {
    id: 'Kuota harian chatbot sudah habis. Coba lagi besok.',
    en: "Today's chatbot quota is used up. Please try again tomorrow.",
  },
  UPSTREAM: {
    id: 'Layanan AI sedang bermasalah. Coba lagi.',
    en: 'The AI service is having trouble. Please try again.',
  },
  TIMEOUT: {
    id: 'Permintaan terlalu lama. Coba pertanyaan yang lebih spesifik.',
    en: 'The request took too long. Try a more specific question.',
  },
  BAD_REQUEST: { id: 'Permintaan tidak valid.', en: 'Invalid request.' },
  INTERNAL: { id: 'Terjadi kesalahan. Coba lagi.', en: 'Something went wrong. Please try again.' },
} as const;

let memLimiter: MemoryLimiter | null = null;
const stores = new Map<string, DataStore>();

function rid(): string {
  return crypto.randomUUID();
}

export function createHandler(deps: HandlerDeps = {}): (req: Request) => Promise<Response> {
  const env = deps.env ?? readEnv();
  setLogLevel(env.LOG_LEVEL);
  const origins = parseOrigins(env.CORS_ALLOWED_ORIGINS, env.PRODUCTION_ORIGIN);
  const limiter: Limiter =
    deps.limiter ??
    (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN
      ? new UpstashLimiter(env.UPSTASH_REDIS_REST_URL, env.UPSTASH_REDIS_REST_TOKEN, env.DAILY_TOKEN_BUDGET)
      : (memLimiter ??= new MemoryLimiter(env.DAILY_TOKEN_BUDGET)));
  const storeFor = (req: Request): DataStore => {
    if (deps.store) return deps.store;
    const base = env.DATA_BASE_URL ?? new URL('/data', req.url).toString();
    let s = stores.get(base);
    if (!s) stores.set(base, (s = new DataStore(base)));
    return s;
  };

  return async function handle(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '').replace(/^\/\.netlify\/functions\/api/, '/api');
    const cors = corsHeaders(req.headers.get('origin'), origins);
    const base = { ...SECURITY_HEADERS, ...cors };
    const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { ...base, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra },
      });

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: base });
    if (req.headers.get('origin') && !cors['Access-Control-Allow-Origin'])
      return json(403, { error: { code: 'BAD_REQUEST', message: 'origin not allowed' } });

    try {
      if (path === '/api/health' && req.method === 'GET')
        return json(200, { ok: true, llm: Boolean(env.ANTHROPIC_API_KEY || deps.llm) });
      if (path === '/api/version' && req.method === 'GET')
        return json(200, { app: 'Finandex', version: APP_VERSION, build: env.APP_BUILD_ID ?? null, creator: CREATOR });
      if (path === '/api/dex' && req.method === 'GET') {
        const manifest = await loadManifest(storeFor(req));
        return json(
          200,
          {
            dex: DEX_REGISTRY.map((d) => ({
              id: d.id,
              name: d.name,
              group: d.group,
              status: manifest?.dex[d.id]?.status ?? d.status,
              as_of: manifest?.dex[d.id]?.as_of ?? d.asOf,
            })),
          },
          { 'Cache-Control': 'public, max-age=300' },
        );
      }
      if (path === '/api/feedback' && req.method === 'POST') {
        const body = await readJsonBody(req, 4096);
        if (!body.ok) return json(body.status, { error: { code: 'BAD_REQUEST', message: body.message } });
        const fb = FeedbackSchema.safeParse(body.value);
        if (!fb.success) return json(400, { error: { code: 'BAD_REQUEST', message: 'invalid feedback' } });
        log('info', 'feedback', { requestId: fb.data.requestId, dex: fb.data.dex, rating: fb.data.rating });
        return json(202, { ok: true });
      }
      if (path === '/api/chat' && req.method === 'POST') return await chat(req, json);
      return json(404, { error: { code: 'BAD_REQUEST', message: 'not found' } });
    } catch (e) {
      log('error', 'handler_failed', { path, err: e instanceof Error ? e.name : 'unknown' });
      return json(500, { error: { code: 'INTERNAL', message: FRIENDLY.INTERNAL.en } });
    }

    async function chat(
      req: Request,
      json: (s: number, b: unknown, h?: Record<string, string>) => Response,
    ): Promise<Response> {
      const body = await readJsonBody(req);
      if (!body.ok) return json(body.status, { error: { code: 'BAD_REQUEST', message: body.message } });
      const parsed = ChatRequestSchema.safeParse(body.value);
      if (!parsed.success)
        return json(400, {
          error: { code: 'BAD_REQUEST', message: parsed.error.issues[0]?.message ?? 'invalid request' },
        });
      const r = parsed.data;
      if (!isDexId(r.dex)) return json(400, { error: { code: 'BAD_REQUEST', message: 'unknown dex' } });
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'unknown';
      const lim = await limiter.hit(`${r.clientId}:${ip}`);
      if (!lim.ok)
        return json(
          429,
          { error: { code: 'RATE_LIMIT', message: FRIENDLY.RATE_LIMIT[r.locale], retryAfter: lim.retryAfter } },
          { 'Retry-After': String(lim.retryAfter) },
        );
      if (!(await limiter.tokensLeft()))
        return json(429, { error: { code: 'BUDGET', message: FRIENDLY.BUDGET[r.locale] } }, { 'Retry-After': '3600' });

      const requestId = rid();
      const dex = DEX_BY_ID[r.dex];
      const store = storeFor(req);
      const { stream, sink } = sseStream();
      const sseHeaders = {
        ...base,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
        'X-Request-Id': requestId,
      };
      const abort = new AbortController();
      req.signal?.addEventListener('abort', () => abort.abort());

      const last = r.messages.at(-1)!.content;
      if (detectSensitive(last, BIP39).length) {
        sink.send({ event: 'meta', data: { requestId, dex: dex.id, as_of: null, model: 'none' } });
        sink.send({ event: 'text', data: { delta: SENSITIVE_REPLY[r.locale] } });
        sink.send({
          event: 'done',
          data: { usage: { input_tokens: 0, output_tokens: 0 }, tools_used: [], elapsed_ms: 0 },
        });
        sink.close();
        log('info', 'chat_sensitive_blocked', { requestId, dex: dex.id });
        return new Response(stream, { status: 200, headers: sseHeaders });
      }

      void (async () => {
        const t0 = Date.now();
        try {
          const llm = deps.llm ? deps.llm(env) : new AnthropicLlm(env);
          const manifest = await loadManifest(store);
          const out = await orchestrate(
            { dex, messages: r.messages, locale: r.locale, context: r.context },
            {
              llm,
              store,
              manifest,
              sink,
              requestId,
              deadlineMs: env.CHAT_DEADLINE_MS,
              toolTimeoutMs: env.TOOL_TIMEOUT_MS,
              maxTokens: env.CHAT_MAX_TOKENS,
              signal: abort.signal,
              ...(deps.now ? { now: deps.now } : {}),
            },
          );
          await limiter.addTokens(out.usage.input_tokens + out.usage.output_tokens);
          log('info', 'chat_done', {
            requestId,
            dex: dex.id,
            tools: out.toolsUsed.join(','),
            in: out.usage.input_tokens,
            out: out.usage.output_tokens,
            ms: Date.now() - t0,
            stop: out.stop,
          });
        } catch (e) {
          const le = e instanceof LlmError ? e : classify(e);
          log('error', 'chat_failed', { requestId, dex: dex.id, code: le.code, ms: Date.now() - t0 });
          sink.send({
            event: 'error',
            data: {
              code: le.code,
              message: FRIENDLY[le.code][r.locale],
              ...(le.retryAfter ? { retryAfter: le.retryAfter } : {}),
            },
          });
        } finally {
          sink.close();
        }
      })();
      return new Response(stream, { status: 200, headers: sseHeaders });
    }
  };
}

async function loadManifest(store: DataStore): Promise<ToolContext['manifest']> {
  try {
    return await store.json<NonNullable<ToolContext['manifest']>>('manifest.json');
  } catch {
    return null;
  }
}
