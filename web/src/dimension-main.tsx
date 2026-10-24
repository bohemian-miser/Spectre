/**
 * Entry point for `dimension.html`: how each strand rule's patterns grow with
 * the supertile level. Same multi-entry pattern as `rules-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import DimensionPage from './pages/DimensionPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in dimension.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="dimension" wide>
      <DimensionPage />
    </AppShell>
  </StrictMode>,
);
