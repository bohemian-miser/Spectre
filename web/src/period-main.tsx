/**
 * Entry point for `period.html`: a combination's supertiles built level by
 * level. Same multi-entry pattern as `rules-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import PeriodPage from './pages/PeriodPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in period.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="period" wide>
      <PeriodPage />
    </AppShell>
  </StrictMode>,
);
