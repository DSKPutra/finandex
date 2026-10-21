// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Ordered list of ETL modules (dependencies first: global → … → idfin → rupiah/idx/reksa).
import type { DexModule } from './lib/module.ts';
import { globalModule } from './dex/global.ts';
import { commerceModule } from './dex/commerce.ts';
import { idfinModule } from './dex/idfin.ts';
import { rupiahModule } from './dex/rupiah.ts';
import { reksaModule } from './dex/reksa.ts';
import { idxModule } from './dex/idx.ts';
import { cryptoModule } from './dex/crypto.ts';
import { defiModule } from './dex/defi.ts';
import { centralbankModule } from './dex/centralbank.ts';
import { fintechModule, personalModule } from './dex/social.ts';
import { salaryModule, startupModule, opencompanyModule, vcnetModule, vcdirModule } from './dex/fliar.ts';
import { foodModule } from './dex/food.ts';
import { housingModule } from './dex/housing.ts';
import { nasdaqModule, sp500Module } from './dex/stocks.ts';
import { lawModule } from './dex/law.ts';
import { ipoModule, inflationModule, costlivingModule, povertyModule, populationModule, homelessnessModule, housingnewsModule } from './dex/ydex.ts';

export const MODULES: DexModule[] = [globalModule, nasdaqModule, sp500Module, commerceModule, idfinModule, rupiahModule, reksaModule, idxModule, cryptoModule, defiModule, centralbankModule, fintechModule, personalModule, salaryModule, startupModule, opencompanyModule, vcnetModule, vcdirModule, foodModule, housingModule, ipoModule, inflationModule, costlivingModule, povertyModule, populationModule, homelessnessModule, housingnewsModule, lawModule];
