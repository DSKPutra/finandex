# A10 — Dokumentasi sistem AI

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

| Kontrol dokumen | |
|---|---|
| ID dokumen | A10 |
| Judul | Dokumentasi sistem AI |
| Versi | 0.1.0 (= versi aplikasi) · commit `ae7d11b` |
| Tanggal | 2026-10-24 |
| Status | Draf |
| Klasifikasi | Internal |
| Pemilik | Dea Saka Kurnia Putra |
| Penyusun | Dibangkitkan oleh `scripts/compliance/*` (Claude Code) dari sumber kebenaran repo |
| Penyetuju | [KONFIRMASI] — penyetuju dokumen belum ditetapkan |
| Lingkup | Chatbot dan orkestrasi multi-agen |
| Standar acuan | ISO/IEC 42001:2023; ISO/IEC 23894:2023 |
| Dokumen terkait | A09, B05, C03 |

**Riwayat perubahan**

| Versi | Tanggal | Perubahan |
|---|---|---|
| 0.1.0 | 2026-10-24 | Versi pertama, dibangkitkan dari sumber kebenaran repo. |

## 1. Tujuan & batas penggunaan
Menjawab pertanyaan tentang data pasar, ekonomi, sosial, dan hukum dengan angka yang berasal dari tool. Bukan nasihat investasi, keuangan, pajak, maupun hukum.

## 2. Model
Default `claude-sonnet-5-5` (`ANTHROPIC_MODEL`) dan `claude-haiku-5-5` (`ANTHROPIC_MODEL_FAST`), dapat diganti lewat env (`server/env.ts#L7 @ ae7d11b`). Mode `CHAT_MODE=mock` menjalankan seluruh alur tanpa LLM untuk eval dan uji.

## 3. Data yang dikirim ke penyedia
Teks percakapan (≤ 20 pesan terakhir), hasil tool, prompt sistem Dex. Tidak ada clientId atau IP yang diteruskan ke penyedia. Lihat C01 (D01) dan C09.

## 4. Agen
32 kartu agen dengan keahlian di `server/agents/skills/**`. Batas per jawaban: 4 spesialis, 6 giliran, 8 panggilan tool, 20 detik.

## 5. Prompt sistem
Prompt per Dex dibangkitkan ke `server/chat/prompts.generated.ts`; teks lengkap tidak dimuat di dokumen ini [KONFIRMASI apakah dianggap rahasia].

## 6. Evaluasi
| Set | Hasil |
|---|---|
| kit/golden/chatbot_eval.json (mock) | 161/161 |
| Routing agen | 67 butir, 100 % |
| Keahlian agen | 534 butir, 100 % |
| Eval live (LLM sungguhan) | belum diukur |

## 7. Pengawasan manusia & register risiko AI
| Risiko | Dampak | Mitigasi | Risiko sisa |
|---|---|---|---|
| Angka salah/dikarang | keputusan finansial keliru | Verifikator ClaimGate; angka hanya dari tool | rendah |
| Prompt injection | jawaban menyimpang | Penjaga; tool read-only; data sebagai data | rendah |
| Data pribadi terkirim ke LLM | privasi | detektor + persetujuan + peringatan | sedang — teks bebas tetap mungkin memuat data pribadi |
| Saran dianggap nasihat | kerugian pengguna | penafian di setiap Dex & jawaban | rendah |
| Biaya LLM tak terkendali | operasional | anggaran token harian (DAILY_TOKEN_BUDGET) | rendah |

## 8. Prosedur perubahan model
Ubah env model → jalankan `npm run eval:chat:mock`, `npm run eval:agents`, eval live → catat di `docs/DECISIONS.md` → rilis.
