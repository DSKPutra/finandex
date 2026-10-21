// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Entry: splash (§11.1) shown until the first render settles, then the app.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './i18n/index.ts';
import { App } from './app/App.tsx';
import { Splash } from './app/Splash.tsx';

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } });

function Root() {
  const [splash, setSplash] = useState(() => !sessionStorage.getItem('finandex-splash'));
  useEffect(() => {
    if (!splash) return;
    const h = setTimeout(() => {
      setSplash(false);
      sessionStorage.setItem('finandex-splash', '1');
    }, 900);
    return () => clearTimeout(h);
  }, [splash]);
  return (
    <QueryClientProvider client={qc}>
      <App />
      {splash && <Splash />}
    </QueryClientProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
