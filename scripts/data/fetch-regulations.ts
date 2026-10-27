// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// `npm run data:fetch-regulations` (§4.30): obtain the official PDF of every catalogue entry with source = fetch,
// verify it, and write the lock file. Order per document:
//   1. GitHub Release `data-regulations-v1` asset `<doc_id>.pdf` (verified against the committed lock SHA-256),
//   2. catalogue `pdf_candidates`, 3. `.pdf` links on `official_pages`, 4. JDIH BPK search with `resolve_query`,
//   5. extra official URLs found earlier (scripts/data/regulation-sources.extra.json, allowed domains only).
// Only domains in catalogue meta.allowed_domains; robots.txt honoured; honest User-Agent; ≤ 1 request/s per host;
// 30 s timeout; ≤ 50 MB; PDF content type. Failed verification = not used (status pending/failed).
// Flags: --offline (release + local cache only), --check (report status changes only, never replace files),
//        --only=<id,id>.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import type { Catalog, CatalogDoc } from '../../src/shared/law/kb';
import { chunkLaw, normaliseLaw } from '../../src/shared/law/analyse';
import { pdfPagesText } from './lib/pdf-text';
import { REGULATIONS, ROOT } from './lib/paths';

const KIT_CATALOG: Catalog = JSON.parse(readFileSync(join(ROOT, 'kit/datasets/law/regulation_catalog.json'), 'utf8'));
const SUPPLEMENT: { documents: CatalogDoc[] } = JSON.parse(readFileSync(join(ROOT, 'src/config/regulation-catalog.supplement.json'), 'utf8'));
const CATALOG: Catalog = { ...KIT_CATALOG, documents: [...KIT_CATALOG.documents, ...SUPPLEMENT.documents] };
const EXTRA: Record<string, string[]> = JSON.parse(readFileSync(join(ROOT, 'scripts/data/regulation-sources.extra.json'), 'utf8')).urls;
export const LOCK_PATH = join(ROOT, 'src/config/regulations.lock.json');
const TAG = process.env.DATA_REGULATIONS_RELEASE_TAG ?? 'data-regulations-v1';
const REPO = process.env.GITHUB_REPOSITORY ?? process.env.DATA_INPUTS_REPO ?? 'DSKPutra/finandex';
const UA = `FinandexBuild/1.0 (+kontak ${process.env.SUPPORT_EMAIL ?? process.env.VITE_SUPPORT_EMAIL ?? 'deasakakurniaputra@gmail.com'})`;
const MAX_BYTES = 50 * 1024 * 1024;
const args = new Set(process.argv.slice(2));
const OFFLINE = args.has('--offline');
const CHECK = args.has('--check');
const ONLY = [...args].find((a) => a.startsWith('--only='))?.slice(7).split(',');

export type LockEntry = {
  doc_id: string;
  url: string | null;
  sha256: string | null;
  bytes: number | null;
  pages: number | null;
  fetched_at: string | null;
  title_detected: string | null;
  status: 'available' | 'pending' | 'failed';
  reason?: string;
};
export type Lock = { version: string; catalog_version: string; release: string; documents: LockEntry[] };

const allowed = new Set(CATALOG.meta.allowed_domains);
const lastHit = new Map<string, number>();
const robots = new Map<string, string[]>();

async function politeFetch(url: string): Promise<Response> {
  const u = new URL(url);
  if (u.protocol !== 'https:' || !allowed.has(u.host)) throw new Error(`domain not allowed: ${u.host}`);
  if (!robots.has(u.host)) robots.set(u.host, await loadRobots(u.origin));
  if (robots.get(u.host)!.some((p) => p && u.pathname.startsWith(p))) throw new Error(`disallowed by robots.txt: ${u.pathname}`);
  const wait = (lastHit.get(u.host) ?? 0) + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastHit.set(u.host, Date.now());
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 30_000);
  try {
    return await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/pdf,text/html;q=0.9,*/*;q=0.1' }, signal: ac.signal, redirect: 'follow' });
  } finally {
    clearTimeout(t);
  }
}

async function loadRobots(origin: string): Promise<string[]> {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 15_000);
    const r = await fetch(`${origin}/robots.txt`, { headers: { 'User-Agent': UA }, signal: ac.signal });
    clearTimeout(t);
    const ct = r.headers.get('content-type') ?? '';
    if (!r.ok || !ct.includes('text/plain')) return [];
    const out: string[] = [];
    let applies = false;
    for (const raw of (await r.text()).split('\n')) {
      const line = raw.replace(/#.*/, '').trim();
      const [k, ...rest] = line.split(':');
      const v = rest.join(':').trim();
      if (/^user-agent$/i.test(k ?? '')) applies = v === '*' || /finandex/i.test(v);
      else if (applies && /^disallow$/i.test(k ?? '') && v) out.push(v);
    }
    return out;
  } catch {
    return [];
  }
}

async function downloadPdf(url: string): Promise<Buffer> {
  const r = await politeFetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const ct = r.headers.get('content-type') ?? '';
  const len = Number(r.headers.get('content-length') ?? 0);
  if (len > MAX_BYTES) throw new Error(`too large (${len} bytes)`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > MAX_BYTES) throw new Error('too large');
  if (!buf.subarray(0, 5).toString('latin1').startsWith('%PDF') || !(ct.includes('pdf') || ct.includes('octet-stream'))) throw new Error(`not a PDF (${ct || 'no content-type'})`);
  return buf;
}

async function pdfLinks(page: string): Promise<string[]> {
  const r = await politeFetch(page);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const html = await r.text();
  const out: string[] = [];
  for (const m of html.matchAll(/href="([^"]+)"/g)) {
    const href = m[1]!.replace(/&amp;/g, '&');
    if (/DownloadUjiMateri|\/Read\//i.test(href)) continue;
    if (!/\.pdf($|\?)|\/Download\//i.test(href)) continue;
    if (/abstrak|faq|presentasi|infografis|ringkasan/i.test(decodeURIComponent(href))) continue;
    try {
      const abs = new URL(href, page).toString();
      if (allowed.has(new URL(abs).host) && !out.includes(abs)) out.push(abs);
    } catch {
      /* ignore malformed href */
    }
  }
  return out;
}

const TYPE_SLUG: Record<string, string> = { UU: 'uu', PERMA: 'perma', POJK: 'peraturan-ojk', PBI: 'peraturan-bi', PP: 'pp' };

async function bpkSearch(d: CatalogDoc): Promise<string[]> {
  const num = String(d.number ?? '').match(/\d+/)?.[0];
  if (!num || !d.year) return [];
  // Slash numbers are compacted in BPK slugs: "22/23/PBI" 2020 → "no-2223pbi2020", "31/POJK.07" → "no-31pojk072020".
  const compact = String(d.number).toLowerCase().replace(/[^a-z0-9]/g, '');
  const url = `https://peraturan.bpk.go.id/Search?keywords=${encodeURIComponent(d.title.split(' tentang ').pop() ?? d.title)}&nomor=${num}&tahun=${d.year}`;
  const r = await politeFetch(url);
  if (!r.ok) return [];
  const html = await r.text();
  const pre = TYPE_SLUG[d.type];
  const details = [...new Set([...html.matchAll(/href="(\/Details\/\d+\/([^"]+))"/g)].filter((m) => (!pre || m[2]!.startsWith(`${pre}-`)) && (m[2]!.includes(`no-${num}-tahun-${d.year}`) || (compact !== num && m[2]!.includes(`no-${compact}${d.year}`)))).map((m) => m[1]!))];
  const out: string[] = [];
  for (const p of details.slice(0, 2)) out.push(...(await pdfLinks(`https://peraturan.bpk.go.id${p}`)));
  return out;
}

const norm = (s: string) => normaliseLaw(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const STOP = new Set(['tentang', 'dan', 'atas', 'nomor', 'tahun', 'undang', 'peraturan', 'yang', 'di', 'dalam', 'bagi', 'serta', 'oleh', 'republik', 'indonesia', 'perubahan', 'kedua', 'termasuk']);

/** §4.30 step 2: pages 1–3 mention number, year and title keywords; every anchor found; at least one Pasal heading. */
export function verifyText(d: CatalogDoc, pages: string[]): { ok: boolean; reason?: string; title?: string } {
  const head = norm(pages.slice(0, 3).join(' '));
  const num = String(d.number ?? '').match(/\d+/)?.[0];
  if (d.year && !head.includes(String(d.year))) return { ok: false, reason: `year ${d.year} not on pages 1–3` };
  if (num && !new RegExp(`(^| )${num}( |$)`).test(head)) return { ok: false, reason: `number ${num} not on pages 1–3` };
  // Parenthetical notes in catalogue titles ("sebagaimana diubah …") are not part of the official title.
  const words = [...new Set(norm(d.title.replace(/\([^)]*\)/g, ' ')).split(' ').filter((w) => w.length > 3 && !STOP.has(w)))];
  const hit = words.filter((w) => head.includes(w)).length;
  if (words.length && hit / words.length < 0.6) return { ok: false, reason: `title keywords ${hit}/${words.length} on pages 1–3` };
  const chunks = chunkLaw(d.id, pages, 2000);
  const body = chunks.filter((c) => c.part === 'batang_tubuh');
  if (!body.length) return { ok: false, reason: 'no Pasal heading detected (abstract or scan without text?)' };
  for (const a of d.anchors) {
    const c = body.find((x) => x.pasal === `Pasal ${a.pasal}`);
    if (!c) return { ok: false, reason: `anchor Pasal ${a.pasal} not detected` };
    if (!norm(c.text).includes(norm(a.must_contain))) return { ok: false, reason: `anchor Pasal ${a.pasal} lacks "${a.must_contain}"` };
  }
  const t = pages[0]!.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 8).join(' ');
  return { ok: true, title: t.slice(0, 240) };
}

function releaseAsset(docId: string, dir: string): string | null {
  try {
    execFileSync('gh', ['release', 'download', TAG, '-R', REPO, '-p', `${docId}.pdf`, '-D', dir, '--clobber'], { stdio: 'pipe' });
    return join(dir, `${docId}.pdf`);
  } catch {
    return null;
  }
}

const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');

export function readLock(): Lock | null {
  return existsSync(LOCK_PATH) ? (JSON.parse(readFileSync(LOCK_PATH, 'utf8')) as Lock) : null;
}

async function main() {
  mkdirSync(REGULATIONS, { recursive: true });
  const prev = readLock();
  const prevBy = new Map((prev?.documents ?? []).map((e) => [e.doc_id, e]));
  const seen = new Map<string, string>();
  const out: LockEntry[] = [];
  for (const d of CATALOG.documents) {
    if (d.source !== 'fetch') continue;
    if (ONLY && !ONLY.includes(d.id)) {
      if (prevBy.has(d.id)) out.push(prevBy.get(d.id)!);
      continue;
    }
    const file = join(REGULATIONS, `${d.id}.pdf`);
    const old = prevBy.get(d.id);
    const tried: string[] = [];
    let entry: LockEntry | null = null;
    // 0/1. local cache or release asset matching the committed lock
    if (old?.status === 'available' && old.sha256) {
      const local = existsSync(file) && sha(readFileSync(file)) === old.sha256 ? file : !CHECK ? releaseAsset(d.id, REGULATIONS) : null;
      if (local && sha(readFileSync(local)) === old.sha256) {
        entry = old;
        if (!CHECK) {
          out.push(entry);
          seen.set(old.sha256, d.id);
          console.log(`ok   ${d.id.padEnd(30)} cached (${old.pages} pages)`);
          continue;
        }
      }
    }
    if (OFFLINE) {
      out.push(old ?? { doc_id: d.id, url: null, sha256: null, bytes: null, pages: null, fetched_at: null, title_detected: null, status: 'pending', reason: 'offline build: not in release/cache' });
      continue;
    }
    // 2–5. official sources
    const candidates: string[] = [...d.pdf_candidates];
    const more = async (f: () => Promise<string[]>) => {
      try {
        for (const u of await f()) if (!candidates.includes(u)) candidates.push(u);
      } catch (e) {
        tried.push(`lookup: ${(e as Error).message}`);
      }
    };
    let found: LockEntry | null = null;
    const tryList = async () => {
      for (const url of candidates) {
        if (tried.some((t) => t.startsWith(url))) continue;
        try {
          const buf = await downloadPdf(url);
          const h = sha(buf);
          if (seen.has(h)) throw new Error(`duplicate of ${seen.get(h)}`);
          const tmp = join(REGULATIONS, `${d.id}.tmp.pdf`);
          writeFileSync(tmp, buf);
          const pages = await pdfPagesText(tmp);
          const v = verifyText(d, pages);
          if (!v.ok) throw new Error(v.reason);
          if (!CHECK) writeFileSync(file, buf);
          return { doc_id: d.id, url, sha256: h, bytes: buf.length, pages: pages.length, fetched_at: new Date().toISOString().slice(0, 10), title_detected: v.title ?? null, status: 'available' as const };
        } catch (e) {
          tried.push(`${url} → ${(e as Error).message}`);
        }
      }
      return null;
    };
    found = await tryList();
    if (!found) {
      for (const p of d.official_pages) await more(() => pdfLinks(p));
      found = await tryList();
    }
    if (!found && d.resolve_query) {
      await more(() => bpkSearch(d));
      found = await tryList();
    }
    if (!found && EXTRA[d.id]) {
      for (const u of EXTRA[d.id]!) if (!candidates.includes(u)) candidates.push(u);
      found = await tryList();
    }
    if (CHECK) {
      if (old?.status === 'available' && found && found.sha256 !== old.sha256) console.log(`CHANGED ${d.id}: official source now ${found.url} (${found.sha256})`);
      if (old?.status !== 'available' && found) console.log(`NEW ${d.id}: ${found.url}`);
      out.push(old ?? found ?? { doc_id: d.id, url: null, sha256: null, bytes: null, pages: null, fetched_at: null, title_detected: null, status: 'pending', reason: 'not found' });
      continue;
    }
    if (found) {
      seen.set(found.sha256!, d.id);
      out.push(found);
      console.log(`ok   ${d.id.padEnd(30)} ${found.pages} pages  ${found.url}`);
    } else {
      const reason = tried.length ? tried.slice(-3).join(' | ').slice(0, 600) : 'no official PDF link found';
      out.push({ doc_id: d.id, url: null, sha256: null, bytes: null, pages: null, fetched_at: null, title_detected: null, status: tried.length ? 'failed' : 'pending', reason });
      console.log(`MISS ${d.id.padEnd(30)} ${reason.slice(0, 160)}`);
    }
  }
  // The version date only moves when the documents change, so re-running the pipeline (CI, another day) leaves the lock —
  // and the serverless bundle that embeds it — byte-identical.
  const prevLock = existsSync(LOCK_PATH) ? (JSON.parse(readFileSync(LOCK_PATH, 'utf8')) as Lock) : null;
  const same = prevLock && prevLock.catalog_version === CATALOG.meta.version && JSON.stringify(prevLock.documents) === JSON.stringify(out);
  const lock: Lock = { version: same ? prevLock.version : new Date().toISOString().slice(0, 10), catalog_version: CATALOG.meta.version, release: TAG, documents: out };
  if (!CHECK) {
    writeFileSync(LOCK_PATH, JSON.stringify(lock, null, 1) + '\n');
    writeFileSync(join(REGULATIONS, 'regulations.lock.json'), JSON.stringify(lock, null, 1) + '\n');
  }
  const n = out.filter((e) => e.status === 'available').length;
  console.log(`regulations: ${n}/${out.length} available${CHECK ? ' (check mode, nothing written)' : ''}`);
}

if (process.argv[1]?.endsWith('fetch-regulations.ts')) await main();
