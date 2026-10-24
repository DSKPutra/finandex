// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Shared legal-text engine tools for My LAIwyer (corpus "umum") and FinLAIwyer (corpus "keuangan") — §8.5, §4.20, §4.28.
// Quotations come only from ingested official texts; catalogue summaries are always labelled; document status is
// always stated; penalties of sectoral laws are shown next to the UU 1/2026 cross-reference. Not legal advice.
import { z } from 'zod';
import { ALL_DOC_IDS, DOCS, FLOWS, LAW_DEX_CORPUS, LOCK, NOTES, datasetLabel, isAvailable, lockOf, statusBadge } from '../../../src/config/law-catalog';
import type { Corpus, LawDexId, LawDoc } from '../../../src/config/law-catalog';
import { GLOSSARY, GLOSSARY_LABEL, findGlossary } from '../../../src/config/law-glossary';
import type { LawChunk } from '../../../src/shared/law/analyse';
import { normaliseLaw } from '../../../src/shared/law/analyse';
import { back, getFlow, matchFlows, start, step, view } from '../../../src/shared/law/flow-engine';
import type { FlowState } from '../../../src/shared/law/flow-engine';
import type { Channel } from '../../../src/shared/law/kb';
import type { PenaltyAdjustments } from '../../../src/shared/law/penalty-adjust';
import { expandQuery, loadLawIndex } from '../../../src/shared/law/search';
import { artifact, defineTool, method, ToolError, tr } from '../../tools/kit';
import type { ToolCtx, ToolDef } from '../../tools/kit';
import type { Locale } from '../../../src/config/brand';

type Chunks = { doc_id: string; corpus: Corpus; pages: number; penjelasan_starts_page: number | null; missing_headings: number[]; chunks: LawChunk[] };
const AS_OF = 'per-document';
const other = (c: Corpus): Corpus => (c === 'umum' ? 'keuangan' : 'umum');
const doc = (id: string): LawDoc => {
  const d = DOCS.get(id);
  if (!d) throw new ToolError(`Unknown doc_id ${id}. Use list_sources to see the documents.`);
  return d;
};
const chunksOf = (ctx: ToolCtx, id: string) => ctx.store.json<Chunks>(`heavy/law/${doc(id).corpus}/${id}/chunks.json`);
const indexOf = async (ctx: ToolCtx, corpus: Corpus) => loadLawIndex(await ctx.store.text(`heavy/law/${corpus}/index.json`));
const cite = (dex: string, id: string, pasal?: string | null, page?: number) => ({ dex, dataset: datasetLabel(id), as_of: AS_OF, ref: { doc_id: id, ...(pasal ? { pasal } : {}), ...(page ? { page } : {}) } });
const src = (dex: string, id: string) => ({ dex, dataset: datasetLabel(id), as_of: AS_OF });

/** Fixed notes attached to a quotation (UUD original text, UU 1/2026 penalty adjustment). */
function notesFor(id: string, L: Locale): string | undefined {
  const out: string[] = [];
  if (id === 'uud-1945-naskah-asli') out.push(isAvailable('uud-nri-1945') ? NOTES.uud_both[L] : NOTES.uud_original[L]);
  if (id === 'uud-nri-1945') out.push(NOTES.uud_both[L]);
  if ((DOCS.get(id)?.penalty_adjusted_by ?? []).length) out.push(NOTES.penalty[L]);
  return out.length ? out.join(' ') : undefined;
}

function quoteArtifact(dex: LawDexId, L: Locale, c: LawChunk, text?: string) {
  const d = doc(c.doc_id);
  const n = notesFor(c.doc_id, L);
  const from = d.corpus !== LAW_DEX_CORPUS[dex] ? (dex === 'finlaiwyer' ? NOTES.from_mylaiwyer[L] : NOTES.from_finlaiwyer[L]) : undefined;
  return artifact(
    'quote',
    `${d.short}${c.pasal ? ` · ${c.pasal}` : ''}`,
    { type: 'quote', doc_id: c.doc_id, doc_title: d.title, pasal: c.pasal, page: c.page, text: (text ?? c.text).slice(0, 1600), badges: statusBadge(c.doc_id, L), ...(n ? { note: n } : {}), ...(from ? { from } : {}) },
    src(dex, c.doc_id),
  );
}

function summaryArtifact(dex: LawDexId, L: Locale, d: LawDoc, ref: string, summary: string) {
  const url = lockOf(d.id)?.url ?? d.official_pages[0] ?? d.pdf_candidates[0];
  return artifact('quote', `${d.short} · ${ref}`, { type: 'quote', doc_id: d.id, doc_title: d.title, pasal: ref, page: 0, text: summary, summary: true, note: NOTES.catalog_summary[L], badges: statusBadge(d.id, L), ...(url ? { url } : {}) }, src(dex, d.id));
}

export function extractAyat(text: string, n: number): string | null {
  const start = text.indexOf(`(${n})`);
  if (start < 0) return null;
  const next = text.indexOf(`(${n + 1})`, start + 3);
  return text.slice(start, next < 0 ? undefined : next).trim();
}

async function searchCorpus(ctx: ToolCtx, corpus: Corpus, query: string, opts: { docIds?: string[] | null; part?: string | null }) {
  const ix = await indexOf(ctx, corpus);
  const q = expandQuery(query);
  const hits: { id: string; doc_id: string; score: number }[] = [];
  for (const r of ix.search(q)) {
    const docId = String((r as unknown as { doc_id: string }).doc_id);
    if (opts.docIds?.length && !opts.docIds.includes(docId)) continue;
    const part = (r as unknown as { part: string }).part;
    if (opts.part === 'batang_tubuh' || opts.part === 'penjelasan') {
      if (part !== opts.part && part !== 'halaman') continue;
    } else if (opts.part === 'lampiran' && part !== 'halaman') continue;
    hits.push({ id: String(r.id), doc_id: docId, score: r.score * (part === 'halaman' ? 0.6 : 1) * (doc(docId).status === 'dicabut' ? 0.5 : 1) });
  }
  return hits.sort((a, b) => b.score - a.score);
}

async function chunkById(ctx: ToolCtx, docId: string, id: string): Promise<LawChunk | undefined> {
  const { chunks } = await chunksOf(ctx, docId);
  return chunks.find((c) => c.id === id);
}

async function findPasal(ctx: ToolCtx, docId: string, nomor: string) {
  const { chunks, missing_headings } = await chunksOf(ctx, docId);
  const label = /pasal/i.test(nomor) ? nomor.replace(/\s+/g, ' ').trim() : `Pasal ${nomor.trim()}`;
  const c = chunks.find((x) => x.part === 'batang_tubuh' && x.pasal?.toLowerCase() === label.toLowerCase());
  return { c, label, missing_headings };
}

async function channelsById(ctx: ToolCtx): Promise<Map<string, Channel>> {
  const { channels } = await ctx.store.json<{ channels: Channel[] }>('core/antiscam/channels.json');
  return new Map(channels.map((c) => [c.id, c]));
}

/** Render a flow position as `choices` (question) or `steps` (result) artifacts. */
async function flowArtifacts(dex: LawDexId, ctx: ToolCtx, state: FlowState) {
  const L = ctx.locale;
  const f = getFlow(FLOWS, state.flow_id);
  const v = view(f, state, L);
  const source = { dex, dataset: 'legal_qa_flows.json (Finandex)', as_of: String(FLOWS.meta.version ?? '2026-10-23') };
  if (v.node.type === 'question') {
    const n = v.node;
    return {
      view: v,
      ui: [artifact('choices', v.flow.title, { type: 'choices', flow_id: f.id, node_id: n.id, path: state.path, prompt: L === 'en' && n.prompt_en ? n.prompt_en : n.prompt, options: n.options.map((o, i) => ({ index: i, label: L === 'en' && o.label_en ? o.label_en : o.label })), trail: v.trail }, source)],
      data: { flow_id: f.id, node_id: n.id, path: state.path, question: n.prompt, options: n.options.map((o, i) => ({ choice_index: i, label: o.label })) },
    };
  }
  const r = v.node;
  const ch = await channelsById(ctx);
  const steps = r.steps.map((s) => ({
    text: L === 'en' && s.text_en ? s.text_en : s.text,
    urgent: s.urgent,
    channels: s.channels.map((id) => {
      const c = ch.get(id);
      return { id, name: c ? (L === 'en' && c.name_en ? c.name_en : c.name) : id, ...(c?.url ? { url: c.url } : {}), ...(c?.phone ? { phone: c.phone } : {}), ...(c?.whatsapp ? { whatsapp: c.whatsapp } : {}), ...(c?.email ? { email: c.email } : {}) };
    }),
  }));
  const bases = r.legal_bases.map((b) => ({ doc_id: b.doc_id, label: doc(b.doc_id).short, ref: b.ref, why: L === 'en' && b.why_en ? b.why_en : b.why, available: isAvailable(b.doc_id) }));
  return {
    view: v,
    ui: [
      artifact(
        'steps',
        L === 'en' && r.title_en ? r.title_en : r.title,
        { type: 'steps', steps, legal_bases: bases, notes: (L === 'en' && r.notes_en ? r.notes_en : r.notes) ?? [], open_dex: r.open_dex, flow: { flow_id: f.id, path: state.path }, trail: v.trail, ...(v.flow.disclaimer ? { disclaimer: v.flow.disclaimer } : {}) },
        source,
      ),
    ],
    data: {
      flow_id: f.id,
      result: r.id,
      title: r.title,
      steps: steps.map((s) => ({ text: s.text, urgent: s.urgent, channels: s.channels.map((c) => c.name) })),
      legal_bases: bases,
      next: tr(L, 'Panggil get_pasal/search_law/cross_reference untuk mengutip setiap dasar hukum yang tersedia.', 'Call get_pasal/search_law/cross_reference to quote each available legal basis.'),
    },
  };
}

export function lawTools(dex: LawDexId): ToolDef[] {
  const corpus = LAW_DEX_CORPUS[dex];
  const ids = ALL_DOC_IDS;
  const flowIds = FLOWS.flows.filter((f) => f.dex === dex).map((f) => f.id) as [string, ...string[]];
  const tools: ToolDef[] = [
    defineTool({
      name: 'list_sources',
      description: `Documents of this Dex's legal corpus ("${corpus}") with their status (available = official text ingested and verified; pending = waiting for the document; failed = failed verification) and validity (berlaku/dicabut/disesuaikan). Use first when unsure whether a law is covered.`,
      input: z.object({ status: z.enum(['available', 'pending', 'all']).nullable() }).strict(),
      label: { id: 'Membaca daftar sumber hukum…', en: 'Reading legal sources…' },
      run: async ({ status }, ctx) => {
        const { documents } = await ctx.store.json<{ documents: (Record<string, unknown> & { doc_id: string; available: boolean })[] }>(`core/law/${corpus}/documents.json`);
        const rows = documents.filter((d) => !status || status === 'all' || (status === 'available' ? d.available : !d.available));
        const L = ctx.locale;
        return {
          data: {
            corpus,
            documents: rows.map((d) => ({ doc_id: d.doc_id, short: d.short, title: d.title, status: d.status, available: d.available, pages: d.pages, effective: d.effective, badges: statusBadge(d.doc_id, L), supplement: d.supplement, reason: d.available ? null : (d.lock_reason ?? (d.source === 'catalog-only' ? 'catalog-only (riwayat)' : 'menunggu dokumen')) })),
            uud_note: corpus === 'umum' ? (isAvailable('uud-nri-1945') ? NOTES.uud_both[L] : NOTES.uud_original[L]) : null,
            counts: (() => {
              const cat = rows.filter((d) => !d.supplement);
              const sup = rows.filter((d) => d.supplement);
              return { total: rows.length, available: rows.filter((d) => d.available).length, pending: rows.filter((d) => !d.available).length, catalog: cat.length, catalog_available: cat.filter((d) => d.available).length, catalog_pending: cat.filter((d) => !d.available).length, supplement: sup.length, supplement_available: sup.filter((d) => d.available).length };
            })(),
          },
          ui: [
            artifact(
              'table',
              tr(L, 'Sumber hukum', 'Legal sources'),
              {
                type: 'table',
                columns: [
                  { key: 'doc', label: tr(L, 'Dokumen', 'Document') },
                  { key: 'status', label: tr(L, 'Status', 'Status') },
                  { key: 'text', label: tr(L, 'Teks resmi', 'Official text') },
                  { key: 'pages', label: tr(L, 'Hal.', 'Pages') },
                ],
                rows: rows.map((d) => ({ doc: String(d.short), status: statusBadge(d.doc_id, L).join(' · '), text: d.available ? tr(L, 'tersedia', 'available') : tr(L, 'menunggu dokumen', 'pending'), pages: (d.pages as number | null) ?? null })),
              },
              { dex, dataset: 'regulation_catalog.json + regulations.lock.json', as_of: AS_OF },
            ),
          ],
          method: method('list_sources', ['count'], { inputs: { corpus, status }, rows_used: rows.length, dataset: 'regulation_catalog.json + regulations.lock.json', as_of: LOCK.version, flags: rows.some((d) => (d as { supplement?: boolean }).supplement) ? ['includes_finandex_supplement'] : [] }),
          citations: rows.filter((d) => d.available).map((d) => cite(dex, d.doc_id)),
        };
      },
    }),
    defineTool({
      name: 'search_law',
      description: `BM25 search over the ingested official texts of the "${corpus}" corpus (per-article, explanation, and page chunks; light Indonesian synonyms). Returns original quotations with document, article, page, and status. Revoked documents are ranked lower and labelled.`,
      input: z
        .object({
          query: z.string().min(2).max(200),
          doc_ids: z.array(z.enum(ids)).nullable(),
          part: z.enum(['batang_tubuh', 'penjelasan', 'lampiran', 'both']).nullable(),
          limit: z.number().int().min(1).max(8).nullable(),
        })
        .strict(),
      label: { id: 'Mencari pasal yang relevan…', en: 'Searching relevant articles…' },
      run: async ({ query, doc_ids, part, limit }, ctx) => {
        const hits = await searchCorpus(ctx, corpus, query, { docIds: doc_ids, part });
        const out: { c: LawChunk; score: number }[] = [];
        for (const h of hits) {
          if (out.length >= (limit ?? 5)) break;
          const c = await chunkById(ctx, h.doc_id, h.id);
          if (!c || out.some((x) => x.c.doc_id === c.doc_id && x.c.pasal === c.pasal && x.c.page === c.page)) continue;
          out.push({ c, score: h.score });
        }
        if (!out.length) throw new ToolError('No matching text in the ingested documents of this corpus. The topic may be in a pending document (see list_sources) or in the other law Dex (cross_reference / open_dex).');
        const L = ctx.locale;
        return {
          data: {
            query,
            results: out.map(({ c, score }) => ({ doc_id: c.doc_id, document: doc(c.doc_id).short, status: statusBadge(c.doc_id, L), part: c.part, pasal: c.pasal, page: c.page, score: Math.round(score * 100) / 100, quote: c.text.slice(0, 700), note: notesFor(c.doc_id, L) ?? null })),
          },
          ui: out.slice(0, 3).map(({ c }) => quoteArtifact(dex, L, c, c.text.slice(0, 900))),
          method: method('search_law', ['bm25'], { inputs: { query, corpus, doc_ids, part }, rows_used: hits.length, dataset: `corpus ${corpus}`, as_of: AS_OF, flags: out.some((x) => x.c.doc_id === 'uu-20-2025-kuhap') ? ['ocr_text_uu_20_2025'] : [] }),
          citations: out.map(({ c }) => cite(dex, c.doc_id, c.pasal, c.page)),
        };
      },
    }),
    defineTool({
      name: 'get_pasal',
      description: 'Exact official text of one article (Pasal), optionally one paragraph (ayat), with document status. For documents whose text is pending, returns the labelled catalogue summary instead (never a quotation). Roman-numbered UUD articles: e.g. "Aturan Peralihan Pasal I".',
      input: z.object({ doc_id: z.enum(ids), nomor: z.string().min(1).max(40), ayat: z.number().int().min(1).max(40).nullable() }).strict(),
      label: { id: 'Mengambil teks pasal…', en: 'Fetching article text…' },
      run: async ({ doc_id, nomor, ayat }, ctx) => {
        const L = ctx.locale;
        const d = doc(doc_id);
        if (!isAvailable(doc_id)) {
          const kp = d.key_provisions.find((k) => k.ref.toLowerCase().includes(String(nomor).toLowerCase()));
          if (!kp) throw new ToolError(`The official text of ${d.short} is not available yet (status: menunggu dokumen) and the catalogue has no summary for ${nomor}. Say it is not available; do not answer from memory.`);
          return {
            data: { doc_id, document: d.short, available: false, ref: kp.ref, summary: kp.summary, label: NOTES.catalog_summary[L], status: statusBadge(doc_id, L) },
            ui: [summaryArtifact(dex, L, d, kp.ref, kp.summary)],
            method: method('get_pasal', [], { inputs: { doc_id, nomor }, rows_used: 0, dataset: 'regulation_catalog.json', as_of: AS_OF, flags: ['catalog_summary_not_quote'] }),
          };
        }
        const { c, label, missing_headings } = await findPasal(ctx, doc_id, nomor);
        if (!c) {
          const n = Number(nomor);
          throw new ToolError(missing_headings.includes(n) ? `The heading of Pasal ${n} was not detected in the OCR text; use search_law or open_page to cite the page.` : `${label} not found in ${d.short}.`);
        }
        const text = ayat ? extractAyat(c.text, ayat) : c.text;
        if (ayat && !text) throw new ToolError(`Ayat (${ayat}) not found in ${label}.`);
        let adjustment: unknown = null;
        if ((d.penalty_adjusted_by ?? []).length) {
          try {
            const adj = await ctx.store.json<PenaltyAdjustments>('heavy/law/penalty_adjustments.json');
            adjustment = { note: NOTES.penalty[L], uu_1_2026_pages: (adj.by_doc[doc_id] ?? []).map((r) => r.page) };
          } catch {
            adjustment = { note: NOTES.penalty[L], uu_1_2026_pages: [] };
          }
        }
        return {
          data: { doc_id, document: d.short, title: d.title, status: statusBadge(doc_id, L), pasal: c.pasal, ayat, page: c.page, text, note: notesFor(doc_id, L) ?? null, penalty_adjustment: adjustment },
          ui: [quoteArtifact(dex, L, c, text!)],
          method: method('get_pasal', [], { inputs: { doc_id, nomor, ayat }, rows_used: 1, dataset: datasetLabel(doc_id), as_of: AS_OF, flags: adjustment ? ['penalty_adjusted_uu_1_2026'] : [] }),
          citations: [cite(dex, doc_id, c.pasal, c.page)],
        };
      },
    }),
    defineTool({
      name: 'get_penjelasan',
      description: 'Official explanation (PENJELASAN) of one article, when the document has one.',
      input: z.object({ doc_id: z.enum(ids), nomor: z.string().min(1).max(40) }).strict(),
      label: { id: 'Mengambil penjelasan…', en: 'Fetching explanation…' },
      run: async ({ doc_id, nomor }, ctx) => {
        if (!isAvailable(doc_id)) throw new ToolError(`${doc(doc_id).short}: official text not available yet.`);
        const { chunks } = await chunksOf(ctx, doc_id);
        const label = /pasal/i.test(nomor) ? nomor : `Pasal ${nomor}`;
        const c = chunks.find((x) => x.part === 'penjelasan' && x.pasal?.toLowerCase() === label.toLowerCase());
        if (!c) throw new ToolError(`No explanation found for ${label} (it may be "Cukup jelas" or explained in general terms, or the heading was not detected).`);
        return { data: { doc_id, pasal: c.pasal, page: c.page, text: c.text }, ui: [quoteArtifact(dex, ctx.locale, c)], citations: [cite(dex, doc_id, c.pasal, c.page)] };
      },
    }),
    defineTool({
      name: 'regulation_status',
      description: 'Is a regulation still in force? What amends/revokes it, when is it effective, and are its criminal penalties adjusted by UU 1/2026 (with the pages of the UU 1/2026 annex that list it)? Accepts a doc_id or a free-text query (e.g. "PBI 3/2023").',
      input: z.object({ doc_id: z.enum(ids).nullable(), query: z.string().min(2).max(120).nullable() }).strict(),
      label: { id: 'Memeriksa status peraturan…', en: 'Checking regulation status…' },
      run: async ({ doc_id, query }, ctx) => {
        const L = ctx.locale;
        let d: LawDoc | undefined = doc_id ? doc(doc_id) : undefined;
        if (!d && query) {
          const q = query.toLowerCase().replace(/\s+/g, ' ');
          const nums = q.match(/\d+/g) ?? [];
          d = [...DOCS.values()].find((x) => x.short.toLowerCase() === q) ?? [...DOCS.values()].find((x) => nums.length >= 2 && nums.every((n) => `${x.number ?? ''} ${x.year ?? ''} ${x.short}`.toLowerCase().includes(n)) && (q.includes(x.type.toLowerCase()) || x.short.toLowerCase().split(/\W+/).some((w) => w.length > 2 && q.includes(w))));
        }
        if (!d) throw new ToolError('Regulation not found in the catalogue. Use list_sources to see the documents.');
        const rel = (ids: string[], relation: 'amends' | 'amended_by' | 'revokes' | 'revoked_by') => ids.map((r) => ({ date: DOCS.get(r)?.effective ?? (DOCS.get(r)?.year ? String(DOCS.get(r)!.year) : null), label: DOCS.get(r)?.short ?? r, doc_id: r, relation, status: statusBadge(r, L).join(' · ') }));
        let adj: { page: number; in_lampiran: boolean; excerpt: string }[] = [];
        if ((d.penalty_adjusted_by ?? []).length) {
          try {
            adj = (await ctx.store.json<PenaltyAdjustments>('heavy/law/penalty_adjustments.json')).by_doc[d.id] ?? [];
          } catch {
            adj = [];
          }
        }
        const items = [
          { date: d.effective ?? (d.year ? String(d.year) : null), label: d.short, doc_id: d.id, relation: 'self' as const, status: statusBadge(d.id, L).join(' · ') },
          ...rel(d.amends, 'amends'),
          ...rel(d.amended_by, 'amended_by'),
          ...rel(d.revokes, 'revokes'),
          ...rel(d.revoked_by, 'revoked_by'),
          ...(d.penalty_adjusted_by ?? []).map((r) => ({ date: DOCS.get(r)?.effective ?? '2026-01-02', label: DOCS.get(r)?.short ?? r, doc_id: r, relation: 'adjusted_by' as const, status: tr(L, 'menyesuaikan ancaman pidana', 'adjusts criminal penalties') })),
        ];
        return {
          data: {
            doc_id: d.id,
            title: d.title,
            short: d.short,
            status: d.status,
            badges: statusBadge(d.id, L),
            effective: d.effective,
            text_available: isAvailable(d.id),
            amends: d.amends,
            amended_by: d.amended_by,
            revokes: d.revokes,
            revoked_by: d.revoked_by,
            penalty_adjusted_by: d.penalty_adjusted_by ?? [],
            penalty_note: (d.penalty_adjusted_by ?? []).length ? NOTES.penalty[L] : null,
            uu_1_2026_references: adj.map((a) => ({ page: a.page, in_lampiran: a.in_lampiran, excerpt_ocr: a.excerpt })),
            official: lockOf(d.id)?.url ?? d.official_pages[0] ?? null,
            notes: d.notes,
          },
          ui: [artifact('timeline', `${d.short} — ${tr(L, 'status & perubahan', 'status & changes')}`, { type: 'timeline', items }, { dex, dataset: 'regulation_catalog.json', as_of: AS_OF })],
          method: method('regulation_status', [], { inputs: { doc_id: d.id }, rows_used: items.length, dataset: 'regulation_catalog.json + regulations.lock.json', as_of: AS_OF, flags: adj.length ? ['uu_1_2026_annex_ocr'] : [] }),
          citations: [cite(dex, d.id)],
        };
      },
    }),
    defineTool({
      name: 'cross_reference',
      description: `Fetch an article from the OTHER law corpus ("${other(corpus)}") — e.g. ${corpus === 'keuangan' ? 'KUHP (UU 1/2023) Pasal 492 on fraud, UU 1/2026, KUHPerdata, PERMA gugatan sederhana, UU Bantuan Hukum' : 'UU Transfer Dana, UU ITE, UU PDP, POJK 22/2023'}. The quotation is labelled with its source Dex.`,
      input: z.object({ doc_id: z.enum(ids), nomor: z.string().min(1).max(40) }).strict(),
      label: { id: 'Mengambil pasal dari corpus lain…', en: 'Fetching an article from the other corpus…' },
      run: async ({ doc_id, nomor }, ctx) => {
        const d = doc(doc_id);
        if (!isAvailable(doc_id)) throw new ToolError(`${d.short}: official text not available yet (menunggu dokumen).`);
        const { c, label } = await findPasal(ctx, doc_id, nomor);
        if (!c) throw new ToolError(`${label} not found in ${d.short}.`);
        return {
          data: { doc_id, document: d.short, corpus: d.corpus, from: d.corpus === 'umum' ? NOTES.from_mylaiwyer[ctx.locale] : NOTES.from_finlaiwyer[ctx.locale], status: statusBadge(doc_id, ctx.locale), pasal: c.pasal, page: c.page, text: c.text },
          ui: [quoteArtifact(dex, ctx.locale, c)],
          method: method('cross_reference', [], { inputs: { doc_id, nomor }, rows_used: 1, dataset: datasetLabel(doc_id), as_of: AS_OF, flags: ['cross_corpus'] }),
          citations: [cite(dex, doc_id, c.pasal, c.page)],
        };
      },
    }),
    defineTool({
      name: 'start_flow',
      description: `Guided Consultation (§8.10): without flow_id, list the flows that match the user's situation (pass the user's words as question); with flow_id, return its first question as choice chips. Flows for this Dex: ${flowIds.join(', ')}.`,
      input: z.object({ flow_id: z.enum(flowIds).nullable(), question: z.string().max(400).nullable() }).strict(),
      label: { id: 'Menyiapkan konsultasi terpandu…', en: 'Preparing guided consultation…' },
      run: async ({ flow_id, question }, ctx) => {
        const L = ctx.locale;
        if (!flow_id) {
          const all = FLOWS.flows.filter((f) => f.dex === dex);
          const ranked = question ? matchFlows(FLOWS, dex, question) : [];
          const order = [...ranked.map((r) => r.id), ...all.map((f) => f.id).filter((id) => !ranked.some((r) => r.id === id))];
          const list = order.map((id) => getFlow(FLOWS, id)).map((f) => ({ id: f.id, title: L === 'en' && f.title_en ? f.title_en : f.title }));
          return {
            data: { flows: list, best_match: ranked[0]?.id ?? null },
            ui: [artifact('choices', tr(L, 'Konsultasi Terpandu — pilih situasi Anda', 'Guided Consultation — pick your situation'), { type: 'choices', flow_id: '', node_id: '', path: [], prompt: tr(L, 'Situasi mana yang paling sesuai?', 'Which situation fits best?'), options: [], trail: [], flows: list }, { dex, dataset: 'legal_qa_flows.json (Finandex)', as_of: String(FLOWS.meta.version ?? '') })],
          };
        }
        const f = getFlow(FLOWS, flow_id);
        const r = await flowArtifacts(dex, ctx, start(f));
        return { data: r.data, ui: r.ui, method: method('start_flow', [], { inputs: { flow_id }, rows_used: f.nodes.length, dataset: 'legal_qa_flows.json', as_of: String(FLOWS.meta.version ?? ''), flags: ['deterministic_flow'] }) };
      },
    }),
    defineTool({
      name: 'flow_step',
      description: 'Advance a Guided Consultation deterministically: path = node ids so far (from the previous choices artifact), choice_index = 0-based option chosen. back_to = node id to go back to (breadcrumb). Returns the next question or the result (ordered steps, official channels, legal bases).',
      input: z.object({ flow_id: z.enum(flowIds), path: z.array(z.string().max(40)).min(1).max(12), choice_index: z.number().int().min(0).max(9).nullable(), back_to: z.string().max(40).nullable() }).strict(),
      label: { id: 'Melanjutkan konsultasi…', en: 'Continuing consultation…' },
      run: async ({ flow_id, path, choice_index, back_to }, ctx) => {
        const f = getFlow(FLOWS, flow_id);
        let s: FlowState = { flow_id, path };
        try {
          view(f, s, ctx.locale);
          s = back_to ? back(s, back_to) : choice_index !== null ? step(f, s, choice_index) : s;
        } catch (e) {
          throw new ToolError(`${(e as Error).message} Restart with start_flow.`);
        }
        const r = await flowArtifacts(dex, ctx, s);
        return { data: r.data, ui: r.ui, method: method('flow_step', [], { inputs: { flow_id, path: s.path }, rows_used: s.path.length, dataset: 'legal_qa_flows.json', as_of: String(FLOWS.meta.version ?? ''), flags: ['deterministic_flow'] }) };
      },
    }),
    defineTool({
      name: 'channel_directory',
      description: 'Official complaint/reporting channels (bank, IASC, Kontak OJK 157, SiPASTI, BI 131, cekrekening.id, aduannomor.id, police report, LAPS SJK, 112) with when to use each, from the AntiScamDex knowledge base. situation filters by keyword.',
      input: z.object({ situation: z.string().max(120).nullable() }).strict(),
      label: { id: 'Membuka direktori kanal resmi…', en: 'Opening official channels…' },
      run: async ({ situation }, ctx) => channelDirectory(dex, ctx, situation),
    }),
    defineTool({
      name: 'glossary',
      description: 'Legal term ↔ plain language: the official definition quoted from the general-provisions article of the relevant law (when found) plus a labelled plain-language explanation written by Finandex. Lists the terms when term is null.',
      input: z.object({ term: z.string().min(2).max(60).nullable() }).strict(),
      label: { id: 'Membuka glosarium…', en: 'Opening glossary…' },
      run: async ({ term }, ctx) => {
        const L = ctx.locale;
        const terms = GLOSSARY.filter((g) => g.corpus === corpus);
        if (!term) return { data: { terms: terms.map((g) => g.term), label: GLOSSARY_LABEL[L] }, ui: [artifact('card', tr(L, 'Glosarium', 'Glossary'), { type: 'card', tone: 'info', body: GLOSSARY_LABEL[L], chips: terms.map((g) => g.term) }, { dex, dataset: 'law-glossary (Finandex)', as_of: AS_OF })] };
        const g = findGlossary(term);
        let def: LawChunk | null = null;
        const tryDocs = g ? g.docs.filter(isAvailable) : [];
        for (const id of tryDocs) {
          const { chunks } = await chunksOf(ctx, id);
          const needle = normaliseLaw(g!.term).toLowerCase();
          def = chunks.find((c) => c.part === 'batang_tubuh' && /^Pasal 1$/.test(c.pasal ?? '') && c.text.toLowerCase().includes(needle)) ?? null;
          if (def) break;
        }
        if (!g && !def) throw new ToolError('Term not in the glossary; try search_law for its use in the texts.');
        const ui = [];
        if (def) {
          const t = def.text;
          const i = t.toLowerCase().indexOf(normaliseLaw(g!.term).toLowerCase());
          ui.push(quoteArtifact(dex, L, def, t.slice(Math.max(0, i - 40), i + 600)));
        }
        if (g) ui.push(artifact('card', g.term, { type: 'card', tone: 'info', body: g.plain[L], items: [GLOSSARY_LABEL[L]] }, { dex, dataset: 'law-glossary (Finandex)', as_of: AS_OF }));
        return {
          data: { term: g?.term ?? term, plain: g?.plain[L] ?? null, plain_label: GLOSSARY_LABEL[L], official_definition: def ? { doc_id: def.doc_id, document: doc(def.doc_id).short, pasal: def.pasal, page: def.page, quote: def.text.slice(0, 900) } : null },
          ui,
          ...(def ? { citations: [cite(dex, def.doc_id, def.pasal, def.page)] } : {}),
        };
      },
    }),
    defineTool({
      name: 'open_page',
      description: 'Text of one original PDF page and a preview ("Lihat halaman asli") — for citing pages where article headings were not detected (OCR) or for annexes.',
      input: z.object({ doc_id: z.enum(ids), page: z.number().int().min(1).max(2000) }).strict(),
      label: { id: 'Membuka halaman asli…', en: 'Opening original page…' },
      run: async ({ doc_id, page }, ctx) => {
        if (!isAvailable(doc_id)) throw new ToolError(`${doc(doc_id).short}: official text not available yet.`);
        const { pages } = await chunksOf(ctx, doc_id);
        if (page > pages) throw new ToolError(`The document has ${pages} pages.`);
        const d = doc(doc_id);
        const text = await ctx.store.text(`heavy/law/${d.corpus}/${doc_id}/pages/${page}.txt`);
        return {
          data: { doc_id, page, pages, text: text.slice(0, 4000), pdf: `heavy/law/${d.corpus}/${doc_id}/source.pdf` },
          ui: [artifact('quote', `${d.short} · ${tr(ctx.locale, 'hal.', 'p.')} ${page}`, { type: 'quote', doc_id, doc_title: d.title, pasal: null, page, text: text.replace(/\s+/g, ' ').trim().slice(0, 1500), badges: statusBadge(doc_id, ctx.locale) }, src(dex, doc_id))],
          citations: [cite(dex, doc_id, null, page)],
        };
      },
    }),
  ];
  if (dex === 'mylaiwyer') tools.push(compareVersions(dex));
  return tools;
}

function compareVersions(dex: LawDexId): ToolDef {
  return defineTool({
    name: 'compare_versions',
    description: 'Side-by-side texts on a topic: the old KUHAP (UU 8/1981) vs the new KUHAP (UU 20/2025), or the original 1945 Constitution vs the amended UUD NRI 1945 (pair = uud). Equivalence between articles is never asserted unless the texts say so.',
    input: z.object({ topic: z.string().min(1).max(120), pair: z.enum(['kuhap', 'uud']).nullable() }).strict(),
    label: { id: 'Membandingkan versi…', en: 'Comparing versions…' },
    run: async ({ topic, pair }, ctx) => {
      const L = ctx.locale;
      const [a, b] = pair === 'uud' ? ['uud-1945-naskah-asli', 'uud-nri-1945'] : ['uu-8-1981-kuhap', 'uu-20-2025-kuhap'];
      const pick = async (id: string): Promise<LawChunk | null> => {
        if (!isAvailable(id)) return null;
        if (/^\d+[A-Z]?$/i.test(topic.trim())) {
          const { c } = await findPasal(ctx, id, topic.trim());
          if (c) return c;
        }
        const hits = await searchCorpus(ctx, 'umum', topic, { docIds: [id], part: 'batang_tubuh' });
        for (const h of hits) {
          const c = await chunkById(ctx, id, h.id);
          if (c && c.part === 'batang_tubuh') return c;
        }
        return null;
      };
      const [left, right] = await Promise.all([pick(a!), pick(b!)]);
      if (!left && !right) throw new ToolError(`No matching text in either version${isAvailable(b!) ? '' : ` (${doc(b!).short} is not available yet)`}.`);
      const side = (id: string, c: LawChunk | null) => ({ label: doc(id).short, doc_id: id, pasal: c?.pasal ?? null, page: c?.page ?? null, text: c ? c.text.slice(0, 1400) : tr(L, 'Teks belum tersedia / tidak ditemukan.', 'Text not available / not found.') });
      const note = pair === 'uud' ? (isAvailable('uud-nri-1945') ? NOTES.uud_both[L] : NOTES.uud_original[L]) : tr(L, 'Perbandingan berdampingan saja; kesetaraan pasal tidak disimpulkan.', 'Side-by-side only; equivalence is not asserted.');
      return {
        data: { topic, pair: pair ?? 'kuhap', left: side(a!, left), right: side(b!, right), note },
        ui: [artifact('compare_text', `${doc(a!).short} ↔ ${doc(b!).short}`, { type: 'compare_text', left: side(a!, left), right: side(b!, right), note }, { dex, dataset: `${datasetLabel(a!)}, ${datasetLabel(b!)}`, as_of: AS_OF })],
        method: method('compare_versions', ['bm25'], { inputs: { topic, pair }, rows_used: Number(!!left) + Number(!!right), dataset: `${datasetLabel(a!)}, ${datasetLabel(b!)}`, as_of: AS_OF, flags: ['no_equivalence_asserted'] }),
        citations: [left, right].filter((c): c is LawChunk => !!c).map((c) => cite(dex, c.doc_id, c.pasal, c.page)),
      };
    },
  });
}

/** Shared by FinLAIwyer/My LAIwyer and AntiScamDex. */
export async function channelDirectory(dex: string, ctx: ToolCtx, situation: string | null) {
  const L = ctx.locale;
  const { channels, institutions } = await ctx.store.json<{ channels: Channel[]; institutions: { id: string; name: string }[] }>('core/antiscam/channels.json');
  const words = (situation ?? '')
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length > 2);
  const scored = channels
    .map((c) => ({ c, s: words.length ? words.filter((w) => `${c.name} ${c.use_when} ${c.notes ?? ''}`.toLowerCase().includes(w)).length : 1 }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  const list = (scored.length ? scored : channels.map((c) => ({ c, s: 0 }))).map((x) => x.c);
  const inst = new Map(institutions.map((i) => [i.id, i.name]));
  return {
    data: { channels: list.map((c) => ({ id: c.id, name: L === 'en' && c.name_en ? c.name_en : c.name, operator: c.operator ? inst.get(c.operator) : null, use_when: L === 'en' && c.use_when_en ? c.use_when_en : c.use_when, url: c.url ?? null, phone: c.phone ?? null, whatsapp: c.whatsapp ?? null, email: c.email ?? null })) },
    ui: [
      artifact(
        'steps',
        tr(L, 'Kanal resmi', 'Official channels'),
        { type: 'steps', steps: list.map((c) => ({ text: `${L === 'en' && c.name_en ? c.name_en : c.name} — ${L === 'en' && c.use_when_en ? c.use_when_en : c.use_when}`, urgent: false, channels: [{ id: c.id, name: L === 'en' && c.name_en ? c.name_en : c.name, ...(c.url ? { url: c.url } : {}), ...(c.phone ? { phone: c.phone } : {}), ...(c.whatsapp ? { whatsapp: c.whatsapp } : {}), ...(c.email ? { email: c.email } : {}) }] })), disclaimer: tr(L, 'Finandex tidak berafiliasi dengan lembaga mana pun dan tidak meneruskan laporan.', 'Finandex is not affiliated with any institution and does not forward reports.') },
        { dex, dataset: 'antiscam_kb.json', as_of: '2026-10-23' },
      ),
    ],
    citations: [{ dex, dataset: 'antiscam_kb.json', as_of: '2026-10-23' }],
  };
}
