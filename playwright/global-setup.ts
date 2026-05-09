import 'dotenv/config';

import * as fs from 'node:fs';

import { chromium } from '@playwright/test';

import { waitForClerkReady } from './helpers/clerk-helpers';
import { waitForRedirectToHome } from './helpers/wait-for-home';
import { IdentifierPage } from './page-objects/auth/pages/identifier.page';
import { readClerkTestUserRows } from './test-data/excel';

const SETUP_USER_IDS = ['user1', 'user2'] as const;

function isValidStorageState(filePath: string): boolean {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const state = JSON.parse(raw) as Record<string, unknown>;
    const cookies = Array.isArray(state.cookies) && state.cookies.length > 0;
    const origins = Array.isArray(state.origins) && state.origins.length > 0;
    return cookies || origins;
  } catch {
    return false;
  }
}

export default async function globalSetup(): Promise<void> {
  const baseURL = process.env.BASE_TEST_URL;
  if (!baseURL) {
    throw new Error('[global-setup] BASE_TEST_URL is not set.');
  }

  const allUsers = readClerkTestUserRows();
  const targetUsers = allUsers.filter((u) =>
    (SETUP_USER_IDS as readonly string[]).includes(u.id),
  );

  if (targetUsers.length === 0) {
    throw new Error(
      `[global-setup] No rows found for ids: ${SETUP_USER_IDS.join(', ')} in data_test_users.xlsx`,
    );
  }

  if (targetUsers.every((u) => isValidStorageState(u.storageStatePath))) {
    console.log('[global-setup] All storage states valid, skipping sign-in flow.');
    return;
  }

  const ignoreHTTPSErrors =
    process.env.PLAYWRIGHT_IGNORE_HTTPS_ERRORS === 'true' ||
    process.env.PLAYWRIGHT_IGNORE_HTTPS_ERRORS === '1';

  const browser = await chromium.launch();

  for (const user of targetUsers) {
    const context = await browser.newContext({ baseURL, ignoreHTTPSErrors });
    const page = await context.newPage();

    try {
      await page.goto('/sign-in');
      await waitForClerkReady(page, 30_000);
      console.log(`[global-setup] ${user.id} — clerk ready at ${page.url()}`);

      const identifierPage = new IdentifierPage(page);
      await identifierPage.waitUntilVisible();
      await identifierPage.submitEmail(user.email);
      console.log(`[global-setup] ${user.id} — email submitted`);

      // Clerk renders the password step at /sign-in/factor-one.
      // input[type="password"] has no "textbox" ARIA role; locate via CSS.
      const pwInput = page.locator('input[type="password"]');
      await pwInput.waitFor({ state: 'visible', timeout: 15_000 });
      await pwInput.fill(user.password);
      // The native submit button is aria-hidden; press Enter to submit.
      await pwInput.press('Enter');
      // Wait for URL to move past factor-one before proceeding.
      await page.waitForURL((url) => !url.pathname.includes('factor-one'), {
        timeout: 15_000,
      });
      console.log(`[global-setup] ${user.id} — password accepted, url: ${page.url()}`);

      // Handle optional MFA (factor-two).
      // Clerk test mode accepts 424242 for email-code strategies.
      if (page.url().includes('factor-two')) {
        const otpCode = user.otp || '424242';
        console.log(`[global-setup] ${user.id} — MFA required, trying otp: ${otpCode}`);
        const otpInput = page
          .locator(
            'input[autocomplete="one-time-code"], input[name*="code"], input[name*="otp"], input[inputmode="numeric"]',
          )
          .first();
        await otpInput.waitFor({ state: 'visible', timeout: 10_000 });
        await otpInput.fill(otpCode);
        await otpInput.press('Enter');
        await page.waitForTimeout(2_000);
        console.log(`[global-setup] ${user.id} — MFA submitted, url: ${page.url()}`);
      }

      await waitForRedirectToHome(page, 30_000);
      console.log(`[global-setup] ${user.id} — redirected to: ${page.url()}`);

      await context.storageState({ path: user.storageStatePath });
      console.log(`[global-setup] ${user.id} → ${user.storageStatePath}`);
    } catch (err) {
      // If sign-in fails (e.g. credentials rotated by a test, or site unreachable),
      // fall back to the existing storage state file rather than aborting the entire run.
      console.warn(
        `[global-setup] WARNING: could not refresh session for ${user.id} — ` +
          `existing storage state will be used. ` +
          `If tests fail with auth errors, update ${user.storageStatePath} manually.\n` +
          (err instanceof Error ? err.message : String(err)),
      );
    } finally {
      await context.close();
    }
  }

  await browser.close();
}
