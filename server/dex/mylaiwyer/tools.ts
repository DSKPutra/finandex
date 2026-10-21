// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// My LAIwyer (§4.20, §8.5): retrieval over the uploaded legal texts only. Quotes come verbatim from indexed chunks;
// documents not uploaded are reported as "belum tersedia" — the model must never answer from memory.
import MiniSearch from 'minisearch';
import { z } from 'zod';
import {
  LAW_SOURCES,
  MISSING_LAW_SOURCES,
  UUD_ORIGINAL_NOTE_EN,
  UUD_ORIGINAL_NOTE_ID,
  type LawSource,
} from '../../../src/config/law-sources.ts';
import { splitAyat } from '../../../src/shared/law/normalize.ts';
import { expandQuery, LAW_SEARCH_OPTIONS, type LawChunk } from '../../../src/shared/law/search.ts';
import { fold } from '../../../src/shared/text.ts';
import type { DataStore } from '../../data/store.ts';
import type { Artifact } from '../../../src/shared/chart-spec.ts';
import { artifact, defineTool, t, ToolError, type Citation, type Tool, type ToolContext } from '../../tools/types.ts';
import { infoCard } from '../helpers.ts';
import { appInfo, dataQualityTool, datasetInfo, openDex } from '../shared-tools.ts';

const DS = 'My LAIwyer legal corpus';
const LEGAL = {
  id: 'Informasi hukum umum, bukan nasihat hukum. Untuk kasus nyata hubungi advokat atau LBH.',
  en: 'General legal information, not legal advice. For a real case contact an advocate or legal-aid office (LBH).',
};
interface Coverage {
  available: string[];
  missing_inputs: number[];
}

const ALIASES: [RegExp, string][] = [
  [/\buud\b|undang undang dasar|konstitusi|constitution/, 'uud-1945-naskah-asli'],
  [/\b1\s*(\/|tahun)\s*1946\b|uu 1 1946|peraturan hukum pidana/, 'uu-1-1946-peraturan-hukum-pidana'],
  [/\b20\s*(\/|tahun)\s*2025\b|kuhap baru/, 'uu-20-2025-kuhap'],
  [/\b8\s*(\/|tahun)\s*1981\b|kuhap( lama)?\b|hukum acara pidana/, 'uu-8-1981-kuhap'],
];
/** Topics whose source documents were never supplied (answer = "belum tersedia"). */
const MISSING_TOPICS: [RegExp, number][] = [
  [/kuhp baru|1\s*\/\s*2023|uu 1 2023/, 2],
  [/kuhp( lama)?\b|wetboek|pencurian|penggelapan|penipuan|pembunuhan|penganiayaan/, 1],
  [/perdata|kuhperdata|burgerlijk|cerai|perceraian|waris|wanprestasi|gugat/, 3],
  [/\bhir\b|rbg|acara perdata/, 4],
  [/amandemen|perubahan (i|ii|iii|iv|pertama|kedua|ketiga|keempat)|uud nri/, 0],
];

export function resolveDoc(raw: string): LawSource | null {
  const f = fold(raw).replace(/[.,]/g, ' ');
  const direct = LAW_SOURCES.find((s) => s.docId === raw || fold(s.short) === f);
  if (direct) return direct;
  for (const [re, id] of ALIASES) if (re.test(f)) return LAW_SOURCES.find((s) => s.docId === id) ?? null;
  return null;
}

const coverage = (ctx: ToolContext) => ctx.store.json<Coverage>('core/law/coverage.json');
const chunkCache = new WeakMap<DataStore, Map<string, Promise<LawChunk[]>>>();
function chunksOf(store: DataStore, docId: string): Promise<LawChunk[]> {
  let m = chunkCache.get(store);
  if (!m) chunkCache.set(store, (m = new Map()));
  if (!m.has(docId))
    m.set(
      docId,
      store.json<{ chunks: LawChunk[] }>(`heavy/law/${docId}/chunks.json`).then((c) => c.chunks),
    );
  return m.get(docId)!;
}
const indexCache = new WeakMap<DataStore, Map<string, Promise<MiniSearch<LawChunk>>>>();
function indexOf(store: DataStore, docId: string): Promise<MiniSearch<LawChunk>> {
  let m = indexCache.get(store);
  if (!m) indexCache.set(store, (m = new Map()));
  if (!m.has(docId))
    m.set(
      docId,
      store
        .json<Parameters<typeof MiniSearch.loadJS>[0]>(`heavy/law/${docId}/index.json`)
        .then((js) => MiniSearch.loadJS<LawChunk>(js, LAW_SEARCH_OPTIONS)),
    );
  return m.get(docId)!;
}

function noteFor(ctx: ToolContext, docId: string): string | null {
  return docId === 'uud-1945-naskah-asli' ? (ctx.locale === 'id' ? UUD_ORIGINAL_NOTE_ID : UUD_ORIGINAL_NOTE_EN) : null;
}
function quote(ctx: ToolContext, c: LawChunk, text = c.text): Artifact {
  const src = LAW_SOURCES.find((s) => s.docId === c.doc_id)!;
  return artifact(ctx, {
    title: `${src.short} — ${c.label}`,
    summary: text.slice(0, 160),
    dataset: DS,
    tab: 'search',
    entity: c.doc_id,
    spec: {
      type: 'quote',
      doc_id: c.doc_id,
      doc_title: src.title[ctx.locale],
      label: c.label,
      pasal: c.pasal,
      page: c.page,
      text,
      note: noteFor(ctx, c.doc_id),
    },
  });
}
const cite = (c: LawChunk): Citation => ({
  dex: 'mylaiwyer',
  dataset: LAW_SOURCES.find((s) => s.docId === c.doc_id)!.short,
  as_of: null,
  ref: { doc_id: c.doc_id, pasal: c.pasal, page: c.page },
});

function unavailable(ctx: ToolContext, what: string, missingIdx: number | null, src?: LawSource | null) {
  const missing = missingIdx !== null ? MISSING_LAW_SOURCES[missingIdx] : null;
  const name = src ? `${src.short} (${src.title[ctx.locale]})` : missing ? missing[ctx.locale] : what;
  const body =
    ctx.locale === 'id'
      ? `Dokumen ${name} belum tersedia di Finandex, sehingga tidak dapat dikutip. Jangan menjawab dari ingatan; sebutkan bahwa sumbernya belum tersedia.`
      : `${name} is not yet available in Finandex, so it cannot be quoted. Do not answer from memory; say the source is not yet available.`;
  return {
    data: {
      available: false,
      status: src?.status ?? 'awaiting-document',
      document: name,
      ...(src?.effective
        ? {
            effective_date_registry: src.effective,
            effective_note: 'from the Finandex source registry (document text not yet indexed)',
          }
        : {}),
      message: body,
      disclaimer: LEGAL[ctx.locale],
    },
    ui: [
      infoCard(ctx, ctx.locale === 'id' ? 'Sumber belum tersedia' : 'Source not yet available', body, DS, 'pending'),
    ],
  };
}

const listSources = defineTool({
  name: 'list_sources',
  description:
    'List legal sources: which are indexed (quotable), awaiting upload, secondary/duplicate, and which are not supplied at all. Use before answering "what laws do you have" or when unsure whether a law is covered.',
  input: z.strictObject({}),
  label: t('Memeriksa sumber hukum…', 'Checking legal sources…'),
  numeric: false,
  async run(ctx) {
    const cov = await coverage(ctx);
    const rows = LAW_SOURCES.map((s) => ({
      doc_id: s.docId,
      short: s.short,
      title: s.title[ctx.locale],
      status:
        s.docId && cov.available.includes(s.docId)
          ? 'available'
          : s.status === 'available'
            ? 'awaiting-upload'
            : s.status,
      effective: s.effective ?? null,
    }));
    return {
      data: {
        sources: rows,
        not_supplied: MISSING_LAW_SOURCES.map((m) => m[ctx.locale]),
        uud_note: ctx.locale === 'id' ? UUD_ORIGINAL_NOTE_ID : UUD_ORIGINAL_NOTE_EN,
        disclaimer: LEGAL[ctx.locale],
      },
      ui: [
        infoCard(
          ctx,
          ctx.locale === 'id' ? 'Sumber hukum' : 'Legal sources',
          rows.map((r) => `${r.short}: ${r.status}`).join(' · '),
          DS,
          'info',
          MISSING_LAW_SOURCES.map(
            (m) => `${ctx.locale === 'id' ? 'Belum tersedia' : 'Not available'}: ${m[ctx.locale]}`,
          ),
        ),
      ],
    };
  },
});

const searchLaw = defineTool({
  name: 'search_law',
  description:
    'BM25 search over the INDEXED legal texts (Pasal, ayat, Penjelasan). Returns verbatim chunks with doc, Pasal and page for citation. If the topic belongs to a document that is not uploaded (e.g. KUHP materiil, KUHPerdata, HIR, KUHAP 1981/2025 while awaiting upload), the result says so — then answer "belum tersedia", never from memory.',
  input: z.strictObject({
    query: z.string().min(2).max(200),
    doc: z.string().max(60).optional(),
    limit: z.number().int().min(1).max(8).optional(),
  }),
  label: t('Mencari pasal…', 'Searching the law…'),
  numeric: false,
  async run(ctx, input) {
    const cov = await coverage(ctx);
    const f = fold(`${input.query} ${input.doc ?? ''}`);
    const src = input.doc ? resolveDoc(input.doc) : ALIASES.find(([re]) => re.test(f)) ? resolveDoc(f) : null;
    if (src && (!src.docId || !cov.available.includes(src.docId)))
      return unavailable(ctx, input.doc ?? input.query, null, src);
    const gap = MISSING_TOPICS.find(([re]) => re.test(f));
    const docs = src?.docId ? [src.docId] : cov.available;
    const q = expandQuery(input.query);
    const hits: (LawChunk & { score: number })[] = [];
    for (const d of docs) {
      const [ix, chunks] = await Promise.all([indexOf(ctx.store, d), chunksOf(ctx.store, d)]);
      const byId = new Map(chunks.map((c) => [c.id, c]));
      for (const r of ix.search(q, { combineWith: 'OR' })) {
        const c = byId.get(String(r.id));
        if (c) hits.push({ ...c, score: r.score });
      }
    }
    hits.sort(
      (a, b) =>
        b.score - a.score ||
        (LAW_SOURCES.find((s) => s.docId === a.doc_id)?.priority ?? 9) -
          (LAW_SOURCES.find((s) => s.docId === b.doc_id)?.priority ?? 9),
    );
    const top = hits.slice(0, input.limit ?? 4);
    const pending = LAW_SOURCES.filter((s) => s.role === 'primary' && s.docId && !cov.available.includes(s.docId)).map(
      (s) => s.short,
    );
    if (!top.length && gap) return unavailable(ctx, input.query, gap[1]);
    return {
      data: {
        query: input.query,
        searched: docs,
        results: top.map((c) => ({
          doc_id: c.doc_id,
          doc: LAW_SOURCES.find((s) => s.docId === c.doc_id)?.short,
          label: c.label,
          pasal: c.pasal,
          part: c.part,
          page: c.page,
          text: c.text.slice(0, 1500),
          note: noteFor(ctx, c.doc_id),
        })),
        not_indexed: pending,
        ...(gap
          ? {
              topic_gap: MISSING_LAW_SOURCES[gap[1]]![ctx.locale],
              gap_note:
                ctx.locale === 'id'
                  ? 'Topik ini diatur dalam dokumen yang belum tersedia; hasil di atas hanya dari dokumen yang ada.'
                  : 'This topic is governed by a document not yet available; results above come only from available documents.',
            }
          : {}),
        disclaimer: LEGAL[ctx.locale],
      },
      ui: top.slice(0, 3).map((c) => quote(ctx, c, c.text.slice(0, 1200))),
      citations: top.map((c) => cite(c)),
    };
  },
});

const getPasal = defineTool({
  name: 'get_pasal',
  description:
    'Exact text of a Pasal (optionally one ayat) from a named document, e.g. doc "UUD 1945", pasal "1", ayat 2. Returns the verbatim text, page and the mandatory UUD note when quoting the 1945 Constitution.',
  input: z.strictObject({
    doc: z.string().max(60),
    pasal: z.string().max(10),
    ayat: z.number().int().min(1).max(30).optional(),
  }),
  label: t('Mengambil pasal…', 'Fetching article…'),
  numeric: false,
  async run(ctx, input) {
    const src = resolveDoc(input.doc);
    const cov = await coverage(ctx);
    if (!src) throw new ToolError(`Unknown document "${input.doc}". Call list_sources to see the available documents.`);
    if (!src.docId || !cov.available.includes(src.docId)) return unavailable(ctx, input.doc, null, src);
    const p = input.pasal
      .replace(/^pasal\s*/i, '')
      .trim()
      .toUpperCase();
    const chunk = (await chunksOf(ctx.store, src.docId)).find(
      (c) => c.part === 'batang_tubuh' && c.pasal?.toUpperCase() === p,
    );
    if (!chunk)
      throw new ToolError(`Pasal ${p} not found in ${src.short} (max Pasal ${src.maxPasal ?? '?'}). Try search_law.`);
    let text = chunk.text;
    if (input.ayat) {
      const a = splitAyat(chunk.text).find((x) => x.ayat === input.ayat);
      if (!a)
        throw new ToolError(
          `Ayat (${input.ayat}) not found in Pasal ${p} of ${src.short}; the Pasal has ayat ${JSON.stringify(chunk.ayat)}.`,
        );
      text = a.text;
    }
    // a following chapter heading can trail the last ayat of a Pasal
    text = text.replace(/\s+BAB\s+[IVXLC]+\b[\s\S]*$/, '').trim();
    return {
      data: {
        doc_id: src.docId,
        doc: src.short,
        title: src.title[ctx.locale],
        pasal: p,
        ayat: input.ayat ?? null,
        page: chunk.page,
        text,
        note: noteFor(ctx, src.docId),
        disclaimer: LEGAL[ctx.locale],
      },
      ui: [quote(ctx, chunk, text)],
      citations: [cite(chunk)],
    };
  },
});

const getPenjelasan = defineTool({
  name: 'get_penjelasan',
  description: 'Elucidation (Penjelasan) text of a document: general part or for a specific Pasal.',
  input: z.strictObject({ doc: z.string().max(60), pasal: z.string().max(10).optional() }),
  label: t('Mengambil penjelasan…', 'Fetching elucidation…'),
  numeric: false,
  async run(ctx, input) {
    const src = resolveDoc(input.doc);
    const cov = await coverage(ctx);
    if (!src) throw new ToolError(`Unknown document "${input.doc}". Call list_sources.`);
    if (!src.docId || !cov.available.includes(src.docId)) return unavailable(ctx, input.doc, null, src);
    const all = (await chunksOf(ctx.store, src.docId)).filter((c) => c.part === 'penjelasan');
    const p = input.pasal
      ?.replace(/^pasal\s*/i, '')
      .trim()
      .toUpperCase();
    const hit = p
      ? (all.find((c) => c.pasal?.toUpperCase() === p) ??
        all.find((c) => new RegExp(`\\bpasal\\s+${p}\\b`, 'i').test(c.text)))
      : all[0];
    if (!hit) throw new ToolError(`No Penjelasan${p ? ` for Pasal ${p}` : ''} found in ${src.short}.`);
    return {
      data: {
        doc: src.short,
        label: hit.label,
        page: hit.page,
        text: hit.text.slice(0, 3000),
        note: noteFor(ctx, src.docId),
        disclaimer: LEGAL[ctx.locale],
      },
      ui: [quote(ctx, hit, hit.text.slice(0, 1500))],
      citations: [cite(hit)],
    };
  },
});

const compareVersions = defineTool({
  name: 'compare_versions',
  description:
    'Compare the same subject between KUHAP 1981 (UU 8/1981) and KUHAP 2025 (UU 20/2025, effective 2 Jan 2026). Works only when both are indexed.',
  input: z.strictObject({ query: z.string().min(2).max(200) }),
  label: t('Membandingkan versi…', 'Comparing versions…'),
  numeric: false,
  async run(ctx, input) {
    const cov = await coverage(ctx);
    const pair = ['uu-8-1981-kuhap', 'uu-20-2025-kuhap'];
    const miss = pair.filter((d) => !cov.available.includes(d));
    if (miss.length) {
      const r = unavailable(
        ctx,
        'KUHAP',
        null,
        LAW_SOURCES.find((s) => s.docId === miss[0]),
      );
      return { ...r, data: { ...r.data, missing: miss, effective_new_kuhap: '2026-01-02' } };
    }
    const out: Record<string, unknown>[] = [];
    for (const d of pair) {
      const ix = await indexOf(ctx.store, d);
      const chunks = new Map((await chunksOf(ctx.store, d)).map((c) => [c.id, c]));
      const best = ix.search(expandQuery(input.query))[0];
      const c = best ? chunks.get(String(best.id)) : undefined;
      if (c) out.push({ doc: d, label: c.label, page: c.page, text: c.text.slice(0, 1200) });
    }
    return { data: { query: input.query, results: out, disclaimer: LEGAL[ctx.locale] } };
  },
});

const openPage = defineTool({
  name: 'open_page',
  description: 'Raw extracted text of one page of an indexed document (to verify a citation or read context).',
  input: z.strictObject({ doc: z.string().max(60), page: z.number().int().min(1).max(500) }),
  label: t('Membuka halaman…', 'Opening page…'),
  numeric: false,
  async run(ctx, input) {
    const src = resolveDoc(input.doc);
    const cov = await coverage(ctx);
    if (!src) throw new ToolError(`Unknown document "${input.doc}".`);
    if (!src.docId || !cov.available.includes(src.docId)) return unavailable(ctx, input.doc, null, src);
    if (!(await ctx.store.has(`heavy/law/${src.docId}/pages/${input.page}.txt`)))
      throw new ToolError(`Page ${input.page} does not exist in ${src.short}.`);
    const text = await ctx.store.text(`heavy/law/${src.docId}/pages/${input.page}.txt`);
    return {
      data: { doc: src.short, page: input.page, text: text.slice(0, 6000), note: noteFor(ctx, src.docId) },
      ui: [
        artifact(ctx, {
          title: `${src.short} — ${ctx.locale === 'id' ? 'hal.' : 'p.'} ${input.page}`,
          summary: text.slice(0, 160),
          dataset: DS,
          tab: 'browse',
          spec: { type: 'card', body: text.slice(0, 6000), tone: 'info', link: null, ...(noteFor(ctx, src.docId) ? { items: [noteFor(ctx, src.docId)!] } : {}) },
        }),
      ],
      citations: [{ dex: 'mylaiwyer', dataset: src.short, as_of: null, ref: { doc_id: src.docId, page: input.page } }],
    };
  },
});

export const tools: Tool<never>[] = [
  datasetInfo,
  appInfo,
  openDex,
  ...([listSources, searchLaw, getPasal, getPenjelasan, compareVersions, openPage] as unknown as Tool<never>[]),
  dataQualityTool(async (ctx) => ({
    documents: await ctx.store.json('core/law/documents.json'),
    coverage: await coverage(ctx),
  })),
] as unknown as Tool<never>[];
