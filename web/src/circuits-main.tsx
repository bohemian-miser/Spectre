/**
 * Entry point for `circuits.html`: a rule's circuit types. Same multi-entry
 * pattern as `rules-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import CircuitsPage from './pages/CircuitsPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in circuits.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="circuits" wide>
      <CircuitsPage />
    </AppShell>
  </StrictMode>,
);
