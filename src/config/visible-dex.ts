// © 2026 Dea Saka Kurnia Putra. All rights reserved.
/// <reference types="vite/client" />
// Dex visible in this build: commercial builds (VITE_DISTRIBUTION=commercial) hide non-commercial-licence Dex (§12.3).
import { DEX_REGISTRY } from './dex-registry.ts';

export const DISTRIBUTION = ((import.meta.env.VITE_DISTRIBUTION as string | undefined) ?? 'noncommercial') as
  'noncommercial' | 'commercial';

export function visibleDex(hideNc: boolean) {
  return DEX_REGISTRY.filter((d) => !(hideNc || DISTRIBUTION === 'commercial') || d.commercialUseAllowed !== false);
}
