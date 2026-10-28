/**
 * Entry point for `shapes.html`: every circuit grouped by shape. Same multi-entry
 * pattern as `rules-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import ShapesPage from './pages/ShapesPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in shapes.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="shapes" wide>
      <ShapesPage />
    </AppShell>
  </StrictMode>,
);
