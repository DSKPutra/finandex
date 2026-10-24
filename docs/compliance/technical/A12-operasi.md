# A12 — Operasi & pemeliharaan

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

| Kontrol dokumen | |
|---|---|
| ID dokumen | A12 |
| Judul | Operasi & pemeliharaan |
| Versi | 0.1.0 (= versi aplikasi) · commit `ae7d11b` |
| Tanggal | 2026-10-24 |
| Status | Draf |
| Klasifikasi | Internal |
| Pemilik | Dea Saka Kurnia Putra |
| Penyusun | Dibangkitkan oleh `scripts/compliance/*` (Claude Code) dari sumber kebenaran repo |
| Penyetuju | [KONFIRMASI] — penyetuju dokumen belum ditetapkan |
| Lingkup | Deploy, konfigurasi, data, insiden |
| Standar acuan | ISO/IEC/IEEE 12207:2017 (proses operasi & pemeliharaan) |
| Dokumen terkait | A09, C07 |

**Riwayat perubahan**

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1.0 | 2026-10-24 | Versi pertama, dibangkitkan dari sumber kebenaran repo. |

## 1. Deploy
- `main` → Vercel produksi (https://finandex.vercel.app); cadangan Netlify.
- Rollback: Vercel → Deployments → *Promote* deployment sebelumnya; atau revert commit.
- Rilis: tag `v*` memicu `compliance.yml` (SBOM, tanda tangan, atestasi, dokumen).

## 2. Variabel lingkungan (tanpa nilai)
| Variabel | Lingkup |
|---|---|
| `ANTHROPIC_API_KEY` | server |
| `ANTHROPIC_MODEL` | server |
| `ANTHROPIC_MODEL_FAST` | server |
| `ANTHROPIC_FALLBACKS` | server |
| `DATA_BASE_URL` | server |
| `CORS_ALLOWED_ORIGINS` | server |
| `CHAT_DEADLINE_MS` | server |
| `DAILY_TOKEN_BUDGET` | server |
| `UPSTASH_REDIS_REST_URL` | server |
| `UPSTASH_REDIS_REST_TOKEN` | server |
| `LOG_LEVEL` | server |
| `APP_VERSION` | server |
| `BUILD_ID` | server |
| `VITE_DISTRIBUTION` | server |
| `CHAT_MODE` | server |
| `VITE_ANDROID_APK_DIRECT` | klien (publik) |
| `VITE_API_BASE_URL` | klien (publik) |
| `VITE_APP_STORE_URL` | klien (publik) |
| `VITE_APP_VERSION` | klien (publik) |
| `VITE_BUILD_ID` | klien (publik) |
| `VITE_DATA_BASE_URL` | klien (publik) |
| `VITE_DISTRIBUTION` | klien (publik) |
| `VITE_MS_STORE_URL` | klien (publik) |
| `VITE_PLAY_STORE_URL` | klien (publik) |
| `VITE_SUPPORT_EMAIL` | klien (publik) |
| `VITE_TESTFLIGHT_URL` | klien (publik) |

## 3. Skrip npm
| Skrip | Perintah |
|---|---|
| `dev` | `vite` |
| `build` | `npm run build:api && vite build && npm run typecheck:server` |
| `build:ci` | `npm run data:fetch && npm run data:verify && npm run data:extract && npm run data:fetch-regulations && npm run…` |
| `preview` | `vite preview` |
| `data:fetch` | `tsx scripts/data/fetch-inputs.ts` |
| `data:verify` | `tsx scripts/data/verify-inputs.ts` |
| `data:extract` | `tsx scripts/data/extract.ts` |
| `data:build` | `tsx scripts/data/build-all.ts` |
| `lint` | `eslint . --max-warnings=0` |
| `typecheck` | `tsc -p tsconfig.app.json --noEmit && npm run typecheck:server` |
| `typecheck:server` | `tsc -p tsconfig.node.json --noEmit` |
| `test` | `vitest run --coverage` |
| `test:golden` | `vitest run --project golden` |
| `test:tools` | `vitest run --project tools` |
| `test:parity` | `tsx scripts/data/parity.ts` |
| `eval:chat:mock` | `tsx scripts/eval/eval-chat.ts --mock` |
| `eval:chat` | `tsx scripts/eval/eval-chat.ts --live` |
| `e2e` | `playwright test` |
| `a11y` | `playwright test tests/a11y` |
| `lighthouse` | `lhci autorun` |
| `size` | `size-limit` |
| `check:copyright` | `tsx scripts/brand/check-copyright.ts` |
| `check:licenses` | `tsx scripts/security/check-licenses.ts` |
| `check:secrets` | `tsx scripts/security/check-secrets.ts` |
| `verify` | `npm run lint && npm run ui:audit && npm run typecheck && npm run check:copyright && npm run test && npm run te…` |
| `cap:sync` | `npm run build:native && cap sync` |
| `cap:android` | `npm run build:native && cap sync android && cap open android` |
| `cap:ios` | `npm run build:native && cap sync ios && cap open ios` |
| `tauri:dev` | `tauri dev` |
| `tauri:build` | `tauri build` |
| `assets:generate` | `python3 -I scripts/brand/make-native-assets.py` |
| `assets:pdfjs` | `tsx scripts/build/copy-pdfjs-assets.ts` |
| `predev` | `npm run assets:pdfjs && npm run whitepaper:copy` |
| `prebuild` | `npm run assets:pdfjs && npm run whitepaper:copy && npm run check:licenses` |
| `build:native` | `cross-env VITE_API_BASE_URL=https://finandex.vercel.app VITE_DATA_BASE_URL=https://finandex.vercel.app/data VI…` |
| `build:api` | `tsx scripts/build/bundle-api.ts` |
| `whitepaper:copy` | `tsx scripts/whitepaper/copy-whitepaper.ts` |
| `data:fetch-regulations` | `tsx scripts/data/fetch-regulations.ts` |
| `data:law` | `tsx scripts/data/build-all.ts mylaiwyer finlaiwyer` |
| `data:antiscam` | `tsx scripts/data/build-all.ts antiscamdex` |
| `test:flows` | `vitest run tests/golden/kb.test.ts -t "flow engine"` |
| `feature-guide:check` | `vitest run tests/golden/kb.test.ts -t "feature guide"` |
| `ui:audit` | `tsx scripts/ui/audit.ts` |
| `ui:visual` | `playwright test -c playwright.visual.config.ts --update-snapshots=missing` |
| `agents:gen` | `tsx scripts/build/gen-agents.ts` |
| `eval:agents` | `tsx scripts/eval/eval-agents.ts` |
| `sbom:generate` | `tsx scripts/compliance/sbom.ts` |
| `sbom:merge` | `tsx scripts/compliance/sbom.ts` |
| `vex:generate` | `tsx scripts/compliance/sbom.ts` |
| `sbom:verify` | `tsx scripts/compliance/check-sbom-min-elements.ts` |
| `sbom:sign` | `bash scripts/compliance/sign-sbom.sh` |
| `sbom:attest` | `echo "Attestations are created by .github/workflows/compliance.yml (actions/attest-sbom, actions/attest-build-…` |
| `sbom:docs` | `tsx scripts/compliance/build-sbom-docs.ts` |
| `sbom:docx` | `tsx scripts/compliance/build-sbom-docx.ts` |
| `docs:build` | `npm run sbom:docs && tsx scripts/compliance/build-docs.ts && npm run docs:pdf` |
| `docs:pdf` | `tsx scripts/compliance/pdf.ts docs/compliance/technical/A*.md docs/compliance/sbom/B*.md docs/compliance/priva…` |
| `docs:verify` | `tsx scripts/compliance/verify-docs.ts` |
| `compliance:all` | `npm run sbom:generate && npm run sbom:verify && npm run docs:build && npm run docs:verify` |
| `live:fetch` | `tsx scripts/live-data/fetch.ts` |
| `live:validate` | `tsx scripts/live-data/build.ts --dry` |
| `live:build` | `tsx scripts/live-data/build.ts` |
| `live:report` | `tsx scripts/live-data/report.ts` |
| `live:verify` | `tsx scripts/live-data/verify.ts` |

## 4. Pembaruan data
`npm run data:fetch` → `data:verify` (hash) → `data:extract` → `data:fetch-regulations` → `data:build` → `test:golden`.

## 5. Runbook insiden
1. Deteksi (galat platform, laporan pengguna, pemindai CI).
2. Klasifikasi: insiden keamanan biasa atau **kegagalan pelindungan data pribadi** → ikuti C07 (pemberitahuan 3 × 24 jam).
3. Mitigasi: rollback deployment, rotasi secret di dashboard platform, nonaktifkan chat (`CHAT_MODE=mock`).
4. Catat di register insiden (C07 §5).

## 6. Pemantauan & log
Log platform Vercel berisi metadata permintaan (C01 D04); retensi [KONFIRMASI].
