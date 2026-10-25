/**
 * Entry point for `faultlines.html`: which pairings put their big circuits in
 * the same places. Same multi-entry pattern as `rules-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import FaultLinesPage from './pages/FaultLinesPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in faultlines.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="faultlines" wide>
      <FaultLinesPage />
    </AppShell>
  </StrictMode>,
);
