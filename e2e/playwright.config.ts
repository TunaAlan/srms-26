import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Run tests sequentially — each spec resets DB state via seed; parallel runs
  // would conflict on shared data (e.g. "delete all" wiping another test's rows).
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/report.json' }]],
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:8080',
    // Keep browser visible during development; set to true for CI.
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
