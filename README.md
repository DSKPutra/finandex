# Finandex

**Wawasan Indeks Pasar Keuangan Global** · *Global Financial Market Indexing Insights*

Finandex adalah aplikasi *insights* indeks pasar keuangan global & Indonesia dengan 27 chatbot ("Dex"), masing-masing dengan menu, fitur, logo, dan dataset sendiri. Satu codebase menghasilkan web app/PWA, aplikasi Android dan iOS (Capacitor), dan di-deploy ke Vercel, Netlify, dan Lovable.

> Finandex menyajikan data historis untuk tujuan informasi dan edukasi — bukan rekomendasi investasi maupun nasihat keuangan atau hukum. Data tidak real-time.

## Mulai cepat

```bash
npm install
npm run dev            # http://localhost:5173 + API lokal :8787 (tanpa ANTHROPIC_API_KEY → model tiruan)
                       # tanpa public/data lokal → data & API dari PRODUCTION_ORIGIN (§15.6)
```

Membangun data dari dataset mentah (lihat `docs/DATA.md`):

```bash
npm run data:verify    # cocokkan data/inputs/ dengan kit/manifest (SHA-256)
npm run data:extract   # ekstrak tiap zip ke data/extracted/<nama-zip>/
npm run data:build     # ETL → public/data/**
npm run test:golden    # bandingkan dengan kit/golden/**
npm run verify         # semua gate kualitas
```

Chat dengan Claude secara lokal: `ANTHROPIC_API_KEY=… npm run dev`. Native: `npm run cap:android` / `npm run cap:ios`.

Dokumentasi: `docs/ARCHITECTURE.md`, `docs/DATA.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/RELEASE.md`, `docs/ADD_NEW_DEX.md`, `docs/FINAL_REPORT.md`.

## Hak cipta

Finandex dirancang dan dikembangkan oleh Dea Saka Kurnia Putra.

© 2026 Dea Saka Kurnia Putra. All rights reserved. Lihat `LICENSE`.
