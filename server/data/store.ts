// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// DataStore (§6.1): reads public/data/** through fetch(DATA_BASE_URL + path) with an in-memory LRU cache and ETag
// revalidation. Runtime-agnostic (Web Fetch API only) — used by the server and, unchanged, by the browser.

export type FetchLike = (input: string, init?: { headers?: Record<string, string>; signal?: AbortSignal }) => Promise<Response>;

interface Entry {
  value: unknown;
  etag: string | null;
  bytes: number;
  fetchedAt: number;
}

export class DataNotFoundError extends Error {
  constructor(public readonly path: string) {
    super(`data file not found: ${path}`);
  }
}

export class DataStore {
  private cache = new Map<string, Entry>();
  private inflight = new Map<string, Promise<unknown>>();
  private bytes = 0;

  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: FetchLike = (u, i) => fetch(u, i),
    private readonly maxBytes = 256 * 1024 * 1024,
    private readonly ttlMs = 10 * 60 * 1000,
  ) {}

  private url(path: string): string {
    return `${this.baseUrl.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  }

  private touch(path: string, e: Entry): void {
    this.cache.delete(path);
    this.cache.set(path, e);
  }

  private evict(): void {
    for (const [k, e] of this.cache) {
      if (this.bytes <= this.maxBytes) break;
      this.cache.delete(k);
      this.bytes -= e.bytes;
    }
  }

  async json<T = unknown>(path: string): Promise<T> {
    return (await this.load(path, 'json')) as T;
  }

  async text(path: string): Promise<string> {
    return (await this.load(path, 'text')) as string;
  }

  async binary(path: string): Promise<ArrayBuffer> {
    return (await this.load(path, 'binary')) as ArrayBuffer;
  }

  /** true when the file exists (cached probe). */
  async has(path: string): Promise<boolean> {
    try {
      await this.load(path, 'binary');
      return true;
    } catch (e) {
      if (e instanceof DataNotFoundError) return false;
      throw e;
    }
  }

  private async load(path: string, kind: 'json' | 'text' | 'binary'): Promise<unknown> {
    const key = `${kind}:${path}`;
    const hit = this.cache.get(key);
    const now = Date.now();
    if (hit && now - hit.fetchedAt < this.ttlMs) {
      this.touch(key, hit);
      return hit.value;
    }
    const pending = this.inflight.get(key);
    if (pending) return pending;
    const p = (async () => {
      const headers: Record<string, string> = {};
      if (hit?.etag) headers['If-None-Match'] = hit.etag;
      const res = await this.fetchImpl(this.url(path), { headers });
      if (res.status === 304 && hit) {
        hit.fetchedAt = now;
        this.touch(key, hit);
        return hit.value;
      }
      if (res.status === 404) throw new DataNotFoundError(path);
      if (!res.ok) throw new Error(`data fetch failed (${res.status}) for ${path}`);
      let value: unknown;
      let bytes: number;
      if (kind === 'binary') {
        const b = await res.arrayBuffer();
        value = b;
        bytes = b.byteLength;
      } else {
        const t = await res.text();
        bytes = t.length * 2;
        value = kind === 'json' ? JSON.parse(t) : t;
      }
      if (hit) this.bytes -= hit.bytes;
      this.cache.set(key, { value, etag: res.headers.get('etag'), bytes, fetchedAt: now });
      this.bytes += bytes;
      this.evict();
      return value;
    })().finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }

  stats(): { entries: number; bytes: number } {
    return { entries: this.cache.size, bytes: this.bytes };
  }
}
