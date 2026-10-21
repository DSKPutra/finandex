// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Client-side sensitive-data detector (§13.2): blocks sending until seed phrases / keys / card numbers / NIK are removed.
import { detectSensitive, type SensitiveKind } from '../shared/text.ts';

let words: Promise<ReadonlySet<string>> | null = null;
const bip39 = () => (words ??= import('@scure/bip39/wordlists/english.js').then((m) => new Set(m.wordlist)));

export async function sensitiveKinds(text: string): Promise<SensitiveKind[]> {
  return detectSensitive(text, await bip39());
}
