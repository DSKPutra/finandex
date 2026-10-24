// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// AntiScamDex tools (§8.5, §4.29): public information from IASC, Satgas PASTI, OJK, and BI, summarised by Finandex.
// No tool accepts identity data, account numbers, or report contents. Cumulative series use only exact-date points;
// headline-only points are marked; source conflicts are shown, never reconciled silently.
import { z } from 'zod';
import { FLOWS } from '../../../src/config/law-catalog';
import { getFlow, start, step, view } from '../../../src/shared/law/flow-engine';
import type { AntiscamKb, Observation, SeriesPoint } from '../../../src/shared/law/kb';
import { artifact, defineTool, method, ToolError, tr } from '../../tools/kit';
import type { ToolCtx, ToolDef } from '../../tools/kit';
import { channelDirectory } from '../law/tools';

const DEX = 'antiscamdex';
type Stats = { as_of: string; labels: AntiscamKb['metric_labels']; series: Record<string, SeriesPoint[]>; latest: Record<string, SeriesPoint>; observations: Observation[] };
const kb = (ctx: ToolCtx) => ctx.store.json<AntiscamKb>('core/antiscam/kb.json');
const stats = (ctx: ToolCtx) => ctx.store.json<Stats>('core/antiscam/stats.json');
const srcOf = (asOf: string) => ({ dex: DEX, dataset: 'antiscam_kb.json', as_of: asOf });

export const SELF_CHECK_QUESTIONS: { id: string; en: string; weight: number; why: { id: string; en: string } }[] = [
  { id: 'Anda diminta mengirim kode OTP, PIN, atau kata sandi?', en: 'Were you asked for an OTP code, PIN, or password?', weight: 3, why: { id: 'Bank/lembaga resmi tidak pernah meminta OTP/PIN.', en: 'Banks/official institutions never ask for OTP/PIN.' } },
  { id: 'Anda diminta transfer ke rekening pribadi, bukan rekening resmi perusahaan/platform?', en: 'Were you asked to transfer to a personal account rather than an official company/platform account?', weight: 3, why: { id: 'Pembayaran di luar kanal resmi adalah tanda bahaya umum.', en: 'Payments outside official channels are a common red flag.' } },
  { id: 'Ada tekanan waktu ("sekarang juga", "akun akan diblokir")?', en: 'Is there time pressure ("right now", "your account will be blocked")?', weight: 2, why: { id: 'Pelaku menekan agar korban tidak sempat memverifikasi.', en: 'Scammers pressure victims so they cannot verify.' } },
  { id: 'Dijanjikan keuntungan tinggi, tetap, atau tanpa risiko?', en: 'Were you promised high, fixed, or risk-free returns?', weight: 3, why: { id: 'Ciri investasi ilegal; cek legalitas di OJK/SiPASTI.', en: 'A sign of illegal investment; check legality with OJK/SiPASTI.' } },
  { id: 'Diminta memasang aplikasi atau membuka file (.apk) dari pesan/chat?', en: 'Were you asked to install an app or open a file (.apk) from a message/chat?', weight: 3, why: { id: 'Aplikasi dari pesan bisa mencuri data/OTP.', en: 'Apps from messages can steal data/OTP.' } },
  { id: 'Pengirim mengaku dari bank, OJK, IASC, polisi, atau kurir lewat nomor/akun pribadi?', en: 'Does the sender claim to be from a bank, OJK, IASC, police, or courier via a personal number/account?', weight: 2, why: { id: 'Verifikasi sendiri lewat kontak resmi; lembaga tidak menagih lewat nomor pribadi.', en: 'Verify yourself through official contacts; institutions do not collect via personal numbers.' } },
  { id: 'Ada uang masuk tak dikenal lalu Anda diminta mengembalikannya ke rekening lain?', en: 'Did unknown money arrive and you were asked to return it to another account?', weight: 2, why: { id: 'Bisa modus; kembalikan hanya lewat bank Anda.', en: 'May be a scam; return funds only through your bank.' } },
  { id: 'Harga atau hadiah jauh di atas/di bawah kewajaran, atau Anda "menang undian" yang tidak diikuti?', en: 'Is the price or prize unrealistic, or did you "win" a lottery you never entered?', weight: 2, why: { id: 'Iming-iming yang tidak wajar adalah pola umum penipuan.', en: 'Unrealistic lures are a common scam pattern.' } },
  { id: 'Diminta membayar biaya dulu untuk mencairkan pinjaman, hadiah, atau dana?', en: 'Were you asked to pay a fee first to release a loan, prize, or funds?', weight: 3, why: { id: 'Biaya di muka untuk pencairan adalah modus lazim.', en: 'Up-front fees to release money are a common scheme.' } },
  { id: 'Tautan situs mirip nama resmi tetapi ejaan/domain berbeda?', en: 'Does the website link look like an official name but with a different spelling/domain?', weight: 2, why: { id: 'Situs palsu meniru lembaga resmi; cek domain *.go.id resmi.', en: 'Fake sites imitate official ones; check the official *.go.id domain.' } },
];

export function tools(): ToolDef[] {
  return [
    defineTool({
      name: 'iasc_stats',
      description: 'IASC handling statistics (cumulative since 22 Nov 2024): reports, accounts reported/blocked, victim funds blocked/returned, reported losses, phone numbers. view = latest (values + cut-off dates), series (cumulative line, exact-date points only; headline-only points marked), ratios (blocked share & returned share gauges).',
      input: z
        .object({
          metric: z.enum(['reports_total', 'accounts_reported', 'accounts_blocked', 'funds_blocked_idr', 'funds_returned_idr', 'losses_reported_idr', 'phone_numbers_reported']).nullable(),
          view: z.enum(['latest', 'series', 'ratios']),
        })
        .strict(),
      label: { id: 'Membaca statistik penanganan IASC…', en: 'Reading IASC handling statistics…' },
      run: async ({ metric, view: v }, ctx) => {
        const L = ctx.locale;
        const s = await stats(ctx);
        const label = (m: string) => s.labels[m]?.[L] ?? m;
        if (v === 'ratios') {
          const pairs = [
            ['accounts_blocked', 'accounts_reported'],
            ['funds_returned_idr', 'funds_blocked_idr'],
          ] as const;
          const ui = [];
          const out = [];
          for (const [num, den] of pairs) {
            const n = s.latest[num];
            const d = n ? s.series[den]?.find((o) => o.cutoff === n.cutoff) : undefined;
            if (!n || !d) continue;
            const value = Math.round((n.value / d.value) * 1e6) / 1e6;
            out.push({ numerator: num, denominator: den, cutoff: n.cutoff, share: value, numerator_value: n.value, denominator_value: d.value });
            ui.push(artifact('gauge', `${label(num)} ÷ ${label(den)}`, { type: 'gauge', value, label: `${label(num)} ÷ ${label(den)}`, cutoff: n.cutoff, numerator: { label: label(num), value: n.value }, denominator: { label: label(den), value: d.value }, unit: 'share' }, srcOf(n.cutoff)));
          }
          return { data: { ratios: out }, ui, method: method('iasc_stats', ['share'], { inputs: { view: v }, rows_used: out.length * 2, dataset: 'antiscam_kb.json', as_of: s.as_of, flags: ['cumulative_since_2024_11_22'] }), citations: [{ dex: DEX, dataset: 'antiscam_kb.json', as_of: s.as_of }] };
        }
        if (v === 'series') {
          const m = metric ?? 'reports_total';
          const pts = s.series[m];
          if (!pts?.length) throw new ToolError(`No exact-date observations for ${m}.`);
          const monthOnly = s.observations.filter((o) => o.metric === m && o.cutoff_precision === 'month').map((o) => ({ cutoff: o.cutoff, value: o.value, source_ids: o.source_ids }));
          return {
            data: { metric: m, label: label(m), points: pts.map((p) => ({ cutoff: p.cutoff, value: p.value, headline_only: p.headline_only, sources: p.source_ids })), month_precision_table: monthOnly },
            ui: [
              artifact('line', label(m), { type: 'line', x: pts.map((p) => p.cutoff), series: [{ name: label(m), data: pts.map((p) => p.value), marker: pts.map((p) => (p.headline_only ? 'headline' : null)) }], yUnit: m.endsWith('_idr') ? 'currency' : 'number', ...(m.endsWith('_idr') ? { currency: 'IDR' } : {}) }, srcOf(pts.at(-1)!.cutoff)),
              ...(monthOnly.length ? [artifact('table', tr(L, 'Observasi berpresisi bulan (tidak digaris)', 'Month-precision observations (not plotted)'), { type: 'table', columns: [{ key: 'cutoff', label: tr(L, 'Bulan', 'Month') }, { key: 'value', label: label(m) }], rows: monthOnly.map((o) => ({ cutoff: o.cutoff, value: o.value })) }, srcOf(s.as_of))] : []),
            ],
            method: method('iasc_stats', [], { inputs: { metric: m, view: v }, rows_used: pts.length, dataset: 'antiscam_kb.json', as_of: pts.at(-1)!.cutoff, flags: ['exact_date_points_only', ...(pts.some((p) => p.headline_only) ? ['headline_points_marked'] : [])] }),
            citations: [{ dex: DEX, dataset: 'antiscam_kb.json', as_of: pts.at(-1)!.cutoff }],
          };
        }
        const keys = metric ? [metric] : Object.keys(s.latest);
        const rows = keys.filter((k) => s.latest[k]).map((k) => ({ metric: k, label: label(k), value: s.latest[k]!.value, cutoff: s.latest[k]!.cutoff, headline_only: s.latest[k]!.headline_only, sources: s.latest[k]!.source_ids }));
        if (!rows.length) throw new ToolError('Metric not available.');
        return {
          data: { latest: rows, since: '2024-11-22' },
          ui: [artifact('table', tr(L, 'Statistik penanganan terbaru', 'Latest handling statistics'), { type: 'table', columns: [{ key: 'label', label: tr(L, 'Metrik', 'Metric') }, { key: 'value', label: tr(L, 'Nilai', 'Value') }, { key: 'cutoff', label: tr(L, 'Tanggal potong', 'Cut-off') }], rows: rows.map((r) => ({ label: r.label, value: r.value, cutoff: r.cutoff })) }, srcOf(s.as_of))],
          method: method('iasc_stats', [], { inputs: { metric, view: v }, rows_used: rows.length, dataset: 'antiscam_kb.json', as_of: s.as_of, flags: ['cumulative_since_2024_11_22'] }),
          citations: [{ dex: DEX, dataset: 'antiscam_kb.json', as_of: s.as_of }],
        };
      },
    }),
    defineTool({
      name: 'satgas_stats',
      description: 'Satgas PASTI statistics: complaints about illegal entities (illegal online loans, illegal investment, illegal pawning) and entities stopped, with cut-off dates. period = cutoff date (YYYY-MM-DD) or null for all.',
      input: z.object({ period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable() }).strict(),
      label: { id: 'Membaca statistik Satgas PASTI…', en: 'Reading Satgas PASTI statistics…' },
      run: async ({ period }, ctx) => {
        const k = await kb(ctx);
        const rows = k.satgas_pasti_stats.filter((s) => !period || s.cutoff === period);
        if (!rows.length) throw new ToolError('No Satgas PASTI observation for that cut-off.');
        const latest = rows.reduce((a, b) => (b.cutoff > a.cutoff ? b : a));
        return {
          data: { observations: rows },
          ui: [artifact('bar', tr(ctx.locale, `Satgas PASTI — ${latest.metric}`, `Satgas PASTI — ${latest.metric}`), { type: 'bar', categories: Object.keys(latest.breakdown), series: [{ name: latest.metric, data: Object.values(latest.breakdown) }], horizontal: true, yUnit: 'number' }, srcOf(latest.cutoff))],
          method: method('satgas_stats', [], { inputs: { period }, rows_used: rows.length, dataset: 'antiscam_kb.json', as_of: latest.cutoff }),
          citations: [{ dex: DEX, dataset: 'antiscam_kb.json', as_of: latest.cutoff }],
        };
      },
    }),
    defineTool({
      name: 'ojk_consumer_stats',
      description: 'OJK consumer-service statistics (service requests, complaints by sector) with the period stated in the source.',
      input: z.object({}).strict(),
      label: { id: 'Membaca statistik layanan konsumen OJK…', en: 'Reading OJK consumer-service statistics…' },
      run: async (_i, ctx) => {
        const k = await kb(ctx);
        const oc = k.ojk_consumer_stats;
        const by = oc.service_requests.complaints_by_sector;
        return {
          data: oc,
          ui: [artifact('bar', tr(ctx.locale, 'Pengaduan konsumen per sektor (OJK)', 'Consumer complaints by sector (OJK)'), { type: 'bar', categories: Object.keys(by), series: [{ name: tr(ctx.locale, 'Pengaduan', 'Complaints'), data: Object.values(by) }], horizontal: true, yUnit: 'number' }, srcOf(String((oc.service_requests as unknown as { cutoff?: string }).cutoff ?? '')))],
          method: method('ojk_consumer_stats', [], { inputs: {}, rows_used: Object.keys(by).length, dataset: 'antiscam_kb.json', as_of: String((oc.service_requests as unknown as { cutoff?: string }).cutoff ?? '') }),
          citations: [{ dex: DEX, dataset: 'antiscam_kb.json', as_of: String((oc.service_requests as unknown as { cutoff?: string }).cutoff ?? '') }],
        };
      },
    }),
    defineTool({
      name: 'modus_library',
      description: 'Library of 11 scam types with red flags (query filters by keyword, e.g. "phishing", "pinjol", "investasi").',
      input: z.object({ query: z.string().max(80).nullable() }).strict(),
      label: { id: 'Membuka pustaka modus…', en: 'Opening scam library…' },
      run: async ({ query }, ctx) => {
        const L = ctx.locale;
        const k = await kb(ctx);
        const q = (query ?? '').toLowerCase();
        const list = k.modus.filter((m) => !q || `${m.id} ${m.name} ${m.name_en ?? ''} ${m.description} ${m.red_flags.join(' ')}`.toLowerCase().includes(q));
        if (!list.length) throw new ToolError('No matching scam type; call modus_library with query null to list all.');
        return {
          data: { modus: list.map((m) => ({ id: m.id, name: L === 'en' && m.name_en ? m.name_en : m.name, description: m.description, red_flags: m.red_flags, sources: m.source_ids })) },
          ui: list.slice(0, 4).map((m) => artifact('card', L === 'en' && m.name_en ? m.name_en : m.name, { type: 'card', tone: 'warning', body: m.description, items: m.red_flags }, srcOf('2026-10-23'))),
          citations: [{ dex: DEX, dataset: 'antiscam_kb.json', as_of: '2026-10-23' }],
        };
      },
    }),
    defineTool({
      name: 'modus_stats',
      description: 'Reports per scam type as published (with source and cut-off). Where media report different numbers for the same type, BOTH are returned with their sources (conflict flag) — never reconciled.',
      input: z.object({}).strict(),
      label: { id: 'Membaca statistik modus…', en: 'Reading scam-type statistics…' },
      run: async (_i, ctx) => {
        const L = ctx.locale;
        const k = await kb(ctx);
        const names = new Map(k.modus.map((m) => [m.id, L === 'en' && m.name_en ? m.name_en : m.name]));
        const rows = k.modus_stats.filter((m) => typeof m.reports === 'number');
        return {
          data: { modus_stats: k.modus_stats.map((m) => ({ ...m, name: names.get(m.modus_id) })), conflicts: k.modus_stats.filter((m) => m.conflict).map((m) => m.modus_id) },
          ui: [artifact('bar', tr(L, 'Laporan per modus', 'Reports by scam type'), { type: 'bar', categories: rows.map((m) => `${names.get(m.modus_id)}${m.conflict ? ' ⚠' : ''}`), series: [{ name: tr(L, 'Laporan', 'Reports'), data: rows.map((m) => m.reports as number) }], horizontal: true, yUnit: 'number' }, srcOf('2026-10-23'))],
          method: method('modus_stats', [], { inputs: {}, rows_used: rows.length, dataset: 'antiscam_kb.json', as_of: '2026-10-23', flags: k.modus_stats.some((m) => m.conflict) ? ['source_conflict_shown'] : [] }),
          citations: [{ dex: DEX, dataset: 'antiscam_kb.json', as_of: '2026-10-23' }],
        };
      },
    }),
    defineTool({
      name: 'region_stats',
      description: 'Scam reports by region as published (with source and cut-off).',
      input: z.object({}).strict(),
      label: { id: 'Membaca statistik wilayah…', en: 'Reading regional statistics…' },
      run: async (_i, ctx) => {
        const k = await kb(ctx);
        const r = k.region_stats.regions;
        return {
          data: k.region_stats,
          ui: [artifact('bar', tr(ctx.locale, 'Laporan per wilayah', 'Reports by region'), { type: 'bar', categories: r.map((x) => x.region), series: [{ name: tr(ctx.locale, 'Laporan', 'Reports'), data: r.map((x) => x.reports) }], horizontal: true, yUnit: 'number' }, srcOf(String((k.region_stats as unknown as { cutoff?: string }).cutoff ?? '')))],
          citations: [{ dex: DEX, dataset: 'antiscam_kb.json', as_of: String((k.region_stats as unknown as { cutoff?: string }).cutoff ?? '') }],
        };
      },
    }),
    defineTool({
      name: 'reporting_guide',
      description: 'How to report to IASC: portal features, 4 reporting steps, data to prepare (grouped), rules (1 form = 1 victim account → 1 reported account; dual track IASC + police report; no guarantee funds return), handling flow, refunds, official FAQ (unanswered FAQ link to the official page).',
      input: z.object({}).strict(),
      label: { id: 'Menyiapkan panduan pelaporan…', en: 'Preparing reporting guide…' },
      run: async (_i, ctx) => {
        const L = ctx.locale;
        const k = await kb(ctx);
        const i = k.iasc as unknown as Record<string, unknown> & { reporting_steps: { n: number; label: string }[]; rules: { text: string }[]; required_data: Record<string, string[]> };
        const groups = Object.entries(i.required_data).filter(([g]) => g !== 'source_ids');
        return {
          data: i,
          ui: [
            artifact('steps', tr(L, 'Melapor ke IASC (iasc.ojk.go.id)', 'Reporting to IASC (iasc.ojk.go.id)'), { type: 'steps', steps: i.reporting_steps.map((s) => ({ text: s.label, urgent: s.n <= 2, channels: s.n === 2 ? [{ id: 'iasc-lapor', name: 'iasc.ojk.go.id', url: 'https://iasc.ojk.go.id' }] : [] })), notes: i.rules.map((r) => r.text), disclaimer: tr(L, 'Finandex bukan IASC dan tidak meneruskan laporan. Laporan resmi hanya di iasc.ojk.go.id.', 'Finandex is not IASC and does not forward reports. Official reports only at iasc.ojk.go.id.') }, srcOf('2026-10-23')),
            artifact('card', tr(L, 'Data yang perlu disiapkan', 'Data to prepare'), { type: 'card', tone: 'info', body: tr(L, 'Siapkan sendiri; jangan kirim ke Finandex.', 'Prepare it yourself; do not send it to Finandex.'), items: groups.map(([g, xs]) => `${g}: ${xs.join('; ')}`) }, srcOf('2026-10-23')),
          ],
          citations: [{ dex: DEX, dataset: 'antiscam_kb.json', as_of: '2026-10-23' }],
        };
      },
    }),
    defineTool({
      name: 'channel_directory',
      description: 'Official channels (IASC report/check, Kontak OJK 157, SiPASTI, BI BICARA 131, cekrekening.id, aduannomor.id, police report, LAPS SJK, your bank, 112) with when to use each.',
      input: z.object({ situation: z.string().max(120).nullable() }).strict(),
      label: { id: 'Membuka direktori kanal resmi…', en: 'Opening official channels…' },
      run: async ({ situation }, ctx) => channelDirectory(DEX, ctx, situation),
    }),
    defineTool({
      name: 'evidence_checklist',
      description: 'Checklist of evidence to keep (phone numbers, dated chats, transfer proofs, destination accounts, URLs).',
      input: z.object({}).strict(),
      label: { id: 'Menyiapkan daftar bukti…', en: 'Preparing evidence checklist…' },
      run: async (_i, ctx) => {
        const k = await kb(ctx);
        return { data: k.evidence_checklist, ui: [artifact('card', tr(ctx.locale, 'Amankan bukti', 'Keep evidence'), { type: 'card', tone: 'info', body: tr(ctx.locale, 'Jangan hapus apa pun sebelum didokumentasikan.', 'Do not delete anything before documenting it.'), items: k.evidence_checklist.items }, srcOf('2026-10-23'))], citations: [{ dex: DEX, dataset: 'antiscam_kb.json', as_of: '2026-10-23' }] };
      },
    }),
    defineTool({
      name: 'prevention_tips',
      description: 'Prevention tips from official public information.',
      input: z.object({}).strict(),
      label: { id: 'Menyiapkan tips pencegahan…', en: 'Preparing prevention tips…' },
      run: async (_i, ctx) => {
        const k = await kb(ctx);
        return { data: k.prevention, ui: [artifact('card', tr(ctx.locale, 'Cegah penipuan', 'Prevent scams'), { type: 'card', tone: 'info', body: tr(ctx.locale, 'Tips dari informasi publik resmi:', 'Tips from official public information:'), items: k.prevention.map((p) => p.text) }, srcOf('2026-10-23'))], citations: [{ dex: DEX, dataset: 'antiscam_kb.json', as_of: '2026-10-23' }] };
      },
    }),
    defineTool({
      name: 'scam_selfcheck',
      description: `Deterministic self-check quiz "Apakah ini scam?": answers = ${SELF_CHECK_QUESTIONS.length} yes/no booleans in the order of the questions (call with answers null to get the questions). Returns a red-flag score and an explanation per answer. Nothing is sent anywhere.`,
      input: z.object({ answers: z.array(z.boolean()).nullable() }).strict(),
      label: { id: 'Menghitung tanda bahaya…', en: 'Scoring red flags…' },
      run: async ({ answers }, ctx) => {
        const L = ctx.locale;
        if (!answers) return { data: { questions: SELF_CHECK_QUESTIONS.map((q, i) => ({ index: i, question: q[L] })) } };
        if (answers.length !== SELF_CHECK_QUESTIONS.length) throw new ToolError(`Provide exactly ${SELF_CHECK_QUESTIONS.length} answers.`);
        const r = scoreSelfCheck(answers);
        const verdict = r.level === 'high' ? tr(L, 'Banyak tanda bahaya — sangat mungkin penipuan. Hentikan komunikasi dan verifikasi lewat kanal resmi.', 'Many red flags — very likely a scam. Stop communicating and verify via official channels.') : r.level === 'medium' ? tr(L, 'Ada tanda bahaya — jangan transfer/berikan data sebelum verifikasi.', 'Some red flags — do not transfer or share data before verifying.') : tr(L, 'Sedikit tanda bahaya terdeteksi, tetap waspada.', 'Few red flags detected; stay careful.');
        return {
          data: { ...r, verdict },
          ui: [
            artifact('gauge', tr(L, 'Skor tanda bahaya', 'Red-flag score'), { type: 'gauge', value: r.score / r.max, label: verdict, cutoff: '—', numerator: { label: tr(L, 'Skor', 'Score'), value: r.score }, denominator: { label: tr(L, 'Maksimum', 'Maximum'), value: r.max }, unit: 'count' }, srcOf('2026-10-23')),
            artifact('card', tr(L, 'Penjelasan', 'Explanation'), { type: 'card', tone: r.level === 'low' ? 'info' : 'warning', body: verdict, items: SELF_CHECK_QUESTIONS.filter((_, i) => answers[i]).map((q) => q.why[L]) }, srcOf('2026-10-23')),
          ],
          method: method('scam_selfcheck', [], { inputs: { answers }, rows_used: answers.length, dataset: 'scam_selfcheck (Finandex)', as_of: '2026-10-23', flags: ['deterministic_score', 'not_a_verdict'] }),
        };
      },
    }),
    defineTool({
      name: 'emergency_steps',
      description: 'Just scammed: elapsed = time since the last transfer (lt24h|gt24h|unknown), method = bank|pjp (e-wallet/payment provider)|crypto|other. Runs the FinLAIwyer flow fin-baru-tertipu and returns ordered immediate steps with official channels (urgent marked).',
      input: z.object({ elapsed: z.enum(['lt24h', 'gt24h', 'unknown']), method: z.enum(['bank', 'pjp', 'crypto', 'other']) }).strict(),
      label: { id: 'Menyusun langkah darurat…', en: 'Preparing emergency steps…' },
      run: async ({ elapsed, method: m }, ctx) => {
        const r = emergencyResult(elapsed, m);
        const L = ctx.locale;
        const f = getFlow(FLOWS, 'fin-baru-tertipu');
        const v = view(f, r, L);
        if (v.node.type !== 'result') throw new ToolError('Flow did not reach a result.');
        const res = v.node;
        const { channels } = await ctx.store.json<{ channels: { id: string; name: string; name_en?: string; url?: string; phone?: string; whatsapp?: string; email?: string }[] }>('core/antiscam/channels.json');
        const ch = new Map(channels.map((c) => [c.id, c]));
        const steps = res.steps.map((s) => ({ text: L === 'en' && s.text_en ? s.text_en : s.text, urgent: s.urgent, channels: s.channels.map((id) => ({ id, name: ch.get(id)?.name ?? id, ...(ch.get(id)?.url ? { url: ch.get(id)!.url! } : {}), ...(ch.get(id)?.phone ? { phone: ch.get(id)!.phone! } : {}), ...(ch.get(id)?.whatsapp ? { whatsapp: ch.get(id)!.whatsapp! } : {}), ...(ch.get(id)?.email ? { email: ch.get(id)!.email! } : {}) })) }));
        return {
          data: { flow: r, steps: steps.map((s) => ({ text: s.text, urgent: s.urgent, channels: s.channels.map((c) => c.name) })), legal_bases: res.legal_bases, open_dex: res.open_dex },
          ui: [artifact('steps', L === 'en' && res.title_en ? res.title_en : res.title, { type: 'steps', steps, legal_bases: res.legal_bases.map((b) => ({ doc_id: b.doc_id, label: b.doc_id, ref: b.ref, why: b.why, available: true })), notes: res.notes ?? [], open_dex: res.open_dex, flow: { flow_id: r.flow_id, path: r.path }, trail: v.trail, disclaimer: tr(L, 'Finandex tidak berafiliasi dengan IASC, OJK, BI, atau Satgas PASTI. Laporan resmi hanya di iasc.ojk.go.id.', 'Finandex is not affiliated with IASC, OJK, BI, or Satgas PASTI. Official reports only at iasc.ojk.go.id.') }, srcOf('2026-10-23'))],
          method: method('emergency_steps', [], { inputs: { elapsed, method: m }, rows_used: steps.length, dataset: 'legal_qa_flows.json + antiscam_kb.json', as_of: '2026-10-23', flags: ['deterministic_flow'] }),
        };
      },
    }),
  ];
}

export function scoreSelfCheck(answers: boolean[]): { score: number; max: number; level: 'low' | 'medium' | 'high'; flagged: number[] } {
  const max = SELF_CHECK_QUESTIONS.reduce((a, q) => a + q.weight, 0);
  const score = SELF_CHECK_QUESTIONS.reduce((a, q, i) => a + (answers[i] ? q.weight : 0), 0);
  const flagged = answers.flatMap((x, i) => (x ? [i] : []));
  const level = score >= 6 || answers[0] ? 'high' : score >= 3 ? 'medium' : 'low';
  return { score, max, level, flagged };
}

/** Map the emergency screen's two answers onto the fin-baru-tertipu flow path (deterministic). */
export function emergencyResult(elapsed: 'lt24h' | 'gt24h' | 'unknown', m: 'bank' | 'pjp' | 'crypto' | 'other') {
  const f = getFlow(FLOWS, 'fin-baru-tertipu');
  let s = start(f);
  s = step(f, s, { lt24h: 0, gt24h: 1, unknown: 2 }[elapsed]);
  s = step(f, s, { bank: 0, pjp: 1, crypto: 2, other: 3 }[m]);
  return s;
}
