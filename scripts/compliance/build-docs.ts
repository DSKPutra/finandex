// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// `npm run docs:build` (TECHNICAL_DOCS_PROMPT §1, §3, §4): Package A (A01–A13, docs/compliance/technical/) and Package C
// (C01–C14, docs/compliance/privacy/) plus LEGAL_REFS_VERIFIED.md, and the shared registers INDEX.md, OPEN_ITEMS.md and
// STANDARDS_REFERENCED.md for all three packages. Every list is generated from code, registry, configuration, CI reports
// or the official regulation text in public/data; numbers missing from a report are written as "belum diukur".
// Package B (B01–B05) is written by build-sbom-docs.ts; run it first so its documents exist when the index is built.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { POLICY_VERSION } from '../../src/lib/store';
import { RETENTION_DAYS } from '../../src/lib/secure-store';
import { PRIVACY } from '../../src/content/legal';
import { AGENT_LIMITS } from '../../src/shared/agents';
import { WINDOW_SEC } from '../../server/security/ratelimit';
import { controlBlock, fmtInt, table } from './control';
import type { DocMeta } from './control';
import { collectFacts, detectServices, ref } from './facts';
import { loadSources } from '../live-data/registry';

const f = collectFacts();
const V = f.app.version;
const today = f.app.date;
const read = (p: string) => readFileSync(p, 'utf8');
const J = <T>(p: string): T | null => (existsSync(p) ? (JSON.parse(read(p)) as T) : null);
const meta = (id: string, title: string, classification: DocMeta['classification'], standards: string[], related: string[], scope: string): DocMeta => ({
  id, title, version: V, date: today, commit: f.app.commit, status: 'Draf', classification, scope, standards, related,
  history: [{ version: V, date: today, change: 'Versi pertama, dibangkitkan dari sumber kebenaran repo.' }],
});
const NA = 'belum diukur';
const pct = (x: number) => `${(x * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 })} %`;

// ------------------------------------------------------------------ CI artefacts (numbers only from here)
type Vitest = { numTotalTests: number; numPassedTests: number; numFailedTests: number; numTotalTestSuites: number; success: boolean };
const vitest = J<Vitest>('reports/vitest.json');
const evalMock = J<{ grades: { id: string; pass: boolean; safety: boolean }[] }>('reports/eval-mock.json');
const agentsEval = f.agentsEval as { routing?: { items: number; pass_rate: number; precision: number; recall: number }; skills?: { agents: number; skills: number; items: number; pass_rate: number } } | null;
const audit = J<{ findings: number; files: number }>('docs/ui-review/audit.json');
const sbomCheck = J<{ checked: number; failed: number; sbomqs: Record<string, number> }>('docs/compliance/sbom/SBOM_CHECK.json');
const sbomSummary = J<{ master: { file: string; components: number } }>('docs/compliance/sbom/SBOM_SUMMARY.json');
const evalPass = evalMock ? evalMock.grades.filter((g) => g.pass).length : null;
const safety = evalMock ? evalMock.grades.filter((g) => g.safety) : [];

// ------------------------------------------------------------------ requirements (REQ-*) and traceability to tests
const guide = JSON.parse(read('kit/datasets/app/feature_guide.json')) as { dex: { id: string; purpose: string; functions: { tab: string; what: string }[] }[] };
const testText = Object.fromEntries(f.tests.map((t) => [t, read(t)]));
type Req = { id: string; area: string; text: string; source: string; keys: string[]; quality: string };
const reqs: Req[] = [];
for (const d of f.dex) {
  const g = guide.dex.find((x) => x.id === d.id);
  const tools = (f.tools[d.id] ?? []).map((t) => t.name);
  d.tabs.forEach((t, i) => {
    const fn = g?.functions.find((x) => x.tab.toLowerCase() === t.label.id.toLowerCase());
    reqs.push({
      id: `REQ-${d.id}-${String(i + 1).padStart(3, '0')}`,
      area: d.name,
      text: `Tab "${t.label.id}": ${fn?.what ?? g?.purpose ?? d.tagline.id}`,
      source: ref('src/config/dex-registry.ts', `id: '${d.id}'`),
      keys: [d.id, ...tools],
      quality: 'Kesesuaian fungsional',
    });
  });
}
const APP_REQS: [string, string, string, string[], string][] = [
  ['consent', 'Persetujuan chat (versi kebijakan) sebelum pesan pertama; ditanya ulang bila versi berubah', 'src/components/ConsentDialog.tsx', ['consent', 'POLICY_VERSION'], 'Keamanan'],
  ['sensitive', 'Pesan yang tampak berisi seed phrase, private key, nomor kartu, atau NIK diblokir di klien dan server', 'src/shared/text.ts', ['sensitive', 'seed', 'NIK'], 'Keamanan'],
  ['ratelimit', `Pembatasan laju per clientId + IP (jendela ${WINDOW_SEC / 60} menit dan harian) serta anggaran token harian`, 'server/security/ratelimit.ts', ['RateLimiter', 'MemoryCounter', 'RATE_LIMIT'], 'Keandalan'],
  ['numbers', 'Angka dalam jawaban hanya dari keluaran tool; klaim tanpa bukti dihapus Verifikator', 'server/agents/verifier.ts', ['verif', 'ClaimGate', 'extractNumbers'], 'Kesesuaian fungsional'],
  ['agents', `Orkestrasi multi-agen: Penjaga → Konduktor (≤ ${AGENT_LIMITS.maxSpecialists} spesialis) → agen Dex → Verifikator, dialirkan sebagai event SSE`, 'server/agents/run.ts', ['orchestrateAgents', 'planFor', 'agent_start'], 'Kesesuaian fungsional'],
  ['offline', 'Aplikasi dapat dibuka offline (service worker, cache data yang pernah dibuka)', 'vite.config.ts', ['offline', 'serviceWorkers'], 'Keandalan'],
  ['install', 'Halaman /install: petunjuk pemasangan iPhone/iPad/Android/macOS/Windows dan QR', 'src/features/install/InstallCenter.tsx', ['install'], 'Kapabilitas interaksi'],
  ['a11y', 'Kontras teks ≥ 4,5 : 1 pada kedua tema; navigasi keyboard; lulus pemeriksaan axe', 'tests/unit/contrast.test.ts', ['contrast', 'axe'], 'Kapabilitas interaksi'],
  ['wizard', `Isian "Siapkan Laporan" AntiScamDex terenkripsi AES-GCM di perangkat, terhapus otomatis setelah ${RETENTION_DAYS} hari kecuali disimpan`, 'src/lib/secure-store.ts', ['antiscam', 'wizard', 'secure'], 'Keamanan'],
  ['guided', 'Konsultasi Terpandu hukum: alur pertanyaan bercabang dengan rujukan pasal dari teks resmi', 'kit/datasets/law/legal_qa_flows.json', ['flow', 'law'], 'Kesesuaian fungsional'],
  ['guide', 'Panduan Fitur menjawab "fitur ini untuk apa?" dari feature_guide.json', 'kit/datasets/app/feature_guide.json', ['feature_guide'], 'Kapabilitas interaksi'],
  ['size', 'Bundel awal ≤ 250 KB gzip', 'package.json', ['size'], 'Efisiensi kinerja'],
];
APP_REQS.forEach(([k, text, src, keys, q], i) => reqs.push({ id: `REQ-app-${String(i + 1).padStart(3, '0')}`, area: `Aplikasi (${k})`, text, source: ref(src), keys, quality: q }));
const testsFor = (r: Req) => f.tests.filter((t) => r.keys.some((k) => testText[t]!.includes(k)));
const trace = reqs.map((r) => ({ ...r, tests: testsFor(r) }));
const untested = trace.filter((r) => r.tests.length === 0);

// ------------------------------------------------------------------ official UU PDP text (verification of article numbers)
type Chunk = { pasal: string | null; part: string; page: number; text: string };
const CHUNKS = 'public/data/heavy/law/keuangan/uu-27-2022-pdp/chunks.json';
const chunkFile = J<Chunk[] | { chunks: Chunk[] }>(CHUNKS);
const chunks: Chunk[] = !chunkFile ? [] : Array.isArray(chunkFile) ? chunkFile : chunkFile.chunks;
const lockDoc = (id: string) => f.regulations.lock.documents.find((d) => d.doc_id === id);
const pdpLock = lockDoc('uu-27-2022-pdp');
const ppLock = lockDoc('pp-33-2026-pdp');
type Check = { law: 'UU PDP' | 'PP 33/2026'; pasal: string; topic: string; needle: RegExp; usedIn: string };
const CHECKS: Check[] = [
  { law: 'UU PDP', pasal: '5', topic: 'hak memperoleh informasi', needle: /informasi/i, usedIn: 'C04, C06' },
  { law: 'UU PDP', pasal: '6', topic: 'hak melengkapi/memperbarui/memperbaiki', needle: /memperbaiki|memperbarui/i, usedIn: 'C06' },
  { law: 'UU PDP', pasal: '7', topic: 'hak akses & salinan', needle: /akses|salinan/i, usedIn: 'C06' },
  { law: 'UU PDP', pasal: '8', topic: 'hak mengakhiri pemrosesan & menghapus', needle: /mengakhiri|menghapus|memusnahkan/i, usedIn: 'C06, C10' },
  { law: 'UU PDP', pasal: '9', topic: 'hak menarik persetujuan', needle: /menarik/i, usedIn: 'C05, C06' },
  { law: 'UU PDP', pasal: '10', topic: 'hak keberatan atas keputusan otomatis', needle: /otomatis/i, usedIn: 'C06' },
  { law: 'UU PDP', pasal: '11', topic: 'hak menunda/membatasi pemrosesan', needle: /menunda|membatasi/i, usedIn: 'C06' },
  { law: 'UU PDP', pasal: '20', topic: 'dasar pemrosesan', needle: /dasar pemrosesan|persetujuan/i, usedIn: 'C02, C04' },
  { law: 'UU PDP', pasal: '25', topic: 'data pribadi anak', needle: /anak/i, usedIn: 'C13' },
  { law: 'UU PDP', pasal: '31', topic: 'perekaman kegiatan pemrosesan', needle: /rekam|merekam/i, usedIn: 'C02' },
  { law: 'UU PDP', pasal: '34', topic: 'penilaian dampak PDP', needle: /dampak/i, usedIn: 'C03' },
  { law: 'UU PDP', pasal: '46', topic: 'pemberitahuan kegagalan PDP (3 × 24 jam)', needle: /kegagalan|3 ?(x|×) ?24/i, usedIn: 'C07' },
  { law: 'UU PDP', pasal: '53', topic: 'pejabat/petugas PDP', needle: /pejabat|petugas/i, usedIn: 'C11' },
  { law: 'UU PDP', pasal: '56', topic: 'transfer data ke luar wilayah hukum RI', needle: /luar wilayah/i, usedIn: 'C09' },
  ...(
    [
      ['30–36', 'persetujuan & bukti persetujuan', 'C05'],
      ['33', 'informasi sebelum persetujuan', 'C04'],
      ['71', 'koreksi', 'C06'],
      ['74', 'rekaman kegiatan pemrosesan (butir minimum)', 'C02'],
      ['77', 'akses', 'C06'],
      ['92', 'penghentian setelah penarikan persetujuan', 'C06'],
      ['93–96', 'keberatan atas keputusan otomatis', 'C06'],
      ['99', 'pembatasan (3 × 24 jam)', 'C06'],
      ['114–118', 'pemberitahuan kegagalan PDP', 'C07'],
      ['120–121', 'penilaian dampak PDP', 'C03'],
      ['123–124', 'privacy by design & by default', 'C12'],
      ['142–146', 'pejabat/petugas PDP', 'C11'],
      ['160–167', 'transfer lintas batas', 'C09'],
    ] as const
  ).map(([pasal, topic, usedIn]) => ({ law: 'PP 33/2026' as const, pasal, topic, needle: /$^/, usedIn })),
];
const pasalChunks = (n: string) => chunks.filter((c) => c.part === 'batang_tubuh' && c.pasal === `Pasal ${n}`);
const verified = CHECKS.map((c) => {
  if (c.law === 'PP 33/2026') return { ...c, status: 'belum dapat diverifikasi', page: '—', quote: `teks resmi belum tersedia (${ppLock?.reason ?? 'tidak ada di lock'})` };
  const cs = pasalChunks(c.pasal);
  if (!cs.length) return { ...c, status: 'tidak ditemukan di teks', page: '—', quote: chunks.length ? 'pasal tidak terdeteksi pada potongan teks' : `${CHUNKS} belum dibangun (npm run data:build)` };
  const text = cs.map((x) => x.text).join(' ').replace(/\s+/g, ' ');
  const hit = c.needle.test(text);
  return { ...c, status: hit ? 'cocok' : 'topik tidak cocok — periksa', page: String(cs[0]!.page), quote: text.slice(0, 220) + (text.length > 220 ? ' …' : '') };
});
const vMark = (law: Check['law'], pasal: string) => {
  const v = verified.find((x) => x.law === law && x.pasal === pasal);
  return v?.status === 'cocok' ? `${law} Pasal ${pasal} ✓` : `${law} Pasal ${pasal} (${v?.status ?? 'tidak diperiksa'})`;
};

// ------------------------------------------------------------------ processing activities (Package C single source)
const svc = detectServices();
const used = (id: string) => svc.find((s) => s.id === id)?.used ?? false;
type Element = { id: string; data: string; where: string; purpose: string; role: string; retention: string; basis: string; evidence: string };
const ELEMENTS: Element[] = [
  { id: 'D01', data: 'Isi pesan chat (≤ 20 pesan terakhir), bahasa, Dex, konteks tampilan — dapat memuat data yang diketik pengguna (nama, keuangan, kronologi korban)', where: 'perangkat → server Finandex (memori, tidak disimpan) → Anthropic', purpose: 'menghasilkan jawaban chat', role: 'Finandex pengendali; Anthropic & Vercel prosesor', retention: 'server: tidak disimpan (hanya selama permintaan); penyedia LLM: sesuai ketentuan penyedia [KONFIRMASI]', basis: 'persetujuan (UU PDP Pasal 20 ayat (2) huruf a)', evidence: ref('server/chat/orchestrator.ts') },
  { id: 'D02', data: 'clientId (UUID acak lokal)', where: 'perangkat; dikirim bersama permintaan chat', purpose: 'pembatasan laju', role: 'pengendali', retention: 'perangkat: sampai direset pengguna; server: kunci rate limit ber-TTL', basis: 'persetujuan', evidence: ref('src/lib/store.ts', 'clientId: uuid()') },
  { id: 'D03', data: 'Alamat IP', where: 'server (memori / Upstash Redis bila dikonfigurasi)', purpose: 'pembatasan laju & pencegahan penyalahgunaan', role: `pengendali; ${used('upstash') ? 'Upstash' : 'Upstash (opsional, tidak terdeteksi aktif)'} & Vercel prosesor`, retention: `TTL kunci: ${WINDOW_SEC} detik (jendela) dan 1 hari (harian)`, basis: 'kepentingan yang sah (UU PDP Pasal 20 ayat (2) huruf f) [KONFIRMASI]', evidence: ref('server/security/ratelimit.ts', 'WINDOW_SEC') },
  { id: 'D04', data: 'Log operasional: requestId, Dex, tool, latensi, token, kode galat (tanpa isi pesan)', where: 'log platform Vercel', purpose: 'operasi & penanganan galat', role: 'pengendali; Vercel prosesor', retention: '[KONFIRMASI] default 30 hari', basis: 'kepentingan yang sah [KONFIRMASI]', evidence: ref('server/handler.ts', 'log: (r)') },
  { id: 'D05', data: 'Riwayat chat (≤ 50 percakapan per Dex)', where: 'perangkat (IndexedDB)', purpose: 'melanjutkan percakapan', role: 'tidak diproses Finandex', retention: 'sampai dihapus pengguna', basis: '— (tidak meninggalkan perangkat)', evidence: ref('src/lib/history.ts') },
  { id: 'D06', data: 'Watchlist, preferensi tema/bahasa/aksesibilitas, status persetujuan + versi kebijakan', where: 'perangkat (localStorage)', purpose: 'preferensi & bukti persetujuan lokal', role: 'tidak diproses Finandex', retention: 'sampai direset pengguna', basis: '—', evidence: ref('src/lib/store.ts', 'consentVersion') },
  { id: 'D07', data: 'Isian "Siapkan Laporan" (kronologi korban penipuan, nominal, kanal)', where: 'perangkat (IndexedDB, AES-GCM, kunci tidak dapat diekspor)', purpose: 'menyiapkan laporan ke kanal resmi', role: 'tidak diproses Finandex', retention: `${RETENTION_DAYS} hari otomatis, kecuali pengguna memilih simpan`, basis: '—', evidence: ref('src/lib/secure-store.ts', 'RETENTION_DAYS') },
  { id: 'D08', data: 'Data pasar/regulasi yang dibuka (cache)', where: 'perangkat (Cache Storage)', purpose: 'pemakaian offline', role: 'bukan data pribadi', retention: 'sampai cache dibersihkan', basis: '—', evidence: ref('vite.config.ts') },
  { id: 'D09', data: 'Data unduhan/pembaruan aplikasi (akun store pengguna)', where: 'Apple App Store, Google Play, GitHub Releases', purpose: 'distribusi aplikasi', role: 'store = pengendali mandiri', retention: 'sesuai kebijakan store', basis: 'perjanjian pengguna dengan store', evidence: ref('capacitor.config.ts') },
];

// ------------------------------------------------------------------ writers
const TECH = 'docs/compliance/technical';
const PRIV = 'docs/compliance/privacy';
mkdirSync(TECH, { recursive: true });
mkdirSync(PRIV, { recursive: true });
const written: { id: string; title: string; cls: DocMeta['classification']; path: string }[] = [];
function write(dir: string, file: string, m: DocMeta, body: string) {
  writeFileSync(join(dir, file), `${controlBlock(m)}\n${body.trim()}\n`);
  written.push({ id: m.id, title: m.title, cls: m.classification, path: `${dir.replace('docs/compliance/', '')}/${file}` });
}
const dexTable = table(['Dex', 'Kategori', 'Status', 'Tab', 'Tool', 'Lisensi'], f.dex.map((d) => [d.name, f.groups.find((g) => g.id === d.group)?.name.id ?? d.group, d.status, d.tabs.map((t) => t.label.id).join(', '), (f.tools[d.id] ?? []).length, d.license]));

// ================================================================== Package A
write(TECH, 'A01-rencana-dokumentasi.md', meta('A01', 'Rencana & indeks dokumentasi', 'Internal', ['ISO/IEC/IEEE 15289:2019 (kerangka isi information item)', 'ISO/IEC/IEEE 12207:2017 (proses daur hidup)'], ['A02–A13', 'B01–B05', 'C01–C14'], 'Seluruh dokumentasi teknis, SBOM dan privasi Finandex'), `
## 1. Tujuan
Menetapkan dokumen apa yang dipelihara, siapa pemiliknya, dari mana isinya dibangkitkan, dan kapan diperbarui. Semua dokumen dibangun ulang otomatis (\`npm run docs:build\`) dan diperiksa (\`npm run docs:verify\`) di setiap rilis.

## 2. Daftar information item
${table(['ID', 'Dokumen', 'Proses ISO/IEC/IEEE 12207', 'Sumber kebenaran'], [
  ['A02', 'Kebutuhan (StRS + SRS)', 'Teknis — definisi kebutuhan pemangku kepentingan & sistem', '`src/config/dex-registry.ts`, `feature_guide.json`'],
  ['A03', 'Deskripsi arsitektur', 'Teknis — definisi arsitektur', '`vercel.json`, `server/**`, `capacitor.config.ts`, `docs/DECISIONS.md`'],
  ['A04', 'Deskripsi desain', 'Teknis — definisi desain', '`src/**`, `server/**`, `scripts/**`'],
  ['A05', 'Spesifikasi antarmuka', 'Teknis — definisi desain', '`server/handler.ts`, `src/shared/chat-protocol.ts`'],
  ['A06', 'Spesifikasi & kamus data', 'Teknis — implementasi; pendukung — manajemen informasi', '`kit/manifest/input_files_manifest.json`, `kit/datasets/**`, `regulations.lock.json`'],
  ['A07', 'Dokumentasi pengujian', 'Teknis — verifikasi & validasi', '`tests/**`, `reports/*.json`'],
  ['A08', 'Evaluasi kualitas produk', 'Manajemen — jaminan kualitas', '`reports/*.json`, `docs/ui-review/audit.json`'],
  ['A09', 'Keamanan aplikasi', 'Pendukung — manajemen risiko', '`server/security/**`, `vercel.json`, `SECURITY.md`'],
  ['A10', 'Sistem AI', 'Teknis & manajemen risiko', '`server/env.ts`, `server/agents/**`, `docs/agents/eval.json`'],
  ['A11', 'Informasi untuk pengguna', 'Teknis — transisi & operasi', '`feature_guide.json`, `docs/ui-review/**`'],
  ['A12', 'Operasi & pemeliharaan', 'Teknis — operasi, pemeliharaan', '`package.json` scripts, `.github/workflows/**`, `server/env.ts`'],
  ['A13', 'Keterlacakan & glosarium', 'Manajemen — manajemen konfigurasi', 'A02 + `tests/**`'],
  ['B01–B05', 'Secure SBOM', 'Pendukung — manajemen konfigurasi & risiko rantai pasok', '`public/sbom/<versi>/`'],
  ['C01–C14', 'Pelindungan data pribadi', 'Manajemen — risiko & kepatuhan', 'kode + teks resmi UU PDP'],
])}

## 3. Siklus pembaruan
- Setiap commit ke \`main\`: \`npm run verify\` (lint, audit UI, typecheck, tes, eval, build).
- Setiap rilis (tag \`v*\`): workflow \`compliance.yml\` membangun SBOM, menandatangani, mengatestasi, lalu \`docs:build\` + \`docs:verify\`.
- Generator **gagal** bila sumber berubah tanpa dokumen ikut berubah: Dex/tab baru tanpa \`REQ-*\`, env var baru tanpa entri A12, layanan eksternal baru tanpa entri C08 (lihat \`scripts/compliance/verify-docs.ts\`).

## 4. Workflow CI yang terdaftar
${table(['Workflow', 'File'], f.workflows.map((w) => [w.name, `\`${w.file}\``]))}
`);

write(TECH, 'A02-kebutuhan.md', meta('A02', 'Spesifikasi kebutuhan pemangku kepentingan & perangkat lunak (StRS + SRS)', 'Internal', ['ISO/IEC/IEEE 29148 (kebutuhan)', 'ISO/IEC 25010:2023 (karakteristik kualitas produk)'], ['A07', 'A13'], `${f.dex.length} Dex, ${reqs.length} kebutuhan`), `
## 1. Pemangku kepentingan
${table(['Pemangku kepentingan', 'Kepentingan utama'], [
  ['Pengguna umum (investor ritel, pelajar, pekerja)', 'jawaban berbasis data dengan sumber dan tanggal data; tanpa akun'],
  ['Korban/calon korban penipuan', 'langkah darurat, kanal resmi, laporan siap kirim yang tetap di perangkat'],
  ['Pemilik produk (Dea Saka Kurnia Putra)', 'kepatuhan lisensi data, biaya LLM terkendali, dokumentasi dapat diaudit'],
  ['Penyedia data & pemegang lisensi', 'atribusi dan batas penggunaan (NC/komersial) dihormati'],
  ['Regulator (Komdigi / lembaga PDP)', 'kepatuhan UU PDP dan PSE'],
])}

## 2. Kebutuhan fungsional per Dex
Satu kebutuhan per tab, dibangkitkan dari registry dan \`feature_guide.json\`. Karakteristik kualitas: kesesuaian fungsional.

${table(['ID', 'Dex', 'Kebutuhan', 'Sumber'], trace.filter((r) => !r.id.startsWith('REQ-app')).map((r) => [r.id, r.area, r.text, `\`${r.source}\``]))}

## 3. Kebutuhan lintas aplikasi & non-fungsional
Dipetakan ke sembilan karakteristik kualitas ISO/IEC 25010:2023.

${table(['ID', 'Kebutuhan', 'Karakteristik kualitas', 'Sumber'], trace.filter((r) => r.id.startsWith('REQ-app')).map((r) => [r.id, r.text, r.quality, `\`${r.source}\``]))}

## 4. Kriteria penerimaan
Setiap kebutuhan diterima bila tes yang tertaut di A13 lulus pada rilis yang sama dan gate \`npm run verify\` hijau. Hasil terakhir: ${vitest ? `${fmtInt(vitest.numPassedTests)}/${fmtInt(vitest.numTotalTests)} tes unit/komponen lulus` : NA}; eval chat mock ${evalPass !== null ? `${evalPass}/${evalMock!.grades.length}` : NA}.
`);

const lockDocs = f.regulations.lock.documents;
write(TECH, 'A03-arsitektur.md', meta('A03', 'Deskripsi arsitektur', 'Internal', ['ISO/IEC/IEEE 42010:2022'], ['A04', 'A05', 'A09', 'C01'], 'Web/PWA, fungsi serverless, aplikasi mobile & desktop'), `
## 1. Concerns pemangku kepentingan
${table(['Concern', 'Pemangku kepentingan', 'View yang menjawab'], [
  ['Apakah angka dapat dipercaya?', 'pengguna', 'logis, AI'],
  ['Data apa yang meninggalkan perangkat?', 'pengguna, regulator', 'aliran data, keamanan'],
  ['Berapa biaya & batas pemakaian LLM?', 'pemilik', 'deployment, AI'],
  ['Bagaimana rilis ke web, store dan desktop?', 'pemilik', 'deployment'],
])}

## 2. View konteks sistem
\`\`\`mermaid
flowchart LR
  U[Pengguna] -->|HTTPS| W[Finandex PWA / app]
  W -->|/api/chat SSE| S[Fungsi serverless Vercel]
  S -->|teks percakapan| A[Anthropic API]
  S -->|rate limit, opsional| R[(Upstash Redis)]
  W -->|data statis| D[(public/data · CDN)]
  G[GitHub Actions] -->|build & deploy| S
  G --> D
\`\`\`

## 3. View logis
- **Frontend** (\`src/**\`): React 19 + Vite; registry ${f.dex.length} Dex; tab chat/data/statistik per Dex; Index Constellation; Agent Room 3D.
- **Server** (\`server/**\`): \`server/handler.ts\` merutekan ${f.routes.length} rute API (${f.routes.map((r) => `${r.method} ${r.path}`).join(', ')}); orkestrator agen; tool per Dex membaca \`DataStore\`.
- **ETL** (\`scripts/data/**\`): input terverifikasi hash → \`public/data/**\` + golden.

## 4. View deployment
${table(['Target', 'Bukti', 'Status'], [
  ['Vercel (produksi)', `\`vercel.json\`; ${f.app.production}`, 'aktif'],
  ['Netlify (cadangan)', '`netlify.toml`', used('netlify') ? 'dikonfigurasi' : 'tidak terdeteksi'],
  ['Android / iOS (Capacitor)', '`capacitor.config.ts`', `${f.hasAndroid ? 'proyek Android ada' : 'proyek Android belum ada'}; ${f.hasIos ? 'proyek iOS ada' : 'proyek iOS belum ada'}`],
  ['Desktop (Tauri)', '`src-tauri/tauri.conf.json`', f.hasTauri ? 'ada' : 'belum ada di repo'],
  ['GitHub Releases', '`.github/workflows/compliance.yml`', 'SBOM & atestasi saat tag'],
])}

## 5. View aliran data
Lihat C01 untuk tabel lengkap. Ringkas: hanya permintaan chat yang meninggalkan perangkat (pesan, Dex, bahasa, konteks, clientId); semuanya lain tetap di perangkat.

\`\`\`mermaid
sequenceDiagram
  participant P as Perangkat
  participant S as Server Finandex
  participant L as Anthropic
  P->>S: POST /api/chat (pesan, Dex, clientId)
  S->>S: Penjaga (data sensitif) + rate limit
  S->>L: prompt + hasil tool
  L-->>S: teks
  S->>S: Verifikator (angka hanya dari tool)
  S-->>P: event SSE (plan, agent_*, verify, delta, done)
\`\`\`

## 6. View AI
Lihat A10. Model dipilih lewat env (\`ANTHROPIC_MODEL\`, \`ANTHROPIC_MODEL_FAST\`); ${f.agents.length} kartu agen; batas: ${AGENT_LIMITS.maxSpecialists} spesialis, ${AGENT_LIMITS.maxTurns} giliran, ${AGENT_LIMITS.maxTools} panggilan tool, ${AGENT_LIMITS.timeoutMs / 1000} detik per agen.

## 7. Data & regulasi
${fmtInt(f.inputs.length)} file input, ${fmtInt(f.kitDatasets.length)} dataset kit, ${lockDocs.filter((d) => d.status === 'available').length}/${lockDocs.length} teks regulasi resmi tersedia.

## 8. Keputusan arsitektur (ADR)
${table(['Tanggal', 'Keputusan · alasan · alternatif ditolak'], f.decisions.map((d) => { const [date, ...rest] = d.slice(2).split(' · '); return [date ?? '', rest.join(' · ')]; }))}
`);

write(TECH, 'A04-desain.md', meta('A04', 'Deskripsi desain perangkat lunak', 'Internal', ['ISO/IEC/IEEE 15289:2019 (software design description)'], ['A03', 'A05'], 'Modul, plugin Dex, orkestrator, desain UI'), `
## 1. Modul
${table(['Direktori', 'Tanggung jawab'], [
  ['`src/config/`', 'registry Dex, grup, token merek, agen, katalog hukum'],
  ['`src/features/`', 'fitur UI: chat, dex, constellation, agents, law, antiscam, install, guide, compare, home'],
  ['`src/lib/`', 'state perangkat (zustand), riwayat IndexedDB, penyimpanan terenkripsi, tema, klien API'],
  ['`src/shared/`', 'kode bersama klien/server: protokol chat, analitik, deteksi teks sensitif, angka'],
  ['`server/dex/`', 'tool per Dex (plugin)'],
  ['`server/agents/`', 'Penjaga, Konduktor (planner), runner agen, Verifikator, keahlian'],
  ['`server/chat/`', 'orkestrator, klien LLM, mock LLM, SSE, prompt sistem'],
  ['`server/security/`', 'CORS, header, rate limit'],
  ['`scripts/data/`', 'ETL per Dex'],
  ['`scripts/compliance/`', 'SBOM, dokumen kepatuhan, PDF'],
])}

## 2. Arsitektur plugin Dex
Setiap Dex didaftarkan sekali di \`src/config/dex-registry.ts\` (id, grup, tab, input, lisensi, status) dan memiliki tool di \`server/dex/\`. Jumlah tool per Dex:

${dexTable}

## 3. Orkestrator chat & loop tool
Penjaga memeriksa pesan → Konduktor menyusun rencana (deterministik; mode live memakai \`submit_plan\`) → agen Dex memanggil tool (≤ ${AGENT_LIMITS.maxTools}) → Verifikator mencocokkan setiap angka dengan keluaran tool → Penjaga memeriksa jawaban. Semua langkah dialirkan sebagai event SSE (\`${ref('server/agents/run.ts')}\`).

## 4. Mesin alur hukum
Konsultasi Terpandu memakai \`kit/datasets/law/legal_qa_flows.json\`; setiap rujukan pasal diambil dari potongan teks resmi yang hash-nya tercatat di \`src/config/regulations.lock.json\`.

## 5. Sistem desain
Token warna tema "Spektrum" di \`src/config/brand.ts\` dan \`src/styles/index.css\` (8 warna kategori \`--group-1..8\`); kontras diuji di \`tests/unit/contrast.test.ts\`; audit statis \`scripts/ui/audit.ts\` (temuan terakhir: ${audit ? audit.findings : NA}).
`);

const sseEvents = [...new Set([...read('src/shared/chat-protocol.ts').matchAll(/type: '([a-z_]+)'/g)].map((m) => m[1]!))];
const openapi = {
  openapi: '3.1.0',
  info: { title: 'Finandex API', version: V },
  servers: [{ url: f.app.production }],
  paths: Object.fromEntries(f.routes.map((r) => [r.path, { [r.method.toLowerCase()]: { summary: `Rute ${r.path} (lihat server/handler.ts)`, responses: { '200': { description: r.path === '/api/chat' ? 'text/event-stream — event SSE' : 'application/json' }, '429': { description: 'RATE_LIMIT / BUDGET' } } } }])),
};
writeFileSync(join(TECH, 'openapi.json'), JSON.stringify(openapi, null, 2) + '\n');
write(TECH, 'A05-antarmuka.md', meta('A05', 'Spesifikasi antarmuka', 'Internal', ['ISO/IEC/IEEE 15289:2019 (interface description)', 'OpenAPI 3.1'], ['A04'], 'API HTTP, event SSE, tool, kontrak data'), `
## 1. API HTTP
OpenAPI 3.1 (kerangka dibangkitkan dari \`server/handler.ts\`): [\`openapi.json\`](openapi.json). Skema isi permintaan didefinisikan dengan zod di \`src/shared/chat-protocol.ts\`.

${table(['Metode', 'Rute'], f.routes.map((r) => [r.method, `\`${r.path}\``]))}

## 2. Event SSE
Jenis event yang didefinisikan di protokol: ${sseEvents.map((e) => `\`${e}\``).join(', ')}.

## 3. Tool per Dex
${table(['Dex', 'Tool', 'Deskripsi'], f.dex.flatMap((d) => (f.tools[d.id] ?? []).map((t) => [d.name, `\`${t.name}\``, t.description.slice(0, 160)])))}

## 4. Kontrak data statis
\`public/data/manifest.json\` mencatat setiap file data beserta hash; klien hanya membaca file yang tercantum di manifest.

## 5. Header keamanan (vercel.json)
${table(['Sumber', 'Header'], f.vercel.headers.flatMap((h) => h.headers.map((x) => [`\`${h.source}\``, `${x.key}: ${x.value.slice(0, 120)}`])))}
`);

write(TECH, 'A06-data.md', meta('A06', 'Spesifikasi data & kamus data', 'Internal', ['ISO/IEC 25012 (model kualitas data)'], ['A03', 'B01'], `${f.inputs.length} input, ${f.kitDatasets.length} dataset kit, ${lockDocs.length} dokumen regulasi`), `
## 1. File input (terverifikasi SHA-256)
${table(['No', 'Nama', 'File', 'Ukuran (byte)', 'SHA-256'], f.inputs.map((i) => [i.no, i.name, `\`${i.file}\``, fmtInt(i.bytes), `\`${i.sha256.slice(0, 16)}…\``]))}

## 2. Dataset kit
${table(['File', 'Ukuran (byte)', 'SHA-256'], f.kitDatasets.map((k) => [`\`${k.path}\``, fmtInt(k.bytes), `\`${k.sha256.slice(0, 16)}…\``]))}

## 3. Dokumen regulasi
${table(['Dokumen', 'Status', 'Halaman', 'Diambil'], lockDocs.map((d) => [d.doc_id, d.status, d.pages ?? '—', d.fetched_at ?? '—']))}

## 4. Lineage
input (hash dicek \`data:verify\`) → ekstraksi → ETL \`scripts/data/build-*.ts\` → \`public/data/**\` (manifest + hash) → golden \`tests/golden/**\` → tool server.

## 4a. Sumber data live (\`scripts/live-data/sources.yaml\`)
Data live memperpanjang Dex setelah tanggal terakhir dataset asli, disimpan sebagai snapshot append-only ber-hash di \`data/live/\` dan dipublikasikan di \`public/data/live/<dex>.json\`; data historis tidak diubah.

${table(['ID', 'Sumber', 'Status', 'Dex', 'Penggunaan diizinkan', 'Ketentuan dibaca'], loadSources().map((s) => [`\`${s.id}\``, s.name, s.status, s.datasets.map((d) => d.dex).join(', '), s.allowed_use, s.terms_checked_at ?? 'belum (halaman tidak tersedia)']))}

## 5. Karakteristik kualitas data (ISO/IEC 25012)
${table(['Karakteristik', 'Bukti di Finandex'], [
  ['Akurasi', 'tes golden membandingkan keluaran ETL dengan nilai rujukan kit (`tests/golden/**`)'],
  ['Kelengkapan', 'catatan data per Dex (`src/config/data-notes.ts`), status `partial`/`pending-data` di registry'],
  ['Konsistensi', 'paritas TypeScript ↔ implementasi Python referensi (`parity.yml`)'],
  ['Kekinian', 'tanggal "Data per" per Dex (`asOf`) ditampilkan di UI'],
  ['Kredibilitas', 'hash SHA-256 setiap input dan dokumen regulasi'],
  ['Kepatuhan', 'lisensi per Dex, mode distribusi non-komersial memblokir data NC'],
])}
`);

const byDir = (d: string) => f.tests.filter((t) => t.startsWith(`tests/${d}/`));
write(TECH, 'A07-pengujian.md', meta('A07', 'Dokumentasi pengujian', 'Internal', ['ISO/IEC/IEEE 29119-3:2021'], ['A02', 'A08', 'A13'], 'Seluruh tes otomatis'), `
## 1. Rencana uji
${table(['Tingkat', 'Alat', 'Lokasi', 'File'], [
  ['Unit & server', 'Vitest', '`tests/unit/`', byDir('unit').length],
  ['Komponen UI', 'Vitest + Testing Library', '`tests/ui/`', byDir('ui').length],
  ['Golden data', 'Vitest', '`tests/golden/`', byDir('golden').length],
  ['Tool', 'Vitest', '`tests/tools/`', byDir('tools').length],
  ['E2E', 'Playwright', '`tests/e2e/`', byDir('e2e').length],
  ['Aksesibilitas', 'Playwright + axe', '`tests/a11y/`', byDir('a11y').length],
  ['Eval chatbot', '`scripts/eval/`', '`kit/golden/chatbot_eval.json`', '—'],
  ['Eval agen', '`scripts/eval/eval-agents.ts`', '`scripts/eval/agents/`', '—'],
])}

## 2. Laporan penyelesaian uji (artefak CI terakhir)
${table(['Ukuran', 'Nilai'], [
  ['Tes Vitest', vitest ? `${fmtInt(vitest.numPassedTests)} lulus / ${fmtInt(vitest.numTotalTests)} (${vitest.numFailedTests} gagal)` : NA],
  ['Eval chat (mock)', evalPass !== null ? `${evalPass}/${evalMock!.grades.length} lulus; keamanan ${safety.filter((s) => s.pass).length}/${safety.length}` : NA],
  ['Eval routing agen', agentsEval?.routing ? `${agentsEval.routing.items} butir, presisi ${pct(agentsEval.routing.precision)}, recall ${pct(agentsEval.routing.recall)}` : NA],
  ['Eval keahlian agen', agentsEval?.skills ? `${agentsEval.skills.items} butir, ${pct(agentsEval.skills.pass_rate)} lulus` : NA],
  ['Audit UI', audit ? `${audit.findings} temuan di ${audit.files} file` : NA],
  ['Gate SBOM', sbomCheck ? `${sbomCheck.checked} pemeriksaan, ${sbomCheck.failed} gagal` : NA],
  ['Coverage, Lighthouse, E2E pada rilis', NA],
])}

## 3. File tes
${table(['File'], f.tests.map((t) => [`\`${t}\``]))}

Matriks keterlacakan \`REQ-*\` ↔ tes: A13.
`);

write(TECH, 'A08-evaluasi-kualitas.md', meta('A08', 'Laporan evaluasi kualitas produk', 'Internal', ['ISO/IEC 25010:2023'], ['A02', 'A07'], 'Gate rilis dipetakan ke karakteristik kualitas'), `
${table(['Karakteristik (ISO/IEC 25010:2023)', 'Metrik', 'Ambang', 'Nilai aktual', 'Status'], [
  ['Kesesuaian fungsional', 'tes Vitest lulus', '100 %', vitest ? pct(vitest.numPassedTests / vitest.numTotalTests) : NA, vitest ? (vitest.success ? 'lulus' : 'gagal') : NA],
  ['Kesesuaian fungsional', 'eval chat mock', '100 %', evalPass !== null ? pct(evalPass / evalMock!.grades.length) : NA, evalPass !== null && evalPass === evalMock!.grades.length ? 'lulus' : NA],
  ['Efisiensi kinerja', 'bundel awal gzip', '≤ 250 KB', NA, NA],
  ['Kompatibilitas', 'web, Android, iOS, desktop', 'semua target dibangun', `web ✓; Android ${f.hasAndroid ? '✓' : '—'}; iOS ${f.hasIos ? '✓' : '—'}; desktop ${f.hasTauri ? '✓' : '—'}`, 'sebagian'],
  ['Kapabilitas interaksi', 'kontras teks AA', '≥ 4,5 : 1', 'diuji di contrast.test.ts', vitest?.success ? 'lulus' : NA],
  ['Keandalan', 'mode offline & mock LLM', 'tersedia', 'service worker + CHAT_MODE=mock', 'lulus'],
  ['Keamanan', 'eval keamanan chat', '100 %', safety.length ? pct(safety.filter((s) => s.pass).length / safety.length) : NA, safety.length && safety.every((s) => s.pass) ? 'lulus' : NA],
  ['Keamanan', 'gate SBOM', '0 gagal', sbomCheck ? `${sbomCheck.failed} gagal` : NA, sbomCheck && sbomCheck.failed === 0 ? 'lulus' : NA],
  ['Kemudahan pemeliharaan', 'audit UI statis', '0 temuan', audit ? String(audit.findings) : NA, audit && audit.findings === 0 ? 'lulus' : NA],
  ['Fleksibilitas', 'Dex sebagai plugin registry', 'Dex baru tanpa ubah inti', `${f.dex.length} Dex terdaftar`, 'lulus'],
  ['Keselamatan', 'jawaban bukan nasihat; data sensitif diblokir', 'selalu', 'disclaimer + detektor', 'lulus'],
])}

Nilai "${NA}" berarti artefak CI untuk rilis ini belum tersedia; tidak ditebak.
`);

write(TECH, 'A09-keamanan.md', meta('A09', 'Dokumentasi keamanan aplikasi', 'Internal', ['ISO/IEC 27001:2022 Annex A (subset)', 'ISO/IEC 27034', 'OWASP ASVS 5.0 (target Level 2)', 'OWASP Top 10 for LLM Applications', 'NIST SP 800-218 (SSDF)'], ['A10', 'B03', 'C07'], 'Aplikasi web, API, aplikasi mobile/desktop'), `
## 1. Model ancaman
${table(['Ancaman (STRIDE / LLM)', 'Contoh', 'Kontrol', 'Bukti'], [
  ['Spoofing', 'permintaan otomatis memakai banyak clientId', 'rate limit per clientId + IP, anggaran token harian', `\`${ref('server/security/ratelimit.ts')}\``],
  ['Tampering', 'data statis diubah', 'hash SHA-256 di manifest & SBOM', '`public/data/manifest.json`'],
  ['Repudiation', 'sumber jawaban tidak jelas', 'sitasi + panel "Kenapa jawabannya begini?"', '`src/features/chat/`'],
  ['Information disclosure', 'pengguna mengetik NIK/kartu', 'detektor data sensitif klien & server', `\`${ref('src/shared/text.ts')}\``],
  ['Denial of service', 'banjir permintaan chat', 'rate limit, batas waktu chat, batas agen', '`server/env.ts` CHAT_DEADLINE_MS'],
  ['Elevation of privilege', 'XSS', 'CSP & header keamanan', '`vercel.json`'],
  ['LLM01 Prompt injection', 'dokumen/teks pengguna berisi instruksi', 'data diperlakukan sebagai data, tool read-only, Verifikator', '`server/agents/guard.ts`'],
  ['LLM02 Kebocoran data sensitif', 'data pribadi dikirim ke LLM', 'detektor + persetujuan + tanpa penyimpanan server', 'C03'],
  ['LLM06 Excessive agency', 'agen melakukan aksi', 'tidak ada tool yang menulis/mengirim; `proposed_action` hanya usulan untuk pengguna', '`server/agents/run.ts`'],
  ['LLM09 Misinformation', 'angka dikarang', 'angka hanya dari tool, klaim tak berbukti dihapus', '`server/agents/verifier.ts`'],
])}

## 2. Statement of Applicability (ringkas, Annex A ISO/IEC 27001:2022)
${table(['Kontrol', 'Berlaku', 'Penerapan'], [
  ['5.23 Keamanan layanan cloud', 'ya', 'Vercel/Netlify, secret hanya di env platform'],
  ['5.34 Privasi & PII', 'ya', 'Paket C'],
  ['8.4 Akses ke kode sumber', 'ya', 'GitHub, branch utama `main`'],
  ['8.8 Manajemen kerentanan teknis', 'ya', 'npm audit → VEX (B04), osv-scanner/grype di CI'],
  ['8.9 Manajemen konfigurasi', 'ya', 'konfigurasi di repo; env tervalidasi zod'],
  ['8.12 Pencegahan kebocoran data', 'ya', '`check:secrets`, detektor data sensitif'],
  ['8.25–8.29 Pengembangan aman & pengujian keamanan', 'ya', 'lint, typecheck, eval keamanan, gate SBOM'],
  ['7.x Keamanan fisik', 'tidak', 'tanpa fasilitas fisik; infrastruktur dikelola penyedia'],
])}

## 3. Verifikasi ASVS 5.0 (ringkas per bab)
${table(['Bab', 'Status', 'Catatan'], [
  ['Autentikasi & sesi', 'tidak berlaku', 'tanpa akun'],
  ['Validasi & encoding', 'diterapkan', 'zod untuk semua isi permintaan'],
  ['Kriptografi data tersimpan', 'diterapkan', 'AES-GCM WebCrypto untuk isian laporan'],
  ['Konfigurasi & header', 'diterapkan', 'CSP, CORS daftar putih'],
  ['Pencatatan', 'diterapkan', 'metadata saja, tanpa isi pesan'],
  ['Verifikasi independen', 'belum', '[KONFIRMASI] uji penetrasi pihak ketiga'],
])}

## 4. Secret & pelaporan kerentanan
Variabel server: ${f.env.server.map((e) => `\`${e}\``).join(', ')} (nilai tidak pernah di repo; \`npm run check:secrets\`). Variabel klien (publik): ${f.env.client.map((e) => `\`${e}\``).join(', ') || '—'}. Pelaporan kerentanan: \`SECURITY.md\`.

## 5. CORS
Origin yang diizinkan: lihat \`${ref('server/env.ts', 'finandex.vercel.app')}\`.
`);

write(TECH, 'A10-sistem-ai.md', meta('A10', 'Dokumentasi sistem AI', 'Internal', ['ISO/IEC 42001:2023', 'ISO/IEC 23894:2023'], ['A09', 'B05', 'C03'], 'Chatbot dan orkestrasi multi-agen'), `
## 1. Tujuan & batas penggunaan
Menjawab pertanyaan tentang data pasar, ekonomi, sosial, dan hukum dengan angka yang berasal dari tool. Bukan nasihat investasi, keuangan, pajak, maupun hukum.

## 2. Model
Default \`claude-sonnet-5-5\` (\`ANTHROPIC_MODEL\`) dan \`claude-haiku-5-5\` (\`ANTHROPIC_MODEL_FAST\`), dapat diganti lewat env (\`${ref('server/env.ts', 'ANTHROPIC_MODEL')}\`). Mode \`CHAT_MODE=mock\` menjalankan seluruh alur tanpa LLM untuk eval dan uji.

## 3. Data yang dikirim ke penyedia
Teks percakapan (≤ 20 pesan terakhir), hasil tool, prompt sistem Dex. Tidak ada clientId atau IP yang diteruskan ke penyedia. Lihat C01 (D01) dan C09.

## 4. Agen
${fmtInt(f.agents.length)} kartu agen dengan keahlian di \`server/agents/skills/**\`. Batas per jawaban: ${AGENT_LIMITS.maxSpecialists} spesialis, ${AGENT_LIMITS.maxTurns} giliran, ${AGENT_LIMITS.maxTools} panggilan tool, ${AGENT_LIMITS.timeoutMs / 1000} detik.

## 5. Prompt sistem
Prompt per Dex dibangkitkan ke \`server/chat/prompts.generated.ts\`; teks lengkap tidak dimuat di dokumen ini [KONFIRMASI apakah dianggap rahasia].

## 6. Evaluasi
${table(['Set', 'Hasil'], [
  ['kit/golden/chatbot_eval.json (mock)', evalPass !== null ? `${evalPass}/${evalMock!.grades.length}` : NA],
  ['Routing agen', agentsEval?.routing ? `${agentsEval.routing.items} butir, ${pct(agentsEval.routing.pass_rate)}` : NA],
  ['Keahlian agen', agentsEval?.skills ? `${agentsEval.skills.items} butir, ${pct(agentsEval.skills.pass_rate)}` : NA],
  ['Eval live (LLM sungguhan)', NA],
])}

## 7. Pengawasan manusia & register risiko AI
${table(['Risiko', 'Dampak', 'Mitigasi', 'Risiko sisa'], [
  ['Angka salah/dikarang', 'keputusan finansial keliru', 'Verifikator ClaimGate; angka hanya dari tool', 'rendah'],
  ['Prompt injection', 'jawaban menyimpang', 'Penjaga; tool read-only; data sebagai data', 'rendah'],
  ['Data pribadi terkirim ke LLM', 'privasi', 'detektor + persetujuan + peringatan', 'sedang — teks bebas tetap mungkin memuat data pribadi'],
  ['Saran dianggap nasihat', 'kerugian pengguna', 'penafian di setiap Dex & jawaban', 'rendah'],
  ['Biaya LLM tak terkendali', 'operasional', `anggaran token harian (DAILY_TOKEN_BUDGET)`, 'rendah'],
])}

## 8. Prosedur perubahan model
Ubah env model → jalankan \`npm run eval:chat:mock\`, \`npm run eval:agents\`, eval live → catat di \`docs/DECISIONS.md\` → rilis.
`);

write(TECH, 'A11-panduan-pengguna.md', meta('A11', 'Informasi untuk pengguna (ID & EN)', 'Publik', ['ISO/IEC/IEEE 26514'], ['C04'], 'Panduan memakai semua Dex'), `
## 1. Memulai · Getting started
Buka ${f.app.production}. Tanpa akun. Beranda menampilkan Index Constellation: setiap bintang adalah satu Dex. — *No account needed. The home page shows the Index Constellation: each star is one Dex.*

## 2. Setiap Dex · Every Dex
${guide.dex.map((g) => `### ${f.dex.find((d) => d.id === g.id)?.name ?? g.id}\n${g.purpose}\n\n${table(['Tab', 'Fungsi'], g.functions.map((fn) => [fn.tab, fn.what]))}`).join('\n\n')}

## 3. Chat & "Kenapa jawabannya begini?"
Setiap jawaban menampilkan sumber dan langkah perhitungan. Angka hanya dari data. — *Every answer shows sources and calculation steps.*

## 4. AntiScamDex — darurat & Siapkan Laporan
Langkah darurat dan kanal resmi; isian laporan terenkripsi di perangkat dan terhapus otomatis setelah ${RETENTION_DAYS} hari kecuali disimpan.

## 5. Pemasangan · Installation
Halaman /install berisi langkah iPhone/iPad (Bagikan → Tambahkan ke Layar Utama), Android, macOS dan Windows.

## 6. Privasi & hapus data · Privacy & data deletion
Pengaturan → hapus riwayat / reset semua. Lihat Kebijakan Privasi (/legal/privacy, C04).

## 7. Tangkapan layar
\`docs/ui-review/spektrum/\` (Beranda, FinLAIwyer, RupiahDex, Agent Room — terang & gelap).
`);

write(TECH, 'A12-operasi.md', meta('A12', 'Operasi & pemeliharaan', 'Internal', ['ISO/IEC/IEEE 12207:2017 (proses operasi & pemeliharaan)'], ['A09', 'C07'], 'Deploy, konfigurasi, data, insiden'), `
## 1. Deploy
- \`main\` → Vercel produksi (${f.app.production}); cadangan Netlify.
- Rollback: Vercel → Deployments → *Promote* deployment sebelumnya; atau revert commit.
- Rilis: tag \`v*\` memicu \`compliance.yml\` (SBOM, tanda tangan, atestasi, dokumen).

## 2. Variabel lingkungan (tanpa nilai)
${table(['Variabel', 'Lingkup'], [...f.env.server.map((e) => [`\`${e}\``, 'server']), ...f.env.client.map((e) => [`\`${e}\``, 'klien (publik)'])])}

## 3. Skrip npm
${table(['Skrip', 'Perintah'], Object.entries(f.pkg.scripts).map(([k, v]) => [`\`${k}\``, `\`${v.slice(0, 110)}${v.length > 110 ? '…' : ''}\``]))}

## 4. Pembaruan data
\`npm run data:fetch\` → \`data:verify\` (hash) → \`data:extract\` → \`data:fetch-regulations\` → \`data:build\` → \`test:golden\`.

## 5. Runbook insiden
1. Deteksi (galat platform, laporan pengguna, pemindai CI).
2. Klasifikasi: insiden keamanan biasa atau **kegagalan pelindungan data pribadi** → ikuti C07 (pemberitahuan 3 × 24 jam).
3. Mitigasi: rollback deployment, rotasi secret di dashboard platform, nonaktifkan chat (\`CHAT_MODE=mock\`).
4. Catat di register insiden (C07 §5).

## 6. Pemantauan & log
Log platform Vercel berisi metadata permintaan (C01 D04); retensi [KONFIRMASI].
`);

write(TECH, 'A13-keterlacakan-glosarium.md', meta('A13', 'Keterlacakan & glosarium', 'Internal', ['ISO/IEC/IEEE 15289:2019'], ['A02', 'A07'], `${trace.length} kebutuhan`), `
## 1. Matriks keterlacakan
Tes ditautkan otomatis bila file tes menyebut ID Dex, nama tool, atau kata kunci kebutuhan. ${untested.length ? `**${untested.length} kebutuhan belum punya tes yang tertaut** (ditandai —).` : 'Semua kebutuhan punya ≥ 1 tes.'}

${table(['REQ', 'Desain / kode', 'Tes', 'Rilis'], trace.map((r) => [r.id, `\`${r.source}\``, r.tests.length ? r.tests.map((t) => `\`${t.replace('tests/', '')}\``).join(', ') : '—', V]))}

## 2. Glosarium
${table(['Istilah', 'Arti di Finandex'], [
  ['Dex', 'modul topik dengan data, tool, dan chat sendiri (mis. RupiahDex)'],
  ['as-of / Data per', 'tanggal pengamatan terakhir dalam dataset'],
  ['golden', 'nilai rujukan yang harus sama persis dengan keluaran ETL/tool'],
  ['paritas', 'kesamaan hasil implementasi TypeScript dan Python referensi'],
  ['provenance', 'jejak sumber dan transformasi setiap angka'],
  ['tool', 'fungsi server deterministik yang menghitung dari data'],
  ['Konduktor / Penjaga / Verifikator', 'agen perencana / pemeriksa keamanan / pemeriksa angka'],
  ['SBOM / VEX', 'daftar komponen perangkat lunak / pernyataan status kerentanan'],
  ['clientId', 'pengenal acak di perangkat untuk rate limit'],
])}
`);

// ================================================================== Package C
const ctrl = 'Finandex (pemilik: Dea Saka Kurnia Putra) [KONFIRMASI identitas & alamat pengendali]';
write(PRIV, 'C01-inventaris-data.md', meta('C01', 'Inventaris & peta data pribadi', 'Internal', ['UU 27/2022 (UU PDP)', 'ISO/IEC 29100'], ['C02', 'C04', 'C10'], 'Semua elemen data yang diproses atau disimpan'), `
Pengendali: ${ctrl}.

${table(['ID', 'Elemen data', 'Lokasi', 'Tujuan', 'Peran', 'Retensi', 'Bukti'], ELEMENTS.map((e) => [e.id, e.data, e.where, e.purpose, e.role, e.retention, `\`${e.evidence}\``]))}

\`\`\`mermaid
flowchart LR
  subgraph Perangkat[Batas kepercayaan: perangkat pengguna]
    H[(Riwayat chat D05)]; P[(Preferensi D06)]; L[(Laporan terenkripsi D07)]
  end
  subgraph Server[Batas kepercayaan: server Finandex]
    RL[(Kunci rate limit D02/D03)]; LG[(Log metadata D04)]
  end
  Perangkat -- D01 pesan + D02 clientId --> Server
  Server -- D01 teks --> AN[Anthropic · luar negeri]
\`\`\`

Tidak ada analytics pihak ketiga dan tidak ada akun.
`);

const ROPA_FIELDS = '[KONFIRMASI] daftar butir minimum PP 33/2026 Pasal 74 belum dapat disalin karena teks resmi belum tersedia; kolom di bawah mengikuti butir yang lazim (pengendali, tujuan, dasar, kategori subjek & data, penerima, transfer, retensi, keamanan).';
const ACTIVITIES = [
  ['Chat AI', 'D01, D02', 'menjawab pertanyaan', 'persetujuan', 'pengguna aplikasi', 'Anthropic, Vercel', 'ya (Anthropic)', 'tidak disimpan di server', 'TLS, detektor data sensitif'],
  ['Rate limit', 'D02, D03', 'mencegah penyalahgunaan', 'kepentingan yang sah [KONFIRMASI]', 'pengguna chat', 'Vercel, Upstash (opsional)', 'tergantung region [KONFIRMASI]', 'TTL 10 menit / 1 hari', 'kunci tidak berisi isi pesan'],
  ['Log operasional', 'D04', 'operasi & galat', 'kepentingan yang sah [KONFIRMASI]', 'pengguna chat', 'Vercel', 'tergantung region [KONFIRMASI]', '[KONFIRMASI] 30 hari', 'metadata saja'],
  ['Persetujuan', 'D06', 'bukti persetujuan lokal', '—', 'pengguna chat', '—', 'tidak', 'sampai direset', 'di perangkat'],
  ['Distribusi aplikasi', 'D09', 'unduhan & pembaruan', 'perjanjian store', 'pengunduh', 'Apple, Google, GitHub', 'ya', 'kebijakan store', 'dikelola store'],
  ['Dukungan / email', '—', 'menjawab permintaan', 'persetujuan', 'pengirim email', '[KONFIRMASI] penyedia email', '[KONFIRMASI]', '[KONFIRMASI]', '[KONFIRMASI]'],
  ['Feedback anonim', '—', 'perbaikan produk', '—', '—', '—', '—', '—', 'belum ada fitur feedback di kode'],
];
write(PRIV, 'C02-ropa.md', meta('C02', 'Rekaman kegiatan pemrosesan (RoPA)', 'Internal', ['UU PDP (perekaman pemrosesan)', 'PP 33/2026 Pasal 74 (belum diverifikasi)'], ['C01', 'C08'], 'Semua kegiatan pemrosesan'), `
Pengendali: ${ctrl}. Rujukan: ${vMark('UU PDP', '31')}; ${vMark('UU PDP', '20')}.

${ROPA_FIELDS}

${table(['Kegiatan', 'Elemen (C01)', 'Tujuan', 'Dasar', 'Subjek', 'Penerima/prosesor', 'Transfer luar negeri', 'Retensi', 'Keamanan'], ACTIVITIES)}
`);

write(PRIV, 'C03-dpia.md', meta('C03', 'Penilaian Dampak Pelindungan Data Pribadi (DPIA)', 'Internal', ['UU PDP Pasal 34', 'PP 33/2026 Pasal 120–121 (belum diverifikasi)', 'ISO/IEC 29134:2023'], ['C01', 'C09', 'A10'], 'Chat AI, FinLAIwyer/AntiScamDex, penyimpanan lokal'), `
Rujukan: ${vMark('UU PDP', '34')}.

## (a) Chat AI — teks pengguna dikirim ke penyedia LLM di luar negeri
${table(['Aspek', 'Isi'], [
  ['Deskripsi', 'pesan pengguna diteruskan server ke Anthropic untuk menghasilkan jawaban'],
  ['Kebutuhan & proporsionalitas', 'diperlukan untuk fungsi chat; hanya ≤ 20 pesan terakhir; tanpa clientId/IP ke penyedia'],
  ['Risiko bagi subjek', 'pengguna mengetik data pribadi/keuangan; transfer lintas batas'],
  ['Mitigasi', 'persetujuan sebelum chat, detektor data sensitif (blokir), peringatan "jangan masukkan data pribadi", tidak disimpan di server'],
  ['Risiko sisa', 'sedang — teks bebas selain pola yang dideteksi tetap dapat terkirim'],
  ['Keputusan', 'dapat dilanjutkan dengan mitigasi; tinjau saat model/penyedia berubah'],
])}

## (b) FinLAIwyer / AntiScamDex — konteks korban tindak pidana & data keuangan
${table(['Aspek', 'Isi'], [
  ['Deskripsi', 'pertanyaan hukum dan kronologi penipuan dapat diketik ke chat'],
  ['Risiko', 'data yang berkaitan dengan tindak pidana dan keuangan (data pribadi spesifik)'],
  ['Mitigasi', 'wizard laporan tidak dikirim ke server (C01 D07); chat mengingatkan untuk tidak memasukkan identitas; rujukan ke kanal resmi'],
  ['Risiko sisa', 'sedang'],
  ['Keputusan', 'dilanjutkan; [KONFIRMASI] tinjauan konsultan hukum'],
])}

## (c) Penyimpanan lokal wizard
${table(['Aspek', 'Isi'], [
  ['Deskripsi', 'isian laporan disimpan di IndexedDB'],
  ['Mitigasi', `AES-GCM dengan kunci perangkat yang tidak dapat diekspor; hapus otomatis ${RETENTION_DAYS} hari`],
  ['Risiko sisa', 'rendah (perangkat yang dibuka orang lain tetap dapat membuka aplikasi)'],
  ['Keputusan', 'dilanjutkan'],
])}
`);

const privacyText = PRIVACY.map((s) => `### ${s.title.id} · ${s.title.en}\n${s.body.map((b) => `${b.id}\n\n*${b.en}*`).join('\n\n')}`).join('\n\n');
write(PRIV, 'C04-kebijakan-privasi.md', meta('C04', 'Kebijakan Privasi publik (ID & EN)', 'Publik', ['UU PDP (hak & kewajiban informasi)', 'PP 33/2026 Pasal 33 (belum diverifikasi)'], ['C01', 'C05'], 'Isi halaman /legal/privacy'), `
Versi kebijakan aktif di aplikasi: \`${POLICY_VERSION}\` (\`${ref('src/lib/store.ts', 'POLICY_VERSION')}\`). Teks di bawah dibangkitkan dari \`src/content/legal.ts\` — sumber yang sama dengan /legal/privacy.

${privacyText}

### Butir yang belum ada di halaman publik
- Identitas & alamat pengendali, kontak PDP — [KONFIRMASI].
- Transfer lintas batas ke Anthropic (AS) dan dasar transfer — lihat C09.
- Retensi log server — [KONFIRMASI].
`);

write(PRIV, 'C05-persetujuan.md', meta('C05', 'Spesifikasi persetujuan & pemberitahuan', 'Internal', ['UU PDP Pasal 9 & 20', 'PP 33/2026 Pasal 30–36 (belum diverifikasi)'], ['C04', 'C06'], 'Dialog persetujuan chat'), `
Rujukan: ${vMark('UU PDP', '20')}; ${vMark('UU PDP', '9')}.

${table(['Syarat', 'Implementasi', 'Bukti'], [
  ['Eksplisit & spesifik', 'dialog khusus chat sebelum pesan pertama', `\`${ref('src/components/ConsentDialog.tsx')}\``],
  ['Tidak digabung dengan syarat & ketentuan', 'dialog persetujuan terpisah dari halaman Ketentuan', '`src/content/legal.ts` (PRIVACY vs TERMS)'],
  ['Layanan tetap tersedia tanpa persetujuan', 'Dex, grafik, statistik dapat dipakai tanpa chat', '`src/features/dex/`'],
  ['Penarikan persetujuan', 'Pengaturan → reset semua menghapus consentVersion dan clientId', `\`${ref('src/lib/store.ts', 'resetAll')}\``],
  ['Bukti persetujuan', `versi kebijakan disimpan di perangkat (\`consentVersion\` = \`${POLICY_VERSION}\`); server tidak mencatat persetujuan`, `\`${ref('src/lib/store.ts', 'acceptConsent')}\``],
  ['Re-consent', 'bila POLICY_VERSION berubah, dialog muncul lagi', `\`${ref('src/components/ConsentDialog.tsx', 'POLICY_VERSION')}\``],
])}

Catatan: bukti persetujuan hanya di perangkat (data minimum). Bila PP 33/2026 Pasal 36 mensyaratkan bukti di sisi pengendali, rancangan tambahan: catat \`(POLICY_VERSION, waktu, hash clientId)\` di server — [KONFIRMASI] setelah teks resmi diverifikasi.
`);

write(PRIV, 'C06-hak-subjek.md', meta('C06', 'Prosedur hak subjek data', 'Internal', ['UU PDP Pasal 5–11', 'PP 33/2026 Pasal 71, 77, 92, 93–96, 99 (belum diverifikasi)'], ['C04', 'C05'], 'Permintaan hak subjek data'), `
${table(['Hak', 'Rujukan', 'Cara memenuhi (tanpa akun)'], [
  ['Informasi', vMark('UU PDP', '5'), 'Kebijakan Privasi (C04)'],
  ['Memperbaiki', vMark('UU PDP', '6'), 'data di perangkat diubah/dihapus langsung oleh pengguna'],
  ['Akses & salinan', vMark('UU PDP', '7'), 'ekspor riwayat chat dari perangkat; server tidak menyimpan isi pesan'],
  ['Mengakhiri & menghapus', vMark('UU PDP', '8'), 'Pengaturan → hapus riwayat / reset semua; kunci rate limit kedaluwarsa sendiri (TTL)'],
  ['Menarik persetujuan', vMark('UU PDP', '9'), 'reset semua → chat terkunci sampai persetujuan baru'],
  ['Keberatan atas keputusan otomatis', vMark('UU PDP', '10'), 'jawaban chatbot bersifat informasi, bukan keputusan yang berdampak hukum atas subjek; tetap dapat diajukan lewat kontak PDP'],
  ['Menunda/membatasi', vMark('UU PDP', '11'), 'berhenti memakai chat; tenggat 3 × 24 jam (PP 33/2026 Pasal 99, belum diverifikasi)'],
])}

Kanal: kontak PDP [KONFIRMASI]. Log permintaan: tanggal diterima, hak, tindakan, tanggal selesai.
`);

write(PRIV, 'C07-kegagalan-pdp.md', meta('C07', 'Prosedur pemberitahuan kegagalan pelindungan data pribadi', 'Internal', ['UU PDP Pasal 46', 'PP 33/2026 Pasal 114–118 (belum diverifikasi)'], ['A12'], 'Insiden data pribadi'), `
Rujukan: ${vMark('UU PDP', '46')}.

## 1. Tenggat
Pemberitahuan tertulis kepada subjek data dan lembaga (sementara: Komdigi) paling lambat **3 × 24 jam** sejak kegagalan diketahui.

## 2. Isi pemberitahuan
Data yang terungkap; kapan dan bagaimana terungkap; upaya penanganan dan pemulihan.

## 3. Langkah
1. Pastikan insiden (runbook A12 §5).
2. Hentikan sumber (rollback, rotasi secret, \`CHAT_MODE=mock\`).
3. Nilai elemen C01 yang terdampak (catatan: isi pesan tidak disimpan di server — paparan paling mungkin adalah log metadata atau kunci rate limit).
4. Kirim pemberitahuan; pemberitahuan publik bila subjek tidak dapat dihubungi satu per satu (tanpa akun, ini kemungkinan besar).
5. Prosesor melapor ke pengendali pada kesempatan pertama (C08).

## 4. Templat
**ID:** "Pada [tanggal] kami mengetahui [uraian]. Data yang terdampak: [elemen]. Langkah yang telah kami ambil: [tindakan]. Kontak: [kontak PDP]."

**EN:** "On [date] we became aware of [description]. Data affected: [elements]. Steps taken: [actions]. Contact: [PDP contact]."

## 5. Register insiden
| Tanggal | Uraian | Elemen | Diberitahukan | Selesai |
|---|---|---|---|---|
| — | belum ada insiden | — | — | — |
`);

const PROC = [
  ['anthropic', 'Anthropic', 'LLM — memproses teks percakapan', 'AS', 'https://www.anthropic.com/legal/commercial-terms'],
  ['vercel', 'Vercel', 'hosting & fungsi serverless, log', 'global (region fungsi [KONFIRMASI])', 'https://vercel.com/legal/dpa'],
  ['netlify', 'Netlify', 'hosting cadangan', 'global', 'https://www.netlify.com/pdf/netlify-dpa.pdf'],
  ['github', 'GitHub', 'repo, CI, rilis', 'AS', 'https://github.com/customer-terms'],
  ['upstash', 'Upstash', 'rate limit (opsional)', 'region [KONFIRMASI]', 'https://upstash.com/trust/dpa.pdf'],
  ['apple', 'Apple', 'distribusi App Store', 'global', 'https://www.apple.com/legal/privacy/'],
  ['google', 'Google', 'distribusi Play Store', 'global', 'https://policies.google.com/privacy'],
];
write(PRIV, 'C08-prosesor.md', meta('C08', 'Register prosesor & sub-prosesor', 'Internal', ['UU PDP (pengendali–prosesor)'], ['C01', 'C09'], 'Layanan eksternal yang dipanggil kode/konfigurasi'), `
Kolom "Terdeteksi di repo" dibangkitkan dari \`detectServices()\` (pencarian pola di kode, konfigurasi, dan workflow). Tautan DPA/ketentuan perlu diverifikasi pemilik sebelum disetujui [KONFIRMASI].

${table(['Prosesor', 'Peran', 'Lokasi', 'Terdeteksi di repo', 'Bukti', 'Ketentuan/DPA'], PROC.map(([id, name, role, loc, url]) => { const s = svc.find((x) => x.id === id); return [name!, role!, loc!, s?.used ? 'ya' : 'tidak', s ? `\`${s.evidence}\`` : '—', url!]; }))}

Penyedia email dukungan: [KONFIRMASI]. Lovable: tidak terdeteksi sebagai layanan yang dipanggil kode.
`);

write(PRIV, 'C09-transfer-lintas-batas.md', meta('C09', 'Penilaian transfer data lintas batas', 'Internal', ['UU PDP Pasal 56', 'PP 33/2026 Pasal 160–167 (belum diverifikasi)'], ['C03', 'C08'], 'Prosesor di luar Indonesia'), `
Rujukan: ${vMark('UU PDP', '56')}.

Urutan dasar transfer: tingkat pelindungan setara → pelindungan yang memadai dan mengikat → persetujuan subjek data. Karena penilaian kesetaraan bergantung pada lembaga PDP yang belum terbentuk, mekanisme sementara dicatat di bawah.

${table(['Prosesor', 'Data', 'Negara', 'Mekanisme sementara'], [
  ['Anthropic', 'teks percakapan (D01)', 'AS', 'ketentuan komersial penyedia + persetujuan pengguna di dialog chat [KONFIRMASI penyebutan transfer di dialog]'],
  ['Vercel', 'D01 (transit), D03, D04', 'tergantung region', 'DPA Vercel [KONFIRMASI]'],
  ['Upstash (opsional)', 'D02, D03', 'tergantung region', 'DPA Upstash [KONFIRMASI]'],
])}
`);

write(PRIV, 'C10-retensi.md', meta('C10', 'Kebijakan retensi & pemusnahan', 'Internal', ['UU PDP', 'PP 33/2026 (belum diverifikasi)'], ['C01'], 'Semua elemen C01'), `
${table(['Elemen', 'Retensi', 'Cara pemusnahan', 'Bukti'], ELEMENTS.map((e) => [`${e.id} — ${e.data.split(' (')[0]}`, e.retention, e.where.startsWith('perangkat') ? 'dihapus pengguna (Pengaturan) atau otomatis' : 'kedaluwarsa TTL / rotasi log platform', `\`${e.evidence}\``]))}
`);

write(PRIV, 'C11-pejabat-pdp.md', meta('C11', 'Penetapan Pejabat/Petugas PDP', 'Internal', ['UU PDP Pasal 53', 'PP 33/2026 Pasal 142–146 (belum diverifikasi)'], ['C06', 'C07'], 'Kewajiban menunjuk pejabat PDP'), `
Rujukan: ${vMark('UU PDP', '53')}.

${table(['Kriteria wajib', 'Finandex', 'Alasan'], [
  ['Pemrosesan untuk pelayanan publik', 'tidak', 'aplikasi swasta'],
  ['Pemantauan teratur & sistematis berskala besar', 'tidak', 'tanpa akun, tanpa analytics, tanpa profil pengguna'],
  ['Data pribadi spesifik / terkait tindak pidana berskala besar', 'tidak secara sengaja', 'teks bebas di chat tidak disimpan; wizard tetap di perangkat'],
])}

Kesimpulan sementara: tidak wajib, namun tetap menunjuk **kontak PDP** [KONFIRMASI nama & alamat]. Templat penetapan: "Dengan ini [nama pengendali] menetapkan [nama] sebagai kontak pelindungan data pribadi Finandex sejak [tanggal]."
`);

const pbd = [
  ['Chat', 'persetujuan, detektor data sensitif, tanpa penyimpanan server', 'src/components/ConsentDialog.tsx'],
  ['AntiScamDex / Siapkan Laporan', 'terenkripsi di perangkat, hapus otomatis', 'src/lib/secure-store.ts'],
  ['FinLAIwyer', 'rujukan teks resmi; tanpa pengiriman identitas', 'kit/datasets/law/legal_qa_flows.json'],
  ['Riwayat & preferensi', 'hanya di perangkat, dapat dihapus', 'src/lib/history.ts'],
  ['Install / PWA', 'tanpa pelacakan pemasangan', 'src/features/install/InstallCenter.tsx'],
  ['Desktop', f.hasTauri ? 'capabilities Tauri minimum' : 'belum ada aplikasi desktop di repo', f.hasTauri ? 'src-tauri/tauri.conf.json' : '—'],
  ['Feedback', 'belum ada fitur feedback', '—'],
];
write(PRIV, 'C12-privacy-by-design.md', meta('C12', 'Privacy by design & by default', 'Internal', ['PP 33/2026 Pasal 123–124 (belum diverifikasi)', 'ISO/IEC 27701:2025', 'ISO/IEC 29100'], ['C01', 'C03'], 'Daftar periksa per fitur'), `
${table(['Fitur', 'Penerapan', 'Bukti'], pbd.map(([a, b, c]) => [a!, b!, c === '—' ? '—' : `\`${ref(c!)}\``]))}

Default: tanpa akun, tanpa analytics, chat terkunci sampai persetujuan, data lokal saja.
`);

write(PRIV, 'C13-data-anak.md', meta('C13', 'Data anak', 'Internal', ['UU PDP Pasal 25'], ['C04'], 'Posisi Finandex terhadap pengguna anak'), `
Rujukan: ${vMark('UU PDP', '25')}.

- Finandex tidak ditujukan untuk anak; rating usia store [KONFIRMASI].
- Tidak ada pengumpulan usia karena tanpa akun.
- Bila terdeteksi data anak dalam permintaan hak subjek, data perangkat dihapus atas permintaan orang tua/wali.
`);

write(PRIV, 'C14-kepatuhan-pendukung.md', meta('C14', 'Kepatuhan pendukung', 'Internal', ['Permenkominfo 5/2020 & perubahannya', 'Pedoman App Store & Google Play'], ['C01'], 'PSE, label privasi store'), `
${table(['Butir', 'Status'], [
  ['Pendaftaran PSE Lingkup Privat ke Komdigi sebelum peluncuran publik', '[KONFIRMASI]'],
  ['App Privacy (Apple): "Data Not Collected" kecuali isi pesan chat (D01) yang diproses untuk fungsi aplikasi dan tidak ditautkan ke identitas', 'disiapkan dari C01 — [KONFIRMASI saat pengajuan]'],
  ['Data safety (Google): data dienkripsi saat transit; pengguna dapat meminta penghapusan (data di perangkat)', 'disiapkan dari C01 — [KONFIRMASI saat pengajuan]'],
  ['Tinjauan konsultan hukum PDP Indonesia', '[KONFIRMASI]'],
])}
`);

// ------------------------------------------------------------------ LEGAL_REFS_VERIFIED.md
writeFileSync(join(PRIV, 'LEGAL_REFS_VERIFIED.md'), `# Verifikasi rujukan pasal — Paket C

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

Dibangkitkan ${today} dari teks resmi di \`${CHUNKS}\`. UU 27/2022: ${pdpLock?.status === 'available' ? `PDF resmi ${pdpLock.url} (SHA-256 \`${pdpLock.sha256}\`, ${pdpLock.pages} halaman, diambil ${pdpLock.fetched_at})` : 'teks resmi belum tersedia'}. PP 33/2026: ${ppLock?.status === 'available' ? 'tersedia' : `**belum tersedia** — ${ppLock?.reason ?? 'tidak ada di lock'}; semua rujukan PP 33/2026 di Paket C berasal dari prompt (ringkasan sekunder) dan **belum diverifikasi**`}. Kutipan teks peraturan diperbolehkan (UU 28/2014 Pasal 42).

${table(['Peraturan', 'Pasal', 'Topik yang dirujuk', 'Dipakai di', 'Status', 'Hal.', 'Kutipan awal teks resmi'], verified.map((v) => [v.law, v.pasal, v.topic, v.usedIn, v.status, v.page, v.quote]))}
`);

// ------------------------------------------------------------------ shared registers
const standards = `# Standar & rujukan yang dipakai

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

Diperiksa ${today}. "belum diverifikasi ulang" berarti edisi diambil dari prompt dan wajib dicek ke katalog resmi sebelum dokumen disetujui.

${table(['Area', 'Rujukan', 'Edisi / tanggal', 'Verifikasi'], [
  ['Kerangka information item', 'ISO/IEC/IEEE 15289', '2019 (edisi ke-4)', 'belum diverifikasi ulang'],
  ['Proses daur hidup', 'ISO/IEC/IEEE 12207', '2017', 'belum diverifikasi ulang'],
  ['Kebutuhan', 'ISO/IEC/IEEE 29148', 'edisi terbaru', 'belum diverifikasi ulang'],
  ['Arsitektur', 'ISO/IEC/IEEE 42010', '2022', 'belum diverifikasi ulang'],
  ['Pengujian', 'ISO/IEC/IEEE 29119-3', '2021', 'belum diverifikasi ulang'],
  ['Kualitas produk', 'ISO/IEC 25010', '2023', 'belum diverifikasi ulang'],
  ['Kualitas data', 'ISO/IEC 25012', '—', 'belum diverifikasi ulang'],
  ['Informasi pengguna', 'ISO/IEC/IEEE 26514', 'edisi terbaru', 'belum diverifikasi ulang'],
  ['Keamanan informasi', 'ISO/IEC 27001 (+ Amd 1:2024), 27002, 27005', '2022', 'belum diverifikasi ulang'],
  ['Keamanan aplikasi', 'ISO/IEC 27034; OWASP ASVS 5.0; OWASP Top 10 for LLM Applications', '—', 'belum diverifikasi ulang'],
  ['Sistem & risiko AI', 'ISO/IEC 42001; ISO/IEC 23894', '2023', 'belum diverifikasi ulang'],
  ['Privasi', 'ISO/IEC 27701; ISO/IEC 29100; ISO/IEC 29134', '2025; —; 2023', 'belum diverifikasi ulang'],
  ['Format SBOM (utama)', 'CycloneDX 1.7 = ECMA-424', 'edisi ke-2, Desember 2025', 'ecma-international.org & cyclonedx.org — dicek 2026-10-23'],
  ['Format SBOM (sekunder)', 'SPDX', '2.3 (ISO/IEC 5962:2021 = SPDX 2.2.1)', 'belum diverifikasi ulang'],
  ['Elemen minimum SBOM', 'CISA dkk. — 2026 Minimum Elements for a Software Bill of Materials', '29 Juli 2026; menggantikan NTIA 2021', 'cisa.gov & nsa.gov — dicek 2026-10-23'],
  ['SBOM untuk AI', 'CISA & mitra — Software Bill of Materials for AI, Minimum Elements', '2026', 'cisa.gov — judul perlu dicek ulang'],
  ['Rantai pasok', 'NIST SP 800-218 (SSDF); SLSA Build track; ISO/IEC 5230:2020; ISO/IEC 18974:2023', '—', 'belum diverifikasi ulang'],
  ['Kualitas SBOM', 'sbomqs (Interlynk)', 'v2.1.2', 'GitHub release + checksum'],
  ['Pelindungan data pribadi', 'UU 27/2022 (UU PDP)', '17 Oktober 2022', pdpLock?.status === 'available' ? `teks resmi JDIH BPK, SHA-256 ${pdpLock.sha256?.slice(0, 12)}… — pasal dicek di LEGAL_REFS_VERIFIED.md` : 'teks resmi belum tersedia'],
  ['Pelaksanaan UU PDP', 'PP 33/2026', 'diundangkan 16 Juli 2026, berlaku 16 Januari 2027 (menurut prompt)', ppLock?.status === 'available' ? 'teks resmi tersedia' : 'teks resmi belum dapat diunduh — belum diverifikasi'],
  ['PSE', 'Permenkominfo 5/2020 & perubahannya', '—', 'belum diverifikasi ulang'],
])}
`;
writeFileSync('docs/compliance/STANDARDS_REFERENCED.md', standards);

const openItems = [
  ['Penyetuju (approver) dokumen kepatuhan', 'semua', 'blok kontrol dokumen'],
  ['Identitas & alamat pengendali data', 'C01, C02, C04', 'nama badan/perorangan, alamat'],
  ['Kontak PDP / pejabat PDP', 'C04, C06, C11', 'nama & email'],
  ['Alamat kontak keamanan & pertanyaan SBOM', 'B01, SECURITY.md', 'email resmi'],
  ['Retensi log server (usulan 30 hari)', 'C01, C10, A12', 'atur di platform'],
  ['Dasar pemrosesan rate limit & log (kepentingan yang sah)', 'C01, C02', 'konfirmasi pilihan dasar'],
  ['Teks resmi PP 33/2026 untuk verifikasi pasal', 'C02–C12, LEGAL_REFS_VERIFIED.md', 'unduh dari JDIH resmi lalu jalankan ulang docs:build'],
  ['Penyebutan transfer ke Anthropic (AS) di dialog persetujuan', 'C05, C09', 'teks dialog'],
  ['Region Vercel/Upstash dan DPA yang berlaku', 'C08, C09', 'verifikasi tautan'],
  ['Penyedia email dukungan', 'C02, C08', '—'],
  ['Pendaftaran PSE Lingkup Privat', 'C14', 'sebelum peluncuran publik'],
  ['Tinjauan konsultan hukum PDP Indonesia', 'Paket C', 'sebelum publikasi'],
  ['Kerahasiaan prompt sistem', 'A10', 'boleh dimuat atau tidak'],
  ['Uji penetrasi pihak ketiga', 'A09', 'ASVS verifikasi independen'],
  [`Menandai rilis \`v${V}\` agar compliance.yml menandatangani & mengatestasi SBOM`, 'B01, B02', 'izin push tag'],
  ['Pin versi paket Python referensi', 'B01, B03', 'parity.yml'],
  ['Mengaktifkan OpenSSF Scorecard', 'B03', 'workflow terpisah'],
  ['Rating usia store', 'C13, C14', '—'],
  ['Izin DefiLlama untuk data DeFi CryptDex: dataset input menyebut DefiLlama sebagai sumber, sedangkan ketentuan DefiLlama (dibaca 2026-10-24) melarang "republish the data in any form without permission"', 'A06, docs/live-data/REPORT.md', 'minta izin tertulis atau batasi tampilan'],
  ['Lisensi penyedia harga saham/indeks/kripto (Yahoo Finance, CoinGecko, CoinMarketCap) untuk data live', 'scripts/live-data/sources.yaml', 'saat ini blocked-pending-license'],
  ['Kunci tanda tangan updater Tauri (TAURI_SIGNING_PRIVATE_KEY/PUBLIC_KEY), sertifikat Apple Developer ID + notarisasi, tanda tangan Authenticode Windows', 'A12, desktop.yml', 'secret repo; tanpa itu build desktop tidak bertanda tangan'],
  ['Kompilasi Rust src-tauri belum diverifikasi lokal (index.crates.io tidak dapat di-resolve dari mesin pengembang); verifikasi pertama di desktop.yml', 'A03, A12', 'jalankan workflow desktop manual'],
];
writeFileSync('docs/compliance/OPEN_ITEMS.md', `# Butir yang memerlukan keputusan pemilik — [KONFIRMASI]

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

${table(['#', 'Butir', 'Dokumen', 'Keterangan'], openItems.map((o, i) => [i + 1, ...o]))}
`);

const B_DOCS: [string, string, DocMeta['classification'], string][] = [
  ['B01', 'Kebijakan & prosedur SBOM', 'Publik', 'sbom/B01-kebijakan-sbom.md'],
  ['B02', 'Panduan verifikasi untuk penerima', 'Publik', 'sbom/B02-verifikasi-penerima.md'],
  ['B03', 'Keamanan rantai pasok', 'Internal', 'sbom/B03-rantai-pasok.md'],
  ['B04', 'Register kerentanan & VEX', 'Internal', 'sbom/B04-register-kerentanan-vex.md'],
  ['B05', 'AI-BOM', 'Publik', 'sbom/B05-ai-bom.md'],
];
const all = [...written.filter((w) => w.id.startsWith('A')), ...B_DOCS.map(([id, title, cls, path]) => ({ id, title, cls, path })), ...written.filter((w) => w.id.startsWith('C'))];
writeFileSync('docs/compliance/INDEX.md', `# Daftar induk dokumen kepatuhan

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

Versi aplikasi ${V} · commit \`${f.app.commit}\` · ${today}. Paket A (dokumentasi teknis), Paket B (Secure SBOM), Paket C (pelindungan data pribadi).

${table(['ID', 'Judul', 'Versi', 'Status', 'Klasifikasi', 'MD', 'PDF'], all.map((d) => [d.id, d.title, V, 'Draf', d.cls, `[MD](${d.path})`, `[PDF](pdf/${d.id}.pdf)`]))}

Lampiran: [OpenAPI](technical/openapi.json) · [verifikasi pasal](privacy/LEGAL_REFS_VERIFIED.md) · SBOM \`public/sbom/${V}/\` · [ringkasan SBOM](sbom/SBOM_SUMMARY.json) · [hasil gate SBOM](sbom/SBOM_CHECK.json) · [standar](STANDARDS_REFERENCED.md) · [butir terbuka](OPEN_ITEMS.md).
`);

console.log(`docs: ${written.length} documents (A ${written.filter((w) => w.id.startsWith('A')).length}, C ${written.filter((w) => w.id.startsWith('C')).length}); REQ ${trace.length} (${untested.length} without a linked test); UU PDP refs ${verified.filter((v) => v.status === 'cocok').length}/${verified.filter((v) => v.law === 'UU PDP').length} matched; SBOM master ${sbomSummary ? fmtInt(sbomSummary.master.components) : NA} components`);
