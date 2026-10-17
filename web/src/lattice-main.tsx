/**
 * Entry point for `lattice.html`: directed circuits on the hexagons as a
 * lattice. Same multi-entry pattern as `rules-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import LatticePage from './pages/LatticePage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in lattice.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="lattice" wide>
      <LatticePage />
    </AppShell>
  </StrictMode>,
);
