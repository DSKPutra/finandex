// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// `npm run data:verify` (§3.3): check data/inputs/ against kit/manifest/input_files_manifest.json (bytes, SHA-256, zip members)
// and write docs/INPUTS_VERIFIED.md. Missing inputs are reported (status HILANG) — they are never replaced from the internet.
// Exit code 1 only when a PRESENT file does not match (corrupt/different) or with --strict when anything is missing.
import { createHash } from 'node:crypto';
import { createReadStream, existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { listZip } from './lib/zip.ts';

const ROOT = process.cwd();
const INPUTS = join(ROOT, 'data/inputs');
interface Entry {
  no: number;
  file: string;
  bytes: number;
  sha256: string;
  zip_entries?: number;
  zip_members_sample?: string[];
  zip_uncompressed_bytes?: number;
}

export async function sha256File(p: string): Promise<string> {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(p)) h.update(chunk as Buffer);
  return h.digest('hex');
}

async function main() {
  const strict = process.argv.includes('--strict');
  const manifest = (JSON.parse(readFileSync(join(ROOT, 'kit/manifest/input_files_manifest.json'), 'utf8')) as Entry[]).sort((a, b) => a.no - b.no);
  const rows: { no: number; file: string; bytes: number; status: string; detail: string }[] = [];
  for (const e of manifest) {
    const p = join(INPUTS, e.file);
    if (!existsSync(p)) {
      rows.push({ no: e.no, file: e.file, bytes: e.bytes, status: 'HILANG', detail: 'belum diunggah' });
      continue;
    }
    const size = statSync(p).size;
    const sha = await sha256File(p);
    if (size !== e.bytes || sha !== e.sha256) {
      rows.push({ no: e.no, file: e.file, bytes: e.bytes, status: 'BEDA', detail: `byte ${size} / SHA-256 ${sha.slice(0, 12)}… tidak cocok` });
      continue;
    }
    if (e.file.endsWith('.zip')) {
      const members = await listZip(p);
      const names = members.map((m) => m.name);
      const files = members.filter((m) => !m.name.endsWith('/'));
      const okN = e.zip_entries === undefined || e.zip_entries === names.length || e.zip_entries === files.length;
      const okS = (e.zip_members_sample ?? []).every((m) => names.includes(m));
      const okB = e.zip_uncompressed_bytes === undefined || e.zip_uncompressed_bytes === members.reduce((a, m) => a + m.size, 0);
      if (!(okN && okS && okB)) {
        rows.push({ no: e.no, file: e.file, bytes: e.bytes, status: 'BEDA', detail: `isi zip tidak cocok (entries ${names.length}/${e.zip_entries}, sample ${okS}, bytes ${okB})` });
        continue;
      }
      rows.push({ no: e.no, file: e.file, bytes: e.bytes, status: 'OK', detail: `byte, SHA-256 & ${names.length} anggota zip cocok` });
    } else rows.push({ no: e.no, file: e.file, bytes: e.bytes, status: 'OK', detail: 'byte & SHA-256 cocok' });
  }
  const ok = rows.filter((r) => r.status === 'OK').length;
  const bad = rows.filter((r) => r.status === 'BEDA');
  const miss = rows.filter((r) => r.status === 'HILANG');
  const md = [
    '# Verifikasi Input — Fase 0',
    '',
    `Dibangkitkan oleh \`npm run data:verify\` dari \`kit/manifest/input_files_manifest.json\` (${new Date().toISOString().slice(0, 10)}).`,
    '',
    `- Dataset terverifikasi: **${ok} dari ${rows.length}**`,
    `- Tidak cocok: **${bad.length}** · Belum diunggah: **${miss.length}**${miss.length ? ` (#${miss.map((m) => m.no).join(', #')}) → Dex terkait berstatus \`pending-data\`/\`partial\` (lihat docs/DECISIONS.md)` : ''}`,
    '',
    '| # | File | Byte | Status | Detail |',
    '|---|---|---|---|---|',
    ...rows.map((r) => `| ${r.no} | \`${r.file}\` | ${r.bytes.toLocaleString('en-US')} | ${r.status} | ${r.detail} |`),
    '',
  ].join('\n');
  writeFileSync(join(ROOT, 'docs/INPUTS_VERIFIED.md'), md);
  console.log(`data:verify — OK ${ok}/${rows.length}; mismatched ${bad.length}; missing ${miss.length}`);
  for (const b of bad) console.error(`  MISMATCH #${b.no} ${b.file}: ${b.detail}`);
  if (bad.length || (strict && miss.length)) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
