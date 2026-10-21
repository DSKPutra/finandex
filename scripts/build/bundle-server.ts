// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Bundle the runtime-agnostic API handler into server-dist/handler.mjs for the Vercel function (api/[[...route]].mjs),
// so the deployed function has no dependency on TypeScript-extension imports. Netlify bundles netlify/functions itself.
import { build } from 'esbuild';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '../..');
await build({
  entryPoints: [join(ROOT, 'server/handler.ts')],
  outfile: join(ROOT, 'server-dist/handler.mjs'),
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: false,
  legalComments: 'none',
  banner: {
    js: '// © 2026 Dea Saka Kurnia Putra. All rights reserved.\nimport { createRequire as __cr } from "node:module"; const require = __cr(import.meta.url);',
  },
});
console.log('server-dist/handler.mjs built');
