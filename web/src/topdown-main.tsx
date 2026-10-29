/**
 * Entry point for `topdown.html` — the Top-down substitution page.
 * Same multi-entry pattern as `supertiles-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import TopDownPage from './pages/TopDownPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in topdown.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="topdown" wide>
      <TopDownPage />
    </AppShell>
  </StrictMode>,
);
