// © 2026 Dea Saka Kurnia Putra. All rights reserved.
/// <reference lib="webworker" />
// Service worker (§14): precache app shell + data `core/` (revision = SHA-256 from the data manifest),
// stale-while-revalidate for `heavy/` with an LRU byte quota (≤ 300 MB), SPA navigation fallback
// that never captures /api or /data. A new build activates immediately (skipWaiting + clientsClaim) and open pages
// reload themselves (src/pwa.ts), so nobody keeps running an old, cached version of the app.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching';
import type { PrecacheEntry } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { clientsClaim } from 'workbox-core';
import type { WorkboxPlugin } from 'workbox-core';
import { createStore, get, set } from 'idb-keyval';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (PrecacheEntry | string)[] };

const HEAVY_CACHE = 'finandex-heavy';
const HEAVY_MAX_BYTES = 300 * 1024 * 1024;
const HEAVY_TARGET_BYTES = 270 * 1024 * 1024;

void self.skipWaiting();
clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

self.addEventListener('message', (e) => {
  if ((e.data as { type?: string } | null)?.type === 'SKIP_WAITING') void self.skipWaiting();
});

// Stand-alone law apps (§14) navigate to their own shell (own manifest); everything else to the Finandex shell.
for (const app of ['mylaiwyer', 'finlaiwyer']) registerRoute(new NavigationRoute(createHandlerBoundToURL(`/apps/${app}/index.html`), { allowlist: [new RegExp(`^/apps/${app}(/|$)`)] }));
registerRoute(new NavigationRoute(createHandlerBoundToURL('/index.html'), { denylist: [/^\/api\//, /^\/data\//, /^\/pdfjs\//] }));

// The data manifest changes with every data build → always try the network first.
registerRoute(({ url }) => /\/data\/(manifest|summary)\.json$/.test(url.pathname), new NetworkFirst({ cacheName: 'finandex-manifest', networkTimeoutSeconds: 4 }));

// ----------------------------------------------------------------------------- heavy/ LRU byte quota

type Meta = Map<string, [bytes: number, lastUsed: number]>;
const metaStore = createStore('finandex-sw', 'meta');
let meta: Meta | null = null;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

async function loadMeta(): Promise<Meta> {
  return (meta ??= ((await get<Meta>('heavy', metaStore)) ?? new Map()));
}
function scheduleSave(): void {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => void set('heavy', meta, metaStore), 2000);
}

async function enforceQuota(): Promise<void> {
  const m = await loadMeta();
  let total = [...m.values()].reduce((s, [b]) => s + b, 0);
  if (total <= HEAVY_MAX_BYTES) return;
  const cache = await caches.open(HEAVY_CACHE);
  for (const [url, [bytes]] of [...m.entries()].sort((a, b) => a[1][1] - b[1][1])) {
    if (total <= HEAVY_TARGET_BYTES) break;
    await cache.delete(url);
    m.delete(url);
    total -= bytes;
  }
  scheduleSave();
}

const lruBytes: WorkboxPlugin = {
  cacheDidUpdate: async ({ request, newResponse }) => {
    const m = await loadMeta();
    const len = Number(newResponse.headers.get('content-length')) || (await newResponse.clone().blob()).size;
    m.set(request.url, [len, Date.now()]);
    scheduleSave();
    await enforceQuota();
  },
  cachedResponseWillBeUsed: async ({ request, cachedResponse }) => {
    if (cachedResponse) {
      const m = await loadMeta();
      const e = m.get(request.url);
      if (e) {
        e[1] = Date.now();
        scheduleSave();
      }
    }
    return cachedResponse ?? null;
  },
};

registerRoute(({ url }) => url.pathname.includes('/data/heavy/'), new StaleWhileRevalidate({ cacheName: HEAVY_CACHE, plugins: [lruBytes] }));

// Runtime-only core files not in the precache (e.g. data hosted on another origin for native/Lovable builds).
registerRoute(({ url }) => url.pathname.includes('/data/core/'), new StaleWhileRevalidate({ cacheName: 'finandex-core' }));

// pdf.js WASM decoders / fonts are versioned with the app build.
registerRoute(({ url }) => url.pathname.startsWith('/pdfjs/'), new CacheFirst({ cacheName: 'finandex-pdfjs' }));
