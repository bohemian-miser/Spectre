/**
 * Entry point for `shapesound.html`. Same multi-entry pattern as
 * `sound-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import ShapeSoundPage from './pages/ShapeSoundPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in shapesound.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="shapesound" wide>
      <ShapeSoundPage />
    </AppShell>
  </StrictMode>,
);
