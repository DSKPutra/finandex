// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Chat UI (§10.6): streaming messages (aria-live), tool status chip, §8.8 answer card (core answer → charts →
// analysis → "why this answer" → limits & citations), stop / regenerate / copy / share, suggestions, local history,
// first-use consent (§13.3) and the per-Dex disclaimer under the input.
import * as Dialog from '@radix-ui/react-dialog';
import { Copy, History, RotateCcw, Send, Share2, Square, SquarePen, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import rehypeSanitize from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import {
  DISCLAIMER_CRYPTO_EN,
  DISCLAIMER_CRYPTO_ID,
  DISCLAIMER_GENERAL_EN,
  DISCLAIMER_GENERAL_ID,
  DISCLAIMER_LAW_EN,
  DISCLAIMER_LAW_ID,
} from '../config/brand.ts';
import { DEX_BY_ID, type DexId } from '../config/dex-registry.ts';
import { SUGGESTIONS } from '../config/suggestions.ts';
import { fmtAsOf } from '../shared/format.ts';
import { useTranslation, type Locale } from '../i18n/index.ts';
import { CONSENT_VERSION, useSettings } from '../lib/settings.ts';
import { ArtifactCard } from '../components/ArtifactCard.tsx';
import { MethodPanel } from '../components/MethodPanel.tsx';
import {
  deleteAllConversations,
  deleteConversation,
  listConversations,
  type ChatMessage,
  type Conversation,
} from './history.ts';
import { sensitiveKinds } from './sensitive.ts';
import { useChat } from './useChat.ts';
import { useOnline } from '../components/States.tsx';
import { hapticTap } from '../native/native.ts';

const DISCLAIMER: Record<string, { id: string; en: string }> = {
  mylaiwyer: { id: DISCLAIMER_LAW_ID, en: DISCLAIMER_LAW_EN },
  cryptdex: { id: DISCLAIMER_CRYPTO_ID, en: DISCLAIMER_CRYPTO_EN },
};

function Answer({ m, locale, onAsk }: { m: ChatMessage; locale: Locale; onAsk: (q: string) => void }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const cites = [
    ...new Map(
      (m.citations ?? []).map((c) => [`${c.dataset}|${c.as_of}|${c.ref?.pasal ?? ''}|${c.ref?.page ?? ''}`, c]),
    ).values(),
  ];
  return (
    <div className="flex flex-col gap-2">
      {m.content && (
        <div className="prose-chat">
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
            {m.content}
          </ReactMarkdown>
        </div>
      )}
      {(m.artifacts ?? []).map((a) => (
        <ArtifactCard key={a.id} a={a} locale={locale} compact onAsk={(q) => onAsk(q)} />
      ))}
      <MethodPanel methods={m.methods ?? []} locale={locale} />
      {cites.length > 0 && (
        <p className="text-xs muted m-0">
          {t('chat.citations')}:{' '}
          {cites
            .map(
              (c) =>
                `${c.dataset}${c.ref?.pasal ? ` Pasal ${c.ref.pasal}` : ''}${c.ref?.page ? ` (${locale === 'id' ? 'hal.' : 'p.'} ${c.ref.page})` : ''} · ${t('common.asOf', { date: fmtAsOf(c.as_of, locale) })}`,
            )
            .join(' — ')}
        </p>
      )}
      {m.error && (
        <p role="alert" className="m-0" style={{ color: 'var(--negative)' }}>
          {m.error}
        </p>
      )}
      {m.content && (
        <div className="flex gap-1">
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              void navigator.clipboard?.writeText(m.content);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            <Copy size={14} /> {copied ? t('chat.copied') : t('chat.copy')}
          </button>
          {typeof navigator.share === 'function' && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() =>
                void navigator
                  .share({ title: 'Finandex', text: `${m.content}\n\nFinandex · © Dea Saka Kurnia Putra` })
                  .catch(() => undefined)
              }
            >
              <Share2 size={14} /> {t('chat.share')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function ChatPanel({
  dex,
  initialQuestion,
  context,
}: {
  dex: DexId;
  initialQuestion?: string | null;
  context?: { entity?: string; view?: string };
}) {
  const { t } = useTranslation();
  const locale = useSettings((s) => s.locale);
  const consent = useSettings((s) => s.consentVersion);
  const setS = useSettings((s) => s.set);
  const friendly = useCallback(
    (code: string, retryAfter?: number) =>
      code === 'RATE_LIMIT' && retryAfter ? t('chat.rateLimited', { s: retryAfter }) : t('chat.errorGeneric'),
    [t],
  );
  const chat = useChat(dex, locale, friendly);
  const [text, setText] = useState('');
  const [warn, setWarn] = useState<string | null>(null);
  const [hist, setHist] = useState<Conversation[] | null>(null);
  const pending = useRef<string | null>(initialQuestion ?? null);
  const end = useRef<HTMLDivElement>(null);
  const entry = DEX_BY_ID[dex];
  const needConsent = consent < CONSENT_VERSION;
  const online = useOnline();

  const submit = useCallback(
    async (q: string) => {
      const s = q.trim();
      if (!s || chat.busy || !online) return;
      const kinds = await sensitiveKinds(s);
      if (kinds.length) {
        setWarn(t('chat.sensitive', { kinds: kinds.join(', ') }));
        return;
      }
      setWarn(null);
      setText('');
      void hapticTap();
      void chat.send(s, context);
    },
    [chat, context, t, online],
  );

  useEffect(() => {
    if (pending.current && !needConsent) {
      const q = pending.current;
      pending.current = null;
      void submit(q);
    }
  }, [needConsent, submit]);
  useEffect(() => end.current?.scrollIntoView?.({ block: 'end' }), [chat.conv.messages.length, chat.busy]);

  const sugg = SUGGESTIONS[dex]?.[locale] ?? [];
  return (
    <div className="flex flex-col gap-3" style={{ minHeight: '60vh' }}>
      <div className="flex justify-end gap-1">
        <button className="btn btn-sm" onClick={() => chat.reset()}>
          <SquarePen size={14} /> {t('chat.newChat')}
        </button>
        <Dialog.Root onOpenChange={(o) => o && void listConversations(dex).then(setHist)}>
          <Dialog.Trigger asChild>
            <button className="btn btn-sm">
              <History size={14} /> {t('chat.history')}
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0" style={{ background: 'rgba(0,0,0,.6)', zIndex: 60 }} />
            <Dialog.Content
              className="card fixed p-4"
              style={{ right: 0, top: 0, bottom: 0, width: 'min(420px, 100vw)', zIndex: 61, overflow: 'auto' }}
            >
              <Dialog.Title className="text-lg mb-2">{t('chat.history')}</Dialog.Title>
              <Dialog.Description className="sr-only">{entry.name}</Dialog.Description>
              <ul className="list-none p-0 m-0 flex flex-col gap-1">
                {(hist ?? []).map((c) => (
                  <li key={c.id} className="flex gap-1">
                    <Dialog.Close asChild>
                      <button className="btn btn-sm flex-1 justify-start truncate" onClick={() => void chat.load(c.id)}>
                        {c.title || '…'}
                      </button>
                    </Dialog.Close>
                    <button
                      className="btn btn-sm"
                      aria-label={t('chat.delete')}
                      onClick={() => void deleteConversation(c.id).then(() => listConversations(dex).then(setHist))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              {hist && hist.length > 0 && (
                <button
                  className="btn btn-sm mt-3"
                  onClick={() => void deleteAllConversations().then(() => setHist([]))}
                >
                  {t('chat.deleteAll')}
                </button>
              )}
              <Dialog.Close asChild>
                <button className="btn mt-3">{t('common.close')}</button>
              </Dialog.Close>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <div className="flex flex-col gap-3" aria-live="polite" aria-busy={chat.busy}>
        {chat.conv.messages.length === 0 && (
          <div className="card p-4">
            <p className="m-0 mb-2">{t('chat.empty', { dex: entry.name })}</p>
            <p className="text-sm muted m-0 mb-2">{t('chat.suggested')}</p>
            <div className="flex flex-wrap gap-2">
              {sugg.map((q) => (
                <button key={q} className="chip" onClick={() => void submit(q)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {chat.conv.messages.map((m, i) =>
          m.role === 'user' ? (
            <div key={i} className="self-end card p-3" style={{ maxWidth: '85%', background: 'var(--surface-2)' }}>
              {m.content}
            </div>
          ) : (
            <div key={i} className="card p-3">
              <Answer m={m} locale={locale} onAsk={(q) => void submit(q)} />
            </div>
          ),
        )}
        {chat.busy && (
          <p className="chip self-start" role="status">
            {chat.status?.tool
              ? t('chat.tool', { label: chat.status.label })
              : (chat.status?.label ?? t('chat.thinking'))}
          </p>
        )}
        <div ref={end} />
      </div>

      <form
        className="card p-2 sticky bottom-20 md:bottom-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(text);
        }}
      >
        {!online && (
          <p role="status" className="text-sm m-0 mb-2" style={{ color: 'var(--warning)' }}>
            {t('chat.offline')}
          </p>
        )}
        {warn && (
          <p role="alert" className="text-sm m-0 mb-2" style={{ color: 'var(--negative)' }}>
            {warn}
          </p>
        )}
        <div className="flex gap-2 items-end">
          <label className="sr-only" htmlFor="chat-input">
            {t('chat.placeholder')}
          </label>
          <textarea
            id="chat-input"
            className="input"
            rows={2}
            maxLength={2000}
            placeholder={t('chat.placeholder')}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submit(text);
              }
            }}
            style={{ resize: 'vertical' }}
          />
          {chat.busy ? (
            <button type="button" className="btn" onClick={chat.stop} aria-label={t('chat.stop')}>
              <Square size={16} />
            </button>
          ) : (
            <button
              type="submit"
              className="btn btn-primary"
              aria-label={t('chat.send')}
              disabled={!text.trim() || !online}
            >
              <Send size={16} />
            </button>
          )}
          {!chat.busy && chat.conv.messages.some((m) => m.role === 'assistant') && (
            <button type="button" className="btn" onClick={chat.regenerate} aria-label={t('chat.regenerate')}>
              <RotateCcw size={16} />
            </button>
          )}
        </div>
        <p className="text-xs muted m-0 mt-1">
          {(DISCLAIMER[dex] ?? { id: DISCLAIMER_GENERAL_ID, en: DISCLAIMER_GENERAL_EN })[locale]}
        </p>
      </form>

      <Dialog.Root open={needConsent}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0" style={{ background: 'rgba(0,0,0,.6)', zIndex: 70 }} />
          <Dialog.Content
            className="card fixed p-5"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%,-50%)',
              width: 'min(480px, 92vw)',
              zIndex: 71,
            }}
          >
            <Dialog.Title className="text-lg mb-2">{t('chat.consentTitle')}</Dialog.Title>
            <Dialog.Description>{t('chat.consentBody')}</Dialog.Description>
            <p className="text-sm muted">{locale === 'id' ? DISCLAIMER_GENERAL_ID : DISCLAIMER_GENERAL_EN}</p>
            <div className="flex gap-2 justify-end mt-3">
              <Link className="btn" to="/legal/privacy">
                {t('chat.privacyLink')}
              </Link>
              <button className="btn btn-primary" onClick={() => setS({ consentVersion: CONSENT_VERSION })}>
                {t('chat.consentAccept')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
