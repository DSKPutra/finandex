// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Multi-agent orchestration (AGENTIC_AI_PROMPT §5): Guard (entrance) → Conductor plan → specialist agents (each runs the
// §8.3 tool loop with its own card limits; independent agents in parallel; ≤ 1 handoff) → Conductor composition →
// Verifier (every number/quote grounded in tool results, unverified claims removed while streaming) → Guard (exit).
// Tools stay read-only; in-app actions are only *proposed* (`proposed_action`) and run after the user confirms.
import { agentCard } from '../../src/config/agents';
import { DATA_NOTES } from '../../src/config/data-notes';
import ANTISCAM_KB from '../../kit/datasets/antiscam/antiscam_kb.json';
import { getDex } from '../../src/config/dex-registry';
import type { DexId } from '../../src/config/dex-registry';
import { tabForTool } from '../../src/features/dex/panels';
import { AGENT_LIMITS, isDexAgent } from '../../src/shared/agents';
import type { AgentId, AgentPhase, AgentResult, Fact, Plan, ProposedAction } from '../../src/shared/agents';
import { LIMITS } from '../../src/shared/chat-protocol';
import type { ChatRequest, Citation, Method, SseEvent } from '../../src/shared/chat-protocol';
import type { Locale } from '../../src/config/brand';
import { toolsFor } from '../dex/index';
import type { Block, Llm } from '../chat/llm';
import { systemPrompt } from '../chat/prompts';
import { apiSchema, modelCopy, tr } from '../tools/kit';
import type { ToolCtx, ToolDef, ToolResult } from '../tools/kit';
import { ADVICE_NOTE, INJECTION_NOTE, inboundCheck, outboundUnit } from './guard';
import { planDeterministic, planWithModel } from './planner';
import { loadSkill, pickSkill, skillCatalogue } from './skills';
import { ClaimGate, collectEvidence, questionNumbers } from './verifier';
import type { Evidence } from './verifier';
import type { OrchestratorDeps } from '../chat/orchestrator';

type Emit = (e: SseEvent) => void;
type Msg = { role: 'user' | 'assistant'; content: unknown };

export type AgentRun = {
  agentId: DexId;
  task: string;
  text: string;
  toolsUsed: string[];
  tokens: number;
  usage: { input_tokens: number; output_tokens: number };
  facts: Fact[];
  methods: Method[];
  artifactIds: string[];
  citations: Citation[];
  openDex: { dexId: DexId; reason: string }[];
  entities: string[];
  channels: { label: string; url: string }[];
  skill: string | null;
  status: 'ok' | 'timeout' | 'error';
  elapsed: number;
};

/** Official channels (names, phones, URLs) from the AntiScamDex knowledge base — numbers such as 112 or 131. */
const CHANNEL_EVIDENCE = (ANTISCAM_KB as { channels?: unknown }).channels ?? [];

const LOAD_SKILL_TOOL = { name: 'load_skill', description: 'Load the step-by-step procedure of one of your skills (by id) before a multi-step task.', input_schema: { type: 'object', additionalProperties: false, required: ['skill_id'], properties: { skill_id: { type: 'string' } } } };

const label = (L: Locale, id: string, en: string) => (L === 'id' ? id : en);
const agentName = (id: AgentId) => agentCard(id)?.name ?? id;

/** Numeric leaves of a tool result with their key path (labels for AgentResult facts). */
function factsOf(data: unknown, toolCallId: string, asOf: string, source: string, cap = 40): Fact[] {
  const out: Fact[] = [];
  const walk = (v: unknown, path: string) => {
    if (out.length >= cap) return;
    if (typeof v === 'number' && Number.isFinite(v)) out.push({ value: v, unit: null, asOf, source, toolCallId, label: path });
    else if (Array.isArray(v)) v.slice(0, 20).forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, path ? `${path}.${k}` : k);
  };
  walk(data, '');
  return out;
}

function withDeadline<T>(p: Promise<T>, ms: number, ctrl: AbortController): Promise<T | 'timeout'> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      ctrl.abort();
      resolve('timeout');
    }, Math.max(1, ms));
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e: unknown) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

type RunOpts = {
  req: ChatRequest;
  deps: OrchestratorDeps;
  emit: Emit;
  evidence: Evidence;
  messages: Msg[];
  task: string;
  onText?: (delta: string) => void;
  signal: AbortSignal;
  live: boolean;
  /** Absolute deadline (deps.now clock) — the loop stops with a note when it is passed (§5.6). */
  deadline: number;
};

/** One specialist agent: the §8.3 tool loop bounded by its card limits. Never throws for tool errors. */
export async function runAgent(agent: DexId, o: RunOpts): Promise<AgentRun> {
  const now = o.deps.now ?? Date.now;
  const t0 = now();
  const L = o.req.locale;
  const card = agentCard(agent);
  const llm: Llm = o.deps.llmFor ? o.deps.llmFor(agent) : o.deps.llm;
  const run: AgentRun = { agentId: agent, task: o.task, text: '', toolsUsed: [], tokens: 0, usage: { input_tokens: 0, output_tokens: 0 }, facts: [], methods: [], artifactIds: [], citations: [], openDex: [], entities: [], channels: [], skill: null, status: 'ok', elapsed: 0 };
  const status = (phase: AgentPhase, text: string, extra: { tool?: string; skill?: string } = {}) => o.emit({ event: 'agent_status', data: { agentId: agent, phase, label: text, ...extra } });
  o.emit({ event: 'agent_start', data: { agentId: agent, task: o.task.slice(0, 300), model: o.live ? (card?.model ?? llm.model) : llm.model } });

  // App-provided facts the agent may state: registry sample label, data notes, official channel directory.
  const entry = getDex(agent)!;
  collectEvidence([entry.sample, DATA_NOTES[agent], CHANNEL_EVIDENCE], o.evidence);
  const tools = toolsFor(agent, o.deps.store);
  const manifest = await o.deps.manifest().catch(() => null);
  const ctx: ToolCtx = { dex: agent, locale: L, store: o.deps.store, manifest: o.deps.manifest, distribution: o.deps.distribution, appVersion: o.deps.appVersion };
  const specs = tools.map((t) => ({ name: t.name, description: t.description, input_schema: apiSchema(t.input) }));
  if (o.live) specs.push(LOAD_SKILL_TOOL);
  const system = systemPrompt(agent, L, manifest) + (o.live ? skillCatalogue(agent) : '');

  // Data/mock mode: the runner chooses the skill (the model chooses it itself with load_skill in live mode).
  if (!o.live) {
    const sk = pickSkill(agent, o.task);
    if (sk) {
      run.skill = sk.id;
      status('loading_skill', label(L, `Memuat keahlian: ${sk.title}`, `Loading skill: ${sk.title}`), { skill: sk.id });
    }
  }
  status('planning', label(L, 'Merencanakan langkah…', 'Planning steps…'));
  const messages = o.messages.slice();
  const maxTurns = Math.min(card?.limits.maxTurns ?? AGENT_LIMITS.maxTurns, LIMITS.turns);
  const maxTools = Math.min(card?.limits.maxTools ?? AGENT_LIMITS.maxTools, LIMITS.toolCallsPerRequest);
  let calls = 0;
  let wrote = false;
  for (let turn = 1; turn <= maxTurns; turn++) {
    const res = await llm.turn({
      system,
      tools: specs,
      messages,
      signal: o.signal,
      onText: (d) => {
        if (!wrote) {
          wrote = true;
          status('writing', label(L, 'Menulis jawaban…', 'Writing the answer…'));
        }
        run.text += d;
        o.onText?.(d);
      },
    });
    run.usage.input_tokens += res.usage.input_tokens;
    run.usage.output_tokens += res.usage.output_tokens;
    if (res.stop_reason === 'refusal') {
      const t = tr(L, '\n\nMaaf, saya tidak dapat membantu permintaan ini.', '\n\nSorry, I cannot help with this request.');
      run.text += t;
      o.onText?.(t);
      break;
    }
    const uses = res.content.filter((b): b is Extract<Block, { type: 'tool_use' }> => b.type === 'tool_use');
    if (res.stop_reason !== 'tool_use' || !uses.length) break;
    messages.push({ role: 'assistant', content: res.content });
    const results: { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean }[] = [];
    for (const use of uses) {
      if (use.name === 'load_skill') {
        const id = String((use.input as { skill_id?: string })?.skill_id ?? '');
        const body = loadSkill(agent, id);
        if (body) {
          run.skill = id;
          status('loading_skill', label(L, `Memuat keahlian: ${id}`, `Loading skill: ${id}`), { skill: id });
        }
        results.push({ type: 'tool_result', tool_use_id: use.id, content: body ?? `Unknown skill "${id}".`, ...(body ? {} : { is_error: true }) });
        continue;
      }
      if (calls >= maxTools) {
        results.push({ type: 'tool_result', tool_use_id: use.id, is_error: true, content: 'Tool-call limit reached for this agent; answer with the data already retrieved.' });
        continue;
      }
      calls++;
      const def = tools.find((t) => t.name === use.name);
      const toolLabel = def ? def.label[L] : use.name;
      o.emit({ event: 'status', data: { code: 'tool', tool: use.name, label: toolLabel } });
      status('calling_tool', toolLabel, { tool: use.name });
      const { runTool } = await import('../chat/orchestrator');
      const out = await runTool(tools as ToolDef[], use, ctx);
      if ('error' in out) {
        o.deps.log?.({ dex: agent, tool: use.name, error: true });
        results.push({ type: 'tool_result', tool_use_id: use.id, is_error: true, content: out.error! });
        continue;
      }
      const r: ToolResult = out.result!;
      status('reading_data', label(L, `Membaca hasil ${use.name}`, `Reading ${use.name} results`), { tool: use.name });
      run.toolsUsed.push(use.name);
      collectEvidence([r.data, ...(r.ui ?? []).map((a) => a.spec)], o.evidence);
      for (const a of r.ui ?? []) {
        run.artifactIds.push(a.id);
        o.emit({ event: 'artifact', data: { ...a, agentId: agent } });
      }
      if (r.method) {
        run.methods.push(r.method);
        o.emit({ event: 'method', data: { ...r.method, agentId: agent } });
        const ent = (r.method.inputs as { id?: unknown; ticker?: unknown }).id ?? (r.method.inputs as { ticker?: unknown }).ticker;
        if (typeof ent === 'string' && ent.length <= 24) run.entities.push(ent);
      }
      for (const c of r.citations ?? []) run.citations.push(c);
      run.facts.push(...factsOf(r.data, use.id, r.method?.as_of ?? manifest?.dex[agent]?.as_of ?? '', r.method?.dataset ?? agent, 40 - run.facts.length));
      if (use.name === 'open_dex') {
        const d = r.data as { dexId?: DexId; reason?: string };
        if (d.dexId && getDex(d.dexId)) run.openDex.push({ dexId: d.dexId, reason: d.reason ?? '' });
      }
      if (use.name === 'channel_directory') {
        for (const c of ((r.data as { channels?: { name: string; url: string | null }[] }).channels ?? []).filter((x) => x.url).slice(0, 2)) run.channels.push({ label: c.name, url: c.url! });
      }
      results.push({ type: 'tool_result', tool_use_id: use.id, content: modelCopy(r.data, LIMITS.modelCopyBytes) });
    }
    messages.push({ role: 'user', content: results });
    if (now() > o.deadline) {
      const note = tr(L, '\n\n(Waktu habis — jawaban dihentikan. Silakan persempit pertanyaan.)', '\n\n(Time limit reached — answer stopped. Please narrow the question.)');
      run.text += note;
      o.onText?.(note);
      run.status = 'timeout';
      break;
    }
  }
  run.tokens = run.usage.input_tokens + run.usage.output_tokens;
  run.elapsed = now() - t0;
  return run;
}

function resultOf(r: AgentRun): AgentResult {
  return {
    agentId: r.agentId,
    summary: r.text.replace(/\s+/g, ' ').trim().slice(0, 280),
    facts: r.facts,
    artifacts: r.artifactIds,
    method: r.methods.map((m) => m.tool),
    citations: r.citations.map((c) => (c.ref ? `${c.ref.doc_id}${c.ref.pasal ? ` Pasal ${c.ref.pasal}` : ''}` : c.dataset)),
    flags: [...new Set(r.methods.flatMap((m) => m.flags))].concat(r.status === 'ok' ? [] : [r.status]),
    confidence: r.status !== 'ok' ? 'partial' : r.facts.length || r.citations.length ? 'data' : r.text ? 'partial' : 'none',
  };
}

/** Facts with the same label + date from different agents that disagree (> 0.5 %) — shown side by side, never averaged. */
export function conflicts(runs: AgentRun[]): { label: string; a: { agent: AgentId; value: number; source: string }; b: { agent: AgentId; value: number; source: string } }[] {
  const out: ReturnType<typeof conflicts> = [];
  const key = (f: Fact) => `${(f.label ?? '').replace(/\[\d+\]/g, '').split('.').pop()}|${f.asOf}`;
  for (let i = 0; i < runs.length; i++)
    for (let j = i + 1; j < runs.length; j++)
      for (const fa of runs[i]!.facts)
        for (const fb of runs[j]!.facts) {
          if (key(fa) !== key(fb) || !fa.label || !/(close|rate|value|kurs|price|usd_idr|idr)/i.test(fa.label)) continue;
          if (fa.value !== 0 && Math.abs(fa.value - fb.value) / Math.abs(fa.value) > 0.005 && out.length < 3) out.push({ label: key(fa).split('|')[0]!, a: { agent: runs[i]!.agentId, value: fa.value, source: fa.source }, b: { agent: runs[j]!.agentId, value: fb.value, source: fb.source } });
        }
  return out;
}

function proposals(runs: AgentRun[], L: Locale): ProposedAction[] {
  const out: ProposedAction[] = [];
  let n = 0;
  const id = () => `act-${++n}`;
  for (const r of runs) {
    const dex = getDex(r.agentId)!;
    const lastTool = r.toolsUsed.at(-1);
    const tab = lastTool ? tabForTool(r.agentId, lastTool) : undefined;
    if (tab) out.push({ id: id(), agentId: r.agentId, kind: 'open_tab', label: label(L, `Buka tab ${dex.tabs.find((t) => t.id === tab)?.label.id ?? tab} di ${dex.name}`, `Open ${dex.tabs.find((t) => t.id === tab)?.label.en ?? tab} in ${dex.name}`), dex: r.agentId, tab });
    const ent = r.entities[0];
    if (ent) {
      out.push({ id: id(), agentId: r.agentId, kind: 'add_compare', label: label(L, `Tambahkan ${ent} ke Baki Banding`, `Add ${ent} to the compare tray`), dex: r.agentId, entity: ent });
      out.push({ id: id(), agentId: r.agentId, kind: 'add_watchlist', label: label(L, `Tambahkan ${ent} ke watchlist`, `Add ${ent} to the watchlist`), dex: r.agentId, entity: ent });
    }
    for (const c of r.channels) out.push({ id: id(), agentId: r.agentId, kind: 'open_channel', label: label(L, `Buka kanal resmi: ${c.label}`, `Open official channel: ${c.label}`), url: c.url });
    for (const d of r.openDex) out.push({ id: id(), agentId: r.agentId, kind: 'open_dex', label: label(L, `Buka ${getDex(d.dexId)!.name}`, `Open ${getDex(d.dexId)!.name}`), dex: d.dexId });
  }
  return out.slice(0, 4);
}

/** Entry point used by /api/chat: the full agentic pipeline (§5). */
export async function orchestrateAgents(req: ChatRequest, deps: OrchestratorDeps, emit: Emit, signal: AbortSignal, requestId: string): Promise<void> {
  const now = deps.now ?? Date.now;
  const t0 = now();
  const L = req.locale;
  const manifest = await deps.manifest().catch(() => null);
  const dex = getDex(req.dex)!;
  emit({ event: 'meta', data: { requestId, dex: req.dex, as_of: manifest?.dex[req.dex]?.as_of ?? dex.asOf, model: deps.llm.model, agents: true } });
  const last = req.messages.at(-1)!;
  const live = deps.live === true;

  // 1. Guard — entrance.
  emit({ event: 'agent_start', data: { agentId: 'guard', task: label(L, 'Memeriksa pesan masuk', 'Checking the incoming message'), model: 'deterministic' } });
  emit({ event: 'agent_status', data: { agentId: 'guard', phase: 'verifying', label: label(L, 'Pindai data sensitif & kebijakan', 'Scanning sensitive data & policy') } });
  const inbound = inboundCheck(last.content);
  emit({ event: 'agent_done', data: { agentId: 'guard', elapsed_ms: now() - t0, tools_used: ['pii_scan', 'policy_check'], tokens: 0 } });
  if (inbound.flags.includes('sensitive')) {
    const { SENSITIVE_REPLY, SENSITIVE_LAW_NOTE } = await import('../chat/orchestrator');
    const law = req.dex === 'antiscamdex' || req.dex === 'finlaiwyer' || req.dex === 'mylaiwyer';
    emit({ event: 'text', data: { delta: SENSITIVE_REPLY[L] + (law ? SENSITIVE_LAW_NOTE[L] : '') } });
    emit({ event: 'done', data: { usage: { input_tokens: 0, output_tokens: 0 }, tools_used: [], elapsed_ms: now() - t0 } });
    return;
  }

  // 2. Conductor — plan.
  emit({ event: 'status', data: { code: 'thinking', label: tr(L, 'Berpikir…', 'Thinking…') } });
  emit({ event: 'agent_start', data: { agentId: 'conductor', task: last.content.slice(0, 300), model: live ? (agentCard('conductor')?.model ?? deps.llm.model) : deps.llm.model } });
  emit({ event: 'agent_status', data: { agentId: 'conductor', phase: 'planning', label: label(L, 'Menyusun rencana', 'Making a plan') } });
  const plan: Plan = live ? await planWithModel(deps.llm, last.content, req.dex, signal) : planDeterministic(last.content, req.dex);
  emit({ event: 'plan', data: { intent: plan.intent, agents: plan.agents.map((a) => ({ id: a.id as AgentId, task: a.task })), parallel: plan.parallel } });

  // Conversation for specialists: earlier turns + the task (single agent: the user's own words, with screen context).
  const history: Msg[] = req.messages.slice(0, -1).map((m) => ({ role: m.role, content: m.content }));
  const userTurn = (task: string): Msg => {
    const parts: { type: 'text'; text: string }[] = [{ type: 'text', text: task }];
    if (req.context) {
      const c = req.context;
      const note = [c.entity && `entity: ${c.entity}`, c.view && `view: ${c.view}`, c.period && `period: ${c.period.start ?? '…'} → ${c.period.end ?? '…'}`].filter(Boolean).join('; ');
      if (note) parts.push({ type: 'text', text: `[Screen context — ${note}]` });
    }
    if (inbound.flags.includes('injection')) parts.push({ type: 'text', text: INJECTION_NOTE });
    return { role: 'user', content: parts.length === 1 ? task : parts };
  };

  const evidence: Evidence = { numbers: [], texts: [] };
  const verifierStart = () => emit({ event: 'agent_start', data: { agentId: 'verifier', task: label(L, 'Memeriksa angka & kutipan', 'Checking numbers & quotations'), model: 'deterministic' } });
  let verifierStarted = false;
  const outFlags = new Set<string>();
  const gate = new ClaimGate(
    () => evidence,
    questionNumbers(req.messages.filter((m) => m.role === 'user').map((m) => m.content).join(' ')),
    (unit) => {
      const o = outboundUnit(unit, L);
      for (const f of o.flags) outFlags.add(f);
      if (o.text) emit({ event: 'text', data: { delta: o.text } });
    },
  );
  const pushText = (d: string) => {
    if (!verifierStarted) {
      verifierStarted = true;
      verifierStart();
    }
    gate.push(d);
  };

  const deadline = t0 + deps.deadlineMs;
  const runs: AgentRun[] = [];
  const single = plan.agents.length === 1;
  const runOne = async (id: DexId, task: string, stream: boolean): Promise<AgentRun> => {
    const ctrl = new AbortController();
    signal.addEventListener('abort', () => ctrl.abort());
    const budget = Math.min(agentCard(id)?.limits.timeoutMs ?? AGENT_LIMITS.timeoutMs, deadline - now());
    const p = runAgent(id, { req, deps, emit, evidence, messages: [...history, userTurn(task)], task, signal: ctrl.signal, live, deadline, ...(stream ? { onText: pushText } : {}) });
    const startedAt = now();
    try {
      const r = await withDeadline(p, single ? Math.max(1_000, deps.deadlineMs) : Math.max(1, budget), ctrl);
      if (r === 'timeout') return { agentId: id, task, text: '', toolsUsed: [], tokens: 0, usage: { input_tokens: 0, output_tokens: 0 }, facts: [], methods: [], artifactIds: [], citations: [], openDex: [], entities: [], channels: [], skill: null, status: 'timeout', elapsed: now() - startedAt };
      return r;
    } catch (e) {
      if (signal.aborted) throw e;
      deps.log?.({ requestId, agent: id, error: (e as Error).message });
      return { agentId: id, task, text: '', toolsUsed: [], tokens: 0, usage: { input_tokens: 0, output_tokens: 0 }, facts: [], methods: [], artifactIds: [], citations: [], openDex: [], entities: [], channels: [], skill: null, status: 'error', elapsed: now() - startedAt };
    }
  };
  const finish = (r: AgentRun) => {
    const res = resultOf(r);
    emit({ event: 'agent_result', data: { ...res, facts: res.facts.length } });
    emit({ event: 'agent_done', data: { agentId: r.agentId, elapsed_ms: r.elapsed, tools_used: r.toolsUsed, tokens: r.tokens } });
  };

  // 3. Specialists — the single main agent streams; several agents run in parallel and the Conductor composes.
  if (single) {
    // Delegated to another Dex than the open one: say who answers.
    if (plan.agents[0]!.id !== req.dex) pushText(`**${agentName(plan.agents[0]!.id as AgentId)}**\n\n`);
    const r = await runOne(plan.agents[0]!.id as DexId, plan.agents[0]!.task, true);
    runs.push(r);
    finish(r);
  } else {
    emit({ event: 'agent_status', data: { agentId: 'conductor', phase: 'planning', label: label(L, `Mendelegasikan ke ${plan.agents.length} agen`, `Delegating to ${plan.agents.length} agents`) } });
    const settled = plan.parallel ? await Promise.all(plan.agents.map((a) => runOne(a.id as DexId, a.task, false))) : [];
    if (!plan.parallel) for (const a of plan.agents) settled.push(await runOne(a.id as DexId, a.task, false));
    for (const r of settled) {
      runs.push(r);
      finish(r);
    }
  }

  // 4. One handoff (depth 1): an agent pointed to another Dex (open_dex) that is not in the plan yet.
  const ask = runs.flatMap((r) => r.openDex.map((o) => ({ from: r.agentId, ...o }))).find((o) => !runs.some((r) => r.agentId === o.dexId));
  if (ask && runs.length < AGENT_LIMITS.maxSpecialists && now() < deadline - 1000) {
    emit({ event: 'agent_handoff', data: { from: ask.from, to: ask.dexId, reason: ask.reason || label(L, 'Di luar domain agen ini', 'Outside this agent\'s domain') } });
    const r = await runOne(ask.dexId, last.content, false);
    runs.push(r);
    finish(r);
    if (r.text) {
      if (!verifierStarted) {
        verifierStarted = true;
        verifierStart();
      }
      gate.push(`\n\n**${agentName(r.agentId)}**\n\n`);
      gate.push(r.text);
    }
  }

  // 5. Conductor — composition (multi-agent): one section per agent, conflicts side by side, partial results labelled.
  emit({ event: 'agent_status', data: { agentId: 'conductor', phase: 'writing', label: label(L, 'Menggabungkan hasil agen', 'Merging agent results') } });
  if (!single) {
    const sections = runs.slice(0, plan.agents.length).filter((r) => r.text.trim());
    for (const [i, r] of sections.entries()) pushText(`${i ? '\n\n' : ''}**${agentName(r.agentId)}**\n\n${r.text.trim()}\n`);
  }
  const notes: string[] = [];
  for (const c of conflicts(runs))
    notes.push(label(L, `Dua sumber berbeda untuk ${c.label}: ${agentName(c.a.agent)} (${c.a.source}) dan ${agentName(c.b.agent)} (${c.b.source}) — keduanya ditampilkan, tidak dirata-rata.`, `Two sources differ for ${c.label}: ${agentName(c.a.agent)} (${c.a.source}) and ${agentName(c.b.agent)} (${c.b.source}) — both shown, not averaged.`));
  const pending = runs.filter((r) => r.status !== 'ok');
  if (pending.length) notes.push(label(L, `Sebagian agen belum selesai: ${pending.map((r) => agentName(r.agentId)).join(', ')}. Jawaban di atas parsial.`, `Some agents did not finish: ${pending.map((r) => agentName(r.agentId)).join(', ')}. The answer above is partial.`));
  if (inbound.flags.includes('advice')) notes.push(ADVICE_NOTE[L]);
  gate.flush();
  // 6. Verifier — result.
  if (!verifierStarted) verifierStart();
  emit({ event: 'agent_status', data: { agentId: 'verifier', phase: 'verifying', label: label(L, `${gate.stats.checked} angka/kutipan dicek`, `${gate.stats.checked} numbers/quotes checked`) } });
  if (gate.stats.removed) deps.log?.({ requestId, removed_claims: gate.stats.removedClaims });
  if (gate.stats.removed) notes.push(label(L, `${gate.stats.removed} klaim dihapus karena tidak dapat diverifikasi dari data.`, `${gate.stats.removed} claim(s) removed because they could not be verified from the data.`));
  emit({ event: 'verify', data: { passed: gate.stats.removed === 0, checked: gate.stats.checked, removed_claims: gate.stats.removed } });
  emit({ event: 'agent_done', data: { agentId: 'verifier', elapsed_ms: 0, tools_used: ['match_numbers', 'match_quotes'], tokens: 0 } });
  // Notes are fixed system text (no numbers from the model) — emitted after verification.
  if (notes.length) emit({ event: 'text', data: { delta: `\n\n${notes.map((n) => `_${n}_`).join('\n\n')}` } });
  if (outFlags.size) deps.log?.({ requestId, guard_exit: [...outFlags] });

  // 7. Proposed in-app actions (run only after the user confirms), citations, done.
  for (const a of proposals(runs.filter((r) => isDexAgent(r.agentId)), L)) emit({ event: 'proposed_action', data: a });
  const cites = new Map<string, Citation & { agentId: string }>();
  for (const r of runs) for (const c of r.citations) cites.set(JSON.stringify(c), { ...c, agentId: r.agentId });
  for (const c of cites.values()) emit({ event: 'citation', data: c });
  const usage = runs.reduce((u, r) => ({ input_tokens: u.input_tokens + r.usage.input_tokens, output_tokens: u.output_tokens + r.usage.output_tokens }), { input_tokens: 0, output_tokens: 0 });
  emit({ event: 'agent_done', data: { agentId: 'conductor', elapsed_ms: now() - t0, tools_used: ['delegate'], tokens: 0 } });
  const toolsUsed = runs.flatMap((r) => r.toolsUsed);
  deps.log?.({ requestId, dex: req.dex, agents: runs.map((r) => r.agentId), tools: toolsUsed, ...usage, ms: now() - t0 });
  emit({ event: 'done', data: { usage, tools_used: toolsUsed, elapsed_ms: now() - t0, ...(pending.length ? { partial: true } : {}) } });
}
