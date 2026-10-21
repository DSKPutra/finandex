# Finandex

**Wawasan Indeks Pasar Keuangan Global** · *Global Financial Market Indexing Insights*

Finandex adalah aplikasi *insights* indeks pasar keuangan global & Indonesia dengan 27 chatbot ("Dex"), masing-masing dengan menu, fitur, logo, dan dataset sendiri. Satu codebase menghasilkan web app/PWA, aplikasi Android dan iOS (Capacitor), dan di-deploy ke Vercel, Netlify, dan Lovable.

> Finandex menyajikan data historis untuk tujuan informasi dan edukasi — bukan rekomendasi investasi maupun nasihat keuangan atau hukum. Data tidak real-time.

## Mulai cepat

```bash
npm install
npm run dev            # http://localhost:5173 (tanpa public/data lokal → data dari PRODUCTION_ORIGIN)
```

Membangun data dari dataset mentah (lihat `docs/DATA.md`):

```bash
npm run data:verify    # cocokkan data/inputs/ dengan kit/manifest (SHA-256)
npm run data:extract   # ekstrak tiap zip ke data/extracted/<nama-zip>/
npm run data:build     # ETL → public/data/**
npm run test:golden    # bandingkan dengan kit/golden/**
npm run verify         # semua gate kualitas
```

Dokumentasi: `docs/ARCHITECTURE.md`, `docs/DATA.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/RELEASE.md`, `docs/ADD_NEW_DEX.md`.

## Hak cipta

Finandex dirancang dan dikembangkan oleh Dea Saka Kurnia Putra.

© 2026 Dea Saka Kurnia Putra. All rights reserved. Lihat `LICENSE`.
