// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Dex page (§9): header (icon, name, tagline, badges) + horizontal tabs. First tab Chat, last tab Data; feature tabs
// come from the declarative views. Route: /dex/:dexId/:tab?/:entity?
import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DISCLAIMER_LAW_EN, DISCLAIMER_LAW_ID } from '../config/brand.ts';
import { DEX_BY_ID, isDexId } from '../config/dex-registry.ts';
import { useManifest } from '../lib/data.ts';
import { useSettings } from '../lib/settings.ts';
import { ChatPanel } from '../chat/ChatPanel.tsx';
import { DexBadges } from '../components/Badges.tsx';
import { DexIcon } from '../components/DexCard.tsx';
import { ErrorState, PendingState, Skeleton } from '../components/States.tsx';
import { TabView } from '../dex/TabView.tsx';
import { viewsFor } from '../dex/views/index.ts';
import type { DexViews } from '../dex/views/types.ts';
import { DataTab } from './DataTab.tsx';
import NotFound from './NotFound.tsx';

const PdfPage = lazy(() => import('../components/PdfPage.tsx'));

export default function DexPage({ fixedDex }: { fixedDex?: string }) {
  const params = useParams();
  const [search] = useSearchParams();
  const nav = useNavigate();
  const locale = useSettings((s) => s.locale);
  const manifest = useManifest();
  const id = fixedDex ?? params.dexId ?? '';
  const views = useQuery({
    queryKey: ['views', id],
    queryFn: (): Promise<DexViews> => (isDexId(id) ? viewsFor(id) : Promise.resolve({})),
    enabled: isDexId(id),
  });
  if (!isDexId(id)) return <NotFound />;
  const dex = DEX_BY_ID[id];
  const tab = params.tab && dex.tabs.some((x) => x.id === params.tab) ? params.tab : 'chat';
  const entity = params.entity ? decodeURIComponent(params.entity) : (search.get('entity') ?? undefined);
  const m = manifest.data?.dex[id];
  const status = m?.status ?? dex.status;
  const base = fixedDex === 'finandex-ai' ? '/ai' : `/dex/${id}`;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <div className="flex gap-3 items-center">
          <DexIcon id={dex.icon} size={48} />
          <div className="min-w-0">
            <h1 className="text-2xl">{dex.name}</h1>
            <p className="muted m-0">{dex.tagline[locale]}</p>
          </div>
        </div>
        <DexBadges dex={dex} status={status} asOf={m?.as_of ?? dex.asOf} locale={locale} />
        {id === 'mylaiwyer' && (
          <p
            role="note"
            className="m-0 text-sm p-2"
            style={{ background: 'var(--surface-2)', borderLeft: '3px solid var(--warning)', borderRadius: 8 }}
          >
            {locale === 'id' ? DISCLAIMER_LAW_ID : DISCLAIMER_LAW_EN}
          </p>
        )}
      </header>
      <div className="tabs-scroll" role="tablist" aria-label={dex.name}>
        {dex.tabs.map((x) => (
          <Link key={x.id} role="tab" aria-selected={x.id === tab} className="tab no-underline" to={`${base}/${x.id}`}>
            {x.label[locale]}
          </Link>
        ))}
      </div>
      <div role="tabpanel">
        {status === 'pending-data' && tab !== 'data' && tab !== 'chat' && (
          <PendingState {...(dex.statusNote ? { text: dex.statusNote[locale] } : {})} />
        )}
        {tab === 'chat' ? (
          <ChatPanel
            key={`${id}:${search.get('q') ?? ''}`}
            dex={id}
            initialQuestion={search.get('q')}
            {...(entity ? { context: { entity, ...(search.get('view') ? { view: search.get('view')! } : {}) } } : {})}
          />
        ) : tab === 'data' ? (
          <DataTab dex={dex} />
        ) : views.isLoading ? (
          <Skeleton />
        ) : views.data?.[tab] ? (
          <>
            {id === 'mylaiwyer' && tab === 'browse' && entity?.includes('@') && (
              <div className="mb-3">
                <Suspense fallback={<Skeleton h={480} />}>
                  <PdfPage docId={entity.split('@')[0]!} page={Number(entity.split('@')[1]) || 1} />
                </Suspense>
              </div>
            )}
            <TabView key={`${id}/${tab}/${entity ?? ''}`} dex={id} tab={tab} view={views.data[tab]} entity={entity} />
          </>
        ) : (
          <ErrorState onRetry={() => nav(0)} />
        )}
      </div>
    </div>
  );
}
