// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// All mock-eval scenarios, keyed by eval item id.
import type { ScenarioSet } from '../types.ts';
import { scenarios as cryptoFin } from './crypto-fin.ts';
import { scenarios as idmarkets } from './idmarkets.ts';
import { scenarios as markets } from './markets.ts';
import { scenarios as misc } from './misc.ts';
import { scenarios as people } from './people.ts';

export const SCENARIOS: ScenarioSet = { ...markets, ...idmarkets, ...cryptoFin, ...people, ...misc };
