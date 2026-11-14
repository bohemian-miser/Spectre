/**
 * Entry point for `sound.html`: hear a rule's circuits. Same multi-entry
 * pattern as `corners-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import SoundPage from './pages/SoundPage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in sound.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="sound" wide>
      <SoundPage />
    </AppShell>
  </StrictMode>,
);
