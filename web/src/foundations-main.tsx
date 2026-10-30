/**
 * Entry point for `foundations.html`: the foundational circuits of every
 * combination of 023468. Same multi-entry pattern as `buildup-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import FoundationsPage from './pages/FoundationsPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in foundations.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="foundations" wide>
      <FoundationsPage />
    </AppShell>
  </StrictMode>,
);
