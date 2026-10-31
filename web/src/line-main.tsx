/**
 * Entry point for `line.html`: the proof that rule 128 with combination
 * 010100000 makes one strand. Same multi-entry pattern as `rules-main.tsx`.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from './components';
import LinePage from './pages/LinePage';
import './styles/widgets.css';
import './styles/site.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in line.html');

createRoot(host).render(
  <StrictMode>
    <AppShell active="line" wide>
      <LinePage />
    </AppShell>
  </StrictMode>,
);
