// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Netlify Functions (v2) adapter: same Web standard handler; served at /api/*.
import { createHandler } from '../../server/handler.ts';

const handle = createHandler();
export default (req: Request) => handle(req);
export const config = { path: ['/api/*'] };
