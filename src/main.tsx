// © 2026 Dea Saka Kurnia Putra. All rights reserved.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Splash } from './app/Splash.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>,
);
