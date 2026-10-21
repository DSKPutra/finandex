// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Vercel Function adapter (Web standard fetch handler, Node.js runtime, streaming). The handler is pre-bundled by
// `npm run build` (scripts/build/bundle-server.ts) into server-dist/handler.mjs.
import { createHandler } from '../server-dist/handler.mjs';

const handle = createHandler();

export default { fetch: (req) => handle(req) };
