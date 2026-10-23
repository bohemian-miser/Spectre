/**
 * Entry point for `multiedge.html`: multi-edge undirected circuits on the
 * hexagons. Same multi-entry pattern as `rules-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import MultiEdgePage from './pages/MultiEdgePage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in multiedge.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="multiedge" wide>
      <MultiEdgePage />
    </AppShell>
  </StrictMode>,
);
