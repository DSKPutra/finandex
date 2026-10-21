// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Tab views for FintechDex (§9): Sentimen · Topik & Aspek · Jelajah Ulasan · Tren. Also reused by PersonalFinanDex.
import { clean, L, type DexViews } from './types.ts';

const LIMITS = L(
  'Sentimen = label otomatis penyedia; sampel media sosial, bukan survei; nama/handle penulis tidak disimpan.',
  'Sentiment = automatic provider label; a social-media sample, not a survey; author names/handles are not stored.',
);

export function socialViews(topicsLabel: { id: string; en: string }): DexViews {
  return {
    sentiment: {
      intro: LIMITS,
      controls: [
        {
          kind: 'select',
          key: 'group_by',
          label: L('Kelompokkan', 'Group by'),
          options: [
            { value: 'none', label: L('Keseluruhan', 'Overall') },
            { value: 'platform', label: 'Platform' },
            { value: 'language', label: L('Bahasa', 'Language') },
            { value: 'month', label: L('Bulan', 'Month') },
          ],
          default: 'platform',
        },
        {
          kind: 'select',
          key: 'all',
          label: L('Baris', 'Rows'),
          options: [
            { value: 'default', label: L('Tanpa spam/phishing', 'Excluding spam/phishing') },
            { value: 'all', label: L('Semua baris (seperti dipublikasikan)', 'All rows (as published)') },
          ],
          default: 'default',
        },
      ],
      calls: (v) => [
        {
          tool: 'sentiment_overview',
          input: clean({ group_by: v.group_by, include_all: v.all === 'all' ? true : '' }),
        },
      ],
    },
    topics: {
      intro: L(
        `${topicsLabel.id} berdasarkan label penyedia (topik dan kolom aspek_*), bukan klasifikasi Finandex.`,
        `${topicsLabel.en} from provider labels (topic and aspect_* columns), not Finandex classifications.`,
      ),
      controls: [
        {
          kind: 'select',
          key: 'field',
          label: L('Kolom', 'Field'),
          options: [
            { value: 'topic', label: L('Topik', 'Topic') },
            { value: 'topic_tags', label: L('Tag topik', 'Topic tags') },
            { value: 'product_mentioned', label: L('Produk disebut', 'Products mentioned') },
            { value: 'company_mentioned', label: L('Perusahaan disebut', 'Companies mentioned') },
          ],
          default: 'topic',
        },
        {
          kind: 'select',
          key: 'aspect',
          label: L('Aspek', 'Aspect'),
          options: ['pricing', 'ux', 'product', 'service', 'security', 'brand', 'reliable'].map((a) => ({
            value: a,
            label: a,
          })),
          default: 'pricing',
        },
      ],
      calls: (v) => [
        { tool: 'topic_breakdown', input: { field: v.field, limit: 15 } },
        { tool: 'aspect_sentiment', input: { aspect: v.aspect } },
      ],
    },
    browse: {
      intro: L(
        'Cari unggahan publik menurut teks; hanya judul, ringkasan, platform, tanggal dan tautan — tanpa identitas penulis.',
        'Search public posts by text; only title, summary, platform, date and link — no author identity.',
      ),
      controls: [
        {
          kind: 'text',
          key: 'query',
          label: L('Kata kunci', 'Keywords'),
          default: 'fees',
          placeholder: 'fees, app, savings…',
        },
        {
          kind: 'select',
          key: 'sentiment',
          label: L('Sentimen', 'Sentiment'),
          options: [
            { value: '', label: L('Semua', 'All') },
            { value: 'negative', label: L('Negatif', 'Negative') },
            { value: 'neutral', label: L('Netral', 'Neutral') },
            { value: 'positive', label: L('Positif', 'Positive') },
          ],
          default: '',
        },
        {
          kind: 'text',
          key: 'platform',
          label: L('Platform', 'Platform'),
          default: '',
          placeholder: 'reddit, mastodon…',
        },
      ],
      calls: (v) => [
        {
          tool: 'search_posts',
          input: clean({
            query: v.query?.trim() || 'fees',
            sentiment: v.sentiment,
            platform: v.platform?.trim(),
            limit: 10,
          }),
        },
      ],
    },
    trend: {
      intro: L(
        'Jumlah unggahan dan porsi sentimen per bulan; tanggal terbit tidak merata (sebagian besar baru).',
        'Posts and sentiment share per month; publication dates are uneven (mostly recent).',
      ),
      controls: [
        {
          kind: 'select',
          key: 'metric',
          label: L('Metrik', 'Metric'),
          options: [
            { value: 'posts', label: L('Jumlah unggahan', 'Posts') },
            { value: 'sentiment_share', label: L('Porsi sentimen', 'Sentiment share') },
          ],
          default: 'posts',
        },
        { kind: 'text', key: 'since', label: L('Sejak (YYYY-MM)', 'Since (YYYY-MM)'), default: '2024-01' },
      ],
      calls: (v) => [
        {
          tool: 'trend',
          input: clean({ metric: v.metric, since: /^\d{4}-\d{2}$/.test(v.since ?? '') ? v.since : '' }),
        },
      ],
    },
  };
}

export const views: DexViews = socialViews(L('Topik & aspek', 'Topics & aspects'));
