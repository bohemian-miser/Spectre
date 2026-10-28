/**
 * Entry point for `corners.html`: how many sides a circuit has. Same multi-entry
 * pattern as `rules-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import CornersPage from './pages/CornersPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in corners.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="corners" wide>
      <CornersPage />
    </AppShell>
  </StrictMode>,
);
