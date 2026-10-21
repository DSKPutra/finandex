# Menambah Dex baru (§6.2)

© 2026 Dea Saka Kurnia Putra. All rights reserved.

1. **Input**: tambahkan file ke §3.1 / `kit/manifest` dan ke release data; jalankan `npm run data:verify`.
2. **Registry**: entri baru di `src/config/dex-registry.ts` (id, nama, grup dari `dex-groups.ts`, tagline id/en, ikon, input, as-of, lisensi, tab — `chat` pertama & `data` terakhir, scope, kata kunci).
3. **Ikon**: SVG di `public/icons/<id>.svg` mengikuti gaya keluarga ikon (§10.7).
4. **ETL**: modul di `scripts/data/dex/<id>.ts` (port referensi Python bila ada) + daftarkan di `scripts/data/modules.ts`; golden di `kit/golden/<id>/`; `npm run data:build && npm run test:golden`.
5. **Tool**: `server/dex/<id>/tools.ts` (pakai `timeSeriesTools`, `news-tools`, `social-tools`, `stock-tools` bila cocok) + daftarkan di `server/dex/index.ts`; catatan dataset di `server/dex/dataset-notes.ts`.
6. **Prompt**: `server/chat/system-prompts/<id>.md` (5 bagian, id & en) lalu `npm run prompts:build`.
7. **Tab**: `src/dex/views/<id>.ts` (satu view per tab fitur) + loader di `src/dex/views/index.ts`; saran pertanyaan di `src/config/suggestions.ts` (≥ 6, id & en).
8. **Test & eval**: fixture matriks di `tests/tools/matrix/*.ts`, item eval + skenario mock di `scripts/eval/scenarios/*.ts`.
9. `npm run verify`. Navigasi, Beranda, Dex Hub, pencarian dan halaman legal ikut otomatis — tidak ada komponen inti yang perlu diubah.
