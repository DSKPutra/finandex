// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Prebuilt deploy bundle (used while the GitHub repo / data-inputs release do not exist yet): copies dist/ and the
// esbuild-bundled API handler into a clean folder with a netlify.toml that skips the remote build. Raw dataset inputs
// (data/inputs, data/extracted) are never included — only the published build output in dist/.
// Usage: tsx scripts/deploy/stage-prebuilt.ts <outDir>
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../..');
const out = process.argv[2];
if (!out) throw new Error('usage: stage-prebuilt.ts <outDir>');
for (const need of ['dist/index.html', 'dist/data/manifest.json', 'server-dist/handler.mjs'])
  if (!existsSync(join(ROOT, need))) throw new Error(`missing ${need} — run npm run build first`);

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'netlify/functions'), { recursive: true });
cpSync(join(ROOT, 'dist'), join(out, 'dist'), { recursive: true });
cpSync(join(ROOT, 'server-dist'), join(out, 'server-dist'), { recursive: true });
writeFileSync(
  join(out, 'netlify/functions/api.mjs'),
  `// © 2026 Dea Saka Kurnia Putra. All rights reserved.\nimport { createHandler } from '../../server-dist/handler.mjs';\nconst handle = createHandler();\nexport default (req) => handle(req);\nexport const config = { path: ['/api/*'] };\n`,
);
const toml = readFileSync(join(ROOT, 'netlify.toml'), 'utf8')
  .replace(/command = "npm run build:ci"/, 'command = "echo prebuilt"')
  .replace(
    /\[functions\]\n {2}node_bundler = "esbuild"/,
    '[functions]\n  node_bundler = "esbuild"\n  included_files = ["server-dist/**"]',
  );
writeFileSync(join(out, 'netlify.toml'), toml);
writeFileSync(
  join(out, 'package.json'),
  JSON.stringify(
    {
      name: 'finandex-prebuilt',
      private: true,
      type: 'module',
      author: 'Dea Saka Kurnia Putra',
      license: 'UNLICENSED',
    },
    null,
    2,
  ),
);
console.log(`staged prebuilt deploy in ${out}`);
