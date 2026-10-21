// © 2026 Dea Saka Kurnia Putra. All rights reserved.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: { target: 'es2022', sourcemap: false, chunkSizeWarningLimit: 1500 },
  server: { port: 5173, proxy: { '/api': 'http://localhost:8787' } },
  preview: { port: 4173, proxy: { '/api': 'http://localhost:8787' } },
});
