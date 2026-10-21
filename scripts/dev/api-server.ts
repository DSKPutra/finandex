// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Local API for `npm run dev` / E2E: the same Web handler as Vercel/Netlify on node:http, data from public/data.
// FINANDEX_MOCK_LLM=1 uses a scripted model (no API key): it answers with tool output for the eval scenarios.
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { readEnv } from '../../server/env.ts';
import { createHandler } from '../../server/handler.ts';
import type { Llm } from '../../server/chat/orchestrator.ts';
import { fileStore } from '../eval/fs-store.ts';
import { ScenarioLlm } from '../eval/mock-llm.ts';
import { SCENARIOS } from '../eval/scenarios/index.ts';

const PORT = Number(process.env.API_PORT ?? 8787);
const env = readEnv(process.env);
const mock = process.env.FINANDEX_MOCK_LLM === '1' || !env.ANTHROPIC_API_KEY;

/** Mock model: replays the eval scenario whose question matches; otherwise a short fixed reply. */
function mockLlm(question: string): Llm {
  const hit = Object.entries(SCENARIOS).find(([id]) => question.includes(`[${id}]`))?.[1];
  if (hit) return new ScenarioLlm(hit, 'id');
  return {
    model: 'mock',
    turn: async (_r, on) => (
      on('Mode demo (tanpa kunci API): jawaban model tidak tersedia. / Demo mode (no API key).'),
      {
        content: [{ type: 'text', text: '' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 0, output_tokens: 0 },
        model: 'mock',
      }
    ),
  };
}

let lastQuestion = '';
const handle = createHandler({ env, store: fileStore(), ...(mock ? { llm: () => mockLlm(lastQuestion) } : {}) });

createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const body = Buffer.concat(chunks);
  if (req.url?.startsWith('/api/chat')) {
    try {
      const j = JSON.parse(body.toString()) as { messages?: { content: string }[] };
      lastQuestion = j.messages?.at(-1)?.content ?? '';
    } catch {
      lastQuestion = '';
    }
  }
  const ac = new AbortController();
  res.on('close', () => ac.abort());
  const r = await handle(
    new Request(`http://localhost:${PORT}${req.url}`, {
      method: req.method!,
      headers: req.headers as Record<string, string>,
      ...(body.length ? { body } : {}),
      signal: ac.signal,
    }),
  );
  res.writeHead(r.status, Object.fromEntries(r.headers));
  if (r.body) Readable.fromWeb(r.body as never).pipe(res);
  else res.end();
}).listen(PORT, () =>
  console.log(`finandex api on http://localhost:${PORT} (${mock ? 'mock LLM' : env.ANTHROPIC_MODEL})`),
);
