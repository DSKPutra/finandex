// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// SSE encoder (§8.2). Event names and payload shapes are fixed by the protocol table.
import type { Artifact, Method } from '../../src/shared/chart-spec.ts';
import type { Citation } from '../tools/types.ts';

export type ErrorCode = 'RATE_LIMIT' | 'BUDGET' | 'UPSTREAM' | 'TIMEOUT' | 'BAD_REQUEST' | 'INTERNAL';
export type SseEvent =
  | { event: 'meta'; data: { requestId: string; dex: string; as_of: string | null; model: string } }
  | { event: 'status'; data: { code: 'thinking' | 'tool'; tool?: string; label: string } }
  | { event: 'text'; data: { delta: string } }
  | { event: 'artifact'; data: Artifact }
  | { event: 'method'; data: Method }
  | { event: 'citation'; data: Citation }
  | {
      event: 'done';
      data: { usage: { input_tokens: number; output_tokens: number }; tools_used: string[]; elapsed_ms: number };
    }
  | { event: 'error'; data: { code: ErrorCode; message: string; retryAfter?: number } };

const enc = new TextEncoder();
export function encodeEvent(e: SseEvent): Uint8Array {
  return enc.encode(`event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`);
}
export const PING = enc.encode(': ping\n\n');

/** Parse an SSE byte stream back into events (used by tests, the mock eval and the client). */
export function parseSse(text: string): SseEvent[] {
  const out: SseEvent[] = [];
  for (const block of text.split(/\n\n/)) {
    let ev = '';
    let data = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) ev = line.slice(7);
      else if (line.startsWith('data: ')) data += line.slice(6);
    }
    if (ev && data) out.push({ event: ev, data: JSON.parse(data) } as SseEvent);
  }
  return out;
}

export interface SseSink {
  send(e: SseEvent): void;
  close(): void;
  readonly closed: boolean;
}

/** A ReadableStream-backed sink with a 15 s heartbeat. */
export function sseStream(heartbeatMs = 15_000): { stream: ReadableStream<Uint8Array>; sink: SseSink } {
  let ctrl!: ReadableStreamDefaultController<Uint8Array>;
  let closed = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      ctrl = c;
      timer = setInterval(() => !closed && ctrl.enqueue(PING), heartbeatMs);
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
    },
  });
  const sink: SseSink = {
    send(e) {
      if (!closed) ctrl.enqueue(encodeEvent(e));
    },
    close() {
      if (closed) return;
      closed = true;
      if (timer) clearInterval(timer);
      ctrl.close();
    },
    get closed() {
      return closed;
    },
  };
  return { stream, sink };
}
