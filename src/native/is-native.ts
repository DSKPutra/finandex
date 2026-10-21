// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Cheap native check without loading @capacitor/core into the web entry chunk.
export function isNative(): boolean {
  const c = (globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!c?.isNativePlatform?.();
}
