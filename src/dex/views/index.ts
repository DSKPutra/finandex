// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Dex id → tab views, code-split per Dex (chat and data tabs are generic and not listed here).
import type { DexId } from '../../config/dex-registry.ts';
import type { DexViews } from './types.ts';

const LOADERS: Record<DexId, () => Promise<{ views: DexViews }>> = {
  'finandex-ai': () => import('./finandex-ai.ts'),
  nasdaqdex: () => import('./nasdaqdex.ts'),
  snp500dex: () => import('./snp500dex.ts'),
  commercedex: () => import('./commercedex.ts'),
  ipodex: () => import('./ipodex.ts'),
  idfinandex: () => import('./idfinandex.ts'),
  rupiahdex: () => import('./rupiahdex.ts'),
  idxdex: () => import('./idxdex.ts'),
  reksadex: () => import('./reksadex.ts'),
  cryptdex: () => import('./cryptdex.ts'),
  centralbankdex: () => import('./centralbankdex.ts'),
  inflationdex: () => import('./inflationdex.ts'),
  startupdex: () => import('./startupdex.ts'),
  vcdex: () => import('./vcdex.ts'),
  vcnetworkdex: () => import('./vcnetworkdex.ts'),
  opencompanydex: () => import('./opencompanydex.ts'),
  salarydex: () => import('./salarydex.ts'),
  costlivingdex: () => import('./costlivingdex.ts'),
  idhousingdex: () => import('./idhousingdex.ts'),
  idfooddeliverydex: () => import('./idfooddeliverydex.ts'),
  povertydex: () => import('./povertydex.ts'),
  populationdex: () => import('./populationdex.ts'),
  homelessnessdex: () => import('./homelessnessdex.ts'),
  housingdex: () => import('./housingdex.ts'),
  fintechdex: () => import('./fintechdex.ts'),
  personalfinandex: () => import('./personalfinandex.ts'),
  mylaiwyer: () => import('./mylaiwyer.ts'),
};

export async function viewsFor(dex: DexId): Promise<DexViews> {
  return (await LOADERS[dex]()).views;
}
