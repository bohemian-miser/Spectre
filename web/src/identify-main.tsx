/**
 * Entry point for `identify.html`: a strand named by one of its tiles, and
 * the circuit it belongs to. Same multi-entry pattern as `rules-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import IdentifyPage from './pages/IdentifyPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in identify.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="identify" wide>
      <IdentifyPage />
    </AppShell>
  </StrictMode>,
);
