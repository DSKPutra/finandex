// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// ETL builders for the law Dex (§4.20, §4.28, §4.30) and AntiScamDex (§4.29).
//   mylaiwyer  → corpus "umum": uploaded PDFs #30–#35 (+ golden coverage) and fetched official texts;
//                shared catalogue/flows/lock/feature-guide files under core/law and core/app.
//   finlaiwyer → corpus "keuangan": fetched official texts + UU 1/2026 penalty cross-reference.
//   antiscamdex→ kit/datasets/antiscam/antiscam_kb.json, validated with the same checks as the reference.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ALL_DOCS, CATALOG, FLOWS, INPUT_FILES, LOCK, NOTES, isAvailable, docsOf, statusBadge } from '../../../src/config/law-catalog';
import type { Corpus } from '../../../src/config/law-catalog';
import { LAW_DOCS, UUD_ORIGINAL_TEXT_NOTE } from '../../../src/config/law-sources';
import { analyseLaw, chunkLaw } from '../../../src/shared/law/analyse';
import type { LawChunk } from '../../../src/shared/law/analyse';
import { antiscamDerived, catalogDerived, flowsDerived } from '../../../src/shared/law/kb';
import type { AntiscamKb, CatalogDoc } from '../../../src/shared/law/kb';
import { findPenaltyAdjustments } from '../../../src/shared/law/penalty-adjust';
import { buildLawIndex } from '../../../src/shared/law/search';
import { pdfPagesText } from '../lib/pdf-text';
import { INPUTS, KIT, REGULATIONS } from '../lib/paths';
import type { Writer } from '../lib/writer';
import { computeLawGolden, loadLawPages } from '../load-law';
import type { BuildResult, Ctx } from './context';

const KB: AntiscamKb = JSON.parse(readFileSync(join(KIT, 'datasets/antiscam/antiscam_kb.json'), 'utf8'));
const FEATURE_GUIDE = JSON.parse(readFileSync(join(KIT, 'datasets/app/feature_guide.json'), 'utf8')) as unknown;

const lockBy = new Map(LOCK.documents.map((e) => [e.doc_id, e]));
const available = (d: CatalogDoc) => (d.source === 'input' ? d.id in INPUT_FILES : d.source === 'fetch' && lockBy.get(d.id)?.status === 'available');
const pdfPath = (d: CatalogDoc) => (d.source === 'input' ? join(INPUTS, INPUT_FILES[d.id]!.file) : join(REGULATIONS, `${d.id}.pdf`));

/** Page text cache for the run (UU 1/2026 is read by both corpora). */
const pageCache = new Map<string, string[]>();
async function pagesOf(d: CatalogDoc): Promise<string[]> {
  if (!pageCache.has(d.id)) pageCache.set(d.id, await pdfPagesText(pdfPath(d)));
  return pageCache.get(d.id)!;
}

async function buildCorpus(dex: 'mylaiwyer' | 'finlaiwyer', corpus: Corpus, w: Writer) {
  const docs = docsOf(corpus);
  const all: LawChunk[] = [];
  const meta: Record<string, unknown>[] = [];
  for (const d of docs) {
    const base = {
      doc_id: d.id,
      type: d.type,
      number: d.number,
      year: d.year,
      title: d.title,
      short: d.short,
      corpus: d.corpus,
      status: d.status,
      effective: d.effective,
      source: d.source,
      supplement: (d as { supplement?: boolean }).supplement === true,
      badges: { id: statusBadge(d.id, 'id'), en: statusBadge(d.id, 'en') },
      amends: d.amends,
      amended_by: d.amended_by,
      revokes: d.revokes,
      revoked_by: d.revoked_by,
      penalty_adjusted_by: d.penalty_adjusted_by ?? [],
      topics: d.topics,
      scam_relevance: d.scam_relevance,
      key_provisions: d.key_provisions,
      also_relevant_to: d.also_relevant_to,
      official_pages: d.official_pages,
      url: d.source === 'input' ? null : (lockBy.get(d.id)?.url ?? null),
      sha256: d.source === 'input' ? null : (lockBy.get(d.id)?.sha256 ?? null),
      lock_reason: d.source === 'fetch' ? (lockBy.get(d.id)?.reason ?? null) : null,
      file: d.source === 'input' ? INPUT_FILES[d.id]!.file : null,
    };
    if (!available(d)) {
      meta.push({ ...base, available: false, pages: null, chunks: 0 });
      continue;
    }
    const p = await pagesOf(d);
    const maxPasal = d.source === 'input' ? INPUT_FILES[d.id]!.max_pasal : 2000;
    const chunks = chunkLaw(d.id, p, maxPasal);
    const a = analyseLaw(p, maxPasal);
    all.push(...chunks);
    const folder = `heavy/law/${corpus}/${d.id}`;
    w.json(dex, `${folder}/chunks.json`, { doc_id: d.id, corpus, pages: p.length, penjelasan_starts_page: a.penjelasan_starts_page, missing_headings: d.source === 'input' ? a.pasal_missing_headings : [], chunks });
    p.forEach((text, i) => w.text(dex, `${folder}/pages/${i + 1}.txt`, text));
    w.binary(dex, `${folder}/source.pdf`, readFileSync(pdfPath(d)));
    meta.push({ ...base, available: true, pages: p.length, chunks: chunks.length, pasal_headings_detected: a.pasal_headings_detected, penjelasan_starts_page: a.penjelasan_starts_page });
  }
  w.text(dex, `heavy/law/${corpus}/index.json`, JSON.stringify(buildLawIndex(all)));
  w.json(dex, `core/law/${corpus}/documents.json`, { corpus, documents: meta });
  return { docs: meta, chunks: all.length };
}

export async function buildLaw(_ctx: Ctx, w: Writer): Promise<BuildResult> {
  const dex = 'mylaiwyer';
  // Uploaded inputs: golden coverage (kit/golden/law) and the original documents list.
  const pages = await loadLawPages();
  const golden = computeLawGolden(pages);
  w.json(dex, 'core/law/documents.json', {
    documents: (golden.documents as Record<string, unknown>[]).map((d) => ({ ...d, short: LAW_DOCS.find((x) => x.file === d.file)?.short ?? null, effective: LAW_DOCS.find((x) => x.file === d.file)?.effective ?? null })),
    kuhp_pdf_is_identical_to_kuhap_pdf: golden.kuhp_pdf_is_identical_to_kuhap_pdf,
    uud_note: UUD_ORIGINAL_TEXT_NOTE,
  });
  w.json(dex, 'core/law/coverage.json', { coverage: golden.coverage, rules: golden.rules, golden_quotes_found: golden.golden_quotes_found_after_normalisation });
  for (const [f, p] of pages) {
    const id = Object.entries(INPUT_FILES).find(([, v]) => v.file === f)?.[0];
    if (id) pageCache.set(id, p);
  }
  // Shared catalogue, flows, lock, feature guide (validated exactly like the reference).
  const cat = catalogDerived(CATALOG);
  const fl = flowsDerived(FLOWS, CATALOG, KB);
  if (cat.errors.length || fl.errors.length) throw new Error(`law catalogue/flows validation failed:\n${[...cat.errors, ...fl.errors].join('\n')}`);
  const catalogOut = ALL_DOCS.map((d) => ({
    id: d.id,
    type: d.type,
    number: d.number,
    year: d.year,
    title: d.title,
    short: d.short,
    corpus: d.corpus,
    status: d.status,
    effective: d.effective,
    source: d.source,
    supplement: (d as { supplement?: boolean }).supplement === true,
    available: available(d),
    url: d.source === 'fetch' ? (lockBy.get(d.id)?.url ?? null) : null,
    official_pages: d.official_pages,
    amends: d.amends,
    amended_by: d.amended_by,
    revokes: d.revokes,
    revoked_by: d.revoked_by,
    penalty_adjusted_by: d.penalty_adjusted_by ?? [],
    topics: d.topics,
    scam_relevance: d.scam_relevance,
    key_provisions: d.key_provisions,
    also_relevant_to: d.also_relevant_to,
    badges: { id: statusBadge(d.id, 'id'), en: statusBadge(d.id, 'en') },
  }));
  w.json(dex, 'core/law/catalog.json', { version: CATALOG.meta.version, notes: NOTES, documents: catalogOut, golden: cat.golden });
  w.json(dex, 'core/law/flows.json', FLOWS);
  w.json(dex, 'core/law/lock.json', LOCK);
  w.json(dex, 'core/app/feature_guide.json', FEATURE_GUIDE);
  const umum = await buildCorpus(dex, 'umum', w);
  return {
    as_of: CATALOG.meta.version,
    quality: { corpus: 'umum', documents: umum.docs.length, available: umum.docs.filter((d) => d.available).length, chunks: umum.chunks, quotes_found: golden.golden_quotes_found_after_normalisation as Record<string, boolean>, uud_nri_available: isAvailable('uud-nri-1945') },
  };
}

export async function buildFinLaw(_ctx: Ctx, w: Writer): Promise<BuildResult> {
  const dex = 'finlaiwyer';
  const keu = await buildCorpus(dex, 'keuangan', w);
  const uu1 = CATALOG.documents.find((d) => d.id === 'uu-1-2026-penyesuaian-pidana')!;
  let adjusted = 0;
  if (available(uu1)) {
    const targets = ALL_DOCS.filter((d) => (d.penalty_adjusted_by ?? []).includes(uu1.id));
    const adj = findPenaltyAdjustments(await pagesOf(uu1), targets);
    adjusted = Object.keys(adj.by_doc).length;
    w.json(dex, 'heavy/law/penalty_adjustments.json', adj);
  }
  return { as_of: CATALOG.meta.version, quality: { corpus: 'keuangan', documents: keu.docs.length, available: keu.docs.filter((d) => d.available).length, chunks: keu.chunks, penalty_adjusted_docs_located: adjusted } };
}

export async function buildAntiscam(_ctx: Ctx, w: Writer): Promise<BuildResult> {
  const dex = 'antiscamdex';
  const r = antiscamDerived(KB);
  if (r.errors.length) throw new Error(`antiscam_kb validation failed:\n${r.errors.join('\n')}`);
  w.json(dex, 'core/antiscam/kb.json', KB);
  w.json(dex, 'core/antiscam/stats.json', { as_of: r.golden.as_of, labels: KB.metric_labels, series: r.series, latest: r.latest, golden: r.golden, observations: KB.stats });
  w.json(dex, 'core/antiscam/channels.json', { channels: KB.channels, institutions: KB.institutions });
  w.json(dex, 'core/antiscam/modus.json', { modus: KB.modus, modus_stats: KB.modus_stats });
  w.json(dex, 'core/antiscam/satgas.json', { satgas: KB.satgas_pasti_stats });
  w.json(dex, 'core/antiscam/ojk_consumer.json', KB.ojk_consumer_stats);
  return { as_of: r.golden.as_of, quality: { sources: r.golden.sources, observations: KB.stats.length, modus: KB.modus.length, conflicts: r.golden.modus_conflicts } };
}
