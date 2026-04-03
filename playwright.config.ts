import 'dotenv/config';

import { defineConfig, devices } from '@playwright/test';

const ignoreHttpsErrors =
  process.env.PLAYWRIGHT_IGNORE_HTTPS_ERRORS === 'true' ||
  process.env.PLAYWRIGHT_IGNORE_HTTPS_ERRORS === '1';

export default defineConfig({
  testDir: './playwright/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],
  globalSetup: './playwright/tests/auth/global-setup.ts',
  use: {
    baseURL: process.env.BASE_TEST_URL,
    trace: 'on-first-retry',
    ignoreHTTPSErrors: ignoreHttpsErrors,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // webServer: {
  //   command: 'pnpm dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
