// © 2026 Dea Saka Kurnia Putra. All rights reserved.
/// <reference types="vite/client" />
// Runtime URL resolution (§15.6): VITE_API_BASE_URL / VITE_DATA_BASE_URL when set → same origin when
// GET /data/manifest.json succeeds → PRODUCTION_ORIGIN. Lets Lovable/Netlify previews and native apps find API & data.

export const PRODUCTION_ORIGIN =
  (import.meta.env.VITE_PRODUCTION_ORIGIN as string | undefined) || 'https://finandex.vercel.app';

export interface Runtime {
  apiBase: string;
  dataBase: string;
  source: 'env' | 'same-origin' | 'production';
}

export async function resolveRuntime(
  fetchImpl: typeof fetch = fetch,
  origin: string = location.origin,
  env: Record<string, string | undefined> = import.meta.env as Record<string, string | undefined>,
): Promise<Runtime> {
  const api = env.VITE_API_BASE_URL;
  const data = env.VITE_DATA_BASE_URL;
  if (api || data)
    return {
      apiBase: (api ?? PRODUCTION_ORIGIN).replace(/\/$/, ''),
      dataBase: (data ?? `${PRODUCTION_ORIGIN}/data`).replace(/\/$/, ''),
      source: 'env',
    };
  try {
    const r = await fetchImpl(`${origin}/data/manifest.json`, { method: 'GET', cache: 'no-store' });
    if (r.ok && (r.headers.get('content-type') ?? '').includes('json'))
      return { apiBase: '', dataBase: `${origin}/data`, source: 'same-origin' };
  } catch {
    /* fall through */
  }
  return { apiBase: PRODUCTION_ORIGIN, dataBase: `${PRODUCTION_ORIGIN}/data`, source: 'production' };
}
