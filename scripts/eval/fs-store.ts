// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// DataStore backed by the local build output (public/data) — for tests, the mock eval and the tool explorer.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { DataStore } from '../../server/data/store.ts';

export const DATA_ROOT = join(import.meta.dirname, '../../public/data');

export function fileFetch(root = DATA_ROOT) {
  return async (url: string): Promise<Response> => {
    const rel = decodeURIComponent(new URL(url).pathname.replace(/^\/data\//, ''));
    const p = normalize(join(root, rel));
    if (!p.startsWith(root) || !existsSync(p) || !statSync(p).isFile())
      return new Response('not found', { status: 404 });
    return new Response(readFileSync(p), { status: 200, headers: { ETag: `"${statSync(p).mtimeMs}"` } });
  };
}

export function fileStore(root = DATA_ROOT): DataStore {
  return new DataStore('http://local/data', fileFetch(root));
}
