// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Index Search (§9, §10.9; Ctrl/Cmd+K or "/"): Dex, entities across time-series Dex (assets, stocks, companies, funds,
// coins), legal documents (pasal), scam types, "search in <Dex>" actions, and for a free-text question the best Dex
// suggestion with "Tanya di sini" (ask there).
import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import type { DexId } from '../config/dex-registry';
import { visibleDex } from '../config/dex-registry';
import { DISTRIBUTION } from '../config/runtime';
import { getStore } from '../lib/data';
import { useLocale } from '../lib/locale';
import { entityHref } from '../lib/links';
import { normaliseKey } from '../shared/normalise';
import { TABS } from '../features/dex/panels';
import { getJson } from '../lib/data';
import { suggestDex } from '../shared/dex-router';

type Hit = { key: string; label: string; sub: string; href: string };
type EntityRow = { dex: DexId; id: string; name: string; aliases: string[] };
type DocRow = { id: string; short: string; title: string; corpus: 'umum' | 'keuangan' };
type ModusRow = { id: string; name: string; name_en?: string };

let extraIndex: Promise<{ docs: DocRow[]; modus: ModusRow[] }> | undefined;
function loadExtra() {
  return (extraIndex ??= Promise.all([
    getJson<{ documents: DocRow[] }>('core/law/catalog.json').then((c) => c.documents).catch(() => []),
    getJson<{ modus: ModusRow[] }>('core/antiscam/modus.json').then((m) => m.modus).catch(() => []),
  ]).then(([docs, modus]) => ({ docs, modus })));
}

let entityIndex: Promise<EntityRow[]> | undefined;
function loadEntities(): Promise<EntityRow[]> {
  return (entityIndex ??= (async () => {
    const [{ makeAdapters }, store] = await Promise.all([import('../../server/dex/adapters'), getStore()]);
    const ads = makeAdapters(store);
    const visible = new Set(visibleDex(DISTRIBUTION).map((d) => d.id));
    const lists = await Promise.all(
      Object.values(ads)
        .filter((a) => visible.has(a.dex))
        .map(async (a) => (await a.entities().catch(() => [])).map((e) => ({ dex: a.dex, id: e.id, name: e.name, aliases: e.aliases }))),
    );
    return lists.flat();
  })());
}

export default function IndexSearch({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const locale = useLocale();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [entities, setEntities] = useState<EntityRow[]>([]);
  const [extra, setExtra] = useState<{ docs: DocRow[]; modus: ModusRow[] }>({ docs: [], modus: [] });
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    void loadEntities().then(setEntities).catch(() => setEntities([]));
    void loadExtra().then(setExtra);
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const k = normaliseKey(q);
    const dexList = visibleDex(DISTRIBUTION);
    const dexHits = dexList
      .filter((d) => !k || normaliseKey(`${d.name} ${d.tagline.id} ${d.tagline.en} ${d.keywords.join(' ')}`).includes(k))
      .slice(0, k ? 6 : 29)
      .map((d) => ({ key: `dex:${d.id}`, label: d.name, sub: d.tagline[locale], href: `/dex/${d.id}` }));
    if (!k) return dexHits;
    const ent = entities
      .filter((e) => normaliseKey(e.id).startsWith(k) || normaliseKey(e.name).includes(k) || e.aliases.some((a) => normaliseKey(a).startsWith(k)))
      .sort((a, b) => Number(normaliseKey(b.id) === k) - Number(normaliseKey(a.id) === k))
      .slice(0, 12)
      .map((e) => ({ key: `e:${e.dex}:${e.id}`, label: `${e.name}${e.name !== e.id ? ` · ${e.id}` : ''}`, sub: dexList.find((d) => d.id === e.dex)?.name ?? e.dex, href: entityHref(e.dex, e.id) }));
    const searchable = dexList.flatMap((d) =>
      Object.entries(TABS[d.id])
        .filter(([, c]) => c.searchKey)
        .slice(0, 1)
        .map(([tab]) => ({ key: `s:${d.id}`, label: `${locale === 'id' ? 'Cari' : 'Search'} “${q}” — ${d.name}`, sub: d.tagline[locale], href: `/dex/${d.id}/${tab}?q=${encodeURIComponent(q)}` })),
    );
    const docs = extra.docs
      .filter((d) => normaliseKey(`${d.short} ${d.title}`).includes(k))
      .slice(0, 5)
      .map((d) => {
        const dexId = d.corpus === 'umum' ? 'mylaiwyer' : 'finlaiwyer';
        return { key: `doc:${d.id}`, label: d.short, sub: `${d.title} · ${dexList.find((x) => x.id === dexId)?.name ?? dexId}`, href: `/dex/${dexId}/articles?q=${encodeURIComponent(q)}` };
      });
    const modus = extra.modus
      .filter((m) => normaliseKey(`${m.name} ${m.name_en ?? ''} ${m.id}`).includes(k))
      .slice(0, 4)
      .map((m) => ({ key: `modus:${m.id}`, label: locale === 'en' && m.name_en ? m.name_en : m.name, sub: 'AntiScamDex', href: `/dex/antiscamdex/modus?q=${encodeURIComponent(m.id)}` }));
    // A question (several words) → best Dex + "ask there".
    const isQuestion = q.trim().split(/\s+/).length >= 3 || /\?$/.test(q.trim());
    const asks = isQuestion
      ? suggestDex(q, dexList)
          .slice(0, 2)
          .map(({ id }) => {
            const d = dexList.find((x) => x.id === id)!;
            return { key: `ask:${id}`, label: `${locale === 'id' ? 'Tanya di' : 'Ask in'} ${d.name}: “${q.trim()}”`, sub: d.tagline[locale], href: `/dex/${id}/chat?q=${encodeURIComponent(q.trim())}` };
          })
      : [];
    return [...asks, ...dexHits, ...ent, ...docs, ...modus, ...searchable];
  }, [q, entities, extra, locale]);

  const go = (h: Hit | undefined) => {
    if (!h) return;
    onOpenChange(false);
    void nav(h.href);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-field-0/80" />
        <Dialog.Content className="pane fixed left-1/2 top-[10vh] z-50 w-[min(94vw,40rem)] -translate-x-1/2 p-3" aria-describedby={undefined}>
          <Dialog.Title className="sr-only">{t('nav.search')}</Dialog.Title>
          <input
            type="search"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={hits[active] ? `pal-${active}` : undefined}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActive((a) => Math.min(hits.length - 1, a + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActive((a) => Math.max(0, a - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                go(hits[active]);
              }
            }}
            placeholder={t('search.placeholder')}
            aria-label={t('search.placeholder')}
            className="min-h-12 w-full rounded-xl border border-edge bg-pane-2 px-4 text-base"
          />
          <ul id="palette-list" ref={listRef} role="listbox" className="mt-2 max-h-[60vh] overflow-auto">
            {hits.map((h, i) => (
              <li key={h.key} id={`pal-${i}`} role="option" aria-selected={i === active}>
                <button type="button" onMouseEnter={() => setActive(i)} onClick={() => go(h)} className={`flex min-h-11 w-full flex-col items-start rounded-xl px-3 py-1.5 text-left ${i === active ? 'bg-pane-2' : ''} ${h.key.startsWith('ask:') ? 'prov-ai' : ''}`}>
                  <span className="text-sm">{h.label}</span>
                  <span className="text-xs text-ink-muted">{h.sub}</span>
                </button>
              </li>
            ))}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
