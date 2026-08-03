import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Multi-page build (DESIGN.md §1.3, adapted — see `src/lib/siteNav.ts` for why
 * the site is multi-entry rather than router-driven):
 *   index.html   — the new React Explorer (the site's front door)
 *   legacy.html  — the original p5 app, kept working until stage 6 deletes it
 *   widgets.html — the unlisted widget gallery / dev harness
 * `base` stays '/Spectre/' for GitHub Pages.
 *
 * Future pages register by adding one line here (`tails`, `stats`) alongside
 * their own HTML entry; `src/lib/siteNav.ts` links them once they are `ready`.
 */
export default defineConfig({
  base: '/Spectre/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tails: resolve(__dirname, 'tails.html'),
        stats: resolve(__dirname, 'stats.html'),
        legacy: resolve(__dirname, 'legacy.html'),
        widgets: resolve(__dirname, 'widgets.html'),
      },
      output: {
        manualChunks: {
          // p5 is reachable only from legacy.html; its own chunk keeps it out
          // of the Explorer's graph entirely.
          p5: ['p5'],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
});
