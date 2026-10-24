// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Evidence Pane (§10.1, §10.6): the "Bukti" column of the chat — charts, tables, official quotations, guided-consultation
// steps, the deterministic "Kenapa jawabannya begini?" panel, citations, and the provenance legend ("Arti warna") for the
// selected answer. Separating AI narration from evidence is a Finandex signature.
import { clsx } from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AgentBadge, AgentTracePanel } from '../agents/AgentUi';
import type { AgentId } from '../../shared/agents';
import { CitationList } from '../../components/CitationCard';
import { ChartCard } from '../../components/chart/ChartCard';
import type { DexId } from '../../config/dex-registry';
import type { ChatMessage } from '../../lib/history';
import { tabForTool } from '../dex/panels';
import { MethodPanel } from './MethodPanel';

export function ProvenanceLegend() {
  const { t } = useTranslation();
  const items: [string, string][] = [
    ['var(--data)', t('prov.data')],
    ['var(--ai)', t('prov.ai')],
    ['var(--quote)', t('prov.quote')],
    ['var(--flag)', t('prov.flag')],
    ['var(--negative)', t('prov.negative')],
  ];
  return (
    <details className="rounded-xl border border-edge px-3 py-2 text-xs">
      <summary className="min-h-9 cursor-pointer content-center font-medium">{t('prov.title')}</summary>
      <ul className="mt-2 space-y-1">
        {items.map(([c, l]) => (
          <li key={l} className="flex items-center gap-2">
            <span aria-hidden className="h-3 w-3 shrink-0 rounded-full border border-edge" style={{ background: c }} />
            {l}
          </li>
        ))}
      </ul>
    </details>
  );
}

export function EvidencePane({ dex, msg, onAsk }: { dex: DexId; msg: ChatMessage | null; onAsk: (title: string) => void }) {
  const { t } = useTranslation();
  const [focus, setFocus] = useState<AgentId | null>(null);
  if (!msg) return <p className="text-sm text-ink-muted">{t('evidence.empty')}</p>;
  const artifacts = msg.artifacts ?? [];
  return (
    <div className="space-y-3">
      {artifacts.length === 0 && (msg.methods ?? []).length === 0 && <p className="text-sm text-ink-muted">{t('evidence.none')}</p>}
      {msg.agents && <AgentTracePanel trace={msg.agents} onFocus={setFocus} />}
      {artifacts.map((a, i) => {
        const tool = msg.artifactTools?.[i];
        const agent = (a as { agentId?: string }).agentId;
        const src = (agent ?? dex) as DexId;
        const tab = tool ? tabForTool(src, tool) : undefined;
        return (
          <div key={a.id} data-agent={agent} className={clsx('space-y-1 rounded-xl transition-opacity', focus && agent !== focus && 'opacity-40', focus && agent === focus && 'outline outline-2 outline-offset-2 outline-[var(--primary)]')}>
            {agent && <AgentBadge id={agent} />}
            <ChartCard artifact={a} onAsk={() => onAsk(a.title)} {...(tab ? { openTabHref: `/dex/${src}/${tab}` } : {})} />
          </div>
        );
      })}
      <MethodPanel methods={msg.methods ?? []} defaultOpen />
      <CitationList citations={msg.citations ?? []} />
      <ProvenanceLegend />
    </div>
  );
}
