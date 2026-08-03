/**
 * Entry point for `tails.html` — the tails-problem explainer.
 * Same multi-entry pattern as `explorer-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import ExplainerPage from './pages/ExplainerPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in tails.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="tails">
      <ExplainerPage />
    </AppShell>
  </StrictMode>,
);
