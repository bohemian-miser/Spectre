/**
 * Entry point for `rules.html`: how the three labellings' rules line up.
 * Same multi-entry pattern as `explorer-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import RulesPage from './pages/RulesPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in rules.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="rules">
      <RulesPage />
    </AppShell>
  </StrictMode>,
);
