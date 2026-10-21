// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Vercel Function adapter (Web standard handler, Node.js runtime with streaming).
import { createHandler } from '../server/handler.ts';

export const config = { runtime: 'nodejs', maxDuration: 60 };
const handle = createHandler();

export default { fetch: (req: Request) => handle(req) };
