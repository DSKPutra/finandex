// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Free-text question → best Dex (Index Search "Tanya di sini", §10.9). Deterministic keyword scoring over the registry
// (name, taglines, keywords) with a few strong routing rules from §8.5 cross_dex_lookup.
import type { DexEntry, DexId } from '../config/dex-registry';
import { normaliseKey } from './text';

const RULES: [RegExp, DexId][] = [
  [/baru (kena|tertipu|ditipu)|kena scam|iasc|satgas pasti|modus|lapor penipuan|just scammed/i, 'antiscamdex'],
  [/uang nyasar|pinjol|penagih|bank menolak|transfer dana|rahasia bank|ojk|pojk|\bpbi\b|ite\b|tppu|hukum (keuangan|perbankan)|banking law/i, 'finlaiwyer'],
  [/pasal|uud|kuhap|kuhp|praperadilan|polisi|gugat|advokat|lbh|bantuan hukum|constitution|criminal/i, 'mylaiwyer'],
  [/ihsg|\bbi rate\b|inflasi indonesia/i, 'idfinandex'],
  [/kurs|rupiah|usd\/?idr/i, 'rupiahdex'],
  [/reksa ?dana|mutual fund/i, 'reksadex'],
  [/\b(bbca|bbri|tlkm|goto|bei|idx)\b/i, 'idxdex'],
  [/bitcoin|crypto|kripto|defi|ethereum|tvl/i, 'cryptdex'],
  [/nasdaq|nvda|aapl|msft/i, 'nasdaqdex'],
  [/dividen|dividend|s&p|sp500/i, 'snp500dex'],
  [/gaji|salary/i, 'salarydex'],
  [/ipo\b/i, 'ipodex'],
];

export function suggestDex(question: string, dex: readonly DexEntry[]): { id: DexId; score: number }[] {
  const q = normaliseKey(question);
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  const out = new Map<DexId, number>();
  for (const [re, id] of RULES) if (re.test(question) && dex.some((d) => d.id === id)) out.set(id, (out.get(id) ?? 0) + 10);
  for (const d of dex) {
    const hay = normaliseKey(`${d.name} ${d.tagline.id} ${d.tagline.en} ${d.keywords.join(' ')}`);
    let s = 0;
    for (const w of words) if (hay.includes(w)) s += d.keywords.some((k) => normaliseKey(k) === w) ? 3 : 1;
    if (s) out.set(d.id, (out.get(d.id) ?? 0) + s);
  }
  const ranked = [...out.entries()].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  return ranked.length ? ranked : [{ id: 'finandex-ai', score: 0 }];
}
