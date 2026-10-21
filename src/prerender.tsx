// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Build-time prerender of the Home shell (§14 performance): rendered to static HTML and placed under the splash in
// dist/index.html so the hero paints before any JavaScript runs; the client then renders the same tree.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './app/Layout.tsx';
import { i18n } from './i18n/index.ts';
import Home from './pages/Home.tsx';
import { useSettings } from './lib/settings.ts';

export async function render(locale: 'id' | 'en'): Promise<string> {
  await i18n.changeLanguage(locale);
  useSettings.setState({ locale });
  const qc = new QueryClient({ defaultOptions: { queries: { enabled: false } } });
  return renderToString(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
