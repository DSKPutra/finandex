// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Dex → tool registry (§8.5). Only the active Dex's tools are offered to the model; unknown tool names are rejected.
import type { DexId } from '../../src/config/dex-registry.ts';
import type { Tool } from '../tools/types.ts';
import { tools as finandexai } from './finandex-ai/tools.ts';
import { tools as nasdaqdex } from './nasdaqdex/tools.ts';
import { tools as snp500dex } from './snp500dex/tools.ts';
import { tools as commercedex } from './commercedex/tools.ts';
import { tools as ipodex } from './ipodex/tools.ts';
import { tools as idfinandex } from './idfinandex/tools.ts';
import { tools as rupiahdex } from './rupiahdex/tools.ts';
import { tools as idxdex } from './idxdex/tools.ts';
import { tools as reksadex } from './reksadex/tools.ts';
import { tools as cryptdex } from './cryptdex/tools.ts';
import { tools as centralbankdex } from './centralbankdex/tools.ts';
import { tools as inflationdex } from './inflationdex/tools.ts';
import { tools as startupdex } from './startupdex/tools.ts';
import { tools as vcdex } from './vcdex/tools.ts';
import { tools as vcnetworkdex } from './vcnetworkdex/tools.ts';
import { tools as opencompanydex } from './opencompanydex/tools.ts';
import { tools as salarydex } from './salarydex/tools.ts';
import { tools as costlivingdex } from './costlivingdex/tools.ts';
import { tools as idhousingdex } from './idhousingdex/tools.ts';
import { tools as idfooddeliverydex } from './idfooddeliverydex/tools.ts';
import { tools as povertydex } from './povertydex/tools.ts';
import { tools as populationdex } from './populationdex/tools.ts';
import { tools as homelessnessdex } from './homelessnessdex/tools.ts';
import { tools as housingdex } from './housingdex/tools.ts';
import { tools as fintechdex } from './fintechdex/tools.ts';
import { tools as personalfinandex } from './personalfinandex/tools.ts';
import { tools as mylaiwyer } from './mylaiwyer/tools.ts';

export const DEX_TOOLS: Record<DexId, Tool<never>[]> = {
  'finandex-ai': finandexai,
  nasdaqdex: nasdaqdex,
  snp500dex: snp500dex,
  commercedex: commercedex,
  ipodex: ipodex,
  idfinandex: idfinandex,
  rupiahdex: rupiahdex,
  idxdex: idxdex,
  reksadex: reksadex,
  cryptdex: cryptdex,
  centralbankdex: centralbankdex,
  inflationdex: inflationdex,
  startupdex: startupdex,
  vcdex: vcdex,
  vcnetworkdex: vcnetworkdex,
  opencompanydex: opencompanydex,
  salarydex: salarydex,
  costlivingdex: costlivingdex,
  idhousingdex: idhousingdex,
  idfooddeliverydex: idfooddeliverydex,
  povertydex: povertydex,
  populationdex: populationdex,
  homelessnessdex: homelessnessdex,
  housingdex: housingdex,
  fintechdex: fintechdex,
  personalfinandex: personalfinandex,
  mylaiwyer: mylaiwyer,
};

export function toolsFor(dex: DexId): Tool<never>[] {
  return DEX_TOOLS[dex];
}

export function findTool(dex: DexId, name: string): Tool<never> | undefined {
  return DEX_TOOLS[dex].find((t) => t.name === name);
}
