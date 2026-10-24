// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Conductor planning (AGENTIC_AI_PROMPT §5.1). Deterministic planner: split the question into clauses, route each clause
// with domain rules, keep the open Dex as the main agent when the question is (also) in its domain, ≤ 4 specialists,
// independent agents run in parallel. With an AI model configured the Conductor may refine the plan (validated with zod;
// any failure falls back to this plan).
import type { DexId } from '../../src/config/dex-registry';
import { DEX_REGISTRY, getDex } from '../../src/config/dex-registry';
import { AGENT_LIMITS, Plan } from '../../src/shared/agents';
import { suggestDex } from '../../src/shared/dex-router';
import { normaliseKey } from '../../src/shared/text';
import type { Llm } from '../chat/llm';

/** Domain rules (strong signals only). Order matters: more specific first. */
export const DOMAIN_RULES: [RegExp, DexId][] = [
  [/baru (kena|tertipu|ditipu)|kena (scam|tipu|penipuan)|\biasc\b|satgas pasti|modus (penipuan|scam)|lapor(kan)? penipuan|just (got )?scammed|scam (stats|statistik)|statistik (scam|penipuan)/i, 'antiscamdex'],
  [/uang nyasar|pinjol|penagih|pengaduan|mengadu(kan)?|komplain|bank indonesia|debt collector|bank menolak|transfer dana|rahasia bank|\bojk\b|\bpojk\b|\bpbi\b|uu ite|\bite\b|tppu|pencucian uang|hukum (keuangan|perbankan)|banking law|pelindungan konsumen|perlindungan konsumen|pasal penipuan|penipuan online/i, 'finlaiwyer'],
  [/\bpasal\b|\buud\b|kuhap|\bkuhp\b|praperadilan|ditangkap|penahanan|gugat(an)?|advokat|\blbh\b|bantuan hukum|konstitusi|constitution|criminal procedure|hukum pidana/i, 'mylaiwyer'],
  [/\bihsg\b|bi ?rate|suku bunga bi|inflasi indonesia|makro indonesia|cpi indonesia/i, 'idfinandex'],
  [/\bkurs\b|rupiah|usd ?\/? ?idr|idr ?\/? ?usd|dolar ke rupiah|exchange rate/i, 'rupiahdex'],
  [/reksa ?dana|mutual fund|\bnab\b/i, 'reksadex'],
  [/\b(bbca|bbri|bmri|tlkm|goto|asii|unvr|bbni)\b|saham bei|bursa efek indonesia|\bidx\b|emiten/i, 'idxdex'],
  [/\bipo\b|initial public offering|penawaran umum perdana/i, 'ipodex'],
  [/\bdefi\b|\btvl\b|stablecoin|yield pool|bot (trading|kripto)|trading bot|kripto|crypto|bitcoin|\bbtc\b|ethereum|\beth\b|solana/i, 'cryptdex'],
  [/bank sentral|central bank|the fed|\bfomc\b|\becb\b|suku bunga acuan|policy rate|m2 money/i, 'centralbankdex'],
  [/inflasi (global|dunia|negara)|inflation (rate|by country)|\bcpi\b/i, 'inflationdex'],
  [/nasdaq|\bnvda\b|\baapl\b|\bmsft\b|\bgoogl\b|\bamzn\b|\btsla\b/i, 'nasdaqdex'],
  [/dividen|dividend|s&p ?500|\bsp500\b|\bspx\b/i, 'snp500dex'],
  [/e-?commerce|shopee|\bsea ltd|lazada|tokopedia|marketplace/i, 'commercedex'],
  [/startup|unicorn|pendanaan (startup|seri)|funding round|series [abc]\b/i, 'startupdex'],
  [/venture capital|modal ventura|\bvc\b|investor startup/i, 'vcdex'],
  [/jaringan investor|co-?invest|sindikasi/i, 'vcnetworkdex'],
  [/profil perusahaan|company profile|open ?company|direksi perusahaan/i, 'opencompanydex'],
  [/\bgaji\b|salary|upah|kompensasi/i, 'salarydex'],
  [/biaya hidup|cost of living|harga sewa (kota|apartemen)|indeks biaya/i, 'costlivingdex'],
  [/rumah subsidi|perumahan (indonesia|subsidi)|pengembang (rumah|perumahan)|harga rumah (di )?(jakarta|bekasi|indonesia)|kpr/i, 'idhousingdex'],
  [/gofood|grabfood|shopeefood|pesan antar makanan|food delivery|ojek online makanan|markup (menu|harga makanan)/i, 'idfooddeliverydex'],
  [/kemiskinan|poverty|\bmpi\b|miskin multidimensi/i, 'povertydex'],
  [/populasi|population|kependudukan|demografi/i, 'populationdex'],
  [/tunawisma|homeless/i, 'homelessnessdex'],
  [/krisis perumahan|housing (crisis|news)|harga rumah global/i, 'housingdex'],
  [/fintech|dompet digital|e-?wallet|paylater|adopsi (aplikasi )?keuangan/i, 'fintechdex'],
  [/keuangan pribadi|personal finance|menabung|tabungan pribadi|utang pribadi|budgeting/i, 'personalfinandex'],
  [/\bemas\b|\bgold\b|minyak|\bwti\b|\boil\b|indeks (global|dunia)|nikkei|\bdax\b|ftse|hang seng|s&p.*nasdaq|nasdaq.*s&p/i, 'finandex-ai'],
];

const CLAUSE_SPLIT = /\s*(?:\+|;|\bdan juga\b|\bserta\b|\blalu\b|\bkemudian\b|\bplus\b|\band also\b|\bthen\b|,\s*(?:dan|and)\b)\s*/i;

/** Domain hits for a clause; a hit is skipped when the words that triggered it are covered by the open Dex itself
 *  (e.g. "Bitcoin" in Finandex AI, which has BTC-USD; "IHSG" in IDXDex, which computes beta vs IHSG). */
export function routeClause(text: string, open?: DexId): DexId[] {
  const hits: DexId[] = [];
  const own = open ? [getDex(open)!.name, ...getDex(open)!.keywords].map((k) => normaliseKey(k).trim()).filter((k) => k.length >= 3) : [];
  const wordIn = (needle: string, hay: string) => new RegExp(`(^|[^a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z0-9])`).test(hay);
  const covered = (m: string) => own.some((k) => wordIn(k, m) || wordIn(m, k));
  const legalIntent = /\bpasal\b|\buu\b|undang-undang|hukum|dilanggar|pidana|sanksi|ancaman/i.test(text);
  for (const [re, id] of DOMAIN_RULES) {
    if (hits.includes(id)) continue;
    const ms = [...text.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`))].map((m) => normaliseKey(m[0]).trim());
    if (!ms.length) continue;
    if (open && id !== open && !(legalIntent && (id === 'finlaiwyer' || id === 'mylaiwyer')) && ms.every(covered)) continue;
    hits.push(id);
  }
  return hits;
}

export function clauses(question: string): string[] {
  const parts = question.split(CLAUSE_SPLIT).map((s) => s.trim()).filter((s) => s.split(/\s+/).length >= 2);
  // A plain "dan"/"and" separates clauses only when both sides name a (different) domain.
  const out: string[] = [];
  for (const p of parts.length ? parts : [question]) {
    const bits = p.split(/\s+(?:dan|and)\s+/i);
    if (bits.length === 2 && bits.every((b) => b.split(/\s+/).length >= 2)) {
      const [x, y] = bits.map((b) => routeClause(b)[0]);
      if (x && y && x !== y) {
        out.push(...bits);
        continue;
      }
    }
    out.push(p);
  }
  return out;
}

/** Does the question (also) belong to the open Dex's domain? */
function inDomain(dex: DexId, question: string): boolean {
  const own = DOMAIN_RULES.filter(([, id]) => id === dex).some(([re]) => re.test(question));
  if (own) return true;
  const s = suggestDex(question, DEX_REGISTRY).find((x) => x.id === dex)?.score ?? 0;
  return s >= 3;
}

export function planDeterministic(question: string, open: DexId): Plan {
  const parts = clauses(question);
  const routed: { id: DexId; task: string }[] = [];
  const add = (id: DexId, task: string) => {
    const hit = routed.find((r) => r.id === id);
    if (hit) {
      if (!hit.task.includes(task)) hit.task = `${hit.task}; ${task}`;
    } else routed.push({ id, task });
  };
  for (const c of parts) {
    const hits = routeClause(c, open);
    // A clause that matches the open Dex stays with it; real multi-domain questions are split into clauses first.
    if (!hits.length || hits.includes(open)) add(open, c);
    // The first (most specific) domain owns the clause.
    else add(hits[0]!, c);
  }
  // The open Dex leads when it was routed and the question is in its domain (or nobody else was routed); a clause that
  // matched nothing is kept by the open Dex only in that case — otherwise the routed specialists answer alone.
  const others = routed.filter((r) => r.id !== open);
  const own = routed.find((r) => r.id === open);
  let agents = own && (!others.length || inDomain(open, question)) ? [own, ...others] : others;
  if (!agents.length) agents = [{ id: open, task: question }];
  agents = agents.slice(0, AGENT_LIMITS.maxSpecialists);
  if (agents.length === 1) agents[0] = { id: agents[0]!.id, task: question };
  const main = getDex(agents[0]!.id)!;
  return {
    intent: agents.length > 1 ? `${agents.length} domain: ${agents.map((a) => getDex(a.id)!.name).join(' + ')}` : `${main.name}`,
    agents: agents.map((a) => ({ id: a.id, task: a.task, inputs: {}, needs: [] })),
    parallel: agents.length > 1,
  };
}

const PLAN_TOOL = {
  name: 'submit_plan',
  description: 'Submit the plan: which specialist agents (Dex ids) handle which part of the question.',
  input_schema: {
    type: 'object',
    additionalProperties: false,
    required: ['intent', 'agents', 'parallel'],
    properties: {
      intent: { type: 'string' },
      parallel: { type: 'boolean' },
      agents: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['id', 'task'], properties: { id: { type: 'string', enum: DEX_REGISTRY.map((d) => d.id) }, task: { type: 'string' } } } },
    },
  },
};

/** AI Conductor plan (live mode): validated; falls back to the deterministic plan on any problem. */
export async function planWithModel(llm: Llm, question: string, open: DexId, signal: AbortSignal): Promise<Plan> {
  const base = planDeterministic(question, open);
  try {
    const catalogue = DEX_REGISTRY.map((d) => `${d.id}: ${d.name} — ${d.tagline.en}`).join('\n');
    const res = await llm.turn({
      system: `You are the Finandex Conductor. Split the user's question into at most ${AGENT_LIMITS.maxSpecialists} tasks for specialist agents (one per domain). The open Dex is "${open}" and leads when the question is in its domain. Call submit_plan exactly once.\nAgents:\n${catalogue}\nDeterministic suggestion: ${JSON.stringify(base.agents.map((a) => a.id))}`,
      tools: [PLAN_TOOL],
      messages: [{ role: 'user', content: question }],
      signal,
      onText: () => undefined,
      toolChoice: 'submit_plan',
    });
    const use = res.content.find((b) => b.type === 'tool_use' && (b as { name?: string }).name === 'submit_plan') as { input?: unknown } | undefined;
    const raw = (use?.input ?? {}) as { intent?: string; parallel?: boolean; agents?: { id: string; task: string }[] };
    const parsed = Plan.safeParse({ intent: raw.intent ?? base.intent, parallel: raw.parallel ?? base.parallel, agents: (raw.agents ?? []).map((a) => ({ ...a, inputs: {}, needs: [] })) });
    if (!parsed.success || parsed.data.agents.some((a) => !getDex(a.id))) return base;
    const seen = new Set<string>();
    const agents = parsed.data.agents.filter((a) => !seen.has(a.id) && seen.add(a.id)).slice(0, AGENT_LIMITS.maxSpecialists);
    return { ...parsed.data, agents, parallel: agents.length > 1 && parsed.data.parallel };
  } catch {
    return base;
  }
}
