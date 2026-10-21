// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Structured logging without message content (§13.1): only ids, dex, tool names, latency, tokens and error codes.
type Level = 'debug' | 'info' | 'warn' | 'error' | 'silent';
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };
let threshold: Level = 'info';

export function setLogLevel(l: Level): void {
  threshold = l;
}

export function log(
  level: Exclude<Level, 'silent'>,
  event: string,
  fields: Record<string, string | number | boolean | null | undefined> = {},
): void {
  if (ORDER[level] < ORDER[threshold]) return;
  const line = JSON.stringify({ t: new Date().toISOString(), level, event, ...fields });
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}
