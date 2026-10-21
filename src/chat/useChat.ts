// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Chat state machine: send, stream (text/artifact/method/citation), stop, regenerate, persist to local history.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DexId } from '../config/dex-registry.ts';
import type { Locale } from '../i18n/index.ts';
import { autoTitle, getConversation, saveConversation, type ChatMessage, type Conversation } from './history.ts';
import { HttpError, streamChat } from './sse-client.ts';

const CLIENT_KEY = 'finandex-client-id';
export function clientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_KEY);
    if (!id) localStorage.setItem(CLIENT_KEY, (id = crypto.randomUUID()));
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export interface ChatStatus {
  label: string;
  tool?: string;
}

export function useChat(dex: DexId, locale: Locale, friendlyError: (code: string, retryAfter?: number) => string) {
  const [conv, setConv] = useState<Conversation>(() => ({
    id: crypto.randomUUID(),
    dex,
    title: '',
    updated: Date.now(),
    messages: [],
  }));
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<ChatStatus | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);
  useEffect(() => {
    setConv({ id: crypto.randomUUID(), dex, title: '', updated: Date.now(), messages: [] });
  }, [dex]);

  const load = useCallback(async (id: string) => {
    const c = await getConversation(id);
    if (c) setConv(c);
  }, []);
  const reset = useCallback(
    () => setConv({ id: crypto.randomUUID(), dex, title: '', updated: Date.now(), messages: [] }),
    [dex],
  );

  const run = useCallback(
    async (history: ChatMessage[], context?: { entity?: string; view?: string }) => {
      const ac = new AbortController();
      abort.current = ac;
      setBusy(true);
      const reply: ChatMessage = {
        role: 'assistant',
        content: '',
        artifacts: [],
        methods: [],
        citations: [],
        tools: [],
        error: null,
      };
      const base = { ...conv, messages: [...history, reply] };
      const push = () => setConv({ ...base, messages: [...history, { ...reply }], updated: Date.now() });
      push();
      try {
        await streamChat(
          {
            dex,
            locale,
            clientId: clientId(),
            messages: history.slice(-20).map((m) => ({ role: m.role, content: m.content.slice(0, 4000) || '…' })),
            ...(context ? { context } : {}),
          },
          (e) => {
            if (e.event === 'text') reply.content += e.data.delta;
            else if (e.event === 'artifact') reply.artifacts!.push(e.data);
            else if (e.event === 'method') reply.methods!.push(e.data);
            else if (e.event === 'citation') reply.citations!.push(e.data);
            else if (e.event === 'meta') reply.asOf = e.data.as_of;
            else if (e.event === 'status')
              setStatus({ label: e.data.label, ...(e.data.tool ? { tool: e.data.tool } : {}) });
            else if (e.event === 'done') reply.tools = e.data.tools_used;
            else if (e.event === 'error') reply.error = friendlyError(e.data.code, e.data.retryAfter);
            push();
          },
          ac.signal,
        );
      } catch (e) {
        if (!(e instanceof DOMException && e.name === 'AbortError'))
          reply.error = e instanceof HttpError ? friendlyError(e.code, e.retryAfter) : friendlyError('INTERNAL');
        push();
      } finally {
        setBusy(false);
        setStatus(null);
        abort.current = null;
        const final: Conversation = {
          ...base,
          title: base.title || autoTitle(history.find((m) => m.role === 'user')?.content ?? ''),
          messages: [...history, { ...reply }],
          updated: Date.now(),
        };
        setConv(final);
        void saveConversation(final);
      }
    },
    [conv, dex, locale, friendlyError],
  );

  const send = useCallback(
    (text: string, context?: { entity?: string; view?: string }) =>
      run([...conv.messages.filter((m) => m.content || m.role === 'user'), { role: 'user', content: text }], context),
    [conv.messages, run],
  );
  const stop = useCallback(() => abort.current?.abort(), []);
  const regenerate = useCallback(() => {
    const msgs = [...conv.messages];
    while (msgs.length && msgs.at(-1)!.role === 'assistant') msgs.pop();
    if (msgs.length) void run(msgs);
  }, [conv.messages, run]);

  return { conv, busy, status, send, stop, regenerate, load, reset };
}
