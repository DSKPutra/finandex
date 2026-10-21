# Keputusan (DECISIONS)

Format: tanggal · keputusan · alasan · alternatif yang ditolak.

- 2026-10-21 · **Input yang belum diunggah diperlakukan "kosong" (status `pending-data`/`partial`)** — #2 (NASDAQ), #3 (S&P 500), #30 (KUHP_Lama.pdf = UU 8/1981), #31 (UU 20/2025). · Instruksi pemilik: "yang kurang anggap saja kosong dulu". NASDAQDex & SnP500Dex = `pending-data`; My LAIwyer = `partial` (UUD 1945 & UU 1/1946 tersedia). Pipeline otomatis memproses file itu bila nanti ditaruh di `data/inputs/`. · Ditolak: mengunduh pengganti dari internet (dilarang §3.3), mengarang data.
- 2026-10-21 · **KUHAP.pdf (#32, kompilasi tidak resmi) tetap TIDAK diindeks** walau #30 belum ada. · Mengikuti §4.20 (sekunder = hanya cross-check); menghindari mengutip teks tidak resmi sebagai sumber. Pertanyaan KUHAP dijawab "belum tersedia". · Ditolak: memakai #32 sebagai pengganti sementara.
- 2026-10-21 · **Dua zip di luar manifest tidak dipakai** (`Indonesian_Stock_Price_All_Time_Until_25th_May_2024.zip`, `Indonesia_Stock_Exchange_IDX_Stocks_ETF__Index.zip`). · Tidak tercantum di §3.1; bisa menjadi Dex baru lewat `kit/templates/ADD_NEW_DEX_PROMPT.md`. · Ditolak: mencampur ke IDXDex tanpa golden/spesifikasi.
- 2026-10-21 · **TypeScript 6.0.3** (bukan 7.x). · typescript-eslint 8.72 mendukung `<6.1`. · Ditolak: TS 7 (compiler native, belum didukung linter).
- 2026-10-21 · **ESLint 9.39** (bukan 10.x). · `eslint-plugin-jsx-a11y` 6.10 belum mendukung ESLint 10. · Ditolak: `--legacy-peer-deps`.
- 2026-10-21 · **Node 22 LTS** (`.nvmrc` = 22, `engines >=22.12`). · Versi yang terpasang di lingkungan build & didukung Vite 8 / Vitest 5.
- 2026-10-21 · **React 19, React Router 7, Tailwind 4, Vite 8, Vitest 5, zod 4, ECharts 6, Capacitor 8** (versi stabil terbaru saat build). · §5 meminta "React 18+" dan versi stabil terbaru.
- 2026-10-21 · **Komponen UI ditulis sendiri di atas Radix (gaya shadcn/ui)**, bukan via CLI shadcn. · shadcn adalah pola salin-tempel; CLI butuh jaringan/interaktif. Hasil setara, lebih sedikit dependensi.
- 2026-10-21 · **Temuan `npm audit` moderate (uuid ← xcode ← @capacitor/cli) diterima** — hanya devDependency CLI. · Gate §13.1 = `npm audit --omit=dev` tanpa high/critical (lolos: 0). · Ditolak: `audit fix --force` (downgrade Capacitor CLI).
