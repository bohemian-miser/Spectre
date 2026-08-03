import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    // Both `vite dev` and `vite preview` serve under `base: '/Spectre/'`, so the
    // baseURL includes it and specs navigate with *relative* paths
    // (`''`, `'legacy.html'`, `'widgets.html'`).
    baseURL: 'http://localhost:8081/Spectre/',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
