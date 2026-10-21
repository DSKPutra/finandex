// © 2026 Dea Saka Kurnia Putra. All rights reserved.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { scriptsLast } from './scripts/build/html-scripts-last.ts';

// PWA (§14): precache the app shell + data/core; heavy data cached at runtime (stale-while-revalidate, LRU by
// entry count + purge on quota errors); /api is never cached.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    scriptsLast(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/*.svg', 'icons/finandex-*.png', 'brand/*.png'],
      manifest: {
        name: 'Finandex',
        short_name: 'Finandex',
        description: 'Finandex — Wawasan Indeks Pasar Keuangan Global. © 2026 Dea Saka Kurnia Putra.',
        lang: 'id',
        theme_color: '#0A0F0C',
        background_color: '#0A0F0C',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/finandex-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/finandex-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/finandex-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}', 'data/manifest.json', 'data/core/**/*.json'],
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/data\//],
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.startsWith('/api/'), handler: 'NetworkOnly' },
          {
            urlPattern: ({ url }) => url.pathname.includes('/data/heavy/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'finandex-heavy',
              expiration: { maxEntries: 4000, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) =>
              url.pathname.includes('/data/core/') || url.pathname.endsWith('/data/manifest.json'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'finandex-core', cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1500 },
  server: { port: 5173, proxy: { '/api': 'http://localhost:8787' } },
  preview: { port: 4173, proxy: { '/api': 'http://localhost:8787' } },
});
