# Laporan data live

> © 2026 Dea Saka Kurnia Putra. All rights reserved.

Dibangkitkan 2026-10-28 oleh `npm run live:report` dari `scripts/live-data/sources.yaml`, `data/live/status.json` dan snapshot di `data/live/`.

| Sumber | Status | Ketentuan yang dibaca | Dex | Baris baru | As-of baru | Flag kualitas | Kuota |
|---|---|---|---|---|---|---|---|
| European Central Bank — Data Portal (euro foreign exchange reference rates) | enabled | 2026-10-24: "All publicly available ESCB statistics may be reused free of charge on the condition that the source is quoted (e.g. Source: ECB statistics.) and that the statistics (including metadata) are not modified." | rupiahdex | 5 | 2026-10-27 | tidak ada | tanpa kunci; tidak ada kuota yang dilaporkan sumber |
| World Bank — Indicators API (World Development Indicators) | enabled | 2026-10-24: Datasets licensed under CC BY 4.0, which "allows users to copy, modify and distribute data in any format for any purpose, including commercial use"; users must give appropriate credit and indicate changes. | inflationdex | 168 | 2026-10-08 | tidak ada | tanpa kunci; tidak ada kuota yang dilaporkan sumber |
| CoinGecko API | blocked-pending-license | 2026-10-24: Attribution "Powered by CoinGecko" required; "you are not permitted to sell, rent, lease, sub-license, re-distribute or syndicate access to the CoinGecko API"; "you are not allowed to duplicate, reproduce, copy, store, derive from or translate any Data" except as expressly permitted; cache refreshed at least every 24 hours. | cryptdex | — | — | — | belum dipakai |
| CoinMarketCap API | blocked-pending-license | Terms page returned HTTP 404 on 2026-10-24; terms not read, so the source cannot be enabled. | cryptdex | — | — | — | belum dipakai |
| DefiLlama API | blocked-pending-license | 2026-10-24: Users agree not to "republish the data in any form without permission" nor "copy, scrape, harvest or otherwise exploit the Content & Data for commercial purposes without prior written consent". | cryptdex | — | — | — | tanpa kunci; tidak ada kuota yang dilaporkan sumber |
| FRED API (Federal Reserve Bank of St. Louis) | disabled | 2026-10-24: API key required; notice "This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis." required; third-party series need the owner's permission for anything other than personal use. | centralbankdex | — | — | — | belum dipakai |
| Yahoo Finance | blocked-pending-license | 2026-10-24: The Yahoo developer API terms do not grant access to Yahoo Finance market data; there is no official public Yahoo Finance API. Scraping is not allowed by this pipeline. | finandex-ai | — | — | — | belum dipakai |

## Perlu keputusan / lisensi dari pemilik
- **CoinGecko API** (blocked-pending-license) — Attribution "Powered by CoinGecko" required; "you are not permitted to sell, rent, lease, sub-license, re-distribute or syndicate access to the CoinGecko API"; "you are not allowed to duplicate, reproduce, copy, store, derive from or translate any Data" except as expressly permitted; cache refreshed at least every 24 hours.
- **CoinMarketCap API** (blocked-pending-license) — Terms page returned HTTP 404 on 2026-10-24; terms not read, so the source cannot be enabled.
- **DefiLlama API** (blocked-pending-license) — Users agree not to "republish the data in any form without permission" nor "copy, scrape, harvest or otherwise exploit the Content & Data for commercial purposes without prior written consent".
- **FRED API (Federal Reserve Bank of St. Louis)** (disabled) — API key required; notice "This product uses the FRED® API but is not endorsed or certified by the Federal Reserve Bank of St. Louis." required; third-party series need the owner's permission for anything other than personal use.
- **Yahoo Finance** (blocked-pending-license) — The Yahoo developer API terms do not grant access to Yahoo Finance market data; there is no official public Yahoo Finance API. Scraping is not allowed by this pipeline.

Alternatif resmi yang sudah aktif: kurs referensi ECB (USD/IDR turunan) untuk RupiahDex dan World Bank WDI untuk InflationDex. Untuk harga saham/indeks/kripto diperlukan penyedia berlisensi yang ketentuannya mengizinkan penyimpanan & tampilan publik.
