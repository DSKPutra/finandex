# B04 — Register kerentanan & VEX

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

| Kontrol dokumen | |
|---|---|
| ID dokumen | B04 |
| Judul | Register kerentanan & VEX |
| Versi | 0.1.0 (= versi aplikasi) · commit `ae7d11b` |
| Tanggal | 2026-10-24 |
| Status | Draf |
| Klasifikasi | Internal |
| Pemilik | Dea Saka Kurnia Putra |
| Penyusun | Dibangkitkan oleh `scripts/compliance/*` (Claude Code) dari sumber kebenaran repo |
| Penyetuju | [KONFIRMASI] — penyetuju dokumen belum ditetapkan |
| Lingkup | Temuan pemindai rilis 0.1.0 |
| Standar acuan | CycloneDX 1.7 VEX; NIST SP 800-218 (RV.1–RV.3) |
| Dokumen terkait | B01, B02, B03 |

**Riwayat perubahan**

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1.0 | 2026-10-24 | Versi pertama, dibangkitkan dari artefak SBOM rilis ini. |

## 1. Ringkasan rilis 0.1.0
- Sumber temuan: `npm audit` (GitHub Advisory Database) atas seluruh pohon dependensi; osv-scanner & grype dijalankan di CI (compliance.yml).
- Total pernyataan VEX: **27** — per status: `not_affected` 27; per tingkat: high 19, low 3, medium 4, critical 1.
- Artefak yang didistribusikan (web/PWA, fungsi server, aplikasi mobile): **0 kerentanan** menurut `npm audit --omit=dev`.
- Tidak ada temuan kritis/tinggi tanpa pernyataan VEX (gate `sbom:verify`).

## 2. Daftar pernyataan
| ID | Paket | Tingkat | Status | Justifikasi / tindakan |
|---|---|---|---|---|
| [GHSA-c475-qrg2-pj4r](https://github.com/advisories/GHSA-c475-qrg2-pj4r) | basic-ftp@5.3.1 | high | not_affected | code_not_present: basic-ftp@5.3.1 (node_modules/basic-ftp) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-27r3-jxmh-p828](https://github.com/advisories/GHSA-27r3-jxmh-p828) | body-parser@1.20.8 | high | not_affected | code_not_present: body-parser@1.20.8 (node_modules/body-parser) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-jmr9-qjv8-65gv](https://github.com/advisories/GHSA-jmr9-qjv8-65gv) | extract-zip@2.0.1 | high | not_affected | code_not_present: extract-zip@2.0.1 (node_modules/extract-zip) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-7pqw-9j4j-h8q3](https://github.com/advisories/GHSA-7pqw-9j4j-h8q3) | extract-zip@2.0.1 | high | not_affected | code_not_present: extract-zip@2.0.1 (node_modules/extract-zip) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-5p2g-fcmc-qvqq](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq) | image-size@1.2.1 | high | not_affected | code_not_present: image-size@1.2.1 (node_modules/image-size) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-w3rx-r6r6-pgpr](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) | image-size@1.2.1 | high | not_affected | code_not_present: image-size@1.2.1 (node_modules/image-size) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-238p-pmpm-9mq7](https://github.com/advisories/GHSA-238p-pmpm-9mq7) | katex@0.16.47 | low | not_affected | code_not_present: katex@0.16.47 (node_modules/katex) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-m5mm-p8h7-m29v](https://github.com/advisories/GHSA-m5mm-p8h7-m29v) | serialize-javascript@7.1.2 | low | not_affected | code_not_present: serialize-javascript@7.1.2 (node_modules/serialize-javascript) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj) | sharp@0.32.6 | high | not_affected | code_not_present: sharp@0.32.6 (node_modules/sharp) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c) | sharp@0.32.6 | high | not_affected | code_not_present: sharp@0.32.6 (node_modules/sharp) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-wq5f-xc86-pv6w](https://github.com/advisories/GHSA-wq5f-xc86-pv6w) | sharp@0.32.6 | high | not_affected | code_not_present: sharp@0.32.6 (node_modules/sharp) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-34x7-hfp2-rc4v](https://github.com/advisories/GHSA-34x7-hfp2-rc4v) | tar@7.5.22 | high | not_affected | code_not_present: tar@6.2.1 (node_modules/@capacitor/assets/node_modules/tar) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-8qq5-rm4j-mr97](https://github.com/advisories/GHSA-8qq5-rm4j-mr97) | tar@7.5.22 | high | not_affected | code_not_present: tar@6.2.1 (node_modules/@capacitor/assets/node_modules/tar) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-83g3-92jg-28cx](https://github.com/advisories/GHSA-83g3-92jg-28cx) | tar@7.5.22 | high | not_affected | code_not_present: tar@6.2.1 (node_modules/@capacitor/assets/node_modules/tar) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-qffp-2rhf-9h96](https://github.com/advisories/GHSA-qffp-2rhf-9h96) | tar@7.5.22 | high | not_affected | code_not_present: tar@6.2.1 (node_modules/@capacitor/assets/node_modules/tar) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-9ppj-qmqm-q256](https://github.com/advisories/GHSA-9ppj-qmqm-q256) | tar@7.5.22 | high | not_affected | code_not_present: tar@6.2.1 (node_modules/@capacitor/assets/node_modules/tar) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-r6q2-hw4h-h46w](https://github.com/advisories/GHSA-r6q2-hw4h-h46w) | tar@7.5.22 | high | not_affected | code_not_present: tar@6.2.1 (node_modules/@capacitor/assets/node_modules/tar) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-vmf3-w455-68vh](https://github.com/advisories/GHSA-vmf3-w455-68vh) | tar@7.5.22 | medium | not_affected | code_not_present: tar@6.2.1 (node_modules/@capacitor/assets/node_modules/tar) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-w8wr-v893-vjvp](https://github.com/advisories/GHSA-w8wr-v893-vjvp) | tar@7.5.22 | medium | not_affected | code_not_present: tar@6.2.1 (node_modules/@capacitor/assets/node_modules/tar) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-23hp-3jrh-7fpw](https://github.com/advisories/GHSA-23hp-3jrh-7fpw) | tar@7.5.22 | critical | not_affected | code_not_present: tar@6.2.1 (node_modules/@capacitor/assets/node_modules/tar) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-8x88-c5mf-7j5w](https://github.com/advisories/GHSA-8x88-c5mf-7j5w) | tar@7.5.22 | high | not_affected | code_not_present: tar@6.2.1 (node_modules/@capacitor/assets/node_modules/tar) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-gvwx-54wh-qm9j](https://github.com/advisories/GHSA-gvwx-54wh-qm9j) | tar@7.5.22 | medium | not_affected | code_not_present: tar@6.2.1 (node_modules/@capacitor/assets/node_modules/tar) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-r292-9mhp-454m](https://github.com/advisories/GHSA-r292-9mhp-454m) | tar@7.5.22 | high | not_affected | code_not_present: tar@6.2.1 (node_modules/@capacitor/assets/node_modules/tar) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-52f5-9888-hmc6](https://github.com/advisories/GHSA-52f5-9888-hmc6) | tmp@0.1.0 | low | not_affected | code_not_present: tmp@0.0.33, 0.1.0 (node_modules/external-editor/node_modules/tmp, node_modules/tmp) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-ph9p-34f9-6g65](https://github.com/advisories/GHSA-ph9p-34f9-6g65) | tmp@0.1.0 | high | not_affected | code_not_present: tmp@0.0.33, 0.1.0 (node_modules/external-editor/node_modules/tmp, node_modules/tmp) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | uuid@7.0.3 | medium | not_affected | code_not_present: uuid@8.3.2, 7.0.3 (node_modules/@lhci/cli/node_modules/uuid, node_modules/uuid) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |
| [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | zod@3.25.76 | high | not_affected | code_not_present: zod@3.25.76 (node_modules/chromium-bidi/node_modules/zod) is a build/test tooling copy (devDependencies tree, transitive); it is not included in the web bundle, the serverless function, or the mobile apps. Tracked for upgrade via Dependabot. |

**Tindakan untuk lingkungan build:** paket-paket di atas dipakai oleh alat build/uji (Lighthouse CI, Capacitor CLI, mermaid, sharp) yang berjalan di mesin pengembang & runner CI. Tindakan: perbarui saat versi perbaikan tersedia melalui Dependabot; jangan menjalankan alat tersebut terhadap input yang tidak tepercaya.

## 3. Riwayat
| Rilis | Tanggal | Temuan | Keputusan |
|---|---|---|---|
| 0.1.0 | 2026-10-24 | 27 | not_affected 27 |
