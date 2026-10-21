// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Streaming client for POST /api/chat (§8.2): incremental SSE parsing over fetch, abortable.
import type { SseEvent } from '../../server/chat/sse.ts';
import { API_BASE } from '../lib/data.ts';

export interface ChatRequestBody {
  dex: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  locale: 'id' | 'en';
  clientId: string;
  context?: { entity?: string; view?: string; period?: { start?: string; end?: string } };
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly retryAfter?: number,
  ) {
    super(message);
  }
}

export async function streamChat(
  body: ChatRequestBody,
  onEvent: (e: SseEvent) => void,
  signal: AbortSignal,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const res = await fetchImpl(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const j = (await res.json().catch(() => null)) as {
      error?: { code?: string; message?: string; retryAfter?: number };
    } | null;
    throw new HttpError(
      res.status,
      j?.error?.code ?? 'INTERNAL',
      j?.error?.message ?? `HTTP ${res.status}`,
      j?.error?.retryAfter,
    );
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, i);
      buf = buf.slice(i + 2);
      let ev = '';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) ev = line.slice(7);
        else if (line.startsWith('data: ')) data += line.slice(6);
      }
      if (ev && data) onEvent({ event: ev, data: JSON.parse(data) } as SseEvent);
    }
  }
}
