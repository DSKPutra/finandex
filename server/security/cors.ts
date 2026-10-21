// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// CORS allowlist (§13.1) with wildcard-subdomain support ("https://*.lovable.app").
import { DEFAULT_ORIGINS } from '../env.ts';

export function parseOrigins(csv: string | undefined, production?: string): string[] {
  const list = csv
    ? csv
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : DEFAULT_ORIGINS;
  return production ? [...new Set([...list, production])] : list;
}

export function originAllowed(origin: string | null, allow: readonly string[]): boolean {
  if (!origin) return false;
  for (const a of allow) {
    if (a === origin) return true;
    const m = /^([a-z]+:\/\/)\*\.(.+)$/i.exec(a);
    if (
      m &&
      origin.startsWith(m[1]!) &&
      origin.endsWith(`.${m[2]}`) &&
      !origin.slice(m[1]!.length, -(m[2]!.length + 1)).includes('/')
    )
      return true;
  }
  return false;
}

export function corsHeaders(origin: string | null, allow: readonly string[]): Record<string, string> {
  if (!originAllowed(origin, allow)) return { Vary: 'Origin' };
  return {
    'Access-Control-Allow-Origin': origin!,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  };
}
