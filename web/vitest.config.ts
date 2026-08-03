import { defineConfig } from 'vitest/config';

// Unit tests cover the pure core library only (src/core/**). The Playwright
// e2e suite in tests/ is run separately via `npm run test:e2e`.
export default defineConfig({
  test: {
    include: ['src/core/**/*.test.ts'],
    environment: 'node',
  },
});
