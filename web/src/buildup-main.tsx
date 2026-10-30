/**
 * Entry point for `buildup.html`: a combination's supertiles built level by
 * level. Same multi-entry pattern as `rules-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import BuildUpPage from './pages/BuildUpPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in buildup.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="buildup" wide>
      <BuildUpPage />
    </AppShell>
  </StrictMode>,
);
