// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Vite plugin: move the entry module script to the end of <body> and drop modulepreload links, so the prerendered
// shell is not treated as waiting on JavaScript (module scripts are deferred anyway; lab tools still count them).
import type { Plugin } from 'vite';

export function scriptsLast(): Plugin {
  return {
    name: 'finandex-scripts-last',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const scripts = [...html.matchAll(/\s*<script type="module"[^>]*><\/script>/g)].map((m) => m[0]);
        let out = html.replace(/\s*<link rel="modulepreload"[^>]*>/g, '');
        for (const s of scripts) out = out.replace(s, '');
        return out.replace('</body>', `${scripts.map((s) => s.trim()).join('\n')}\n</body>`);
      },
    },
  };
}
