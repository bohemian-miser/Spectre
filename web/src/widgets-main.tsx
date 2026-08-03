/**
 * Entry point for the stage-2 widget harness (`widgets.html`).
 *
 * Deliberately separate from `index.html` / `src/sketch.ts`: the p5 app keeps
 * building untouched until stage 6 replaces it, and this entry carries no p5.
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import DevGalleryPage from './pages/DevGalleryPage';
import './styles/widgets.css';
import './styles/gallery.css';

const host = document.getElementById('root');
if (!host) throw new Error('#root not found in widgets.html');

createRoot(host).render(
  <StrictMode>
    <DevGalleryPage />
  </StrictMode>,
);
