import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// Unit tests cover the pure core library (src/core/**) and the widget layer's
// pure logic + component contracts (src/lib/**, src/components/**). The
// Playwright e2e suite in tests/ is run separately via `npm run test:e2e`.
//
// Default environment is node; component tests opt into jsdom with a
// `// @vitest-environment jsdom` docblock so the fast pure tests stay fast.
export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    environment: 'node',
  },
});
