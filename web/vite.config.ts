import { defineConfig } from 'vite';

export default defineConfig({
  base: '/Spectre/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'p5': ['p5'],
        },
      },
    },
  },
});
