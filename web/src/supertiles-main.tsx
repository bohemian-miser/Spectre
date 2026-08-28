/**
 * Entry point for `supertiles.html` — the Supertiles view.
 * Same multi-entry pattern as `map-main.tsx` / `explorer-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import SupertilesPage from './pages/SupertilesPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in supertiles.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="supertiles" wide>
      <SupertilesPage />
    </AppShell>
  </StrictMode>,
);
