/**
 * Entry point for `compare.html`: two circuits side by side. Same multi-entry
 * pattern as `rules-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import ComparePage from './pages/ComparePage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in compare.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="compare" wide>
      <ComparePage />
    </AppShell>
  </StrictMode>,
);
