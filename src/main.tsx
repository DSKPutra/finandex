// © 2026 Dea Saka Kurnia Putra. All rights reserved.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Self-hosted OFL fonts, Latin + Latin-ext subsets only (§10.4): Unbounded (display & big numbers),
// IBM Plex Sans (UI, body, tables), IBM Plex Serif (official quotations only).
import '@fontsource/unbounded/latin-500.css';
import '@fontsource/unbounded/latin-600.css';
import '@fontsource/unbounded/latin-ext-600.css';
import '@fontsource/ibm-plex-sans/latin-400.css';
import '@fontsource/ibm-plex-sans/latin-ext-400.css';
import '@fontsource/ibm-plex-sans/latin-500.css';
import '@fontsource/ibm-plex-sans/latin-600.css';
import '@fontsource/ibm-plex-sans/latin-ext-600.css';
import '@fontsource/ibm-plex-serif/latin-400.css';
import '@fontsource/ibm-plex-serif/latin-ext-400.css';
import './i18n';
import { App } from './app/App';
import { initDesktop } from './desktop';
import { registerPwa } from './pwa';
import './styles/index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
registerPwa();
initDesktop();
void import('./native').then(({ initNative }) => initNative(() => window.confirm(document.documentElement.lang === 'en' ? 'Exit Finandex?' : 'Keluar dari Finandex?')));
