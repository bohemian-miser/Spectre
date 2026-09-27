/**
 * Entry point for `classifications.html`: every combination, classified.
 * Same multi-entry pattern as `explorer-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import ClassificationsPage from './pages/ClassificationsPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in classifications.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="classifications" wide>
      <ClassificationsPage />
    </AppShell>
  </StrictMode>,
);
