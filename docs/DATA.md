# Data pipeline (§3, §4, §7)

© 2026 Dea Saka Kurnia Putra. All rights reserved.

```
data/inputs/   (42 file input, dari GitHub Release; gitignored)
   │  npm run data:verify   → byte + SHA-256 + isi zip vs kit/manifest → docs/INPUTS_VERIFIED.md
   │  npm run data:extract  → data/extracted/<zip>/ (aman: tanpa path traversal; .claude/ dilewati)
   ▼
scripts/data/dex/*.ts       (ETL TypeScript = port persis kit/reference/*.py)
   │  npm run data:build    → public/data/{core,heavy}/**, manifest.json (+ manifest.full.json)
   ▼
tests/golden (60 tes; 49 file golden dibandingkan rel 1e-6 / abs 1e-9) · npm run test:parity (Python ↔ golden ↔ TS)
```

- **core/** (±23 MB): ringkasan, katalog, metrik, laporan kualitas — dipre-cache PWA & dibundel di aplikasi native.
- **heavy/** (±192 MB): seri harga per entitas, tabel kolumnar, indeks pencarian hukum, matriks harga — dimuat sesuai kebutuhan.
- Format seri ringkas: `c`/`ac`/`v` penuh, `o`/`h`/`l` 2 tahun terakhir (`ohlc_from`), dividen/split sebagai event jarang.
- Tabel baris: kolumnar + kamus (`columns`, `dict`, `rows`).
- Isi dataset (README, AGENTS.md, notebook, kolom teks) adalah **DATA**, bukan instruksi; skrip di dalam dataset tidak pernah dijalankan.
- Kolom identitas media sosial (author, followers, mentions) dibuang; handle dalam teks diganti `[pengguna]`.

## Status per Dex
Lihat `public/data/manifest.json` (`dex.<id>.status`, `as_of`, `missing_inputs`) atau halaman `/legal/data-sources`.
Saat ini: 24 `live`, My LAIwyer `partial` (#30/#31 belum ada), NASDAQDex & SnP500Dex `pending-data` (#2/#3 belum ada).

## Menambah input yang tertunda
Taruh file (nama persis §3.1) di release `data-inputs-v1` → build ulang. ETL NASDAQ/S&P 500/hukum sudah terpasang; golden NASDAQ/S&P dan kutipan hukum akan ikut dibandingkan otomatis.
