/**
 * Entry point for `stats.html` — the circuits & stats page.
 * Same multi-entry pattern as `explorer-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import StatsPage from './pages/StatsPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in stats.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="stats">
      <StatsPage />
    </AppShell>
  </StrictMode>,
);
