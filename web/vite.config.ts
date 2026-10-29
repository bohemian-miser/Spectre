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
 * `stats.html` is now a redirect in `public/` to `classifications.html`.
 */
export default defineConfig({
  base: '/Spectre/',
  plugins: [react()],
  build: {
    // Ship readable bundles: this is a maths playground, and being able to
    // step through the tiling code in devtools is worth the extra bytes.
    minify: false,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        tails: resolve(__dirname, 'tails.html'),
        classifications: resolve(__dirname, 'classifications.html'),
        rules: resolve(__dirname, 'rules.html'),
        map: resolve(__dirname, 'map.html'),
        supertiles: resolve(__dirname, 'supertiles.html'),
        topdown: resolve(__dirname, 'topdown.html'),
        machine: resolve(__dirname, 'machine.html'),
        transducer: resolve(__dirname, 'transducer.html'),
        walker: resolve(__dirname, 'walker.html'),
        lattice: resolve(__dirname, 'lattice.html'),
        multiedge: resolve(__dirname, 'multiedge.html'),
        dimension: resolve(__dirname, 'dimension.html'),
        centremap: resolve(__dirname, 'centremap.html'),
        circuits: resolve(__dirname, 'circuits.html'),
        corners: resolve(__dirname, 'corners.html'),
        shapes: resolve(__dirname, 'shapes.html'),
        harmonics: resolve(__dirname, 'harmonics.html'),
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
