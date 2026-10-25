/**
 * Entry point for `centremap.html`: pairings compared by where their circuit
 * centres are. Same multi-entry pattern as `rules-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import CentreMapPage from './pages/CentreMapPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in centremap.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="centremap" wide>
      <CentreMapPage />
    </AppShell>
  </StrictMode>,
);
