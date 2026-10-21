// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Toolkit for the news-coverage Dex (PopulationDex, HomelessnessDex, HousingDex). They measure NEWS COVERAGE, not
// real-world counts; aggregates and FINDINGS are provider-computed on the full index; the article table is a sample.
import { z } from 'zod';
import { artifact, defineTool, method, t, type Tool, type ToolContext } from '../tools/types.ts';
import { barOutput, tableOutput } from './helpers.ts';
import { appInfo, dataQualityTool, datasetInfo, openDex } from './shared-tools.ts';
import { loadTable, matches, type Row } from './table.ts';

interface Finding {
  id: string;
  grade: string | null;
  sentence: string;
  basis: string | null;
  limit: string | null;
}
interface NewsSummary {
  as_of: string;
  partial_month: string;
  sample_rows: number;
  sample_date_range: [string, string];
  sample_tone_share: Record<string, number>;
  tables: Record<string, Row[]>;
  findings: Finding[];
}

export function newsTools(key: string, dataset: string): Tool<never>[] {
  const FLAGS = ['news_coverage_not_counts'];
  const load = (ctx: ToolContext) => ctx.store.json<NewsSummary>(`core/${key}/summary.json`);
  const table = async (ctx: ToolContext, name: string) => (await load(ctx)).tables[name] ?? [];

  const coverageTrend = defineTool({
    name: 'coverage_trend',
    description:
      'Monthly (or yearly) news coverage: matched articles and per_10k_news (articles per 10,000 news articles, the normalised intensity). The latest month is PARTIAL — say so. Use for peaks/trends of coverage.',
    input: z.strictObject({
      granularity: z.enum(['month', 'year']).optional(),
      measure: z.enum(['per_10k_news', 'articles']).optional(),
      start: z.string().max(7).optional(),
      end: z.string().max(7).optional(),
    }),
    label: t('Menghitung tren liputan…', 'Computing coverage trend…'),
    numeric: true,
    async run(ctx, input) {
      const s = await load(ctx);
      const meas = input.measure ?? 'per_10k_news';
      let m = (s.tables.monthly ?? []).filter(
        (r) => (!input.start || String(r.month) >= input.start) && (!input.end || String(r.month) <= input.end),
      );
      const peak =
        [...m]
          .filter((r) => String(r.month) !== s.partial_month)
          .sort((a, b) => (b[meas] as number) - (a[meas] as number))[0] ?? null;
      let x: string[];
      let y: (number | null)[];
      if (input.granularity === 'year') {
        const g = new Map<string, { a: number; all: number }>();
        for (const r of m) {
          const yk = String(r.month).slice(0, 4);
          if (!g.has(yk)) g.set(yk, { a: 0, all: 0 });
          g.get(yk)!.a += r.articles as number;
          g.get(yk)!.all += r.all_news_articles as number;
        }
        x = [...g.keys()];
        y = [...g.values()].map((v) => (meas === 'articles' ? v.a : v.all ? (v.a / v.all) * 10_000 : null));
      } else {
        m = m.slice();
        x = m.map((r) => String(r.month));
        y = m.map((r) => r[meas] as number);
      }
      return {
        data: {
          measure: meas,
          granularity: input.granularity ?? 'month',
          partial_month: s.partial_month,
          latest: m.at(-1) ?? null,
          peak_excluding_partial: peak,
          points: x.map((k, i) => ({ period: k, value: y[i] })).slice(-36),
          flags: [...FLAGS, 'partial_last_month'],
        },
        ui: [
          artifact(ctx, {
            title: ctx.locale === 'id' ? 'Liputan berita' : 'News coverage',
            summary: peak ? `peak ${String(peak.month)}: ${String(peak[meas])}` : '',
            dataset,
            tab: 'trend',
            spec: {
              type: 'line',
              x,
              series: [{ name: meas, y }],
              y_format: 'num',
              log_allowed: false,
              shaded: [
                { from: s.partial_month, to: s.partial_month, label: ctx.locale === 'id' ? 'parsial' : 'partial' },
              ],
            },
          }),
        ],
        method: method(ctx, {
          tool: 'coverage_trend',
          formulas: ['per_10k', ...(input.granularity === 'year' ? (['monthly_aggregate'] as const) : [])],
          inputs: input,
          rows: m.length,
          period: { start: x[0] ?? null, end: x.at(-1) ?? null },
          dataset,
          flags: [...FLAGS, 'partial_last_month', 'provider_aggregate'],
        }),
      };
    },
  });

  const GEO = {
    country: 'countries',
    city: 'cities',
    continent: 'continents',
    us_state: 'states_us',
    india_state: 'states_india',
  } as const;
  const coverageGeo = defineTool({
    name: 'coverage_geo',
    description:
      'Where coverage happens (2023–2026 provider aggregate): articles, share_pct (percent of matched articles) and lift vs all news, by country, city, continent, US state or Indian state. Country names are lowercase in the source (e.g. "united states").',
    input: z.strictObject({
      level: z.enum(['country', 'city', 'continent', 'us_state', 'india_state']),
      sort_by: z.enum(['articles_2023_2026', 'share_pct', 'lift']).optional(),
      limit: z.number().int().min(1).max(30).optional(),
    }),
    label: t('Memetakan liputan…', 'Mapping coverage…'),
    numeric: true,
    async run(ctx, input) {
      const rows = await table(ctx, GEO[input.level]);
      const nameKey =
        input.level === 'country'
          ? 'country'
          : input.level === 'city'
            ? 'city'
            : input.level === 'continent'
              ? 'continent'
              : 'state';
      const liftKey = Object.keys(rows[0] ?? {}).find((k) => k.startsWith('lift')) ?? 'lift_vs_all_news';
      const sk = input.sort_by === 'lift' ? liftKey : (input.sort_by ?? 'articles_2023_2026');
      const top = [...rows].sort((a, b) => (b[sk] as number) - (a[sk] as number)).slice(0, input.limit ?? 10);
      return barOutput(ctx, {
        tool: 'coverage_geo',
        title: `${input.level} — ${sk}`,
        groups: top.map((r) => ({ key: String(r[`${nameKey}_display`] ?? r[nameKey]), value: r[sk] as number })),
        format: sk === 'share_pct' ? 'pp' : sk.startsWith('lift') ? 'num' : 'int',
        dataset,
        tab: 'geo',
        formulas: ['share'],
        inputs: input,
        rows: rows.length,
        flags: [...FLAGS, 'provider_aggregate'],
        data: {
          rows: top.map((r) => ({
            name: r[nameKey],
            articles_2023_2026: r.articles_2023_2026,
            share_pct: r.share_pct,
            lift: r[liftKey],
          })),
        },
      });
    },
  });

  const countryTrend = defineTool({
    name: 'country_trend',
    description: 'Yearly matched-article counts for one country 2019–2026 (2026 = Jan–Jul only).',
    input: z.strictObject({ country: z.string().max(60) }),
    label: t('Mengambil tren negara…', 'Fetching country trend…'),
    numeric: true,
    async run(ctx, input) {
      const r = (await table(ctx, 'country_trend')).find(
        (x) => matches(x.country, input.country) || matches(x.country_display, input.country),
      );
      const years = ['2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026_jan_jul'];
      const groups = years.map((y) => ({ key: y, value: r && typeof r[y] === 'number' ? (r[y] as number) : null }));
      return barOutput(ctx, {
        tool: 'country_trend',
        title: `${input.country}`,
        groups,
        format: 'int',
        dataset,
        tab: 'geo',
        formulas: ['count'],
        inputs: input,
        rows: r ? 1 : 0,
        flags: [...FLAGS, 'partial_last_year'],
        horizontal: false,
        data: { found: !!r },
      });
    },
  });

  const toneBreakdown = defineTool({
    name: 'tone_breakdown',
    description:
      'Tone of coverage: share positive/negative/neutral in the ARTICLE SAMPLE (scope=sample), counts by year (scope=by_year, provider aggregate) or negative % per country vs all news (scope=by_country).',
    input: z.strictObject({ scope: z.enum(['sample', 'by_year', 'by_country']) }),
    label: t('Menghitung nada berita…', 'Computing tone…'),
    numeric: true,
    async run(ctx, input) {
      const s = await load(ctx);
      if (input.scope === 'sample') {
        const gs = Object.entries(s.sample_tone_share).map(([k, v]) => ({ key: k, value: v }));
        return barOutput(ctx, {
          tool: 'tone_breakdown',
          title: ctx.locale === 'id' ? 'Nada (sampel)' : 'Tone (sample)',
          groups: gs,
          format: 'pct',
          dataset,
          tab: 'tone',
          formulas: ['share'],
          inputs: input,
          rows: s.sample_rows,
          flags: [...FLAGS, 'sample'],
          data: { sample_rows: s.sample_rows, sample_date_range: s.sample_date_range },
        });
      }
      if (input.scope === 'by_country') {
        const rows = [...(s.tables.country_tone ?? [])].sort(
          (a, b) => (b.negative_pct_topic as number) - (a.negative_pct_topic as number),
        );
        return {
          data: {
            rows: rows.map((r) => ({
              country: r.country,
              labelled_articles: r.labelled_articles,
              negative_pct_topic: r.negative_pct_topic,
              negative_pct_all_news: r.negative_pct_all_news,
            })),
            flags: FLAGS,
          },
          ui: [
            artifact(ctx, {
              title: ctx.locale === 'id' ? '% negatif per negara' : 'Negative % by country',
              summary: '',
              dataset,
              tab: 'tone',
              spec: {
                type: 'bar',
                categories: rows.map((r) => String(r.country_display ?? r.country)),
                series: [
                  { name: 'topic', values: rows.map((r) => r.negative_pct_topic as number) },
                  { name: 'all news', values: rows.map((r) => r.negative_pct_all_news as number) },
                ],
                horizontal: true,
                value_format: 'pp',
              },
            }),
          ],
          method: method(ctx, {
            tool: 'tone_breakdown',
            formulas: ['share'],
            inputs: input,
            rows: rows.length,
            dataset,
            flags: [...FLAGS, 'provider_aggregate'],
          }),
        };
      }
      const rows = s.tables.tone_by_year ?? [];
      const years = [...new Set(rows.map((r) => String(r.year)))];
      const tones = [...new Set(rows.map((r) => String(r.tone)))];
      return {
        data: { rows, flags: FLAGS },
        ui: [
          artifact(ctx, {
            title: ctx.locale === 'id' ? 'Nada per tahun' : 'Tone by year',
            summary: '',
            dataset,
            tab: 'tone',
            spec: {
              type: 'bar',
              categories: years,
              series: tones.map((tn) => ({
                name: tn,
                values: years.map(
                  (y) =>
                    (rows.find((r) => String(r.year) === y && r.tone === tn)?.articles as number | undefined) ?? null,
                ),
              })),
              horizontal: false,
              stacked: true,
              percent_stack: true,
              value_format: 'int',
            },
          }),
        ],
        method: method(ctx, {
          tool: 'tone_breakdown',
          formulas: ['share'],
          inputs: input,
          rows: rows.length,
          dataset,
          flags: [...FLAGS, 'provider_aggregate'],
        }),
      };
    },
  });

  const ranked = (name: 'themes' | 'organisations', col: string, desc: string) =>
    defineTool({
      name,
      description: desc,
      input: z.strictObject({
        query: z.string().max(60).optional(),
        limit: z.number().int().min(1).max(30).optional(),
      }),
      label: t(`Mengambil ${name}…`, `Fetching ${name}…`),
      numeric: true,
      async run(ctx, input) {
        const rows = (await table(ctx, name)).filter((r) => matches(r[col], input.query, 'includes'));
        const top = rows
          .slice()
          .sort((a, b) => (b.articles_2023_2026 as number) - (a.articles_2023_2026 as number))
          .slice(0, input.limit ?? 15);
        return barOutput(ctx, {
          tool: name,
          title: name,
          groups: top.map((r) => ({ key: String(r[col]), value: r.articles_2023_2026 as number })),
          format: 'int',
          dataset,
          tab: 'themes',
          formulas: ['count'],
          inputs: input,
          rows: rows.length,
          flags: [...FLAGS, 'provider_aggregate'],
          data: { rows: top },
        });
      },
    });

  const researchTrend = defineTool({
    name: 'research_trend',
    description: 'Research papers per year on the topic and per_10k_papers (normalised), provider aggregate.',
    input: z.strictObject({}),
    label: t('Mengambil tren riset…', 'Fetching research trend…'),
    numeric: true,
    async run(ctx, input) {
      const rows = await table(ctx, 'research_by_year');
      return {
        data: { rows, flags: FLAGS },
        ui: [
          artifact(ctx, {
            title: ctx.locale === 'id' ? 'Makalah riset per tahun' : 'Research papers per year',
            summary: '',
            dataset,
            tab: 'research',
            spec: {
              type: 'line',
              x: rows.map((r) => String(r.year)),
              series: [
                { name: 'papers', y: rows.map((r) => r.papers as number) },
                { name: 'per_10k_papers', y: rows.map((r) => r.per_10k_papers as number) },
              ],
              y_format: 'num',
              log_allowed: true,
            },
          }),
        ],
        method: method(ctx, {
          tool: 'research_trend',
          formulas: ['per_10k'],
          inputs: input,
          rows: rows.length,
          dataset,
          flags: ['provider_aggregate'],
        }),
      };
    },
  });

  const patents = defineTool({
    name: 'patents',
    description: 'Patent families on the topic: by year, by office or by CPC class (provider aggregate, 2015–2024).',
    input: z.strictObject({ view: z.enum(['by_year', 'by_office', 'by_cpc']) }),
    label: t('Mengambil data paten…', 'Fetching patents…'),
    numeric: true,
    async run(ctx, input) {
      const name =
        input.view === 'by_year' ? 'patents_by_year' : input.view === 'by_office' ? 'patent_offices' : 'patent_cpc';
      const rows = await table(ctx, name);
      const k = input.view === 'by_year' ? 'year' : input.view === 'by_office' ? 'office' : 'cpc_class';
      const v = input.view === 'by_year' ? 'patent_families' : 'families_2015_2024';
      return barOutput(ctx, {
        tool: 'patents',
        title: name,
        groups: rows.map((r) => ({ key: String(r[k]), value: r[v] as number })),
        format: 'int',
        dataset,
        tab: 'research',
        formulas: ['count'],
        inputs: input,
        rows: rows.length,
        flags: ['provider_aggregate'],
        horizontal: input.view !== 'by_year',
        data: { rows },
      });
    },
  });

  const topPapers = defineTool({
    name: 'top_papers',
    description: 'Most-cited research papers on the topic (title, year, venue, citations, DOI).',
    input: z.strictObject({ limit: z.number().int().min(1).max(25).optional() }),
    label: t('Mengambil makalah teratas…', 'Fetching top papers…'),
    numeric: false,
    async run(ctx, input) {
      const rows = (await table(ctx, 'top_papers')).slice(0, input.limit ?? 10);
      return tableOutput(ctx, {
        tool: 'top_papers',
        title: ctx.locale === 'id' ? 'Makalah paling banyak dikutip' : 'Most-cited papers',
        columns: [
          { key: 'title', label: 'Title', format: 'text' },
          { key: 'year', label: 'Year', format: 'int' },
          { key: 'venue', label: 'Venue', format: 'text' },
          { key: 'citations', label: 'Citations', format: 'int' },
          { key: 'doi', label: 'DOI', format: 'text' },
        ],
        rows,
        dataset,
        tab: 'research',
        formulas: [],
        inputs: input,
        rowsUsed: rows.length,
        flags: ['provider_aggregate'],
      });
    },
  });

  const providerFindings = defineTool({
    name: 'provider_findings',
    description:
      'Provider-written findings (FINDINGS.md) with evidence grade A (exact count) / B (keyword rule, measured precision) / C (outlet-sensitive). Quote the grade and limit with any finding; these are the provider’s statements, not Finandex calculations.',
    input: z.strictObject({ query: z.string().max(80).optional() }),
    label: t('Membaca temuan penyedia…', 'Reading provider findings…'),
    numeric: false,
    async run(ctx, input) {
      const f = (await load(ctx)).findings.filter(
        (x) => !input.query || matches(`${x.sentence} ${x.basis ?? ''}`, input.query, 'includes'),
      );
      return {
        data: { findings: f.slice(0, 12), source: 'provider FINDINGS.md (third-party text)' },
        ui: [
          artifact(ctx, {
            title: ctx.locale === 'id' ? 'Temuan penyedia' : 'Provider findings',
            summary: `${f.length}`,
            dataset,
            tab: 'findings',
            spec: {
              type: 'card',
              body:
                ctx.locale === 'id'
                  ? 'Temuan ditulis oleh penyedia data; grade menunjukkan kekuatan bukti.'
                  : 'Findings are written by the data provider; the grade shows evidence strength.',
              tone: 'info',
              link: null,
              items: f.slice(0, 12).map((x) => `[${x.id} · ${x.grade ?? '?'}] ${x.sentence}`),
            },
          }),
        ],
      };
    },
  });

  const sampleArticles = defineTool({
    name: 'sample_articles',
    description:
      'Filter the article-record SAMPLE by country/city/tone/month/term and count matches (records only: date, place, tone, themes; no article text).',
    input: z.strictObject({
      country: z.string().max(60).optional(),
      city: z.string().max(60).optional(),
      tone: z.enum(['positive', 'negative', 'neutral']).optional(),
      month: z.string().max(7).optional(),
      term: z.string().max(60).optional(),
      limit: z.number().int().min(1).max(20).optional(),
    }),
    label: t('Menyaring sampel artikel…', 'Filtering article sample…'),
    numeric: false,
    async run(ctx, input) {
      const rows = (await loadTable(ctx.store, `heavy/${key}/sample.json`)).filter(
        (r) =>
          matches(r.country, input.country) &&
          matches(r.city, input.city) &&
          matches(r.tone, input.tone) &&
          (!input.month || r.month === input.month) &&
          matches(`${String(r.themes ?? '')} ${String(r.matched_terms ?? '')}`, input.term, 'includes'),
      );
      return {
        data: {
          matched_in_sample: rows.length,
          records: rows
            .slice(0, input.limit ?? 10)
            .map((r) => ({
              date: r.date,
              country: r.country,
              city: r.city,
              tone: r.tone,
              themes: r.themes,
              matched_terms: r.matched_terms,
            })),
          note: 'sample of article records, not the full index',
        },
      };
    },
  });

  const coverageTools = [
    coverageTrend,
    coverageGeo,
    countryTrend,
    toneBreakdown,
    ranked(
      'themes',
      'theme',
      'Top themes co-occurring in coverage 2023–2026 (provider aggregate) with share and lift vs all news.',
    ),
    ranked('organisations', 'organisation', 'Organisations most mentioned in coverage 2023–2026 (provider aggregate).'),
    researchTrend,
    patents,
    topPapers,
    providerFindings,
    sampleArticles,
  ];
  return [
    datasetInfo,
    appInfo,
    openDex,
    ...(coverageTools as unknown as Tool<never>[]),
    dataQualityTool(async (ctx) => ctx.store.json(`core/${key}/quality.json`)),
  ] as unknown as Tool<never>[];
}
