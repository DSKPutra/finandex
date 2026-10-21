// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Request validation (§8.1): strict zod schema, 64 KB body limit, known Dex ids only.
import { z } from 'zod';
import { DEX_REGISTRY } from '../../src/config/dex-registry.ts';

export const MAX_BODY_BYTES = 64 * 1024;
const dexIds = DEX_REGISTRY.map((d) => d.id) as [string, ...string[]];

export const ChatRequestSchema = z.strictObject({
  dex: z.enum(dexIds),
  messages: z
    .array(z.strictObject({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(20)
    .refine((m) => m.at(-1)!.role === 'user', 'last message must be from the user')
    .refine((m) => m.at(-1)!.content.length <= 2000, 'last user message must be ≤ 2,000 characters'),
  locale: z.enum(['id', 'en']),
  clientId: z.uuid({ version: 'v4' }),
  context: z
    .strictObject({
      entity: z.string().max(80).optional(),
      view: z.string().max(40).optional(),
      period: z.strictObject({ start: z.string().max(10).optional(), end: z.string().max(10).optional() }).optional(),
    })
    .optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

export const FeedbackSchema = z.strictObject({
  requestId: z.string().max(64),
  dex: z.enum(dexIds),
  rating: z.enum(['up', 'down']),
  reason: z.string().max(500).optional(),
  clientId: z.uuid({ version: 'v4' }),
});

/** Read a request body with a hard size cap (rejects before parsing JSON). */
export async function readJsonBody(
  req: Request,
  limit = MAX_BODY_BYTES,
): Promise<{ ok: true; value: unknown } | { ok: false; status: 400 | 413; message: string }> {
  const len = Number(req.headers.get('content-length') ?? '0');
  if (len > limit) return { ok: false, status: 413, message: 'body too large' };
  const reader = req.body?.getReader();
  if (!reader) return { ok: false, status: 400, message: 'empty body' };
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return { ok: false, status: 413, message: 'body too large' };
    }
    chunks.push(value);
  }
  const buf = new Uint8Array(size);
  let o = 0;
  for (const c of chunks) {
    buf.set(c, o);
    o += c.byteLength;
  }
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(buf)) };
  } catch {
    return { ok: false, status: 400, message: 'invalid JSON' };
  }
}
