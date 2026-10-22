// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// `npm run export` — packages Finandex for hand-off / manual deploy into exports/ (gitignored):
//   finandex-source.zip            the repository at HEAD (git archive; no datasets, no build output)
//   finandex-netlify-prebuilt.zip  dist + bundled API + netlify.toml that skips the remote build
//   finandex-vercel-prebuilt.zip   .vercel/output from `vercel build` (deploy with `vercel deploy --prebuilt`)
//   EXPORT.md                      how to deploy each package
// Requires a completed `npm run build` (dist/ and server-dist/). Raw dataset inputs are never included.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../..');
const OUT = join(ROOT, 'exports');
const STAGE = join(OUT, '.stage');
const run = (cmd: string, args: string[], cwd = ROOT) => execFileSync(cmd, args, { cwd, stdio: 'inherit' });

for (const need of ['dist/index.html', 'dist/data/manifest.json', 'server-dist/handler.mjs'])
  if (!existsSync(join(ROOT, need))) throw new Error(`missing ${need} — run npm run build first`);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(STAGE, { recursive: true });

// 1. source
run('git', ['archive', '--format=zip', '--prefix=finandex/', '-o', join(OUT, 'finandex-source.zip'), 'HEAD']);

// 2. Netlify prebuilt
const netlify = join(STAGE, 'finandex-netlify-prebuilt');
run('npx', ['tsx', 'scripts/deploy/stage-prebuilt.ts', netlify]);
run('zip', ['-qr', join(OUT, 'finandex-netlify-prebuilt.zip'), 'finandex-netlify-prebuilt'], STAGE);

// 3. Vercel prebuilt: the repo at HEAD + build output, built by the Vercel CLI without re-running our build
const vercel = join(STAGE, 'finandex-vercel-prebuilt');
mkdirSync(vercel, { recursive: true });
execFileSync('sh', ['-c', `git archive HEAD | tar -x -C "${vercel}"`], { cwd: ROOT, stdio: 'inherit' });
cpSync(join(ROOT, 'dist'), join(vercel, 'dist'), { recursive: true });
cpSync(join(ROOT, 'server-dist'), join(vercel, 'server-dist'), { recursive: true });
const vj = JSON.parse(readFileSync(join(vercel, 'vercel.json'), 'utf8')) as Record<string, unknown>;
writeFileSync(
  join(vercel, 'vercel.json'),
  JSON.stringify({ ...vj, buildCommand: 'echo prebuilt', installCommand: 'echo skip' }, null, 2),
);
mkdirSync(join(vercel, '.vercel'), { recursive: true });
writeFileSync(
  join(vercel, '.vercel/project.json'),
  JSON.stringify({
    projectId: '_prebuilt',
    orgId: '_prebuilt',
    settings: { framework: 'vite', outputDirectory: 'dist', nodeVersion: '22.x' },
  }),
);
run('npx', ['-y', 'vercel@latest', 'build', '--prod', '--yes'], vercel);
const pkg = join(STAGE, 'vercel-pkg/finandex-vercel-prebuilt');
mkdirSync(join(pkg, '.vercel'), { recursive: true });
cpSync(join(vercel, '.vercel/output'), join(pkg, '.vercel/output'), { recursive: true });
run('zip', ['-qr', join(OUT, 'finandex-vercel-prebuilt.zip'), 'finandex-vercel-prebuilt'], join(STAGE, 'vercel-pkg'));

writeFileSync(
  join(OUT, 'EXPORT.md'),
  `# Finandex — paket ekspor

© 2026 Dea Saka Kurnia Putra. All rights reserved.

Dibuat dari commit \`${execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim()}\`.

| File | Isi | Cara deploy |
|---|---|---|
| \`finandex-source.zip\` | Kode sumber lengkap (tanpa dataset & hasil build) | \`npm ci && npm run build:ci\` (dataset diambil dari branch \`data-inputs\`) |
| \`finandex-netlify-prebuilt.zip\` | Build siap pakai + API + data | Ekstrak → \`cd finandex-netlify-prebuilt\` → \`npx netlify-cli deploy --prod --site finandex\` |
| \`finandex-vercel-prebuilt.zip\` | Output Vercel siap pakai (\`.vercel/output\`) | Ekstrak → \`cd finandex-vercel-prebuilt\` → \`npx vercel link\` → \`npx vercel deploy --prebuilt --prod\` |

Set \`ANTHROPIC_API_KEY\` di pengaturan Environment Variables Netlify/Vercel agar chat AI aktif; halaman, tab data, dan whitepaper berjalan tanpa kunci itu.
`,
);
rmSync(STAGE, { recursive: true, force: true });
console.log(`exports written to ${OUT}`);
