# Arsitektur

© 2026 Dea Saka Kurnia Putra. All rights reserved.

```
Browser / PWA / Capacitor (React 19 + Vite)            Vercel Function · Netlify Function
┌──────────────────────────────────────────┐          ┌──────────────────────────────────────┐
│ pages · Dex tabs (views) · chat UI        │  SSE     │ server/handler.ts (Web Request→Response)│
│   └─ runTool() ── same tools ──┐          │◀────────▶│  validate · CORS · rate limit · budget │
│ DataStore(fetch /data, LRU+ETag)│          │ /api/chat│  orchestrator (≤8 turns, ≤12 tools)    │
└────────────────────────────────┼──────────┘          │   └─ Claude (stream, cache, fallback)  │
                                 ▼                     │   └─ tools (server/dex/*) → DataStore  │
                       public/data/{core,heavy}        └──────────────────────────────────────┘
```

- **Satu set tool deterministik** (`server/dex/<id>/tools.ts`) dipakai chatbot (server) dan tab fitur (browser). Tool mengembalikan `data` (untuk model, ≤ 20 KB), `ui` (ChartSpec tervalidasi zod — grafik dipilih tool, bukan LLM) dan `method` (panel justifikasi).
- **Orkestrator** (`server/chat/orchestrator.ts`) mengikuti §8.3: SSE `meta → status → text/artifact/method → citation → done`; `tool_result` pertama di pesan user; hasil gagal = `is_error` instruktif; blok asisten dikirim ulang utuh.
- **Claude** (`server/chat/anthropic.ts`): `claude-sonnet-5-5`, streaming, `cache_control` pada system & tools, `tool_choice: auto`, tanpa `temperature/top_p/top_k`, thinking adaptif default dengan `effort` terkonfigurasi, fallback penolakan sisi server (`fallbacks: "default"`).
- **Prompt**: `server/chat/system-prompts/global.md` + `<id>.md` (id/en) → `prompts.generated.ts` (`npm run prompts:build`).
- **Keamanan**: zod strict + batas 64 KB, CORS allowlist (wildcard subdomain), rate limit 20/10 menit & 200/hari per clientId+IP, anggaran token harian, penjaga data sensitif (seed phrase/private key/kartu/NIK) di klien & server, log tanpa isi pesan, header keamanan.
- **Registry** (`src/config/dex-registry.ts`, `dex-groups.ts`) membangkitkan navigasi, Beranda, Dex Hub, pencarian, router chat, dan halaman sumber data.
