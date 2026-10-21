// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// CSV reading with pandas.read_csv NA semantics (so ETL results match kit/reference exactly).
import { createReadStream, readFileSync } from 'node:fs';
import { parse } from 'csv-parse';
import { parse as parseSync } from 'csv-parse/sync';

/** pandas default `na_values` (read_csv keep_default_na=True). */
export const PANDAS_NA = new Set([
  '',
  '#N/A',
  '#N/A N/A',
  '#NA',
  '-1.#IND',
  '-1.#QNAN',
  '-NaN',
  '-nan',
  '1.#IND',
  '1.#QNAN',
  '<NA>',
  'N/A',
  'NA',
  'NULL',
  'NaN',
  'None',
  'n/a',
  'nan',
  'null',
]);

export type Row = Record<string, string>;

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/** Read a whole CSV (real parser: quoted multi-line fields are handled). Values are raw strings. */
export function readCsv(path: string): Row[] {
  const txt = stripBom(readFileSync(path, 'utf8'));
  return parseSync(txt, { columns: true, skip_empty_lines: true, relax_column_count: true, bom: true }) as Row[];
}

/** Stream rows of a large CSV without loading it into memory. */
export async function streamCsv(path: string, onRow: (r: Row) => void): Promise<number> {
  let n = 0;
  const parser = createReadStream(path).pipe(parse({ columns: true, bom: true, skip_empty_lines: true, relax_column_count: true }));
  for await (const r of parser as AsyncIterable<Row>) {
    onRow(r);
    n++;
  }
  return n;
}

export function isNA(v: string | undefined | null): boolean {
  return v === undefined || v === null || PANDAS_NA.has(v);
}

/** float or NaN (pandas numeric column). */
export function num(v: string | undefined): number {
  if (isNA(v)) return NaN;
  const x = Number(v);
  if (Number.isNaN(x)) {
    const t = v!.trim().toLowerCase();
    if (t === 'inf' || t === '+inf' || t === 'infinity') return Infinity;
    if (t === '-inf' || t === '-infinity') return -Infinity;
  }
  return x;
}

/** string or null (pandas object column, NaN → null). */
export function str(v: string | undefined): string | null {
  return isNA(v) ? null : v!;
}

/** pandas bool column: "True"/"False" (also "true"/"false", "1"/"0"). */
export function bool(v: string | undefined): boolean | null {
  if (isNA(v)) return null;
  const t = v!.trim();
  if (t === 'True' || t === 'true' || t === 'TRUE' || t === '1') return true;
  if (t === 'False' || t === 'false' || t === 'FALSE' || t === '0') return false;
  return null;
}

/** Column accessor producing numbers. */
export function col(rows: Row[], name: string): number[] {
  return rows.map((r) => num(r[name]));
}

export function header(path: string): string[] {
  const first = stripBom(readFileSync(path, 'utf8').split(/\r?\n/, 1)[0] ?? '');
  return (parseSync(first) as string[][])[0] ?? [];
}
