// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// FintechDex #17 (§4.11) & PersonalFinanDex #22 (§4.12). Port of run_social() in finandex_reference_x.py.
// Privacy: author / author_followers / mentions are dropped and handles scrubbed BEFORE anything is stored (§13.2).
import { fnum, valueCounts } from '../../../src/shared/analytics/stats.ts';
import { sanitizeText, scrubHandles } from '../../../src/shared/text.ts';
import { header, num, readCsv, str, type Row } from '../lib/csv.ts';
import { columnar } from '../lib/frame.ts';
import { x } from '../lib/io.ts';
import type { DexModule, ModuleResult } from '../lib/module.ts';
import type { DexId } from '../../../src/config/dex-registry.ts';

const FINTECH = () => x('Fintech_Product_Adoption_and_Reviews', 'fintech-product-adoption-and-reviews.csv', 'fintech_product_adoption_and_reviews__2026-09-08__f94b9fc2.csv');
const PERSONAL = () =>
  x('Personal_Finance_and_Financial_Independence', 'personal-finance-and-financial-independence.csv', 'personal_finance_and_financial_independence__2026-09-16__f1d77e5b.csv');

/** Whitelisted columns (§4.11). Everything else is ignored. */
const WHITELIST = ['id', 'platform', 'url', 'published_at', 'title', 'summary_2sentences', 'content', 'language_detected', 'likes', 'comments', 'shares', 'views', 'sentiment_label', 'sentiment_score', 'topic', 'primary_topic', 'topic_tags', 'product_mentioned', 'company_mentioned', 'tickers', 'is_spam', 'is_phishing', 'misinformation_flag', 'quality_score'];
const NUMERIC = ['likes', 'comments', 'shares', 'views', 'sentiment_score', 'quality_score'];
const MARKET_LISTING_PLATFORMS = new Set(['dexscreener', 'pump.fun']);

function truthy(v: string | undefined): boolean {
  const s = (v ?? '').trim().toLowerCase();
  return s === 'true' || s === '1';
}

function goldenSocial(df: Row[], ncols: number, snapshot: string) {
  const pub = df.map((r) => String(str(r.published_at) ?? 'nan').slice(0, 10)).sort();
  const sent = valueCounts(df.map((r) => str(r.sentiment_label)));
  const platforms = valueCounts(df.map((r) => str(r.platform)));
  const labels = [...new Set(df.map((r) => str(r.sentiment_label)).filter((v): v is string => v !== null))].sort();
  const byPf: Record<string, Record<string, number | null>> = {};
  for (const p of platforms.map(([p]) => p).sort()) {
    const rows = df.filter((r) => r.platform === p && str(r.sentiment_label) !== null);
    byPf[p] = Object.fromEntries(labels.map((l) => [l, rows.length ? fnum(rows.filter((r) => r.sentiment_label === l).length / rows.length) : 0]));
  }
  return {
    rows: df.length,
    columns: ncols,
    platforms: Object.fromEntries(platforms),
    published_range: [pub[0], pub.at(-1)],
    sentiment_counts: Object.fromEntries(sent),
    sentiment_share: Object.fromEntries(sent.map(([k, v]) => [k, fnum(v / df.length)])),
    sentiment_share_by_platform: byPf,
    languages: Object.fromEntries(valueCounts(df.map((r) => str(r.language_detected)))),
    privacy_rule: 'Drop author, author_followers, mentions and any user handle before processing; never display them.',
    notes: { snapshot, duplicates: 'JSON/JSONL/Parquet copies hold the same records; CSV is primary' },
  };
}

function makeModule(name: string, dex: DexId, input: number, path: () => string, key: string, snapshot: string, asOf: string): DexModule {
  return {
    name,
    dex: [dex],
    inputs: [input],
    requires: () => [path()],
    async build(): Promise<ModuleResult> {
      const df = readCsv(path());
      const ncols = header(path()).length;
      const golden = goldenSocial(df, ncols, snapshot);
      const aspectCols = header(path()).filter((c) => c.startsWith('aspect_'));
      const posts = df.map((r) => {
        const o: Record<string, unknown> = {};
        for (const c of [...WHITELIST, ...aspectCols]) {
          const v = r[c];
          if (NUMERIC.includes(c)) o[c] = num(v);
          else if (c === 'is_spam' || c === 'is_phishing' || c === 'misinformation_flag') o[c] = truthy(v);
          else if (c === 'content') o[c] = str(v) ? scrubHandles(sanitizeText(v, 500)) : null;
          else if (c === 'title' || c === 'summary_2sentences') o[c] = str(v) ? scrubHandles(sanitizeText(v, 400)) : null;
          else o[c] = str(v) ? sanitizeText(v, 300) : null;
        }
        o.published_date = String(str(r.published_at) ?? '').slice(0, 10) || null;
        o.market_listing = MARKET_LISTING_PLATFORMS.has(r.platform ?? '');
        return o;
      });
      // privacy guard: author fields must never appear
      for (const p of posts) for (const k of Object.keys(p)) if (/^author|mentions$/.test(k)) throw new Error(`privacy violation: ${k}`);
      const cols = ['id', 'platform', 'url', 'published_date', 'title', 'summary_2sentences', 'content', 'language_detected', 'likes', 'comments', 'shares', 'views', 'sentiment_label', 'sentiment_score', 'topic', 'primary_topic', 'topic_tags', 'product_mentioned', 'company_mentioned', 'tickers', 'is_spam', 'is_phishing', 'misinformation_flag', 'quality_score', 'market_listing', ...aspectCols];
      return {
        dex: [dex],
        status: 'built',
        asOf,
        golden: { [`${key}/golden.json`]: golden },
        files: {
          [`core/${key}/summary.json`]: { as_of: asOf, ...golden, aspect_columns: aspectCols, market_listing_platforms: [...MARKET_LISTING_PLATFORMS] },
          [`heavy/${key}/posts.json`]: columnar(posts, cols, ['platform', 'language_detected', 'sentiment_label', 'topic', 'primary_topic', ...aspectCols]),
          [`core/${key}/quality.json`]: {
            rows: df.length,
            columns_in_file: ncols,
            columns_used: cols.length,
            privacy: 'author, author_followers, mentions dropped; @handles and u/handles replaced with [pengguna]',
            spam_rows: posts.filter((p) => p.is_spam).length,
            phishing_rows: posts.filter((p) => p.is_phishing).length,
            market_listing_rows: posts.filter((p) => p.market_listing).length,
            provider_labels: 'sentiment_label/sentiment_score/topic/aspect_* are automatic labels from the dataset provider (VADER/LLM)',
          },
        },
      };
    },
  };
}

export const fintechModule = makeModule('fintech', 'fintechdex', 17, FINTECH, 'fintech', 'collected/updated 2026-09-08 (file name)', '2026-09-08');
export const personalModule = makeModule('personalfinance', 'personalfinandex', 22, PERSONAL, 'personalfinance', 'collected/updated 2026-09-16 (file name)', '2026-09-16');
