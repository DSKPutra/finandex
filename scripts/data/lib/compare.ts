// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Golden comparison (§18.3): numbers within rel 1e-6 (or abs 1e-9 near 0); strings, booleans, null, list lengths exact.

/**
 * Lists whose golden order inside groups of EQUAL sort keys is an artefact of numpy's unstable (AVX-512 x86-simd-sort)
 * `sort_values` — not a data rule. For these paths both lists are canonicalised (key desc, then content) before comparing,
 * so elements and values must still match exactly. See docs/DECISIONS.md.
 */
export const TIE_TOLERANT: Record<string, Record<string, string>> = {
  'idx/golden_ipo.json': { '.top_participant_admin_by_count': 'ipos' },
};

function canon(list: unknown[], key: string): unknown[] {
  return list
    .map((x) => ({ x, k: Number((x as Record<string, unknown>)[key]), s: JSON.stringify(x) }))
    .sort((a, b) => b.k - a.k || (a.s < b.s ? -1 : a.s > b.s ? 1 : 0))
    .map((o) => o.x);
}

export function compareGolden(actual: unknown, golden: unknown, path = '', errs: string[] = [], limit = 50, ties: Record<string, string> = {}): string[] {
  if (errs.length >= limit) return errs;
  const tieKey = ties[path];
  if (tieKey && Array.isArray(actual) && Array.isArray(golden)) {
    for (let i = 1; i < actual.length; i++)
      if (Number((actual[i] as Record<string, unknown>)[tieKey]) > Number((actual[i - 1] as Record<string, unknown>)[tieKey])) errs.push(`${path}: not sorted by ${tieKey} desc`);
    return compareGolden(canon(actual, tieKey), canon(golden, tieKey), path + '~', errs, limit, ties);
  }
  if (golden !== null && typeof golden === 'object' && !Array.isArray(golden)) {
    if (actual === null || typeof actual !== 'object' || Array.isArray(actual)) {
      errs.push(`${path}: expected object, got ${JSON.stringify(actual)?.slice(0, 80)}`);
      return errs;
    }
    const a = actual as Record<string, unknown>;
    const g = golden as Record<string, unknown>;
    for (const k of new Set([...Object.keys(a), ...Object.keys(g)])) {
      if (!(k in a)) errs.push(`${path}.${k}: missing`);
      else if (!(k in g)) errs.push(`${path}.${k}: extra`);
      else compareGolden(a[k], g[k], `${path}.${k}`, errs, limit, ties);
    }
    return errs;
  }
  if (Array.isArray(golden)) {
    if (!Array.isArray(actual) || actual.length !== golden.length) {
      errs.push(`${path}: list length ${Array.isArray(actual) ? actual.length : typeof actual} vs ${golden.length}`);
      return errs;
    }
    golden.forEach((g, i) => compareGolden(actual[i], g, `${path}[${i}]`, errs, limit, ties));
    return errs;
  }
  if (typeof golden === 'number' && typeof actual === 'number') {
    const d = Math.abs(actual - golden);
    if (!(d <= 1e-9 || d <= 1e-6 * Math.max(Math.abs(actual), Math.abs(golden)))) errs.push(`${path}: ${actual} vs ${golden}`);
    return errs;
  }
  if (actual !== golden) errs.push(`${path}: ${JSON.stringify(actual)?.slice(0, 120)} vs ${JSON.stringify(golden)?.slice(0, 120)}`);
  return errs;
}

/**
 * Golden adapters for inputs that are only partly available (§4.20: law PDFs #30/#31 not uploaded yet).
 * The golden is reduced to the entries whose source file is present; the reduction is REPORTED (not hidden).
 */
export const GOLDEN_ADAPTERS: Record<string, (golden: unknown, actual: unknown) => { golden: unknown; skipped: string[] }> = {
  'law/golden.json': (golden, actual) => {
    const g = golden as { documents: Record<string, unknown>[]; golden_quotes_found_after_normalisation: Record<string, boolean>; kuhp_pdf_is_identical_to_kuhap_pdf: boolean };
    const a = actual as { documents: Record<string, unknown>[]; golden_quotes_found_after_normalisation: Record<string, boolean> };
    const present = new Set(a.documents.filter((d) => 'sha256' in d).map((d) => d.file));
    const skipped = g.documents.filter((d) => !present.has(d.file)).map((d) => `document ${String(d.file)}`);
    const quotes = Object.fromEntries(Object.entries(g.golden_quotes_found_after_normalisation).filter(([k]) => k in a.golden_quotes_found_after_normalisation));
    for (const k of Object.keys(g.golden_quotes_found_after_normalisation)) if (!(k in quotes)) skipped.push(`quote ${k}`);
    return {
      golden: {
        documents: g.documents.map((d) => (present.has(d.file) ? d : { file: d.file, doc_id: d.doc_id, role: d.role, title: d.title, max_pasal: d.max_pasal })),
        kuhp_pdf_is_identical_to_kuhap_pdf: g.kuhp_pdf_is_identical_to_kuhap_pdf,
        golden_quotes_found_after_normalisation: quotes,
      },
      skipped,
    };
  },
};
