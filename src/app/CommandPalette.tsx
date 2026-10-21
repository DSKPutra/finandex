// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Global search (§9, Ctrl/Cmd+K): Dex by name/keyword, plus entities (assets, stocks, coins, funds, …) from every
// Dex exposing search_entities, and legal articles via search_law. Opens the right Dex detail view.
import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEX_REGISTRY, type DexId } from '../config/dex-registry.ts';
import { fold } from '../shared/text.ts';
import { useTranslation } from '../i18n/index.ts';
import { runTool, useManifest } from '../lib/data.ts';
import { useSettings } from '../lib/settings.ts';
import { DexIcon } from '../components/DexCard.tsx';

const ENTITY_DEX: { dex: DexId; tab: string }[] = [
  { dex: 'finandex-ai', tab: 'markets' },
  { dex: 'idfinandex', tab: 'assets' },
  { dex: 'commercedex', tab: 'companies' },
  { dex: 'idxdex', tab: 'stocks' },
  { dex: 'cryptdex', tab: 'history' },
  { dex: 'nasdaqdex', tab: 'screener' },
  { dex: 'snp500dex', tab: 'screener' },
];

interface Hit {
  key: string;
  label: string;
  sub: string;
  to: string;
  icon: string;
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useTranslation();
  const locale = useSettings((s) => s.locale);
  const manifest = useManifest();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [ents, setEnts] = useState<Hit[]>([]);
  const dexHits = useMemo(() => {
    const f = fold(q);
    return DEX_REGISTRY.filter(
      (d) => !f || fold([d.name, d.tagline[locale], ...d.keywords].join(' ')).includes(f),
    ).slice(0, 8);
  }, [q, locale]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    let live = true;
    const h = setTimeout(() => {
      void Promise.all([
        ...ENTITY_DEX.map(async ({ dex, tab }) => {
          const r = await runTool(
            dex,
            { tool: 'search_entities', input: { query: q.trim(), limit: 4 } },
            locale,
            manifest.data ?? null,
          );
          if (!r.ok) return [];
          const rows = (r.out.data.results ?? []) as { id: string; name: string; type: string }[];
          return rows.map((e) => ({
            key: `${dex}:${e.id}`,
            label: e.name,
            sub: `${DEX_REGISTRY.find((d) => d.id === dex)!.name} · ${e.type}`,
            to: `/dex/${dex}/${tab}/${encodeURIComponent(e.id)}`,
            icon: dex,
          }));
        }),
        runTool(
          'mylaiwyer',
          { tool: 'search_law', input: { query: q.trim(), limit: 3 } },
          locale,
          manifest.data ?? null,
        ).then((r) =>
          r.ok
            ? ((r.out.data.results ?? []) as { doc_id: string; doc: string; label: string; page: number }[]).map(
                (x) => ({
                  key: `law:${x.doc_id}:${x.label}`,
                  label: `${x.doc} — ${x.label}`,
                  sub: 'My LAIwyer',
                  to: `/dex/mylaiwyer/browse/${encodeURIComponent(`${x.doc_id}@${x.page}`)}`,
                  icon: 'mylaiwyer',
                }),
              )
            : [],
        ),
      ]).then((all) => live && setEnts(all.flat().slice(0, 20)));
    }, 200);
    return () => {
      live = false;
      clearTimeout(h);
    };
  }, [q, locale, manifest.data]);

  const shown = q.trim().length < 2 ? [] : ents;
  const go = (to: string) => {
    onOpenChange(false);
    setQ('');
    nav(to);
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0" style={{ background: 'rgba(0,0,0,.6)', zIndex: 80 }} />
        <Dialog.Content
          className="card fixed p-3 flex flex-col gap-2"
          style={{
            left: '50%',
            top: '10vh',
            transform: 'translateX(-50%)',
            width: 'min(640px, 94vw)',
            maxHeight: '75vh',
            zIndex: 81,
          }}
        >
          <Dialog.Title className="sr-only">{t('nav.search')}</Dialog.Title>
          <Dialog.Description className="sr-only">{t('palette.placeholder')}</Dialog.Description>
          <input
            className="input"
            type="search"
            placeholder={t('palette.placeholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) =>
              e.key === 'Enter' && (shown[0] ?? dexHits[0]) && go(shown[0]?.to ?? `/dex/${dexHits[0]!.id}`)
            }
          />
          <div className="overflow-y-auto flex flex-col gap-1">
            <p className="text-xs muted m-0 mt-1">{t('palette.dex')}</p>
            {dexHits.map((d) => (
              <button key={d.id} className="btn justify-start" onClick={() => go(`/dex/${d.id}`)}>
                <DexIcon id={d.icon} size={22} /> {d.name}{' '}
                <span className="muted text-xs truncate">{d.tagline[locale]}</span>
              </button>
            ))}
            {shown.length > 0 && <p className="text-xs muted m-0 mt-2">{t('palette.entities')}</p>}
            {shown.map((e) => (
              <button key={e.key} className="btn justify-start" onClick={() => go(e.to)}>
                <DexIcon id={e.icon} size={22} /> {e.label} <span className="muted text-xs truncate">{e.sub}</span>
              </button>
            ))}
            {!dexHits.length && !shown.length && <p className="muted">{t('palette.none')}</p>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
