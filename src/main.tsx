// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Entry: resolve API/data origins (§15.6), splash (§11.1), then the app; native init inside Capacitor.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { i18n } from './i18n/index.ts';
import { App } from './app/App.tsx';
import { Splash } from './app/Splash.tsx';
import { UpdatePrompt } from './app/UpdatePrompt.tsx';
import { initRuntime } from './lib/data.ts';
import { isNative } from './native/is-native.ts';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

function Root() {
  // web: the static splash in index.html shows until the app mounts (fast LCP); native: timed splash after the
  // native launch screen (§11.1)
  const [splash, setSplash] = useState(() => {
    try {
      return (
        (isNative() || sessionStorage.getItem('finandex-splash') === 'show') &&
        sessionStorage.getItem('finandex-splash') !== '1'
      );
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!splash) return;
    const h = setTimeout(() => {
      setSplash(false);
      try {
        sessionStorage.setItem('finandex-splash', '1');
      } catch {
        /* ignore */
      }
    }, 900);
    return () => clearTimeout(h);
  }, [splash]);
  return (
    <QueryClientProvider client={qc}>
      <App />
      {!isNative() && <UpdatePrompt />}
      {splash && <Splash />}
    </QueryClientProvider>
  );
}

void initRuntime();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
if (isNative())
  void import('./native/native.ts').then((n) =>
    n.initNative({ dark: document.documentElement.dataset.theme !== 'light', exitPrompt: String(i18n.t('pwa.exit')) }),
  );
