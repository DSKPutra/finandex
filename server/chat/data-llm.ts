// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// "Data mode" (no AI model configured): answers ONLY from the Dex tools. Turn 1 routes the question to tool
// calls (known evaluation questions → their scenario; entity detection for time-series Dex; keyword match
// against tool names/labels/descriptions; otherwise the Dex's overview panel). Turn 2 composes the answer
// from the tool results (every number comes from a tool). Charts and the "why" panel come from the same
// tool calls via the orchestrator, exactly as with Claude.
import type { Locale } from '../../src/config/brand';
import type { DexId } from '../../src/config/dex-registry';
import { getDex } from '../../src/config/dex-registry';
import { DOCS, FLOWS } from '../../src/config/law-catalog';
import { findGlossary } from '../../src/config/law-glossary';
import { matchFlows } from '../../src/shared/law/flow-engine';
import { TABS } from '../../src/features/dex/panels';
import { buildInput, fieldsOf } from '../../src/features/dex/schema-form';
import { formatDate, formatNumber, formatPercent, formatPercentPoints } from '../../src/shared/format';
import { normaliseKey } from '../../src/shared/text';
import type { DataStore } from '../data/store';
import { makeAdapters } from '../dex/adapters';
import { toolsFor } from '../dex/index';
import type { ToolDef } from '../tools/kit';
import type { Block, Llm, TurnRequest, TurnResult } from './llm';
import type { Results, Scenario } from './mock-llm';

type Call = { name: string; input: Record<string, unknown> };
export type KnownQuestion = { dex: string; question: string; scenario: Scenario };

const META = new Set(['app_info', 'open_dex', 'dataset_info', 'data_quality', 'search_entities', 'cross_dex_lookup']);
const STOP = new Set(
  'apa yang dan atau di ke dari untuk dengan pada dalam ini itu berapa bagaimana kapan mana siapa adalah sebagai ada tidak saya kamu tolong mohon data dataset menurut sejak terakhir tahun the a an of in on for to and or with what which how when who is are was be by from as at this that me please show give tell about vs versus'.split(' '),
);
const TEXT_KEYS = ['query', 'topic', 'name', 'skill', 'company'];

/** Country names (id/en) → dataset spellings; tools are tried with the name, then the ISO-2 code. */
const COUNTRIES: [RegExp, string, string][] = [
  [/\bindonesia\b/i, 'Indonesia', 'ID'], [/\bindia\b/i, 'India', 'IN'], [/singapura|singapore/i, 'Singapore', 'SG'], [/amerika serikat|united states|\busa\b/i, 'United States', 'US'], [/\b(AS|US)\b/, 'United States', 'US'],
  [/tiongkok|china/i, 'China', 'CN'], [/jepang|japan/i, 'Japan', 'JP'], [/malaysia/i, 'Malaysia', 'MY'], [/kanada|canada/i, 'Canada', 'CA'], [/jerman|germany/i, 'Germany', 'DE'],
  [/inggris|united kingdom|\buk\b/i, 'United Kingdom', 'GB'], [/brasil|brazil/i, 'Brazil', 'BR'], [/australia/i, 'Australia', 'AU'], [/filipina|philippines/i, 'Philippines', 'PH'], [/vietnam/i, 'Vietnam', 'VN'], [/thailand/i, 'Thailand', 'TH'],
];
function countryIn(q: string): { name: string; iso2: string } | null {
  const hit = COUNTRIES.find(([re]) => re.test(q));
  return hit ? { name: hit[1], iso2: hit[2] } : null;
}
/** Routing words that describe the request rather than the thing searched for. */
const NOISE = new Set('cari carikan temukan tampilkan find search show list daftar tentang about menu ulasan review reviews diskusi discussion discussions posts unggahan perusahaan company companies investor investors reksa dana fund funds ipo ipos item items di in tren trend per bulan month'.split(' '));
const words = (s: string) =>
  normaliseKey(s)
    .replace(/[^a-z0-9.&^=-]+/g, ' ')
    .split(' ')
    .filter((w) => w.length >= 2 && !STOP.has(w));

/** Words that change what is asked (superlatives, statistics, periods); they must match for a known plan. */
const INTENT = new Set('tertinggi terendah terbesar terkecil terakhir terbaru rata median korelasi drawdown ytd tahun bulan sepanjang highest lowest largest smallest latest last average correlation year month all beta dividen volume'.split(' '));

const escapeRe = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Tickers (upper-case tokens) and numbers must be identical before a known question's fixed plan is reused. */
function sameSpecifics(a: string, b: string): boolean {
  const spec = (x: string) =>
    new Set(
      x
        .replace(/[?.,!;:()/]/g, ' ')
        .split(/\s+/)
        .filter((t) => /^[A-Z0-9^=.-]{2,}$/.test(t) && /[A-Z0-9]/.test(t))
        .map((t) => t.toUpperCase()),
    );
  const A = spec(a);
  const B = spec(b);
  const ia = new Set(words(a).filter((w) => INTENT.has(w)));
  const ib = new Set(words(b).filter((w) => INTENT.has(w)));
  return A.size === B.size && [...A].every((t) => B.has(t)) && ia.size === ib.size && [...ia].every((w) => ib.has(w));
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  let i = 0;
  for (const x of A) if (B.has(x)) i++;
  return i / Math.max(1, A.size + B.size - i);
}

/** Small id/en synonym table so Indonesian questions reach English tool names. */
const SYN: Record<string, string[]> = {
  korelasi: ['correlation'], kapitalisasi: ['market', 'cap', 'valuation'], profil: ['profile'], likuid: ['liquidity'], tertinggi: ['rank', 'top', 'high'], tahun: ['year'], per: [], sektor: ['sector'], tipe: ['type'], tahap: ['stage'], terbanyak: ['rank', 'top', 'most'], most: ['rank', 'top'], bursa: ['exchange'], grade: ['grade'], dikutip: ['papers', 'cited'], kalender: ['calendar'], tahunan: ['yearly', 'calendar', 'annual'], bandingkan: ['compare'], perbandingan: ['compare'],
  peringkat: ['rank'], terbesar: ['rank', 'top'], terendah: ['rank'], top: ['rank', 'top'], teratas: ['top', 'rank'],
  dividen: ['dividends'], split: ['splits'], volume: ['volume'], likuiditas: ['liquidity', 'volume'], simulasi: ['simulate'], simulasikan: ['simulate'],
  kurs: ['fx', 'rate'], konversi: ['convert'], rata: ['average'], suku: ['rate', 'rates'], bunga: ['rate', 'rates'], inflasi: ['inflation'],
  gaji: ['salary', 'salaries'], skill: ['skill', 'skills'], keahlian: ['skill'], distribusi: ['distribution'], median: ['median', 'stats'],
  sentimen: ['sentiment'], topik: ['topic', 'topics'], aspek: ['aspect'], tren: ['trend'], ulasan: ['posts', 'search'], cari: ['search'],
  pendanaan: ['funding'], putaran: ['rounds'], investor: ['investor', 'investors'], jaringan: ['network', 'graph'], pasangan: ['pairs'],
  perusahaan: ['company', 'companies'], negara: ['country', 'countries'], kota: ['city', 'cities'], provinsi: ['province'], harga: ['price'],
  biaya: ['cost'], hidup: ['living'], kemiskinan: ['mpi', 'poverty'], dimensi: ['dimension'], liputan: ['coverage'], berita: ['coverage', 'articles'],
  tema: ['themes'], organisasi: ['organisations'], riset: ['research'], paten: ['patents'], temuan: ['findings'], nada: ['tone'],
  pasal: ['pasal'], penjelasan: ['penjelasan'], sumber: ['sources'], bandingan: ['compare'], halaman: ['page'], markup: ['markup'], promo: ['promo'],
  kemasan: ['fee'], neraca: ['balance', 'sheets'], imbal: ['yield', 'curve'], inversi: ['inversions'], uang: ['money'], beredar: ['money'],
  ipo: ['ipo'], ditarik: ['withdrawn'], reksa: ['fund'], manajer: ['mi'], kustodian: ['custodian'], aum: ['aum'],
  fundamental: ['fundamentals'], valuasi: ['valuation'], emiten: ['company'], tvl: ['tvl'], yield: ['yield'], apy: ['yield'], fee: ['fees'],
  stablecoin: ['stablecoins'], bot: ['bots'], keamanan: ['security'], dominasi: ['snapshot', 'market'], drawdown: ['drawdowns'], ekstrem: ['extreme'],
  teknikal: ['technical'], beta: ['beta'], pertumbuhan: ['growth'], makro: ['macro'], rezim: ['regime'], keputusan: ['decisions'],
};
const expand = (ws: string[]) => [...new Set(ws.flatMap((w) => [w, ...(SYN[w] ?? [])]))];

function periodFrom(q: string): string | null {
  const m = /(\d{1,2})\s*(tahun|thn|year|years|yr|y)\b/i.exec(q);
  if (m) {
    const n = Number(m[1]);
    for (const p of [1, 3, 5, 10]) if (n <= p) return `${p}Y`;
    return 'MAX';
  }
  if (/\bytd\b|tahun ini|this year/i.test(q)) return 'YTD';
  if (/sepanjang|all[- ]time|max/i.test(q)) return 'MAX';
  return null;
}

const FINANCE_WORD = /bank|perbankan|ojk|otoritas jasa keuangan|bank indonesia|\bbi\b|lps|simpanan|deposito|kredit|nasabah|rahasia bank|transfer|asuransi|pinjaman|pinjol|pindar|e-wallet|dompet digital|uang elektronik|p2sk|pojk|pbi|banking|scam|penipuan|ditipu|tertipu|uang nyasar|investasi bodong/i;

/** English legal terms → the Indonesian words used in the statutes (search runs on Indonesian text). */
const EN_ID: Record<string, string> = {
  rights: 'hak', right: 'hak', consumer: 'konsumen', consumers: 'konsumen', negligent: 'kelalaian', negligence: 'kelalaian', lose: 'kerugian', loss: 'kerugian', losses: 'kerugian', compensation: 'ganti rugi',
  investigator: 'penyidik', investigators: 'penyidik', suspect: 'tersangka', defendant: 'terdakwa', detention: 'penahanan', arrest: 'penangkapan', pretrial: 'praperadilan', evidence: 'alat bukti', witness: 'saksi',
  fraud: 'penipuan', scam: 'penipuan', penalty: 'pidana', penalties: 'pidana', criminal: 'pidana', prison: 'penjara', fine: 'denda', secrecy: 'rahasia', customer: 'nasabah', customers: 'nasabah', deposit: 'simpanan', deposits: 'simpanan',
  transfer: 'transfer dana', laundering: 'pencucian uang', data: 'data pribadi', personal: 'pribadi', complaint: 'pengaduan', complaints: 'pengaduan', lender: 'penyelenggara pendanaan', loan: 'pinjaman', collection: 'penagihan', license: 'izin', licence: 'izin',
  state: 'negara', sovereignty: 'kedaulatan', republic: 'republik', president: 'presiden', definition: 'yang dimaksud dengan', aid: 'bantuan hukum', lawsuit: 'gugatan',
};

const FEATURE_Q = /fitur (ini|apa)|untuk apa|bisa tanya apa|bisa (saya )?tanya|ada fitur|cara pakai|cara menggunakan|what can (i|you)|what (is|are) (this|these) (feature|for)|how (do i|to) use|features?\b/i;

/** Named documents in a question → catalogue id (order matters: most specific first). */
const DOC_NAMES: [RegExp, string][] = [
  [/uud nri|uud .*(berlaku|perubahan|amandemen|amended)/i, 'uud-nri-1945'],
  [/uud|undang-undang dasar|constitution/i, 'uud-1945-naskah-asli'],
  [/kuhap (baru|2025)|20\/2025|new kuhap/i, 'uu-20-2025-kuhap'],
  [/kuhap|8\/1981|criminal procedure/i, 'uu-8-1981-kuhap'],
  [/kuhp|1\/2023|criminal code/i, 'uu-1-2023-kuhp'],
  [/1\/2026|penyesuaian pidana/i, 'uu-1-2026-penyesuaian-pidana'],
  [/transfer dana|3\/2011/i, 'uu-3-2011-transfer-dana'],
  [/\bite\b.*(2024|1\/2024)|1\/2024/i, 'uu-1-2024-ite'],
  [/\bite\b|11\/2008/i, 'uu-11-2008-ite'],
  [/tppu|pencucian uang|8\/2010|money laundering/i, 'uu-8-2010-tppu'],
  [/\bpdp\b|data pribadi|27\/2022/i, 'uu-27-2022-pdp'],
  [/pbi 6\/2026|6\/2026/i, 'pbi-6-2026-pkbi'],
  [/pbi 3\/2023|3\/2023/i, 'pbi-3-2023-pkbi'],
  [/pojk 22\/2023|22\/2023/i, 'pojk-22-2023'],
  [/perlindungan konsumen|8\/1999/i, 'uu-8-1999-perlindungan-konsumen'],
  [/perbankan|10\/1998/i, 'uu-10-1998-perbankan'],
  [/bantuan hukum|16\/2011/i, 'uu-16-2011-bantuan-hukum'],
];
const docsNamed = (q: string) => DOC_NAMES.filter(([re]) => re.test(q)).map(([, id]) => id);

function lawPlan(dex: DexId, question: string, qw: string[]): { calls: Call[] } | null {
  const q = question;
  if (FEATURE_Q.test(q)) return { calls: [{ name: 'feature_guide', input: { dexId: /aplikasi|finandex|\bapp\b|semua dex/i.test(q) ? 'all' : null, function: null } }] };
  qw = qw.flatMap((w) => (EN_ID[w] ? EN_ID[w].split(' ') : [w]));
  const keywords = qw.filter((w) => !['saya', 'apa', 'bagaimana', 'harus', 'lakukan', 'bisakah', 'menurut', 'hukum', 'law', 'what', 'should', 'do', 'bunyi', 'isi'].includes(w)).join(' ').slice(0, 180) || 'penipuan';
  const art = /(?:pasal|article)\s+(\d+[A-Z]?)/i.exec(q);
  const glossaryTerm = /(?:apa (?:itu|yang dimaksud(?: dengan)?)|what is (?:a |an )?|arti(?:nya)?)\s+([\p{L} ]{3,40}?)\??$/iu.exec(q)?.[1]?.trim();

  if (dex === 'antiscamdex') {
    if (/baru (saja )?(kena|tertipu|ditipu)|just (been )?scammed|kena scam|tertipu .*transfer|langkah (segera|darurat)/i.test(q)) {
      const elapsed = /(\d+\s*(menit|jam)|tadi|barusan|hari ini|minutes?|hours?) (lalu|yang lalu|ago)|kurang dari 24|baru saja/i.test(q) ? 'lt24h' : /kemarin|minggu lalu|bulan lalu|lebih dari 24|days? ago|hari lalu/i.test(q) ? 'gt24h' : 'unknown';
      const method = /e-?wallet|dompet|ovo|gopay|dana\b|shopeepay|pjp/i.test(q) ? 'pjp' : /kripto|crypto|usdt|bitcoin/i.test(q) ? 'crypto' : /bank|rekening|transfer/i.test(q) ? 'bank' : 'other';
      return { calls: [{ name: 'emergency_steps', input: { elapsed, method } }] };
    }
    if (/apakah .*scam|cek .*(pesan|scam)|is this (a )?scam|kuis/i.test(q)) return { calls: [{ name: 'scam_selfcheck', input: { answers: null } }, { name: 'modus_library', input: { query: null } }] };
    if (/diblokir.*dikembalikan|dikembalikan|rasio|returned|blocked.*returned/i.test(q)) return { calls: [{ name: 'iasc_stats', input: { metric: null, view: 'ratios' } }, { name: 'iasc_stats', input: { metric: 'funds_blocked_idr', view: 'latest' } }, { name: 'iasc_stats', input: { metric: 'funds_returned_idr', view: 'latest' } }] };
    if (/berapa laporan|jumlah laporan|laporan .*diterima|how many reports|reports? received/i.test(q)) return { calls: [{ name: 'iasc_stats', input: { metric: 'reports_total', view: 'series' } }, { name: 'iasc_stats', input: { metric: 'reports_total', view: 'latest' } }] };
    if (/modus/i.test(q) && /(paling|terbanyak|most|statistik)/i.test(q)) return { calls: [{ name: 'modus_stats', input: {} }] };
    if (/cara (melapor|lapor)|data (yang )?(perlu|harus) disiapkan|how to report|lapor ke iasc/i.test(q)) return { calls: [{ name: 'reporting_guide', input: {} }] };
    if (/satgas|pasti\b|pinjol ilegal|investasi ilegal|entitas ilegal/i.test(q)) return { calls: [{ name: 'satgas_stats', input: { period: null } }] };
    if (/kanal|nomor|kontak|hubungi|channel|hotline/i.test(q)) return { calls: [{ name: 'channel_directory', input: { situation: null } }] };
    if (/bukti|evidence/i.test(q)) return { calls: [{ name: 'evidence_checklist', input: {} }] };
    if (/cegah|pencegahan|prevent|tips/i.test(q)) return { calls: [{ name: 'prevention_tips', input: {} }] };
    if (/wilayah|provinsi|daerah|region/i.test(q)) return { calls: [{ name: 'region_stats', input: {} }] };
    if (/modus|jenis penipuan|types? of scam/i.test(q)) return { calls: [{ name: 'modus_library', input: { query: null } }] };
    return null;
  }

  const corpus = dex === 'mylaiwyer' ? 'umum' : 'keuangan';
  // My LAIwyer hands financial/banking/scam questions to FinLAIwyer (§4.20).
  if (dex === 'mylaiwyer' && FINANCE_WORD.test(q) && !/kuhap|uud|praperadilan|polisi|gugat/i.test(q)) return { calls: [{ name: 'open_dex', input: { dexId: 'finlaiwyer', entity: null, reason: q.length > 3 ? (/[a-z]/.test(q) && /\b(the|what|how|my)\b/i.test(q) ? 'Financial, banking and scam questions are answered by FinLAIwyer.' : 'Pertanyaan hukum keuangan, perbankan, dan korban scam dijawab oleh FinLAIwyer.') : '' } }, { name: 'search_law', input: { query: keywords, doc_ids: null, part: null, limit: 3 } }] };

  // Guided Consultation: a matching flow starts with its first question (choice chips).
  const flow = matchFlows(FLOWS, dex, q)[0];
  if (flow && flow.score >= 0.34 && !art && !glossaryTerm) return { calls: [{ name: 'start_flow', input: { flow_id: flow.id, question: null } }] };

  if (/kapan .*berlaku|mulai berlaku|when .*(effective|in force)|masih berlaku|still (in force|valid)|dicabut|revoked|diubah|amended|\bbeda\b|difference/i.test(q)) {
    const named = docsNamed(q).filter((id) => !(id === 'uud-1945-naskah-asli' && docsNamed(q).includes('uud-nri-1945')));
    const ids = named.length ? named : /kuhp/i.test(q) || /kuhap/i.test(q) ? ['uu-1-2023-kuhp', 'uu-20-2025-kuhap'] : [];
    if (/kuhp/i.test(q) && /kuhap/i.test(q)) ids.splice(0, ids.length, 'uu-1-2023-kuhp', 'uu-20-2025-kuhap');
    if (ids.length) return { calls: [...new Set(ids)].slice(0, 3).map((id) => ({ name: 'regulation_status', input: { doc_id: id, query: null } })) };
    return { calls: [{ name: 'regulation_status', input: { doc_id: null, query: keywords } }] };
  }
  if (art) {
    const named = docsNamed(q);
    if (dex === 'mylaiwyer' && /uud|constitution/i.test(q) && /(asli|berlaku|vs|versus|original)/i.test(q)) return { calls: [{ name: 'compare_versions', input: { topic: art[1]!, pair: 'uud' } }] };
    if (named.length) {
      return {
        calls: named.slice(0, 2).map((id) => {
          const own = (DOCS.get(id)?.corpus ?? corpus) === corpus;
          return own ? { name: 'get_pasal', input: { doc_id: id, nomor: art[1]!, ayat: null } } : { name: 'cross_reference', input: { doc_id: id, nomor: art[1]! } };
        }),
      };
    }
  }
  if (/pasal penipuan|tindak pidana penipuan|fraud (article|provision)/i.test(q) && dex === 'finlaiwyer') {
    const calls: Call[] = [{ name: 'cross_reference', input: { doc_id: 'uu-1-2023-kuhp', nomor: '492' } }];
    if (/\bite\b/i.test(q)) calls.push({ name: 'get_pasal', input: { doc_id: 'uu-1-2024-ite', nomor: '28', ayat: null } });
    return { calls };
  }
  if (glossaryTerm && findGlossary(glossaryTerm)) return { calls: [{ name: 'glossary', input: { term: glossaryTerm } }] };
  if (/sumber hukum|dokumen (apa|hukum)|legal sources|which (laws|sources)|daftar (peraturan|dokumen)/i.test(q)) return { calls: [{ name: 'list_sources', input: { status: 'all' } }] };
  if (dex === 'mylaiwyer' && /(lama dan baru|lama & baru|bandingkan kuhap|old and new|compare .*kuhap)/i.test(q)) return { calls: [{ name: 'compare_versions', input: { topic: keywords.replace(/kuhap|lama|baru|old|new|bandingkan|compare/gi, '').trim() || 'penahanan', pair: 'kuhap' } }] };
  if (/kanal|ke mana|kemana|lapor|pengaduan|mengadu|where (do|can) i (report|complain)|channel/i.test(q) && dex === 'finlaiwyer') return { calls: [{ name: 'channel_directory', input: { situation: keywords } }] };
  const named = docsNamed(q).filter((id) => DOCS.get(id)?.corpus === corpus);
  const query = keywords.replace(/\b(kuhap|kuhp|uud|1945|constitution|criminal|procedure|ite|pdp|pbi|pojk)\b/gi, ' ').replace(/\s+/g, ' ').trim() || keywords;
  return { calls: [{ name: 'search_law', input: { query, doc_ids: named.length ? named : null, part: null, limit: 5 } }] };
}

/** Time-series metric named by the question (rank tools take a free-text metric key). */
function metricFrom(q: string): string {
  if (/volatil/i.test(q)) return 'vol_1Y';
  if (/drawdown|penurunan/i.test(q)) return 'mdd';
  if (/\bath\b|all[- ]time high|tertinggi sepanjang/i.test(q)) return 'pct_from_ath';
  const p = periodFrom(q);
  return `ret_${p ?? '1Y'}`;
}

export class DataLlm implements Llm {
  readonly model = 'finandex-data-mode';
  private readonly tools: ToolDef[];
  private planned: Promise<{ calls: Call[]; scenario?: Scenario }> | null = null;

  constructor(
    private readonly dex: DexId,
    private readonly store: DataStore,
    private readonly locale: Locale,
    private readonly known: KnownQuestion[] = [],
  ) {
    this.tools = toolsFor(dex, store);
  }

  private async plan(question: string): Promise<{ calls: Call[]; scenario?: Scenario }> {
    const qw = words(question);
    // 1) Known evaluation questions for this Dex → their tool plan and composed answer.
    let best: { s: number; k?: KnownQuestion } = { s: 0 };
    for (const k of this.known) if (k.dex === this.dex) {
      const s = jaccard(qw, words(k.question));
      if (s > best.s) best = { s, k };
    }
    if (best.k && best.s >= 0.6 && sameSpecifics(question, best.k.question)) return { calls: best.k.scenario.calls(question, this.dex), scenario: best.k.scenario };

    if (/siapa (pembuat|yang membuat)|who (made|built|created)|pencipta/i.test(question)) return { calls: [{ name: 'app_info', input: {} }] };
    if (/kualitas data|data quality|sumber data|data source|dataset apa|data apa|what data/i.test(question)) return { calls: [{ name: 'dataset_info', input: {} }, { name: 'data_quality', input: { id: null } }].filter((c) => this.has(c.name)) };

    // 1b) Law & consumer-protection Dex (My LAIwyer, FinLAIwyer, AntiScamDex) and feature-guide questions.
    if (this.dex === 'mylaiwyer' || this.dex === 'finlaiwyer' || this.dex === 'antiscamdex') {
      const law = lawPlan(this.dex, question, qw);
      if (law) return { calls: law.calls.filter((c) => this.has(c.name)) };
    } else if (FEATURE_Q.test(question)) return { calls: [{ name: 'feature_guide', input: { dexId: /aplikasi|finandex|\bapp\b|semua dex/i.test(question) ? 'all' : null, function: null } }] };

    // 2) Entities in time-series Dex.
    const ad = makeAdapters(this.store)[this.dex];
    if (ad) {
      const ents = await ad.entities().catch(() => []);
      const raw = question.replace(/[?.,!;:()]/g, ' ');
      const toks = raw.split(/\s+/).filter(Boolean);
      const hits: string[] = [];
      for (const e of ents) {
        const keys = [e.id, ...e.aliases].map((k) => k.toLowerCase());
        const tokHit = toks.some((t) => keys.includes(t.toLowerCase()) && (t.length >= 3 || t === t.toUpperCase()));
        const nameHit = e.name.length >= 4 && new RegExp(`(^|[^a-z0-9])${escapeRe(normaliseKey(e.name))}([^a-z0-9]|$)`).test(normaliseKey(question));
        if ((tokHit || nameHit) && !hits.includes(e.id)) hits.push(e.id);
        if (hits.length >= 5) break;
      }
      const period = periodFrom(question);
      if (hits.length >= 2) {
        if (/korelasi|correlation/i.test(question) && this.has('correlation')) return { calls: [{ name: 'correlation', input: this.fill('correlation', { ids: hits, years: 3 }) }] };
        return { calls: [{ name: 'compare', input: this.fill('compare', { ids: hits, period: period ?? '5Y' }) }] };
      }
      if (hits.length === 1) {
        const id = hits[0]!;
        if (/drawdown|penurunan terbesar|anjlok/i.test(question)) return { calls: [{ name: 'drawdowns', input: this.fill('drawdowns', { id, top_n: 5 }) }] };
        if (/kalender|per tahun|tahunan|calendar|yearly/i.test(question)) return { calls: [{ name: 'calendar_returns', input: this.fill('calendar_returns', { id }) }] };
        if (/ekstrem|terbesar harian|extreme|largest daily/i.test(question)) return { calls: [{ name: 'extreme_moves', input: this.fill('extreme_moves', { id, top_n: 10 }) }] };
        // An intent word naming an entity tool (beta, technical, valuation, dividends, profile…) wins.
        const qx1 = expand(qw);
        const ENTITY_FIELDS = ['id', 'ticker', 'fund', 'symbol', 'asset'];
        const intent = this.tools
          .filter((t) => !META.has(t.name) && !['get_snapshot', 'get_history', 'compare', 'rank', 'correlation'].includes(t.name))
          .map((t) => {
            const key = fieldsOf(t.input).find((f) => ENTITY_FIELDS.includes(f.key))?.key;
            if (!key) return null;
            const nameW = t.name.split('_');
            const labelW = words(`${t.label.id} ${t.label.en}`);
            let sc = 0;
            for (const w of qx1) {
              if (nameW.includes(w)) sc += 3;
              if (labelW.includes(w)) sc += 2;
            }
            return { t, key, sc };
          })
          .filter((x): x is { t: ToolDef; key: string; sc: number } => !!x && x.sc >= 3)
          .sort((a, b) => b.sc - a.sc);
        for (const c of intent) {
          const input = this.fill(c.t.name, { [c.key]: id });
          if (c.t.input.safeParse(input).success && (await this.useful(c.t, input))) return { calls: [{ name: c.t.name, input }] };
        }
        const calls: Call[] = [{ name: 'get_snapshot', input: { id } }];
        if (this.has('get_history')) calls.push({ name: 'get_history', input: this.fill('get_history', { id, interval: 'auto' }) });
        return { calls };
      }
    }

    // 3) Keyword match against the Dex's own tools; candidates are tried and the first that returns data wins.
    const qx = expand(qw);

    // 2b) Ranking questions ("top 10", "teratas", "tertinggi", "terendah") → the Dex's rank tools.
    if (/\b(top|teratas|tertinggi|terendah|terbesar|terkecil|peringkat|highest|lowest|largest|smallest|ranking|most|terbanyak)\b/i.test(question)) {
      const n = Number(/\b(\d{1,2})\b/.exec(question)?.[1] ?? '10');
      const asc = /terendah|terkecil|lowest|smallest|paling rendah/i.test(question);
      const rankTools = this.tools.filter((t) => /rank|leaderboard|top_/.test(t.name));
      for (const t of rankTools) {
        const over: Record<string, unknown> = {};
        for (const f of fieldsOf(t.input)) {
          if (f.kind === 'enum' && /metric|indicator|by/.test(f.key)) {
            const opt = f.options.find((o) => {
              const lo = o.toLowerCase();
              const tail = lo.split('_').at(-1) ?? '';
              return qx.includes(lo) || lo.split('_').every((p) => qx.includes(p)) || (tail.length >= 2 && lo.includes('_') && qx.includes(tail));
            });
            if (opt) over[f.key] = opt;
          }
          if (f.kind === 'string' && f.key === 'metric' && !f.nullable) over.metric = metricFrom(question);
          if (f.kind === 'enum' && f.key === 'order' && f.options.includes(asc ? 'asc' : 'desc')) over.order = asc ? 'asc' : 'desc';
          if (f.kind === 'number' && f.key === 'limit') over.limit = n;
        }
        const input = this.fill(t.name, over);
        if (t.input.safeParse(input).success && (await this.useful(t, input))) return { calls: [{ name: t.name, input }] };
      }
    }
    const countryQ = countryIn(question);
    const scored = this.tools
      .filter((t) => !META.has(t.name))
      .map((t) => {
        const nameW = t.name.split('_');
        const labelW = words(`${t.label.id} ${t.label.en}`);
        const descW = words(t.description);
        let s = 0;
        for (const w of qx) {
          if (nameW.includes(w)) s += 3;
          if (labelW.includes(w)) s += 2;
          if (descW.includes(w)) s += 1;
        }
        // Enum options named in the question (e.g. group_by "year"/"exchange"/"sector") select the option.
        const enums: Record<string, unknown> = {};
        for (const f of fieldsOf(t.input)) {
          if (f.kind !== 'enum' || TEXT_KEYS.includes(f.key)) continue;
          const opt = f.options.find((o) => {
            const lo = o.toLowerCase();
            const tail = lo.split('_').at(-1) ?? '';
            return qx.includes(lo) || lo.split('_').every((p) => qx.includes(p)) || (tail.length >= 2 && lo.includes('_') && qx.includes(tail));
          });
          if (opt) {
            enums[f.key] = opt;
            s += 5;
          }
        }
        if (countryQ && fieldsOf(t.input).some((f) => f.key === 'country' || (f.kind === 'object' && f.fields.some((x) => x.key === 'country')))) s += 3;
        return { t, s, enums };
      })
      .filter((x) => x.s >= 2)
      .sort((a, b) => b.s - a.s);
    const content = qw.filter((w) => !/^\d+$/.test(w) && !NOISE.has(w));
    const queries = [...new Set([content.join(' '), content.slice(-2).join(' '), content.at(-1) ?? ''].filter(Boolean))];
    const country = countryQ;
    for (const { t, enums } of scored.slice(0, 6)) {
      const fields = fieldsOf(t.input);
      const takesText = fields.some((f) => f.kind === 'string' && !f.nullable && TEXT_KEYS.includes(f.key));
      const direct = fields.some((f) => f.key === 'country' && f.kind === 'string');
      const nested = fields.some((f) => f.kind === 'object' && f.key === 'filters' && f.fields.some((x) => x.key === 'country'));
      const countryOpts: Record<string, unknown>[] = !country
        ? [{}]
        : direct
          ? [{ country: country.name }, { country: country.iso2 }]
          : nested
            ? [{ filters: { country: country.name } }, { filters: { country: country.iso2 } }]
            : [{}];
      for (const c of countryOpts)
        for (const q of takesText ? queries : ['']) {
          const input = this.fill(t.name, { ...enums, ...c }, q);
          if (!t.input.safeParse(input).success) continue;
          if (await this.useful(t, input)) return { calls: [{ name: t.name, input }] };
        }
    }

    // 4) Overview panel of the Dex's first feature tab.
    const first = Object.values(TABS[this.dex])[0]?.panels[0];
    if (first && this.has(first.tool)) return { calls: [{ name: first.tool, input: this.fill(first.tool, first.input ?? {}) }] };
    return { calls: [{ name: 'dataset_info', input: {} }] };
  }

  /** True when the tool returns data (no error, and a chart or a non-empty list). */
  private async useful(t: ToolDef, input: Record<string, unknown>): Promise<boolean> {
    try {
      const r = await t.run(input as never, { dex: this.dex, locale: this.locale, store: this.store, manifest: () => this.store.json('manifest.json'), distribution: 'noncommercial', appVersion: 'data-mode' });
      if (r.ui?.length) return true;
      const d = r.data as Record<string, unknown> | null;
      return !!d && Object.values(d).some((v) => Array.isArray(v) && v.length > 0);
    } catch {
      return false;
    }
  }

  private has(name: string): boolean {
    return this.tools.some((t) => t.name === name);
  }

  /** Full schema-valid input from defaults + overrides; free-text fields get the question keywords. */
  private fill(name: string, overrides: Record<string, unknown>, keywords = ''): Record<string, unknown> {
    const t = this.tools.find((x) => x.name === name);
    if (!t) return overrides;
    const fields = fieldsOf(t.input);
    const extra: Record<string, unknown> = {};
    for (const f of fields) if (f.kind === 'string' && !f.nullable && TEXT_KEYS.includes(f.key) && keywords) extra[f.key] = keywords;
    return buildInput(fields, { ...extra, ...overrides });
  }

  async turn(req: TurnRequest): Promise<TurnResult> {
    const last = req.messages.at(-1)!;
    const isResults = Array.isArray(last.content) && (last.content as { type: string }[]).some((b) => b.type === 'tool_result');
    const question = (() => {
      for (let i = req.messages.length - 1; i >= 0; i--) {
        const m = req.messages[i]!;
        if (m.role === 'user' && typeof m.content === 'string') return m.content;
      }
      return '';
    })();
    this.planned ??= this.plan(question);
    const plan = await this.planned;
    if (!isResults) {
      const calls = plan.calls.filter((c) => req.tools.some((t) => t.name === c.name));
      const content: Block[] = calls.map((c, i) => ({ type: 'tool_use', id: `toolu_data_${i}`, name: c.name, input: c.input }));
      return { content, stop_reason: 'tool_use', usage: { input_tokens: 0, output_tokens: 0 }, model: this.model };
    }
    const prev = req.messages.at(-2)!;
    const uses = (prev.content as Block[]).filter((b): b is Extract<Block, { type: 'tool_use' }> => b.type === 'tool_use');
    const results: Results = {};
    for (const r of last.content as { type: string; tool_use_id: string; content: string; is_error?: boolean }[]) {
      const use = uses.find((u) => u.id === r.tool_use_id);
      if (!use) continue;
      let v: unknown;
      try {
        v = r.is_error ? { __error: r.content } : JSON.parse(r.content);
      } catch {
        v = { __error: r.content };
      }
      (results[use.name] ??= []).push(v);
    }
    let text = '';
    if (plan.scenario && this.locale === 'id') {
      try {
        text = plan.scenario.answer(results, this.locale, question);
      } catch {
        text = '';
      }
    }
    if (!text) text = compose(results, this.dex, this.locale, this.tools);
    for (const chunk of text.match(/[\s\S]{1,80}/g) ?? []) req.onText(chunk);
    return { content: [{ type: 'text', text }], stop_reason: 'end_turn', usage: { input_tokens: 0, output_tokens: 0 }, model: this.model };
  }
}

// ----------------------------------------------------------------------------- answer composer

const human = (k: string) => k.replace(/_/g, ' ');
const isRatioKey = (k: string) => /^(ret_|cagr_|vol_)|^mdd$|^pct_from|drawdown|_share$|^share$|_fraction$/.test(k);

function fmt(k: string, v: unknown, L: Locale): string | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean') return v ? (L === 'id' ? 'ya' : 'yes') : L === 'id' ? 'tidak' : 'no';
  if (typeof v === 'string') return /^\d{4}-\d{2}-\d{2}$/.test(v) ? formatDate(v, L) : v.length > 120 ? `${v.slice(0, 117)}…` : v;
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  if (/_pct$|_pct_|apy|percent/.test(k)) return formatPercentPoints(v, L, 2);
  if (isRatioKey(k)) return formatPercent(v, L, 2, /^ret_/.test(k));
  if (/year/.test(k) && Number.isInteger(v)) return String(v);
  if (Number.isInteger(v)) return formatNumber(v, L);
  return formatNumber(v, L, Math.abs(v) >= 100 ? 2 : Math.abs(v) >= 1 ? 2 : 4);
}

const SNAPSHOT_KEYS = ['last_close', 'last_date', 'ret_1D', 'ret_YTD', 'ret_1Y', 'ret_5Y', 'cagr_5Y', 'vol_1Y', 'mdd', 'ath_close', 'ath_date', 'pct_from_ath'];

function describe(tool: string, data: Record<string, unknown>, L: Locale): string[] {
  const out: string[] = [];
  if (tool === 'get_snapshot' && data.metrics && typeof data.metrics === 'object') {
    const m = data.metrics as Record<string, unknown>;
    for (const k of SNAPSHOT_KEYS) {
      const f = fmt(k, m[k], L);
      if (f) out.push(`${human(k)}: ${f}`);
    }
    return out;
  }
  if (tool === 'get_history') {
    const pts = (data.points ?? data.rows) as unknown[] | undefined;
    if (Array.isArray(pts)) out.push(`${L === 'id' ? 'titik data' : 'data points'}: ${formatNumber(pts.length, L)}`);
  }
  // Scalars first (skip duplicates such as *_fraction when *_pct exists).
  for (const [k, v] of Object.entries(data)) {
    if (Array.isArray(v) || (v && typeof v === 'object')) continue;
    if (k.endsWith('_fraction') && `${k.replace(/_fraction$/, '_pct')}` in data) continue;
    if (['id', 'note', 'method', 'dataset'].includes(k)) continue;
    const f = fmt(k, v, L);
    if (f) out.push(`${human(k)}: ${f}`);
    if (out.length >= 5) break;
  }
  // Then the main list: first rows with their label + up to 3 numbers.
  const metricKey = typeof data.metric === 'string' ? data.metric : null;
  const listKey = Object.keys(data).find((k) => Array.isArray(data[k]) && (data[k] as unknown[]).length && (data[k] as unknown[]).every((x) => x && typeof x === 'object'));
  if (listKey) {
    const rows = (data[listKey] as Record<string, unknown>[]).slice(0, 10);
    for (const r of rows) {
      const strs = Object.entries(r).filter(([k, v]) => typeof v === 'string' && !/date|url|link|^id$|slug/.test(k)) as [string, string][];
      const label = (strs.find(([k]) => /sentence|title|name|label|finding|text|summary|country|company|skill|investor|fund/.test(k)) ?? strs[0])?.[1];
      const nums = Object.entries(r)
        .filter(([k, v]) => typeof v === 'number' && k !== 'rank' && !k.endsWith('_fraction'))
        .slice(0, 3)
        .map(([k, v]) => `${human(k === 'value' && metricKey ? metricKey : k)} ${fmt(k === 'value' && metricKey ? metricKey : k, v, L)}`);
      if (label || nums.length) out.push(`${label ?? ''}${label && nums.length ? ' — ' : ''}${nums.join(', ')}`);
    }
  }
  return out;
}

/** §12.2 disclaimers appended to answers of the law & consumer-protection Dex. */
const DISCLAIMER_NOTE = {
  mylaiwyer: { id: 'Informasi hukum berdasarkan dokumen resmi yang tersedia, bukan nasihat hukum dan tidak menggantikan advokat. Untuk kasus nyata, hubungi advokat atau Lembaga Bantuan Hukum. Dalam keadaan darurat, hubungi 112.', en: 'Legal information based on the available official documents; not legal advice and not a substitute for a lawyer. For real cases, contact a lawyer or a Legal Aid Institute. In an emergency, call 112.' },
  finlaiwyer: { id: 'Informasi hukum keuangan dan perbankan berdasarkan dokumen resmi yang tersedia, bukan nasihat hukum. Finandex tidak berafiliasi dengan OJK, Bank Indonesia, IASC, atau Polri, tidak meneruskan laporan, dan tidak dapat memulihkan dana. Ancaman pidana dapat telah disesuaikan oleh UU 1/2026.', en: 'Financial and banking law information based on the available official documents; not legal advice. Finandex is not affiliated with OJK, Bank Indonesia, IASC, or Polri, does not forward reports, and cannot recover funds. Criminal penalties may have been adjusted by Law 1/2026.' },
  antiscamdex: { id: 'Informasi publik dari OJK, Bank Indonesia, Satgas PASTI, dan portal IASC, dirangkum oleh Finandex. Finandex bukan IASC dan tidak berafiliasi dengan lembaga tersebut. Laporan resmi hanya di iasc.ojk.go.id. Jangan pernah membagikan OTP, PIN, atau kata sandi.', en: 'Public information from OJK, Bank Indonesia, Satgas PASTI, and the IASC portal, summarised by Finandex. Finandex is not IASC and is not affiliated with those institutions. Official reports only at iasc.ojk.go.id. Never share your OTP, PIN, or password.' },
} as const;

export function compose(results: Results, dex: DexId, L: Locale, tools: ToolDef[]): string {
  const d = getDex(dex);
  const parts: string[] = [];
  const errors: string[] = [];
  for (const [tool, list] of Object.entries(results)) {
    for (const v of list) {
      const data = v as Record<string, unknown>;
      if (data && '__error' in data) {
        errors.push(String(data.__error));
        continue;
      }
      const t = tools.find((x) => x.name === tool);
      const label = (t ? t.label[L] : tool).replace(/…$/, '');
      const lines = describe(tool, data ?? {}, L);
      if (tool === 'app_info') {
        parts.push(L === 'id' ? 'Finandex dirancang dan dikembangkan oleh Dea Saka Kurnia Putra.' : 'Finandex is designed and developed by Dea Saka Kurnia Putra.');
        continue;
      }
      const page = L === 'id' ? 'hal.' : 'p.';
      const quoteLine = (doc: string, pasal: string | null | undefined, pg: unknown, text: string, n = 320) => `- **${doc}${pasal ? `, ${pasal}` : ''}** (${page} ${String(pg ?? '')}): “${text.replace(/\s+/g, ' ').slice(0, n)}${text.length > n ? '…' : ''}”`;
      if (tool === 'feature_guide') {
        const g = data as { dex?: string; purpose?: string; ask_examples?: string[]; functions?: { tab: string; what: string }[]; data_as_of?: string; limitations?: string; related?: { name: string }[]; groups?: { name: string; dex: string[] }[]; app_functions?: { name: string; what: string }[]; dex_count?: number };
        if (g.groups) {
          parts.push([L === 'id' ? `**Finandex berisi ${g.dex_count} chatbot (Dex) dalam ${g.groups.length} kategori:**` : `**Finandex has ${g.dex_count} chatbots (Dex) in ${g.groups.length} categories:**`, ...g.groups.map((x) => `- **${x.name}** — ${x.dex.join(', ')}`), L === 'id' ? '\n**Fungsi aplikasi:**' : '\n**App functions:**', ...(g.app_functions ?? []).map((f) => `- **${f.name}** — ${f.what}`)].join('\n'));
          continue;
        }
        parts.push(
          [
            `**${g.dex}** — ${g.purpose ?? ''}`,
            L === 'id' ? '\n**Anda bisa bertanya…**' : '\n**You can ask…**',
            ...(g.ask_examples ?? []).slice(0, 6).map((x) => `- ${x}`),
            L === 'id' ? '\n**Fungsi & tab:**' : '\n**Functions & tabs:**',
            ...(g.functions ?? []).map((f) => `- **${f.tab}** — ${f.what}`),
            `\n${L === 'id' ? '**Data per:**' : '**Data as of:**'} ${g.data_as_of ?? '-'}`,
            `${L === 'id' ? '**Tidak bisa:**' : '**Cannot do:**'} ${g.limitations ?? '-'}`,
            g.related?.length ? `${L === 'id' ? '**Dex terkait:**' : '**Related Dex:**'} ${g.related.map((r) => r.name).join(', ')}` : '',
          ].filter(Boolean).join('\n'),
        );
        continue;
      }
      if (tool === 'start_flow' || tool === 'flow_step') {
        const f = data as { flows?: { title: string }[]; question?: string; options?: { label: string }[]; title?: string; steps?: { text: string; urgent: boolean; channels: string[] }[]; legal_bases?: { label: string; ref: string; why: string; available: boolean }[] };
        if (f.flows) parts.push([L === 'id' ? '**Konsultasi Terpandu — pilih situasi yang paling sesuai:**' : '**Guided Consultation — pick the situation that fits best:**', ...f.flows.map((x, i) => `${i + 1}. ${x.title}`)].join('\n'));
        else if (f.question) parts.push([`**${f.question}**`, ...(f.options ?? []).map((o, i) => `${i + 1}. ${o.label}`), L === 'id' ? '\n_Pilih salah satu tombol di bawah (atau tekan angka 1–9)._' : '\n_Pick one of the buttons below (or press 1–9)._'].join('\n'));
        else if (f.steps) {
          parts.push(
            [
              `**${f.title ?? ''}**`,
              ...f.steps.map((x, i) => `${i + 1}. ${x.urgent ? (L === 'id' ? '**Lakukan sekarang:** ' : '**Do it now:** ') : ''}${x.text}${x.channels.length ? ` (${x.channels.join(', ')})` : ''}`),
              L === 'id' ? '\n**Dasar hukum (rujukan katalog; kutipan resmi di bawah bila tersedia):**' : '\n**Legal basis (catalogue references; official quotes below when available):**',
              ...(f.legal_bases ?? []).map((b) => `- ${b.label} ${b.ref} — ${b.why}${b.available ? '' : L === 'id' ? ' _(teks resmi belum tersedia)_' : ' _(official text not yet available)_'}`),
            ].join('\n'),
          );
        }
        continue;
      }
      if (tool === 'emergency_steps') {
        const f = data as { steps?: { text: string; urgent: boolean; channels: string[] }[] };
        parts.push([L === 'id' ? '**Langkah segera:**' : '**Immediate steps:**', ...(f.steps ?? []).map((x, i) => `${i + 1}. ${x.urgent ? (L === 'id' ? '**Lakukan sekarang:** ' : '**Do it now:** ') : ''}${x.text}`), L === 'id' ? '\nLaporan resmi hanya di **iasc.ojk.go.id**; buat juga Laporan Polisi. Jangan pernah membagikan OTP, PIN, atau kata sandi.' : '\nOfficial reports only at **iasc.ojk.go.id**; also file a police report. Never share your OTP, PIN, or password.'].join('\n'));
        continue;
      }
      if (tool === 'regulation_status') {
        const r = data as { short: string; title: string; badges: string[]; effective: string | null; text_available: boolean; amended_by: string[]; revoked_by: string[]; amends: string[]; revokes: string[]; penalty_note: string | null; uu_1_2026_references: { page: number }[]; official: string | null };
        const name = (id: string) => DOCS.get(id)?.short ?? id;
        const lines = [`**${r.short}** — ${r.title}`, `- Status: ${r.badges.join(' · ')}${r.effective ? ` (${L === 'id' ? 'berlaku' : 'effective'} ${formatDate(r.effective, L)})` : ''}`];
        if (r.revoked_by.length) lines.push(`- ${L === 'id' ? 'Dicabut oleh' : 'Revoked by'}: ${r.revoked_by.map(name).join(', ')}`);
        if (r.revokes.length) lines.push(`- ${L === 'id' ? 'Mencabut' : 'Revokes'}: ${r.revokes.map(name).join(', ')}`);
        if (r.amended_by.length) lines.push(`- ${L === 'id' ? 'Diubah oleh' : 'Amended by'}: ${r.amended_by.map(name).join(', ')}`);
        if (r.amends.length) lines.push(`- ${L === 'id' ? 'Mengubah' : 'Amends'}: ${r.amends.map(name).join(', ')}`);
        if (r.penalty_note) lines.push(`- ${r.penalty_note}${r.uu_1_2026_references.length ? ` (${L === 'id' ? 'UU 1/2026 hal.' : 'Law 1/2026 p.'} ${r.uu_1_2026_references.map((x) => x.page).join(', ')})` : ''}`);
        lines.push(`- ${L === 'id' ? 'Teks resmi di Finandex' : 'Official text in Finandex'}: ${r.text_available ? (L === 'id' ? 'tersedia' : 'available') : L === 'id' ? 'menunggu dokumen' : 'pending'}${r.official ? ` — ${r.official}` : ''}`);
        parts.push(lines.join('\n'));
        continue;
      }
      if (tool === 'cross_reference' && typeof data.text === 'string') {
        parts.push(`**${String(data.document)}, ${String(data.pasal)}** _(${String(data.from)})_ (${page} ${String(data.page)}):\n\n> ${data.text.replace(/\s+/g, ' ').slice(0, 1200)}`);
        continue;
      }
      if (tool === 'glossary') {
        const g = data as { term?: string; plain?: string | null; plain_label?: string; official_definition?: { document: string; pasal: string; page: number; quote: string } | null; terms?: string[] };
        if (g.terms) parts.push(`${L === 'id' ? '**Istilah di glosarium:**' : '**Glossary terms:**'} ${g.terms.join(', ')}`);
        else parts.push([`**${g.term}**`, g.official_definition ? quoteLine(g.official_definition.document, g.official_definition.pasal, g.official_definition.page, g.official_definition.quote, 500) : '', g.plain ? `\n${g.plain}\n_(${g.plain_label})_` : ''].filter(Boolean).join('\n'));
        continue;
      }
      if (tool === 'list_sources') {
        const r = data as { documents?: { short: string; available: boolean; badges: string[] }[]; uud_note?: string | null };
        const docs = r.documents ?? [];
        parts.push([L === 'id' ? `**Sumber hukum (${docs.filter((x) => x.available).length} tersedia dari ${docs.length}):**` : `**Legal sources (${docs.filter((x) => x.available).length} available of ${docs.length}):**`, ...docs.map((x) => `- ${x.available ? '✓' : '⏳'} ${x.short} — ${x.badges.join(' · ')}`), r.uud_note ? `\n_${r.uud_note}_` : ''].join('\n'));
        continue;
      }
      if (tool === 'compare_versions') {
        const c = data as { left: { label: string; pasal: string | null; page: number | null; text: string }; right: { label: string; pasal: string | null; page: number | null; text: string }; note: string };
        parts.push([quoteLine(c.left.label, c.left.pasal, c.left.page, c.left.text, 600), quoteLine(c.right.label, c.right.pasal, c.right.page, c.right.text, 600), `\n_${c.note}_`].join('\n'));
        continue;
      }
      if (tool === 'iasc_stats') {
        const r = data as { latest?: { label: string; value: number; cutoff: string; headline_only: boolean }[]; ratios?: { numerator: string; denominator: string; share: number; cutoff: string; numerator_value: number; denominator_value: number }[]; points?: { cutoff: string; value: number; headline_only: boolean }[]; label?: string };
        if (r.latest) parts.push(r.latest.map((x) => `- **${x.label}:** ${/dana|funds|loss|kerugian/i.test(x.label) ? `Rp${formatNumber(x.value, L)}` : formatNumber(x.value, L)} (${L === 'id' ? 'per' : 'as of'} ${formatDate(x.cutoff, L)}${x.headline_only ? (L === 'id' ? '; judul berita' : '; news headline') : ''})`).join('\n'));
        if (r.ratios) parts.push(r.ratios.map((x) => `- **${x.numerator} ÷ ${x.denominator}:** ${formatPercent(x.share, L, 2)} (${formatNumber(x.numerator_value, L)} ÷ ${formatNumber(x.denominator_value, L)}, ${L === 'id' ? 'per' : 'as of'} ${formatDate(x.cutoff, L)})`).join('\n'));
        if (r.points) parts.push(`**${r.label}** — ${r.points.length} ${L === 'id' ? 'titik bertanggal pasti' : 'exact-date points'}: ${r.points.map((p) => `${formatDate(p.cutoff, L)} ${formatNumber(p.value, L)}${p.headline_only ? '*' : ''}`).join(' → ')}${r.points.some((p) => p.headline_only) ? (L === 'id' ? '\n_* bersumber judul berita saja_' : '\n_* news-headline source only_') : ''}`);
        continue;
      }
      if (tool === 'get_pasal' && typeof data.text === 'string') {
        parts.push(`**${String(data.document ?? '')}, ${String(data.pasal ?? '')}${data.ayat ? ` ayat (${String(data.ayat)})` : ''}** (${L === 'id' ? 'hal.' : 'p.'} ${String(data.page ?? '')}):\n\n> ${data.text.replace(/\s+/g, ' ').slice(0, 1200)}${data.note ? `\n\n_${String(data.note)}_` : ''}`);
        continue;
      }
      if (tool === 'search_law') {
        const r = data as { results?: { document: string; pasal: string | null; page: number; quote: string }[] };
        if (r.results?.length) {
          parts.push([L === 'id' ? '**Ketentuan yang ditemukan dalam teks peraturan:**' : '**Provisions found in the regulations:**', ...r.results.slice(0, 5).map((b) => `- **${b.document}${b.pasal ? `, ${b.pasal}` : ''}** (${L === 'id' ? 'hal.' : 'p.'} ${b.page}): “${b.quote.replace(/\s+/g, ' ').slice(0, 320)}…”`)].join('\n'));
          continue;
        }
      }
      if (tool === 'dataset_info') {
        const files = (data.source_files as { file: string }[] | undefined)?.map((f) => f.file).join(', ');
        parts.push(L === 'id' ? `Dataset ${d?.name ?? dex}: ${files ?? '-'} · data per ${String(data.as_of ?? '-')}${data.entities ? ` · ${formatNumber(data.entities as number, L)} entitas` : ''} · lisensi ${String(data.licence ?? '-')}.` : `${d?.name ?? dex} dataset: ${files ?? '-'} · as of ${String(data.as_of ?? '-')}${data.entities ? ` · ${formatNumber(data.entities as number, L)} entities` : ''} · licence ${String(data.licence ?? '-')}.`);
        continue;
      }
      const head = data.name && typeof data.name === 'string' ? `**${label} — ${data.name}**` : `**${label}**`;
      parts.push([head, ...lines.map((l) => `- ${l}`)].join('\n'));
    }
  }
  if (!parts.length) {
    const why = errors[0] ?? '';
    return L === 'id'
      ? `Data untuk pertanyaan ini belum ditemukan di ${d?.name ?? dex}${why ? ` (${why})` : ''}. Coba sebut nama aset/entitas secara spesifik, atau gunakan salah satu saran pertanyaan.`
      : `No matching data was found in ${d?.name ?? dex}${why ? ` (${why})` : ''}. Try naming a specific asset/entity, or use one of the suggested questions.`;
  }
  const lawNote = DISCLAIMER_NOTE[dex as keyof typeof DISCLAIMER_NOTE];
  if (lawNote) return `${parts.join('\n\n')}\n\n_${lawNote[L]}_`;
  const note = L === 'id' ? '_Jawaban disusun otomatis langsung dari dataset (grafik & rincian perhitungan di bawah). Data historis untuk edukasi, bukan nasihat investasi._' : '_Answer assembled directly from the dataset (charts and calculation details below). Historical data for education, not investment advice._';
  return `${parts.join('\n\n')}\n\n${note}`;
}
