# Progres

## Fase 0 — Input · MERAH → dilanjutkan atas instruksi pemilik
- Kit 199/199 checksum OK. Dataset 38/42 terverifikasi (byte + SHA-256 + isi zip). Hilang: #2, #3, #30, #31 → `pending-data` (lihat DECISIONS).
- Referensi Python (`kit/reference/*.py`) dijalankan atas data tersedia: **semua golden yang datanya ada cocok 0 selisih** (global, commerce, idfin, usdidr, reksa, idx, crypto*, centralbank, fintech, personalfinance, salary, startup, food, opencompany, vcnetwork, vcdirectory, housing, ipo, inflation, costliving, poverty, population, homelessness, housingnews). Dilewati: nasdaq, sp500, law.

## Fase 1 — Scaffold · HIJAU
- Gate: `lint` ✓ · `typecheck` (app/server/node) ✓ · `check:copyright` ✓.
