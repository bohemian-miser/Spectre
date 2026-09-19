/**
 * Entry point for `machine.html` — the strand machine explorer.
 * Same multi-entry pattern as `supertiles-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import MachinePage from './pages/MachinePage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in machine.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="machine" wide>
      <MachinePage />
    </AppShell>
  </StrictMode>,
);
