// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Menu & homepage categories (§10.2). Order is fixed; used by Home, sidebar and Dex Hub.

export type DexGroupId =
  | 'global-markets'
  | 'indonesia'
  | 'crypto-macro'
  | 'startup-vc'
  | 'cost-of-living'
  | 'social'
  | 'sentiment'
  | 'law';

export interface DexGroup {
  id: DexGroupId;
  order: number;
  name: { id: string; en: string };
  description: { id: string; en: string };
}

export const DEX_GROUPS: readonly DexGroup[] = [
  {
    id: 'global-markets',
    order: 1,
    name: { id: 'Pasar Global & Saham', en: 'Global Markets & Equities' },
    description: {
      id: 'Analisis harga, return, risiko, dan peringkat aset/saham global serta IPO.',
      en: 'Price, return, risk and ranking analysis for global assets, equities and IPOs.',
    },
  },
  {
    id: 'indonesia',
    order: 2,
    name: { id: 'Pasar & Ekonomi Indonesia', en: 'Indonesian Markets & Economy' },
    description: {
      id: 'IHSG, saham BEI, rupiah, makro BI, dan reksa dana.',
      en: 'IHSG, IDX stocks, the rupiah, BI macro data and mutual funds.',
    },
  },
  {
    id: 'crypto-macro',
    order: 3,
    name: { id: 'Kripto & Makro Global', en: 'Crypto & Global Macro' },
    description: {
      id: 'Aset kripto/DeFi, neraca bank sentral, dan inflasi dunia.',
      en: 'Crypto/DeFi assets, central-bank balance sheets and world inflation.',
    },
  },
  {
    id: 'startup-vc',
    order: 4,
    name: { id: 'Startup, VC & Perusahaan', en: 'Startups, VC & Companies' },
    description: {
      id: 'Pendanaan, investor, jaringan co-investment, dan direktori perusahaan.',
      en: 'Funding, investors, co-investment networks and company directories.',
    },
  },
  {
    id: 'cost-of-living',
    order: 5,
    name: { id: 'Biaya Hidup, Kerja & Rumah Tangga', en: 'Cost of Living, Work & Household' },
    description: {
      id: 'Gaji, biaya hidup kota, harga rumah, dan harga makanan online.',
      en: 'Salaries, city cost of living, house prices and online food prices.',
    },
  },
  {
    id: 'social',
    order: 6,
    name: { id: 'Sosial & Pembangunan', en: 'Social & Development' },
    description: {
      id: 'Kemiskinan multidimensi dan liputan berita isu sosial.',
      en: 'Multidimensional poverty and news coverage of social issues.',
    },
  },
  {
    id: 'sentiment',
    order: 7,
    name: { id: 'Sentimen & Keuangan Pribadi', en: 'Sentiment & Personal Finance' },
    description: {
      id: 'Sentimen & diskusi publik tentang fintech dan keuangan pribadi.',
      en: 'Public sentiment & discussion about fintech and personal finance.',
    },
  },
  {
    id: 'law',
    order: 8,
    name: { id: 'Hukum', en: 'Law' },
    description: {
      id: 'Informasi hukum berbasis dokumen resmi yang diunggah.',
      en: 'Legal information based on the uploaded official documents.',
    },
  },
] as const;
