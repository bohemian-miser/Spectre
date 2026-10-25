/**
 * Entry point for `transducer.html` — the neighbour machine page.
 * Same multi-entry pattern as `machine-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import TransducerPage from './pages/TransducerPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in transducer.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="transducer" wide>
      <TransducerPage />
    </AppShell>
  </StrictMode>,
);
