import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Two entries during the rebuild (DESIGN.md stage 2):
 *   index.html   — the existing p5 app, untouched until stage 6
 *   widgets.html — the React widget gallery / dev harness
 * `base` stays '/Spectre/' for GitHub Pages.
 */
export default defineConfig({
  base: '/Spectre/',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        widgets: resolve(__dirname, 'widgets.html'),
      },
      output: {
        manualChunks: {
          p5: ['p5'],
        },
      },
    },
  },
  worker: {
    format: 'es',
  },
});
