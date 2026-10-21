// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Chat history on the device only (§10.6, §13.2): IndexedDB via idb-keyval, ≤ 50 conversations per Dex.
import { createStore, del, entries, get, set } from 'idb-keyval';
import type { Artifact, Method } from '../shared/chart-spec.ts';
import type { Citation } from '../../server/tools/types.ts';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  artifacts?: Artifact[];
  methods?: Method[];
  citations?: Citation[];
  tools?: string[];
  error?: string | null;
  asOf?: string | null;
}
export interface Conversation {
  id: string;
  dex: string;
  title: string;
  updated: number;
  messages: ChatMessage[];
}

const MAX_PER_DEX = 50;
let db: ReturnType<typeof createStore> | null = null;
const st = () => (db ??= createStore('finandex-chat', 'conversations'));

export async function listConversations(dex?: string): Promise<Conversation[]> {
  try {
    const all = (await entries<string, Conversation>(st())).map(([, v]) => v);
    return all.filter((c) => !dex || c.dex === dex).sort((a, b) => b.updated - a.updated);
  } catch {
    return [];
  }
}
export async function getConversation(id: string): Promise<Conversation | undefined> {
  return get<Conversation>(id, st()).catch(() => undefined);
}
export async function saveConversation(c: Conversation): Promise<void> {
  try {
    await set(c.id, c, st());
    const mine = await listConversations(c.dex);
    for (const old of mine.slice(MAX_PER_DEX)) await del(old.id, st());
  } catch {
    /* storage unavailable (private mode) → history is simply not kept */
  }
}
export async function deleteConversation(id: string): Promise<void> {
  await del(id, st()).catch(() => undefined);
}
export async function deleteAllConversations(): Promise<void> {
  for (const c of await listConversations()) await deleteConversation(c.id);
}
export function autoTitle(q: string): string {
  const s = q.replace(/\s+/g, ' ').trim();
  return s.length > 60 ? `${s.slice(0, 57)}…` : s;
}
