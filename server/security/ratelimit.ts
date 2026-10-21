// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Rate limits (§13.1): per (clientId + IP) 20 requests / 10 min and 200 / day, plus a global daily token budget.
// Upstash Redis (REST) when configured; in-memory fallback otherwise (dev / single instance).
export interface Limiter {
  /** Count one request; returns retryAfter seconds when over a limit. */
  hit(key: string): Promise<{ ok: true } | { ok: false; retryAfter: number }>;
  /** Add used tokens; returns false when today's budget is exhausted (checked before a request). */
  tokensLeft(): Promise<boolean>;
  addTokens(n: number): Promise<void>;
}

export const WINDOW_S = 600;
export const WINDOW_MAX = 20;
export const DAY_MAX = 200;
const DAY_S = 86_400;
const dayKey = (now: number) => new Date(now).toISOString().slice(0, 10);
const secondsToMidnight = (now: number) => DAY_S - Math.floor((now / 1000) % DAY_S);

export class MemoryLimiter implements Limiter {
  private win = new Map<string, number[]>();
  private day = new Map<string, number>();
  private tokens = new Map<string, number>();
  constructor(
    private readonly budget: number,
    private readonly now: () => number = Date.now,
  ) {}

  async hit(key: string) {
    const t = this.now();
    const ts = (this.win.get(key) ?? []).filter((x) => x > t - WINDOW_S * 1000);
    const dk = `${dayKey(t)}:${key}`;
    const d = this.day.get(dk) ?? 0;
    if (d >= DAY_MAX) return { ok: false as const, retryAfter: secondsToMidnight(t) };
    if (ts.length >= WINDOW_MAX)
      return { ok: false as const, retryAfter: Math.max(1, Math.ceil((ts[0]! + WINDOW_S * 1000 - t) / 1000)) };
    ts.push(t);
    this.win.set(key, ts);
    this.day.set(dk, d + 1);
    if (this.win.size > 10_000)
      for (const [k, v] of this.win) if (!v.some((x) => x > t - WINDOW_S * 1000)) this.win.delete(k);
    return { ok: true as const };
  }
  async tokensLeft() {
    return (this.tokens.get(dayKey(this.now())) ?? 0) < this.budget;
  }
  async addTokens(n: number) {
    const k = dayKey(this.now());
    this.tokens.set(k, (this.tokens.get(k) ?? 0) + n);
  }
}

/** Upstash Redis REST limiter (fixed windows via INCR + EXPIRE, pipelined). */
export class UpstashLimiter implements Limiter {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly budget: number,
    private readonly now: () => number = Date.now,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async pipeline(cmds: (string | number)[][]): Promise<number[]> {
    const r = await this.fetchImpl(`${this.url.replace(/\/$/, '')}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds),
    });
    if (!r.ok) throw new Error(`upstash ${r.status}`);
    return ((await r.json()) as { result: number }[]).map((x) => Number(x.result));
  }

  async hit(key: string) {
    const t = this.now();
    const w = Math.floor(t / 1000 / WINDOW_S);
    const kw = `fx:rl:w:${w}:${key}`;
    const kd = `fx:rl:d:${dayKey(t)}:${key}`;
    const [nw, , nd] = await this.pipeline([
      ['INCR', kw],
      ['EXPIRE', kw, WINDOW_S],
      ['INCR', kd],
      ['EXPIRE', kd, DAY_S],
    ]);
    if ((nd ?? 0) > DAY_MAX) return { ok: false as const, retryAfter: secondsToMidnight(t) };
    if ((nw ?? 0) > WINDOW_MAX) return { ok: false as const, retryAfter: (w + 1) * WINDOW_S - Math.floor(t / 1000) };
    return { ok: true as const };
  }
  async tokensLeft() {
    const [n] = await this.pipeline([['INCRBY', `fx:tok:${dayKey(this.now())}`, 0]]);
    return (n ?? 0) < this.budget;
  }
  async addTokens(n: number) {
    const k = `fx:tok:${dayKey(this.now())}`;
    await this.pipeline([
      ['INCRBY', k, n],
      ['EXPIRE', k, DAY_S * 2],
    ]);
  }
}
