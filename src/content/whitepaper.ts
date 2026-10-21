// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// FinanDex whitepaper (ID/EN). One source for the in-app GitBook-style reader (/whitepaper) and the downloadable
// PDF (scripts/build/whitepaper-pdf.ts). Each chapter is Markdown; `###` headings feed the "on this page" list.
// Tokens: {{inputs}} = number of input datasets, {{dex_table}} = table generated from the Dex registry.
import { INPUT_FILES } from '../config/data-sources.ts';
import { DEX_GROUPS } from '../config/dex-groups.ts';
import { DEX_REGISTRY } from '../config/dex-registry.ts';
import type { Locale } from '../i18n/index.ts';
import { APP_VERSION } from '../../server/dex/shared-tools.ts';

export interface Chapter {
  slug: string;
  title: string;
  body: string;
}

export const WHITEPAPER_TITLE: Record<Locale, string> = {
  id: 'Whitepaper FinanDex',
  en: 'FinanDex Whitepaper',
};
export const WHITEPAPER_SUBTITLE: Record<Locale, string> = {
  id: 'Wawasan Indeks Pasar Keuangan Global — 27 chatbot data dalam satu aplikasi',
  en: 'Global Financial Market Indexing Insights — 27 data chatbots in one app',
};
export const WHITEPAPER_DATE = '2026-10-21';
export const WHITEPAPER_VERSION = APP_VERSION;
export const pdfPath = (locale: Locale) => `/whitepaper/finandex-whitepaper-${locale}.pdf`;

const STATUS: Record<Locale, Record<string, string>> = {
  id: { live: 'live', partial: 'parsial', 'pending-data': 'menunggu data' },
  en: { live: 'live', partial: 'partial', 'pending-data': 'pending data' },
};

function dexTable(locale: Locale): string {
  const head =
    locale === 'id'
      ? '| Kategori | Dex | Cakupan | Status |\n| --- | --- | --- | --- |'
      : '| Category | Dex | Scope | Status |\n| --- | --- | --- | --- |';
  const rows = DEX_GROUPS.flatMap((g) =>
    DEX_REGISTRY.filter((d) => d.group === g.id)
      .sort((a, b) => a.order - b.order)
      .map((d) => `| ${g.name[locale]} | ${d.name} | ${d.tagline[locale]} | ${STATUS[locale][d.status] ?? d.status} |`),
  );
  return [head, ...rows].join('\n');
}

const ID: Chapter[] = [
  {
    slug: 'pendahuluan',
    title: 'Apa itu FinanDex?',
    body: `FinanDex adalah aplikasi wawasan data keuangan dan sosial-ekonomi yang menggabungkan **27 chatbot spesialis ("Dex")** dalam satu tempat. Setiap Dex menguasai satu topik — misalnya saham NASDAQ, kurs rupiah, kripto, gaji, harga rumah, atau dokumen hukum — dan menjawab pertanyaan Anda dengan angka yang dihitung dari dataset nyata, lengkap dengan grafik, tabel, dan penjelasan metode.

### Ringkasan singkat

- **Satu pertanyaan, jawaban berbasis data.** Ketik pertanyaan dalam bahasa sehari-hari; Finandex AI mengarahkan Anda ke Dex yang tepat.
- **Angka tidak dikarang.** Semua angka berasal dari *tool* deterministik yang membaca dataset; model AI hanya memilih tool dan merangkai penjelasan.
- **Transparan.** Setiap jawaban menampilkan tanggal data ("Data per"), sumber, dan panel metode yang menjelaskan cara angka dihitung.
- **Bisa dipakai tanpa chat.** Setiap Dex juga punya tab fitur (grafik, peringkat, perbandingan) yang memakai tool yang sama.
- **Di mana saja.** Web, PWA yang bisa dipasang dan dibuka offline, serta aplikasi Android dan iOS. Tersedia dalam Bahasa Indonesia dan Inggris.

### Untuk siapa?

Pelajar, peneliti, jurnalis, analis, dan siapa pun yang ingin memahami data pasar dan ekonomi dengan cepat tanpa harus mengolah spreadsheet sendiri.

> FinanDex menyajikan informasi dan edukasi. FinanDex **bukan** nasihat investasi, keuangan, atau hukum.`,
  },
  {
    slug: 'masalah',
    title: 'Masalah yang Diselesaikan',
    body: `Data keuangan dan ekonomi tersebar di banyak dataset dengan format, istilah, dan tanggal pembaruan yang berbeda-beda. Untuk menjawab pertanyaan sederhana seperti "berapa return emas dibanding Bitcoin lima tahun terakhir?" orang biasanya harus mencari data, membersihkannya, lalu menghitung sendiri.

### Tiga hambatan utama

1. **Fragmentasi.** Data saham, kurs, makro, startup, biaya hidup, dan hukum berada di sumber yang terpisah.
2. **Hambatan teknis.** Menghitung return, volatilitas, drawdown, atau korelasi membutuhkan keahlian analisis data.
3. **Risiko halusinasi AI.** Chatbot umum dapat menyebut angka yang terdengar meyakinkan tetapi tidak bersumber.

### Pendekatan FinanDex

FinanDex memisahkan dua pekerjaan: **perhitungan** dilakukan oleh kode deterministik yang teruji, sedangkan **bahasa** dikerjakan oleh model AI. Hasilnya adalah jawaban yang mudah dipahami, dapat ditelusuri, dan konsisten — pertanyaan yang sama atas data yang sama selalu menghasilkan angka yang sama.`,
  },
  {
    slug: 'cara-kerja',
    title: 'Cara Kerja',
    body: `Setiap pertanyaan melewati alur yang sama, dari pesan Anda sampai jawaban dengan grafik.

### Alur sebuah pertanyaan

1. **Anda bertanya** di Finandex AI atau langsung di Dex tertentu.
2. **Pemeriksaan keamanan** di perangkat dan di server menolak pesan yang memuat data sensitif (seed phrase, private key, nomor kartu, NIK).
3. **Model AI memilih tool.** Model menerima daftar tool milik Dex tersebut beserta skemanya yang ketat, lalu memutuskan tool mana yang perlu dipanggil.
4. **Tool menghitung.** Tool membaca dataset dan mengembalikan tiga hal: data ringkas untuk model, spesifikasi grafik/tabel untuk layar, dan catatan metode.
5. **Jawaban disusun.** Model merangkai penjelasan dari hasil tool. Grafik dipilih oleh tool, bukan oleh model.
6. **Anda melihat hasilnya** secara streaming: teks, grafik interaktif, tabel, panel metode, dan sitasi sumber.

### Batasan yang disengaja

- Paling banyak 8 putaran dan 12 pemanggilan tool per pertanyaan; tiap tool dibatasi waktu 8 detik.
- Jika data tidak tersedia, Dex mengatakannya dengan jelas ("menunggu data") alih-alih menebak.
- Pertanyaan di luar cakupan diarahkan ke Dex yang lebih tepat.

### Tab fitur tanpa chat

Setiap Dex memiliki tab (misalnya Ringkasan, Peringkat, Perbandingan, Data) yang menjalankan tool yang sama langsung di peramban. Tab Data selalu menampilkan sumber, lisensi, dan tanggal data.`,
  },
  {
    slug: 'dex',
    title: '27 Dex dalam 8 Kategori',
    body: `FinanDex dibangun dari satu *registry* Dex. Navigasi, Beranda, Dex Hub, pencarian, router chat, dan halaman sumber data seluruhnya dibangkitkan dari registry yang sama, sehingga daftar di bawah ini selalu sesuai dengan aplikasi.

### Daftar Dex

{{dex_table}}

### Finandex AI sebagai pintu masuk

Finandex AI menjawab pertanyaan lintas pasar (indeks, komoditas, mata uang, kripto) dan dapat membuka Dex lain ketika pertanyaan Anda lebih cocok dijawab di sana.`,
  },
  {
    slug: 'data',
    title: 'Data & Metodologi',
    body: `FinanDex memakai {{inputs}} berkas dataset masukan yang diolah menjadi data siap pakai melalui proses ETL (*extract, transform, load*) saat build.

### Prinsip pengolahan data

- **Tanpa angka karangan.** Bila dataset tidak ada, Dex berstatus *menunggu data* dan tidak menampilkan angka pengganti.
- **Tanggal data eksplisit.** Setiap Dex menampilkan "Data per" yang diambil dari dataset, bukan tanggal hari ini.
- **Label jujur.** Data sintetis (misalnya CostLivingDex) dan data sampel diberi label jelas di antarmuka.
- **Dataset diperlakukan sebagai data.** Isi dataset tidak pernah dijalankan sebagai instruksi atau skrip.

### Perhitungan yang dapat diverifikasi

- **Golden test.** Hasil perhitungan dibandingkan dengan berkas acuan (toleransi relatif 1e-6, absolut 1e-9).
- **Parity Python ↔ TypeScript.** Perhitungan acuan ditulis ulang secara independen dalam Python; hasilnya harus identik dengan implementasi aplikasi.
- **Panel metode.** Setiap jawaban menyertakan rumus dan asumsi yang dipakai, misalnya cara menghitung return tahunan atau drawdown.

### Lisensi data

Setiap dataset memiliki lisensinya sendiri dan ditampilkan di halaman Sumber Data. Dataset berlisensi CC BY-NC 4.0 hanya untuk penggunaan non-komersial; dataset yang lisensinya tidak dicantumkan ditandai dan memerlukan konfirmasi sebelum distribusi publik.`,
  },
  {
    slug: 'ai',
    title: 'Lapisan AI',
    body: `FinanDex memakai model Claude dari Anthropic melalui server FinanDex. Kunci API tidak pernah dikirim ke perangkat pengguna.

### Bagaimana AI dipakai

- **Tool use.** Model hanya dapat memanggil tool milik Dex yang aktif, dengan input yang divalidasi skema ketat.
- **Prompt per Dex.** Setiap Dex memiliki *system prompt* sendiri (ID dan EN) di atas aturan global yang sama.
- **Streaming.** Jawaban dikirim bertahap (Server-Sent Events) sehingga teks dan grafik muncul segera.
- **Efisiensi.** Prompt dan daftar tool di-*cache*; anggaran token harian membatasi biaya.

### Aturan perilaku

- Tidak memberikan rekomendasi beli/jual atau nasihat hukum personal.
- Selalu menyebut tanggal data dan sumber.
- Menolak memproses data sensitif dan mengingatkan pengguna untuk tidak membagikannya.
- Mengakui ketika data tidak cukup alih-alih menebak.`,
  },
  {
    slug: 'arsitektur',
    title: 'Arsitektur Teknis',
    body: `FinanDex terdiri dari aplikasi klien dan satu fungsi server ringan.

### Klien

- React 19, TypeScript (strict), Vite, dan Tailwind.
- Grafik ECharts yang dimuat sesuai kebutuhan; tabel virtual untuk data besar.
- PWA dengan service worker: halaman dan data inti tersedia offline.
- Capacitor untuk aplikasi Android dan iOS dari basis kode yang sama.

### Server

- Satu *handler* Web standar (Request → Response) yang berjalan sebagai Vercel Function maupun Netlify Function.
- Orkestrator chat: memanggil Claude, menjalankan tool, dan mengalirkan hasilnya melalui SSE.
- Tool deterministik yang sama dipakai di server (chat) dan di peramban (tab fitur).

### Data

Data inti (\`core\`) dibundel bersama aplikasi; data besar (\`heavy\`, misalnya deret harga lengkap dan dokumen hukum) dimuat sesuai permintaan dengan cache.`,
  },
  {
    slug: 'keamanan',
    title: 'Keamanan & Privasi',
    body: `FinanDex dirancang agar tidak memerlukan akun dan menyimpan sesedikit mungkin data.

### Privasi

- Tanpa akun, tanpa iklan, tanpa analitik atau pelacakan pihak ketiga.
- Riwayat chat, watchlist, dan preferensi hanya disimpan di perangkat Anda dan dapat dihapus dari Pengaturan.
- Server hanya mencatat metadata teknis (id permintaan, Dex, nama tool, latensi, jumlah token) tanpa isi pesan.
- Kebijakan privasi disusun dengan mengacu pada UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi.

### Keamanan

- Validasi input ketat dan batas ukuran permintaan 64 KB.
- Daftar asal (CORS) yang diizinkan, header keamanan, dan Content Security Policy tanpa skrip inline.
- Batas laju: 20 permintaan per 10 menit dan 200 per hari per perangkat, ditambah anggaran token harian.
- Penjaga data sensitif di klien dan server.
- Pemeriksaan otomatis terhadap kebocoran secret di repositori dan hasil build.`,
  },
  {
    slug: 'platform',
    title: 'Platform & Aksesibilitas',
    body: `### Tersedia di

- **Web** — dapat dibuka di peramban modern.
- **PWA** — dapat dipasang ke layar utama dan tetap berfungsi offline untuk data yang sudah tersimpan.
- **Android & iOS** — aplikasi native berbasis Capacitor.

### Ramah untuk semua

- Bahasa Indonesia dan Inggris.
- Tema terang dan gelap, serta palet ramah buta warna.
- Target WCAG 2.2 AA: kontras warna diperiksa otomatis, navigasi keyboard, dan label pembaca layar.
- Ekspor tabel ke CSV dengan tanda air sumber.`,
  },
  {
    slug: 'kualitas',
    title: 'Jaminan Kualitas',
    body: `Setiap build harus lolos serangkaian *gate* otomatis. Hasil berikut diukur pada build 21 Oktober 2026.

### Hasil pengujian

| Gate | Hasil |
| --- | --- |
| Unit + tools test | 380/380 lulus |
| Coverage (statement / branch) | 98,64% / 90,87% |
| Golden test | 60/60 lulus, 49 berkas identik |
| Parity Python ↔ TypeScript | 48 berkas, 0 selisih |
| Evaluasi chat (mock, 128 item) | 115 lulus, 0 gagal, 13 menunggu data |
| E2E Playwright (Chromium desktop + mobile) | 116 lulus |
| Aksesibilitas axe (8 halaman × 2 tema) | 0 pelanggaran serius |
| Lighthouse mobile Beranda | Performance 91 · Accessibility 100 · Best Practices 100 · SEO 92 |
| Ukuran JavaScript awal | 130,27 KB gzip (batas 250 KB) |

### Yang belum diukur

Evaluasi chat dengan model sungguhan (memerlukan kunci API), E2E di WebKit dan Firefox, serta build Android/iOS dijalankan di CI.`,
  },
  {
    slug: 'status',
    title: 'Status & Keterbatasan',
    body: `### Status saat ini

- 24 Dex berstatus live.
- NASDAQDex dan SnP500Dex **menunggu data** (dataset NASDAQ dan S&P 500 belum tersedia).
- My LAIwyer **parsial**: UUD 1945 dan UU 1/1946 sudah terindeks; KUHAP (UU 8/1981) dan KUHP baru (UU 20/2025) menunggu dokumen.

### Keterbatasan

- Data bersifat historis per tanggal dataset; FinanDex bukan sumber harga real-time.
- Beberapa dataset merupakan sampel atau sintetis, dan ditandai di antarmuka.
- Peta ditampilkan sebagai grafik sebar/batang karena data batas wilayah (GeoJSON) tidak termasuk dalam masukan.
- Jawaban AI dapat keliru dalam merangkai penjelasan; selalu periksa angka di panel metode dan tab Data.`,
  },
  {
    slug: 'legal',
    title: 'Disclaimer & Hak Cipta',
    body: `### Disclaimer

FinanDex menyajikan data historis untuk informasi dan edukasi. FinanDex bukan nasihat investasi, keuangan, pajak, atau hukum. Keputusan atas dasar informasi ini sepenuhnya menjadi tanggung jawab pengguna. Merek dagang pihak ketiga yang disebut adalah milik pemiliknya masing-masing.

### Pembuat

FinanDex dirancang dan dikembangkan oleh Dea Saka Kurnia Putra.

*A BRIGHTER TOMORROW THROUGH MEANINGFUL WORK*

### Hak cipta

© 2026 Dea Saka Kurnia Putra. Hak cipta dilindungi undang-undang. Dilarang menyalin, memodifikasi, atau mendistribusikan perangkat lunak FinanDex tanpa izin tertulis dari pemegang hak cipta.`,
  },
];

const EN: Chapter[] = [
  {
    slug: 'introduction',
    title: 'What is FinanDex?',
    body: `FinanDex is a financial and socio-economic data insight app that brings **27 specialist chatbots ("Dex")** together in one place. Each Dex masters one topic — NASDAQ stocks, the rupiah, crypto, salaries, house prices or legal documents, for example — and answers your questions with numbers computed from real datasets, complete with charts, tables and an explanation of the method.

### At a glance

- **One question, a data-backed answer.** Ask in plain language; Finandex AI routes you to the right Dex.
- **Numbers are never made up.** Every number comes from deterministic *tools* that read the datasets; the AI model only chooses tools and writes the explanation.
- **Transparent.** Every answer shows the data date ("Data as of"), the source and a method panel explaining how the numbers were computed.
- **Usable without chat.** Every Dex also has feature tabs (charts, rankings, comparisons) built on the same tools.
- **Everywhere.** Web, an installable PWA that works offline, and Android and iOS apps. Available in Indonesian and English.

### Who is it for?

Students, researchers, journalists, analysts and anyone who wants to understand market and economic data quickly without processing spreadsheets themselves.

> FinanDex provides information and education. FinanDex is **not** investment, financial or legal advice.`,
  },
  {
    slug: 'problem',
    title: 'The Problem',
    body: `Financial and economic data is scattered across many datasets with different formats, terms and update dates. To answer a simple question such as "how did gold compare with Bitcoin over the last five years?" people usually have to find the data, clean it and compute the answer themselves.

### Three main obstacles

1. **Fragmentation.** Stock, currency, macro, startup, cost-of-living and legal data live in separate sources.
2. **Technical barrier.** Computing returns, volatility, drawdowns or correlations requires data-analysis skills.
3. **AI hallucination risk.** General chatbots can state numbers that sound convincing but have no source.

### The FinanDex approach

FinanDex separates two jobs: **computation** is done by tested deterministic code, while **language** is handled by the AI model. The result is an answer that is easy to understand, traceable and consistent — the same question on the same data always yields the same numbers.`,
  },
  {
    slug: 'how-it-works',
    title: 'How It Works',
    body: `Every question follows the same path, from your message to an answer with charts.

### The path of a question

1. **You ask** in Finandex AI or directly in a specific Dex.
2. **Safety checks** on the device and on the server block messages containing sensitive data (seed phrases, private keys, card numbers, national ID numbers).
3. **The AI model picks tools.** The model receives that Dex's tools with strict schemas and decides which ones to call.
4. **Tools compute.** A tool reads the dataset and returns three things: compact data for the model, a chart/table specification for the screen, and a method note.
5. **The answer is written.** The model explains the tool results. Charts are chosen by the tool, not by the model.
6. **You see the result** streamed: text, interactive charts, tables, a method panel and source citations.

### Deliberate limits

- At most 8 turns and 12 tool calls per question; each tool has an 8-second time limit.
- When data is unavailable, the Dex says so clearly ("pending data") instead of guessing.
- Out-of-scope questions are routed to a better-suited Dex.

### Feature tabs without chat

Every Dex has tabs (for example Overview, Rankings, Compare, Data) that run the same tools directly in the browser. The Data tab always shows the source, license and data date.`,
  },
  {
    slug: 'dex',
    title: '27 Dex in 8 Categories',
    body: `FinanDex is built from a single Dex *registry*. Navigation, Home, the Dex Hub, search, the chat router and the data-sources page are all generated from it, so the list below always matches the app.

### The Dex list

{{dex_table}}

### Finandex AI as the front door

Finandex AI answers cross-market questions (indices, commodities, currencies, crypto) and can open another Dex when your question is better answered there.`,
  },
  {
    slug: 'data',
    title: 'Data & Methodology',
    body: `FinanDex uses {{inputs}} input dataset files, processed into ready-to-use data by an ETL (*extract, transform, load*) step at build time.

### Data principles

- **No invented numbers.** When a dataset is missing, the Dex is marked *pending data* and shows no substitute numbers.
- **Explicit data dates.** Every Dex shows "Data as of" taken from the dataset, not today's date.
- **Honest labels.** Synthetic data (for example CostLivingDex) and sampled data are clearly labelled in the interface.
- **Datasets are treated as data.** Dataset content is never executed as instructions or scripts.

### Verifiable computation

- **Golden tests.** Results are compared with reference files (relative tolerance 1e-6, absolute 1e-9).
- **Python ↔ TypeScript parity.** Reference computations are independently re-implemented in Python; the results must match the app's implementation.
- **Method panel.** Every answer includes the formulas and assumptions used, such as how annualised return or drawdown is computed.

### Data licenses

Each dataset has its own license, shown on the Data Sources page. CC BY-NC 4.0 datasets are for non-commercial use only; datasets with no stated license are flagged and need confirmation before public distribution.`,
  },
  {
    slug: 'ai',
    title: 'The AI Layer',
    body: `FinanDex uses Anthropic's Claude models through the FinanDex server. The API key is never sent to the user's device.

### How AI is used

- **Tool use.** The model can only call the active Dex's tools, with inputs validated against strict schemas.
- **Per-Dex prompts.** Each Dex has its own system prompt (ID and EN) on top of the same global rules.
- **Streaming.** Answers are sent incrementally (Server-Sent Events) so text and charts appear immediately.
- **Efficiency.** Prompts and tool lists are cached; a daily token budget caps cost.

### Behaviour rules

- No buy/sell recommendations or personal legal advice.
- Always states the data date and source.
- Refuses to process sensitive data and reminds users not to share it.
- Admits when data is insufficient instead of guessing.`,
  },
  {
    slug: 'architecture',
    title: 'Technical Architecture',
    body: `FinanDex consists of a client app and one lightweight server function.

### Client

- React 19, TypeScript (strict), Vite and Tailwind.
- ECharts loaded on demand; virtualised tables for large data.
- A PWA with a service worker: pages and core data are available offline.
- Capacitor for Android and iOS apps from the same codebase.

### Server

- One standard Web handler (Request → Response) that runs as both a Vercel Function and a Netlify Function.
- A chat orchestrator: calls Claude, runs tools and streams results over SSE.
- The same deterministic tools run on the server (chat) and in the browser (feature tabs).

### Data

Core data (\`core\`) ships with the app; heavy data (\`heavy\`, such as full price series and legal documents) is loaded on demand with caching.`,
  },
  {
    slug: 'security',
    title: 'Security & Privacy',
    body: `FinanDex is designed to need no account and to store as little data as possible.

### Privacy

- No account, no ads, no third-party analytics or tracking.
- Chat history, watchlist and preferences are stored only on your device and can be deleted in Settings.
- The server logs only technical metadata (request id, Dex, tool names, latency, token counts) without message content.
- The privacy policy references Indonesian Law No. 27 of 2022 on Personal Data Protection.

### Security

- Strict input validation and a 64 KB request size limit.
- An allowed-origin list (CORS), security headers and a Content Security Policy without inline scripts.
- Rate limits: 20 requests per 10 minutes and 200 per day per device, plus a daily token budget.
- Sensitive-data guards on client and server.
- Automated checks for leaked secrets in the repository and build output.`,
  },
  {
    slug: 'platforms',
    title: 'Platforms & Accessibility',
    body: `### Available on

- **Web** — works in modern browsers.
- **PWA** — installable to the home screen and works offline for data already stored.
- **Android & iOS** — native apps built with Capacitor.

### Built for everyone

- Indonesian and English.
- Light and dark themes, plus a colour-blind-friendly palette.
- WCAG 2.2 AA target: automated contrast checks, keyboard navigation and screen-reader labels.
- Table export to CSV with a source watermark.`,
  },
  {
    slug: 'quality',
    title: 'Quality Assurance',
    body: `Every build must pass a series of automated gates. The results below were measured on the 21 October 2026 build.

### Test results

| Gate | Result |
| --- | --- |
| Unit + tool tests | 380/380 passed |
| Coverage (statement / branch) | 98.64% / 90.87% |
| Golden tests | 60/60 passed, 49 files identical |
| Python ↔ TypeScript parity | 48 files, 0 differences |
| Chat evaluation (mock, 128 items) | 115 passed, 0 failed, 13 pending data |
| Playwright E2E (Chromium desktop + mobile) | 116 passed |
| axe accessibility (8 pages × 2 themes) | 0 serious violations |
| Lighthouse mobile, Home | Performance 91 · Accessibility 100 · Best Practices 100 · SEO 92 |
| Initial JavaScript size | 130.27 KB gzip (limit 250 KB) |

### Not yet measured

Chat evaluation with the live model (needs an API key), E2E on WebKit and Firefox, and the Android/iOS builds run in CI.`,
  },
  {
    slug: 'status',
    title: 'Status & Limitations',
    body: `### Current status

- 24 Dex are live.
- NASDAQDex and SnP500Dex are **pending data** (the NASDAQ and S&P 500 datasets are not yet available).
- My LAIwyer is **partial**: the 1945 Constitution and Law 1/1946 are indexed; the Criminal Procedure Code (Law 8/1981) and the new Criminal Code (Law 20/2025) await their documents.

### Limitations

- Data is historical as of each dataset's date; FinanDex is not a real-time price source.
- Some datasets are samples or synthetic, and are labelled in the interface.
- Maps are shown as scatter/bar charts because boundary data (GeoJSON) is not part of the inputs.
- The AI can make mistakes when explaining; always check the numbers in the method panel and the Data tab.`,
  },
  {
    slug: 'legal',
    title: 'Disclaimer & Copyright',
    body: `### Disclaimer

FinanDex presents historical data for information and education. FinanDex is not investment, financial, tax or legal advice. Decisions based on this information are solely the user's responsibility. Third-party trademarks mentioned belong to their respective owners.

### Creator

FinanDex is designed and developed by Dea Saka Kurnia Putra.

*A BRIGHTER TOMORROW THROUGH MEANINGFUL WORK*

### Copyright

© 2026 Dea Saka Kurnia Putra. All rights reserved. You may not copy, modify or distribute the FinanDex software without the written permission of the copyright holder.`,
  },
];

export function whitepaper(locale: Locale): Chapter[] {
  return (locale === 'id' ? ID : EN).map((c) => ({
    ...c,
    body: c.body.replaceAll('{{inputs}}', String(INPUT_FILES.length)).replaceAll('{{dex_table}}', dexTable(locale)),
  }));
}

/** `### Heading` lines of a chapter → anchors for the "on this page" list. */
export function headings(body: string): { id: string; text: string }[] {
  return [...body.matchAll(/^### (.+)$/gm)].map((m) => ({ id: slugify(m[1]!), text: m[1]! }));
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
