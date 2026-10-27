// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Bundle budget (§14): JS + CSS loaded by index.html (entry + modulepreloads, listed on the /boot.js tag) ≤ 250 KB gzip.
// Lazy chunks (ECharts, pdf.js, Dex pages, tools) are excluded by construction.
const { existsSync, readFileSync } = require('node:fs');

const html = existsSync('dist/index.html') ? readFileSync('dist/index.html', 'utf8') : '';
const boot = /data-entry="([^"]+)" data-preload="([^"]*)"/.exec(html);
const listed = boot ? [boot[1], ...boot[2].split(',').filter(Boolean)].map((u) => u.replace(/^\//, '')) : [];
const initial = [...new Set([...[...html.matchAll(/(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g)].map((m) => m[1]), ...listed])].map((u) => `dist/${u}`);

module.exports = [{ name: 'initial JS + CSS (gzip)', path: initial.length ? initial : ['dist/assets/*.js'], limit: '250 KB', gzip: true }];
