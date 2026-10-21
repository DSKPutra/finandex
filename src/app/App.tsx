// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Routes (§10.1): /, /ai, /dex, /dex/:dexId/:tab?/:entity?, /markets/:slug?, /watchlist, /settings, /about, /whitepaper/:chapter?, /legal/:page.
import { lazy, Suspense, useEffect } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { applySettings, useSettings } from '../lib/settings.ts';
import { Skeleton } from '../components/States.tsx';
import { Layout } from './Layout.tsx';
import { RouteError } from './RouteError.tsx';

const Home = lazy(() => import('../pages/Home.tsx'));
const DexHub = lazy(() => import('../pages/DexHub.tsx'));
const DexPage = lazy(() => import('../pages/DexPage.tsx'));
const Markets = lazy(() => import('../pages/Markets.tsx'));
const Watchlist = lazy(() => import('../pages/Watchlist.tsx'));
const Settings = lazy(() => import('../pages/Settings.tsx'));
const About = lazy(() => import('../pages/About.tsx'));
const Whitepaper = lazy(() => import('../pages/Whitepaper.tsx'));
const Legal = lazy(() => import('../pages/Legal.tsx'));
const NotFound = lazy(() => import('../pages/NotFound.tsx'));

const S = (el: React.ReactNode) => <Suspense fallback={<Skeleton h={320} />}>{el}</Suspense>;

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { path: '/', element: S(<Home />) },
      { path: '/ai/:tab?/:entity?', element: S(<DexPage fixedDex="finandex-ai" />) },
      { path: '/dex', element: S(<DexHub />) },
      { path: '/dex/:dexId/:tab?/:entity?', element: S(<DexPage />) },
      { path: '/markets/:slug?', element: S(<Markets />) },
      { path: '/watchlist', element: S(<Watchlist />) },
      { path: '/settings', element: S(<Settings />) },
      { path: '/about', element: S(<About />) },
      { path: '/whitepaper/:chapter?', element: S(<Whitepaper />) },
      { path: '/legal/:page', element: S(<Legal />) },
      { path: '*', element: S(<NotFound />) },
    ],
  },
]);

export function App() {
  const s = useSettings();
  useEffect(() => applySettings(s), [s.locale, s.theme, s.colorblind]); // eslint-disable-line react-hooks/exhaustive-deps
  return <RouterProvider router={router} />;
}
