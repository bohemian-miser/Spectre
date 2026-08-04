/**
 * Entry point for `map.html` — The Infinite Map (BIGMAP stage 2).
 * Same multi-entry pattern as `explorer-main.tsx` / `tails-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import MapPage from './pages/MapPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in map.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="map" wide>
      <MapPage />
    </AppShell>
  </StrictMode>,
);
