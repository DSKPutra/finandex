// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Brand strings & design tokens (§10.3, §11). These exact strings are checked by scripts/brand/check-copyright.ts.

export const APP_NAME = 'Finandex';
export const COPYRIGHT_EN = '© 2026 Dea Saka Kurnia Putra. All rights reserved.';
export const COPYRIGHT_ID = '© 2026 Dea Saka Kurnia Putra. Hak cipta dilindungi undang-undang.';
export const CREDIT_ID = 'Finandex dirancang dan dikembangkan oleh Dea Saka Kurnia Putra.';
export const CREDIT_EN = 'Finandex is designed and developed by Dea Saka Kurnia Putra.';
export const PERSONAL_TAGLINE = 'A BRIGHTER TOMORROW THROUGH MEANINGFUL WORK';
export const APP_TAGLINE_ID = 'Wawasan Indeks Pasar Keuangan Global';
export const APP_TAGLINE_EN = 'Global Financial Market Indexing Insights';
export const CREATOR = 'Dea Saka Kurnia Putra';
export const EXPORT_WATERMARK = 'Finandex · © Dea Saka Kurnia Putra';
export const COPYRIGHT_START_YEAR = 2026;

/** Copyright line for the given locale; becomes "© 2026–{year} …" once the current year passes 2026 (§11). */
export function copyrightLine(locale: 'id' | 'en', currentYear: number = new Date().getUTCFullYear()): string {
  const base = locale === 'id' ? COPYRIGHT_ID : COPYRIGHT_EN;
  if (currentYear <= COPYRIGHT_START_YEAR) return base;
  return base.replace(`© ${COPYRIGHT_START_YEAR}`, `© ${COPYRIGHT_START_YEAR}–${currentYear}`);
}

export const TRADEMARK_NOTICE_ID =
  'NASDAQ®, S&P 500®, IDX, IHSG, nama bursa, nama koin/protokol, nama merchant, dan merek lain adalah milik pemiliknya masing-masing. Finandex tidak berafiliasi dengan, disponsori, atau didukung oleh Nasdaq, Inc., S&P Dow Jones Indices LLC, PT Bursa Efek Indonesia, Otoritas Jasa Keuangan, Bank Indonesia, maupun pemilik merek lainnya.';
export const TRADEMARK_NOTICE_EN =
  'NASDAQ®, S&P 500®, IDX, IHSG, exchange names, coin/protocol names, merchant names and other marks belong to their respective owners. Finandex is not affiliated with, sponsored or endorsed by Nasdaq, Inc., S&P Dow Jones Indices LLC, PT Bursa Efek Indonesia, Otoritas Jasa Keuangan, Bank Indonesia, or any other trademark owner.';

export const DISCLAIMER_GENERAL_ID =
  'Finandex menyajikan data historis untuk tujuan informasi dan edukasi. Bukan rekomendasi investasi, ajakan membeli/menjual efek atau aset kripto, maupun nasihat keuangan atau hukum. Kinerja masa lalu tidak menjamin kinerja masa depan. Data tidak real-time dan dapat mengandung kesalahan dari sumbernya.';
export const DISCLAIMER_GENERAL_EN =
  'Finandex presents historical data for information and education. It is not an investment recommendation, a solicitation to buy/sell securities or crypto-assets, or financial or legal advice. Past performance does not guarantee future performance. Data is not real-time and may contain errors from its sources.';
export const DISCLAIMER_LAW_ID =
  'Informasi hukum berdasarkan dokumen yang tersedia, bukan nasihat hukum dan tidak menggantikan advokat. Untuk kasus nyata, hubungi advokat atau Lembaga Bantuan Hukum. Dalam keadaan darurat, hubungi 112.';
export const DISCLAIMER_LAW_EN =
  'Legal information based on the available documents — not legal advice and no substitute for an advocate. For a real case, contact an advocate or a Legal Aid Institute (LBH). In an emergency, call 112.';
export const DISCLAIMER_CRYPTO_ID =
  'Bot trading dan pool yield berisiko tinggi, termasuk kehilangan seluruh dana. Finandex tidak merekomendasikan atau berafiliasi dengan bot/protokol mana pun. Jangan pernah membagikan seed phrase atau private key.';
export const DISCLAIMER_CRYPTO_EN =
  'Trading bots and yield pools are high risk, including the loss of all funds. Finandex does not recommend or affiliate with any bot/protocol. Never share your seed phrase or private key.';
export const DISCLAIMER_SAMPLE_ID =
  'Statistik dari sampel data; bukan penawaran kerja, penilaian properti, atau rencana keuangan pribadi.';
export const DISCLAIMER_SAMPLE_EN =
  'Statistics from a data sample; not a job offer, a property valuation, or a personal financial plan.';

/** Design tokens (§10.3). Dark is the default theme. */
export const TOKENS = {
  dark: {
    bg: '#0A0F0C',
    surface: '#111915',
    surface2: '#17221C',
    border: 'rgba(255,255,255,0.08)',
    text: '#EEF3EF',
    textMuted: '#9DB0A4',
    brand: '#19F23A',
    brandText: '#19F23A',
    positive: '#19F23A',
    negative: '#FF5A5F',
    warning: '#FFB020',
    info: '#4DA3FF',
  },
  light: {
    bg: '#F6F8F7',
    surface: '#FFFFFF',
    surface2: '#EEF2F0',
    border: 'rgba(10,15,12,0.10)',
    text: '#0A0F0C',
    textMuted: '#4A5B51',
    brand: '#19F23A',
    brandText: '#0A7D24',
    positive: '#0A7D24',
    negative: '#C62828',
    warning: '#A15C00',
    info: '#1565C0',
  },
  colorblind: { positive: '#4DA3FF', negative: '#FF9F1C' },
} as const;

/** Categorical chart palette (max 8 series). */
export const CHART_PALETTE = [
  '#19F23A',
  '#4DA3FF',
  '#FFB020',
  '#FF5A5F',
  '#B98CFF',
  '#2ED3C6',
  '#FF7AC6',
  '#C9D46C',
] as const;
/** Same hues darkened for the light theme so every series keeps ≥ 3:1 against light surfaces (§10.3). */
export const CHART_PALETTE_LIGHT = ['#0A7D24', '#1565C0', '#A15C00', '#C62828', '#7B4FD6', '#00796B', '#C2185B', '#6B7A00'] as const;
