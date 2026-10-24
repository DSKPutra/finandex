# B05 — AI-BOM (SBOM untuk sistem AI)

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

| Kontrol dokumen | |
|---|---|
| ID dokumen | B05 |
| Judul | AI-BOM (SBOM untuk sistem AI) |
| Versi | 0.1.0 (= versi aplikasi) · commit `ae7d11b` |
| Tanggal | 2026-10-24 |
| Status | Draf |
| Klasifikasi | Publik |
| Pemilik | Dea Saka Kurnia Putra |
| Penyusun | Dibangkitkan oleh `scripts/compliance/*` (Claude Code) dari sumber kebenaran repo |
| Penyetuju | [KONFIRMASI] — penyetuju dokumen belum ditetapkan |
| Lingkup | Komponen AI Finandex |
| Standar acuan | CISA & mitra G7 — Software Bill of Materials for AI, Minimum Elements (2026, sukarela); CycloneDX 1.7 (machine-learning-model, modelCard, services); ISO/IEC 42001:2023; ISO/IEC 23894:2023 |
| Dokumen terkait | B01, A10 |

**Riwayat perubahan**

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1.0 | 2026-10-24 | Versi pertama, dibangkitkan dari artefak SBOM rilis ini. |

## 1. Metadata & properti sistem
- Finandex **tidak melatih** dan tidak menyempurnakan (*fine-tune*) model apa pun; model diakses lewat API penyedia.
- Arsitektur: 32 agen (1 Konduktor, 29 agen Dex, Verifikator, Penjaga) — kartu agen di `src/config/agents.generated.json`; tool semuanya baca-saja.

## 2. Model (komponen `machine-learning-model` di SBOM induk)
| Model | Penyedia | Peran | Versi |
|---|---|---|---|
| claude-sonnet-5-5 | Anthropic | lihat modelCard.considerations | dipin oleh ID model |
| claude-haiku-5-5 | Anthropic | lihat modelCard.considerations | dipin oleh ID model |

## 3. Data per permintaan
user message, earlier turns (≤ 20), screen context, tool results (≤ modelCopyBytes). Isi pesan tidak disimpan di server Finandex; log hanya metadata.

## 4. Dataset yang dipakai tool
42 dataset input + 4 dataset kit + 35 PDF regulasi terverifikasi — semuanya komponen `data`/`file` dengan hash di `finandex-0.1.0-data.cdx.json`.

## 5. Infrastruktur & layanan
| Layanan | Data yang mengalir |
|---|---|
| Anthropic (Claude API) | chat messages + tool results per request (no account data); not stored by Finandex servers |
| Vercel (hosting & serverless functions) | HTTP requests incl. IP (rate limiting), chat payload in transit; operational logs (metadata only) |
| Netlify (hosting cadangan) | as Vercel (fallback host) |
| GitHub (repo, Actions, Releases) | source code, release artefacts, SBOMs; no user data |
| Upstash Redis (rate limit, opsional) | rate-limit counters keyed by hashed clientId/IP with TTL (optional) |
| Apple (App Store / TestFlight) | app distribution; Apple processes store-account data under its own terms |
| Google (Play Store) | app distribution; Google processes store-account data under its own terms |

## 6. Properti keamanan
numbers-from-tools rule, sensitive-data detector (client+server), Guard, Verifier, read-only tools, user-confirmed actions.

## 7. KPI
| Metrik | Nilai |
|---|---|
| chat-eval-mock-accuracy | see npm run eval:chat:mock (kit/golden/chatbot_eval.json) |
| routing-precision | 1 |
| routing-recall | 1 |
| skill-items-pass-rate | 1 |
| collaboration-pass-rate | 1 |
| live-model-eval | belum diukur — needs ANTHROPIC_API_KEY (npm run eval:chat -- --live) |
