// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Shared tool factory for FintechDex & PersonalFinanDex (§8.5). Authors/handles are never stored or returned.
import { z } from 'zod';
import { fmtPct } from '../../src/shared/format.ts';
import { artifact, defineTool, method, ToolError, t, type Tool, type ToolContext } from '../tools/types.ts';
import { barOutput } from './helpers.ts';
import { appInfo, dataQualityTool, datasetInfo, openDex } from './shared-tools.ts';
import { loadTable, matches, textSearch, type Row } from './table.ts';

export function socialTools(
  key: 'fintech' | 'personalfinance',
  DS: string,
  opts: { excludeMarketListings: boolean },
): Tool<never>[] {
  const posts = async (ctx: ToolContext, includeListings = false, includeSpam = false) =>
    (await loadTable(ctx.store, `heavy/${key}/posts.json`)).filter(
      (r) =>
        (includeSpam || (!r.is_spam && !r.is_phishing)) &&
        (includeListings || !opts.excludeMarketListings || !r.market_listing),
    );
  const flagsBase = [
    'provider_sentiment_labels',
    'social_media_sample',
    'no_author_identity',
    ...(opts.excludeMarketListings ? ['market_listings_excluded'] : []),
    'spam_phishing_excluded',
  ];
  const SENT = ['negative', 'neutral', 'positive'];

  const sentimentOverview = defineTool({
    name: 'sentiment_overview',
    description:
      'Share of provider sentiment labels (positive/neutral/negative) overall or grouped by platform, month or language. Default aggregates exclude spam/phishing' +
      (opts.excludeMarketListings ? ' and market-listing platforms (dexscreener, pump.fun)' : '') +
      '. Use include_all=true for the raw dataset totals (as published).',
    input: z.strictObject({
      group_by: z.enum(['none', 'platform', 'month', 'language']).optional(),
      include_all: z.boolean().optional(),
    }),
    label: t('Menghitung sentimen…', 'Computing sentiment…'),
    numeric: true,
    async run(ctx, input) {
      const rows = await posts(ctx, input.include_all, input.include_all);
      const gb = input.group_by ?? 'none';
      const kf = (r: Row) =>
        gb === 'platform'
          ? String(r.platform)
          : gb === 'month'
            ? String(r.published_date ?? '').slice(0, 7)
            : gb === 'language'
              ? String(r.language_detected)
              : 'all';
      const g = new Map<string, Record<string, number>>();
      for (const r of rows) {
        const k = kf(r);
        if (!g.has(k)) g.set(k, { negative: 0, neutral: 0, positive: 0, total: 0 });
        const o = g.get(k)!;
        o.total!++;
        if (typeof r.sentiment_label === 'string' && r.sentiment_label in o) o[r.sentiment_label]!++;
      }
      const keys = [...g.keys()]
        .sort((a, b) => (gb === 'month' ? (a < b ? -1 : 1) : g.get(b)!.total! - g.get(a)!.total!))
        .slice(0, gb === 'month' ? 200 : 20);
      const res = keys.map((k) => ({
        key: k,
        n: g.get(k)!.total!,
        ...Object.fromEntries(SENT.map((s) => [s, g.get(k)![s]! / g.get(k)!.total!])),
      }));
      const summary = await ctx.store.json<{
        rows: number;
        sentiment_share: Record<string, number>;
        published_range?: [string, string];
      }>(`core/${key}/summary.json`);
      return {
        data: {
          group_by: gb,
          rows_used: rows.length,
          results: res,
          dataset_totals_all_rows: {
            rows: summary.rows,
            published_range: summary.published_range ?? null,
            sentiment_share: summary.sentiment_share,
          },
          note: 'sentiment = automatic label by the dataset provider',
        },
        ui: [
          artifact(ctx, {
            title:
              ctx.locale === 'id'
                ? `Porsi sentimen${gb !== 'none' ? ' per ' + gb : ''}`
                : `Sentiment share${gb !== 'none' ? ' by ' + gb : ''}`,
            summary: res
              .slice(0, 3)
              .map((r) => `${r.key}: neg ${fmtPct((r as Record<string, unknown>).negative as number, ctx.locale)}`)
              .join('; '),
            dataset: DS,
            tab: 'sentiment',
            spec: {
              type: 'bar',
              categories: res.map((r) => r.key),
              series: SENT.map((s) => ({ name: s, values: res.map((r) => r[s as keyof typeof r] as number) })),
              horizontal: gb !== 'month',
              stacked: true,
              percent_stack: true,
              value_format: 'pct',
            },
          }),
        ],
        method: method(ctx, {
          tool: 'sentiment_overview',
          formulas: ['share', 'count'],
          inputs: input,
          rows: rows.length,
          dataset: DS,
          flags: input.include_all ? ['provider_sentiment_labels', 'all_rows_as_published'] : flagsBase,
        }),
      };
    },
  });

  const topicBreakdown = defineTool({
    name: 'topic_breakdown',
    description:
      'Most frequent values of a topic field (topic, primary_topic, topic_tags, product_mentioned, company_mentioned, or an aspect_* column) among posts.',
    input: z.strictObject({ field: z.string().min(3).max(40), limit: z.number().int().min(1).max(25).optional() }),
    label: t('Menghitung topik…', 'Counting topics…'),
    numeric: true,
    async run(ctx, input) {
      const rows = await posts(ctx);
      if (!(input.field in (rows[0] ?? {})))
        throw new ToolError(
          `Unknown field ${input.field}; use topic, primary_topic, topic_tags, product_mentioned, company_mentioned or ${Object.keys(
            rows[0] ?? {},
          )
            .filter((k) => k.startsWith('aspect_'))
            .join(', ')}`,
        );
      const m = new Map<string, number>();
      for (const r of rows) {
        const v = r[input.field];
        if (v === null || v === undefined || v === '' || v === '[]' || v === 'None') continue;
        for (const part of String(v)
          .replace(/^\[|\]$/g, '')
          .split(/[,;|]/)
          .map((x) => x.replace(/['"]/g, '').trim())
          .filter(Boolean))
          m.set(part, (m.get(part) ?? 0) + 1);
      }
      const gs = [...m.entries()]
        .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
        .slice(0, input.limit ?? 10)
        .map(([k, v]) => ({ key: k, value: v }));
      return barOutput(ctx, {
        tool: 'topic_breakdown',
        title: input.field,
        groups: gs,
        format: 'int',
        dataset: DS,
        tab: 'topics',
        formulas: ['count'],
        inputs: input,
        rows: rows.length,
        flags: flagsBase,
      });
    },
  });

  const searchPosts = defineTool({
    name: 'search_posts',
    description:
      'Search posts by text (title/summary/topics), optional platform & sentiment filters. Returns title, summary, platform, date, url — NEVER the author.',
    input: z.strictObject({
      query: z.string().min(1).max(120),
      platform: z.string().max(40).optional(),
      sentiment: z.enum(['positive', 'neutral', 'negative']).optional(),
      limit: z.number().int().min(1).max(10).optional(),
    }),
    label: t('Mencari unggahan…', 'Searching posts…'),
    numeric: false,
    async run(ctx, input) {
      const rows = (await posts(ctx)).filter(
        (r) => matches(r.platform, input.platform) && matches(r.sentiment_label, input.sentiment),
      );
      const hits = textSearch(
        rows,
        input.query,
        ['title', 'summary_2sentences', 'topic', 'topic_tags', 'product_mentioned'],
        input.limit ?? 5,
      );
      return {
        data: {
          query: input.query,
          results: hits.map((r) => ({
            title: r.title,
            summary: r.summary_2sentences,
            platform: r.platform,
            date: r.published_date,
            sentiment: r.sentiment_label,
            url: r.url,
          })),
          privacy: 'author names/handles are not stored',
        },
      };
    },
  });

  const trend = defineTool({
    name: 'trend',
    description: 'Monthly number of posts and the share of negative/positive sentiment per month.',
    input: z.strictObject({
      metric: z.enum(['posts', 'sentiment_share']).optional(),
      since: z
        .string()
        .regex(/^\d{4}-\d{2}$/)
        .optional(),
    }),
    label: t('Menyusun tren bulanan…', 'Building the monthly trend…'),
    numeric: true,
    async run(ctx, input) {
      const rows = await posts(ctx);
      const m = new Map<string, { n: number; neg: number; pos: number }>();
      for (const r of rows) {
        const k = String(r.published_date ?? '').slice(0, 7);
        if (!/^\d{4}-\d{2}$/.test(k) || (input.since && k < input.since)) continue;
        if (!m.has(k)) m.set(k, { n: 0, neg: 0, pos: 0 });
        const o = m.get(k)!;
        o.n++;
        if (r.sentiment_label === 'negative') o.neg++;
        if (r.sentiment_label === 'positive') o.pos++;
      }
      const x = [...m.keys()].sort();
      const sh = input.metric === 'sentiment_share';
      return {
        data: {
          months: x.length,
          last: x.length ? { month: x.at(-1), ...m.get(x.at(-1)!)! } : null,
          peak: x.length ? x.reduce((a, b) => (m.get(b)!.n > m.get(a)!.n ? b : a)) : null,
        },
        ui: [
          artifact(ctx, {
            title: sh
              ? ctx.locale === 'id'
                ? 'Porsi sentimen per bulan'
                : 'Sentiment share per month'
              : ctx.locale === 'id'
                ? 'Jumlah unggahan per bulan'
                : 'Posts per month',
            summary: `${x.length} ${ctx.locale === 'id' ? 'bulan' : 'months'}`,
            dataset: DS,
            tab: 'trend',
            spec: sh
              ? {
                  type: 'line',
                  x,
                  series: [
                    { name: 'negative', y: x.map((k) => m.get(k)!.neg / m.get(k)!.n) },
                    { name: 'positive', y: x.map((k) => m.get(k)!.pos / m.get(k)!.n) },
                  ],
                  y_format: 'pct',
                  log_allowed: false,
                }
              : {
                  type: 'bar',
                  categories: x,
                  series: [{ name: 'posts', values: x.map((k) => m.get(k)!.n) }],
                  horizontal: false,
                  value_format: 'int',
                },
          }),
        ],
        method: method(ctx, {
          tool: 'trend',
          formulas: ['count', 'share'],
          inputs: input,
          rows: rows.length,
          dataset: DS,
          flags: [...flagsBase, 'publication_dates_uneven'],
        }),
      };
    },
  });

  const aspectSentiment = defineTool({
    name: 'aspect_sentiment',
    description:
      'Sentiment of posts mentioning an aspect (ux, pricing, product, service, security, brand…) using the provider aspect_* columns.',
    input: z.strictObject({ aspect: z.string().min(2).max(30) }),
    label: t('Menghitung sentimen aspek…', 'Computing aspect sentiment…'),
    numeric: true,
    async run(ctx, input) {
      const rows = await posts(ctx);
      const col = Object.keys(rows[0] ?? {}).find(
        (k) => k.startsWith('aspect_') && k.toLowerCase().includes(input.aspect.toLowerCase()),
      );
      if (!col)
        throw new ToolError(
          `No aspect column for "${input.aspect}"; available: ${Object.keys(rows[0] ?? {})
            .filter((k) => k.startsWith('aspect_'))
            .join(', ')}`,
        );
      const m = new Map<string, number>();
      for (const r of rows) {
        const v = r[col];
        if (v === null || v === undefined || v === '') continue;
        m.set(String(v), (m.get(String(v)) ?? 0) + 1);
      }
      const gs = [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ key: k, value: v }));
      return barOutput(ctx, {
        tool: 'aspect_sentiment',
        title: col,
        groups: gs,
        format: 'int',
        dataset: DS,
        tab: 'topics',
        formulas: ['count'],
        inputs: input,
        rows: rows.length,
        flags: flagsBase,
        data: { column: col },
      });
    },
  });

  return [
    datasetInfo,
    appInfo,
    openDex,
    ...([sentimentOverview, topicBreakdown, searchPosts, trend, aspectSentiment] as unknown as Tool<never>[]),
    dataQualityTool(async (ctx) => ctx.store.json(`core/${key}/quality.json`)),
  ] as unknown as Tool<never>[];
}
