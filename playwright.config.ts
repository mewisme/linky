import 'dotenv/config';

import path from 'node:path';

import { defineConfig, devices } from '@playwright/test';

import { playwrightReportSlug } from './playwright/helpers/report-slug';

const ignoreHttpsErrors =
  process.env.PLAYWRIGHT_IGNORE_HTTPS_ERRORS === 'true' ||
  process.env.PLAYWRIGHT_IGNORE_HTTPS_ERRORS === '1';

const reportSlug = playwrightReportSlug();
const reportDir = path.join('playwright-report', reportSlug);

export default defineConfig({
  testDir: './playwright/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: reportDir }],
    ['json', { outputFile: path.join(reportDir, 'results.json') }],
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
