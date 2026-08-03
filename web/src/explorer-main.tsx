/**
 * Entry point for the site's front door (`index.html`) — the Explorer.
 *
 * Multi-entry rather than a router (see `lib/siteNav.ts` for the deviation
 * note); the old p5 app now lives at `legacy.html` and is untouched.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import ExplorerPage from './pages/ExplorerPage';
import './styles/widgets.css';
import './styles/site.css';
import './styles/explorer.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in index.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="explorer" wide>
      <ExplorerPage />
    </AppShell>
  </StrictMode>,
);
