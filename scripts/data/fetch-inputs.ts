// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// `npm run data:fetch` (§3.4): when data/inputs/ lacks files, download them from this project's own GitHub repo — the
// Release `data-inputs-v1` (env DATA_INPUTS_RELEASE_TAG) or, when no release exists, the branch `data-inputs`
// (env DATA_INPUTS_BRANCH) — and verify SHA-256 against kit/manifest. Repo from GH_RELEASE_REPO / GITHUB_REPOSITORY /
// Vercel / Netlify git env; GH_RELEASE_TOKEN for private repos. Never downloads from anywhere else. Missing assets are left missing (the build marks those Dex `pending-data`).
import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { sha256File } from './verify-inputs.ts';

const ROOT = process.cwd();
const INPUTS = join(ROOT, 'data/inputs');
const tag = process.env.DATA_INPUTS_RELEASE_TAG ?? 'data-inputs-v1';
const branch = process.env.DATA_INPUTS_BRANCH ?? 'data-inputs';
const repo =
  process.env.GH_RELEASE_REPO ??
  process.env.GITHUB_REPOSITORY ??
  (process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
    ? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
    : (process.env.REPOSITORY_URL?.match(/github\.com[/:]([^/]+\/[^/.]+)/)?.[1] ?? ''));
const token = process.env.GH_RELEASE_TOKEN ?? process.env.GITHUB_TOKEN ?? '';
const manifest = JSON.parse(readFileSync(join(ROOT, 'kit/manifest/input_files_manifest.json'), 'utf8')) as { no: number; file: string; sha256: string }[];
mkdirSync(INPUTS, { recursive: true });
const need = manifest.filter((m) => !existsSync(join(INPUTS, m.file)));
if (!need.length) {
  console.log('data:fetch — all inputs present');
  process.exit(0);
}
if (!repo) {
  console.log(`data:fetch — ${need.length} input(s) missing and no GH_RELEASE_REPO/GITHUB_REPOSITORY set; skipping download`);
  process.exit(0);
}
const headers: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'finandex-data-fetch' };
if (token) headers.Authorization = `Bearer ${token}`;
const rel = await fetch(`https://api.github.com/repos/${repo}/releases/tags/${tag}`, { headers });
const assets = rel.ok ? ((await rel.json()) as { assets: { name: string; url: string }[] }).assets : null;
if (!assets) console.log(`data:fetch — release ${repo}@${tag} not available (${rel.status}); using branch ${branch}`);
const source = (file: string): { url: string; accept: string } | null => {
  if (!assets) return { url: `https://raw.githubusercontent.com/${repo}/${branch}/${encodeURIComponent(file)}`, accept: '*/*' };
  const a = assets.find((x) => x.name === file || x.name === file.replace(/ /g, '.'));
  return a ? { url: a.url, accept: 'application/octet-stream' } : null;
};
let got = 0;
for (const m of need) {
  const src = source(m.file);
  if (!src) {
    console.log(`  #${m.no} ${m.file}: not in release (stays missing)`);
    continue;
  }
  const tmp = join(INPUTS, `.${m.file}.part`);
  const res = await fetch(src.url, { headers: { ...headers, Accept: src.accept } });
  if (res.status === 404 && !assets) {
    console.log(`  #${m.no} ${m.file}: not on branch ${branch} (stays missing)`);
    continue;
  }
  if (!res.ok || !res.body) throw new Error(`download failed for ${m.file}: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(tmp));
  const sha = await sha256File(tmp);
  if (sha !== m.sha256) {
    rmSync(tmp);
    throw new Error(`SHA-256 mismatch for ${m.file}`);
  }
  renameSync(tmp, join(INPUTS, m.file));
  got++;
  console.log(`  #${m.no} ${m.file}: downloaded & verified`);
}
console.log(`data:fetch — ${got}/${need.length} downloaded`);
