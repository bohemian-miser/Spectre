/**
 * Entry point for `harmonics.html`: circuits that are the same circuit two levels up. Same multi-entry
 * pattern as `rules-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import HarmonicsPage from './pages/HarmonicsPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in harmonics.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="harmonics" wide>
      <HarmonicsPage />
    </AppShell>
  </StrictMode>,
);
