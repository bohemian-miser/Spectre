/**
 * Entry point for `walker.html` — the circuit walker page.
 * Same multi-entry pattern as `machine-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import WalkerPage from './pages/WalkerPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in walker.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="walker" wide>
      <WalkerPage />
    </AppShell>
  </StrictMode>,
);
