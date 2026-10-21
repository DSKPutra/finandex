// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Safe zip listing & extraction (yauzl). Every archive goes to its own folder; path traversal is rejected.
import { createWriteStream, mkdirSync } from 'node:fs';
import { dirname, join, normalize, sep } from 'node:path';
import yauzl from 'yauzl';

export interface ZipMember {
  name: string;
  size: number;
}

function open(path: string): Promise<yauzl.ZipFile> {
  return new Promise((res, rej) => yauzl.open(path, { lazyEntries: true, decodeStrings: true }, (err, zf) => (err || !zf ? rej(err) : res(zf))));
}

export async function listZip(path: string): Promise<ZipMember[]> {
  const zf = await open(path);
  return new Promise((res, rej) => {
    const out: ZipMember[] = [];
    zf.on('entry', (e: yauzl.Entry) => {
      out.push({ name: e.fileName, size: e.uncompressedSize });
      zf.readEntry();
    });
    zf.on('end', () => res(out));
    zf.on('error', rej);
    zf.readEntry();
  });
}

export function isSafeMember(name: string): boolean {
  if (name.startsWith('/') || name.includes('\\') || /^[A-Za-z]:/.test(name)) return false;
  return !name.split('/').includes('..');
}

/** Extract `zipPath` into `outDir`. Tool-config files from third-party datasets (e.g. .claude/) are skipped. */
export async function extractZip(zipPath: string, outDir: string, skip: (name: string) => boolean = () => false): Promise<number> {
  const zf = await open(zipPath);
  let n = 0;
  return new Promise((res, rej) => {
    zf.on('entry', (e: yauzl.Entry) => {
      const name = e.fileName;
      if (!isSafeMember(name)) return rej(new Error(`unsafe zip member: ${name}`));
      const dest = normalize(join(outDir, name));
      if (!dest.startsWith(normalize(outDir) + sep)) return rej(new Error(`zip member escapes target: ${name}`));
      if (name.endsWith('/') || skip(name)) {
        zf.readEntry();
        return;
      }
      zf.openReadStream(e, (err, rs) => {
        if (err || !rs) return rej(err);
        mkdirSync(dirname(dest), { recursive: true });
        const ws = createWriteStream(dest);
        rs.pipe(ws);
        ws.on('finish', () => {
          n++;
          zf.readEntry();
        });
        ws.on('error', rej);
      });
    });
    zf.on('end', () => res(n));
    zf.on('error', rej);
    zf.readEntry();
  });
}
