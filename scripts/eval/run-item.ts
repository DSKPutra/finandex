// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Run one chat request through the real HTTP handler (validation → orchestrator → tools → SSE) and parse the stream.
import type { Locale } from '../../src/shared/format.ts';
import { parseSse, type SseEvent } from '../../server/chat/sse.ts';
import { readEnv } from '../../server/env.ts';
import { createHandler } from '../../server/handler.ts';
import type { Llm } from '../../server/chat/orchestrator.ts';
import { MemoryLimiter } from '../../server/security/ratelimit.ts';
import { fileStore } from './fs-store.ts';

const store = fileStore();

export async function runChat(
  dex: string,
  question: string,
  locale: Locale,
  llm?: Llm,
): Promise<{ status: number; events: SseEvent[]; raw: string }> {
  const env = readEnv({ ...process.env, LOG_LEVEL: 'error', CHAT_DEADLINE_MS: '120000' });
  const handle = createHandler({
    env,
    store,
    limiter: new MemoryLimiter(Number.MAX_SAFE_INTEGER),
    ...(llm ? { llm: () => llm } : {}),
  });
  const res = await handle(
    new Request('http://local/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dex,
        locale,
        clientId: crypto.randomUUID(),
        messages: [{ role: 'user', content: question }],
      }),
    }),
  );
  const raw = await res.text();
  return {
    status: res.status,
    events: res.headers.get('content-type')?.startsWith('text/event-stream') ? parseSse(raw) : [],
    raw,
  };
}
