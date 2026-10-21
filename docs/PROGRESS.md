# Progres

## Fase 0 — Input · MERAH → dilanjutkan atas instruksi pemilik
- Kit 199/199 checksum OK. Dataset 38/42 terverifikasi (byte + SHA-256 + isi zip). Hilang: #2, #3, #30, #31 → `pending-data` (lihat DECISIONS).
- Referensi Python (`kit/reference/*.py`) dijalankan atas data tersedia: **semua golden yang datanya ada cocok 0 selisih** (global, commerce, idfin, usdidr, reksa, idx, crypto*, centralbank, fintech, personalfinance, salary, startup, food, opencompany, vcnetwork, vcdirectory, housing, ipo, inflation, costliving, poverty, population, homelessness, housingnews). Dilewati: nasdaq, sp500, law.

## Fase 1 — Scaffold · HIJAU
- Gate: `lint` ✓ · `typecheck` (app/server/node) ✓ · `check:copyright` ✓.

## Fase 2 — Analitik bersama · HIJAU
- `src/shared/{dates,format,text,analytics,law}` + unit test 40/40; coverage `src/shared` 99,1% statement / 92,9% branch.

## Fase 3 — ETL + golden · HIJAU (parsial sesuai data)
- 24 Dex `live`, 1 `partial` (My LAIwyer), 2 `pending-data` (NASDAQDex, SnP500Dex). `test:golden` 60/60: 49 file golden dibandingkan persis (rel 1e-6 / abs 1e-9); 10 file NASDAQ/S&P dilaporkan pending.

## Fase 4 — Server, tools, SSE, prompt, keamanan · HIJAU (dengan item pending-data)
- Tools untuk 27 Dex (`server/dex/*/tools.ts`, registry `server/dex/index.ts`), skema `strict`, `ui` + `method` wajib untuk tool angka.
- Orkestrator §8.3 (`server/chat/orchestrator.ts`), adapter Claude (`server/chat/anthropic.ts`), SSE §8.2, handler (`server/handler.ts`) untuk Vercel (`api/[[...route]].ts`) & Netlify (`netlify/functions/api.mts`), keamanan (CORS allowlist, rate limit + anggaran token, validasi zod + 64 KB, header, penjaga data sensitif).
- System prompt global + 27 Dex (`server/chat/system-prompts/*.md`, dibundel ke `prompts.generated.ts`).
- `test:tools` + unit: 326 tes lulus; coverage `src/shared` + `server` **98,6% statement · 90,9% branch · 99,7% function · 99,4% line** (matriks tool memanggil setiap tool; fixture saham SINTETIS untuk tool NASDAQ/S&P yang datanya belum ada).
- `eval:chat:mock`: **115/128 lulus, 0 gagal, 13 pending-data** (NASDAQ 7, S&P 500 6 → input #2/#3; mylaiwyer-01 → input #30). Laporan: `docs/eval/mock-report.md`.
