/**
 * Entry point for `limit.html`: supertile outlines level by level and the
 * shape they settle on. Same multi-entry pattern as `rules-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import LimitPage from './pages/LimitPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in limit.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="limit" wide>
      <LimitPage />
    </AppShell>
  </StrictMode>,
);
