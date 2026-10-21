// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// `npm run dev`: local API (scripts/dev/api-server.ts; mock LLM without ANTHROPIC_API_KEY) + Vite dev server.
import { spawn } from 'node:child_process';

const procs = [
  spawn('npx', ['tsx', 'scripts/dev/api-server.ts'], { stdio: 'inherit', env: process.env }),
  spawn('npx', ['vite', ...process.argv.slice(2)], { stdio: 'inherit', env: process.env }),
];
const stop = () => procs.forEach((p) => p.kill('SIGTERM'));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
for (const p of procs) p.on('exit', (code) => (stop(), process.exit(code ?? 0)));
