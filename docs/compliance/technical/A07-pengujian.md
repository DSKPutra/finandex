# A07 — Dokumentasi pengujian

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

| Kontrol dokumen | |
|---|---|
| ID dokumen | A07 |
| Judul | Dokumentasi pengujian |
| Versi | 0.1.0 (= versi aplikasi) · commit `ae7d11b` |
| Tanggal | 2026-10-24 |
| Status | Draf |
| Klasifikasi | Internal |
| Pemilik | Dea Saka Kurnia Putra |
| Penyusun | Dibangkitkan oleh `scripts/compliance/*` (Claude Code) dari sumber kebenaran repo |
| Penyetuju | [KONFIRMASI] — penyetuju dokumen belum ditetapkan |
| Lingkup | Seluruh tes otomatis |
| Standar acuan | ISO/IEC/IEEE 29119-3:2021 |
| Dokumen terkait | A02, A08, A13 |

**Riwayat perubahan**

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1.0 | 2026-10-24 | Versi pertama, dibangkitkan dari sumber kebenaran repo. |

## 1. Rencana uji
| Tingkat | Alat | Lokasi | File |
|---|---|---|---|
| Unit & server | Vitest | `tests/unit/` | 13 |
| Komponen UI | Vitest + Testing Library | `tests/ui/` | 1 |
| Golden data | Vitest | `tests/golden/` | 9 |
| Tool | Vitest | `tests/tools/` | 3 |
| E2E | Playwright | `tests/e2e/` | 3 |
| Aksesibilitas | Playwright + axe | `tests/a11y/` | 1 |
| Eval chatbot | `scripts/eval/` | `kit/golden/chatbot_eval.json` | — |
| Eval agen | `scripts/eval/eval-agents.ts` | `scripts/eval/agents/` | — |

## 2. Laporan penyelesaian uji (artefak CI terakhir)
| Ukuran | Nilai |
|---|---|
| Tes Vitest | 909 lulus / 909 (0 gagal) |
| Eval chat (mock) | 161/161 lulus; keamanan 27/27 |
| Eval routing agen | 67 butir, presisi 100 %, recall 100 % |
| Eval keahlian agen | 534 butir, 100 % lulus |
| Audit UI | 0 temuan di 127 file |
| Gate SBOM | 156 pemeriksaan, 0 gagal |
| Coverage, Lighthouse, E2E pada rilis | belum diukur |

## 3. File tes
| File |
|---|
| `tests/a11y/axe.spec.ts` |
| `tests/e2e/chat.spec.ts` |
| `tests/e2e/dex.spec.ts` |
| `tests/e2e/navigation.spec.ts` |
| `tests/golden/data-output.test.ts` |
| `tests/golden/datasets.test.ts` |
| `tests/golden/defi.test.ts` |
| `tests/golden/global.test.ts` |
| `tests/golden/indonesia.test.ts` |
| `tests/golden/kb.test.ts` |
| `tests/golden/law.test.ts` |
| `tests/golden/social-econ.test.ts` |
| `tests/golden/stocks.test.ts` |
| `tests/tools/data-mode.test.ts` |
| `tests/tools/panels.test.ts` |
| `tests/tools/tools.test.ts` |
| `tests/ui/components.test.tsx` |
| `tests/unit/adapters.test.ts` |
| `tests/unit/agents.test.ts` |
| `tests/unit/analytics.test.ts` |
| `tests/unit/brand.test.ts` |
| `tests/unit/contrast.test.ts` |
| `tests/unit/dates.test.ts` |
| `tests/unit/format-text.test.ts` |
| `tests/unit/live-data.test.ts` |
| `tests/unit/orchestrator.test.ts` |
| `tests/unit/registry.test.ts` |
| `tests/unit/server.test.ts` |
| `tests/unit/ui-audit.test.ts` |
| `tests/unit/ui-helpers.test.ts` |

Matriks keterlacakan `REQ-*` ↔ tes: A13.
