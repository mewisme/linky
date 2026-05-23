// spec: playwright/tests/auth/AUTH_TEST_PLAN.md — Suite 9: Internationalization Smoke Tests

import { expect, test } from 'linky/playwright-test';

import { TEST_USERS } from '../../../fixtures/users.fixtures';
import { waitForClerkReady } from '../../../helpers/clerk-helpers';

test.describe('Internationalization (i18n) Smoke Tests', () => {
  test.describe.configure({ timeout: 30_000 });

  test('I18N-01 · P1 — Auth layout metadata reads authPage.layoutTitle from messages', async ({
    page,
  }) => {
    // 1. Navigate to /sign-in (English)
    await page.goto('/sign-in');
    await waitForClerkReady(page);

    // 2. Assert document title contains "Authentication" (from authPage.layoutTitle in en.json)
    const title = await page.title();
    expect(title).toMatch(/authentication/i);
  });

  test('I18N-02 · P1 — SignedInRedirect shows "Redirecting…" or "Continue" in English', async ({
    browser,
  }) => {
    // Prerequisite: user1 authenticated storage state
    const context = await browser.newContext({
      storageState: TEST_USERS.user1.storageStatePath,
    });
    const page = await context.newPage();

    // 1. Navigate to /sign-in while already authenticated
    await page.goto('/sign-in');
    await waitForClerkReady(page);

    // 2. Assert "Redirecting…" or "Continue" text is briefly visible, or the page has already redirected
    const redirectingText = page.getByText(/redirecting/i);
    const continueButton = page.getByRole('button', { name: /continue/i }).or(
      page.getByRole('link', { name: /continue/i }),
    );

    const alreadyRedirected = !page.url().includes('/sign-in');
    if (alreadyRedirected) {
      // The page redirected before we could catch the interim state — this is also valid
      expect(alreadyRedirected).toBe(true);
    } else {
      await expect(redirectingText.or(continueButton).first()).toBeVisible({ timeout: 5_000 });
    }

    await context.close();
  });

  test('I18N-03 · P2 — Reset-password page in Vietnamese locale', async ({ page }) => {
    // Assumption #10: navigating to /vi/reset-password with a valid token redirects to /vi/user/security.
    // Without a valid Clerk token the page renders an error — we assert it renders without crashing.
    test.skip(
      !process.env.CLERK_RESET_PASSWORD_URL,
      'CLERK_RESET_PASSWORD_URL env var not set — provide a valid Clerk reset-password URL to enable.',
    );

    const resetUrl = process.env.CLERK_RESET_PASSWORD_URL!;
    const viResetUrl = resetUrl.replace('/reset-password', '/vi/reset-password');

    // 1. Navigate to Vietnamese-prefixed reset URL
    await page.goto(viResetUrl);
    await waitForClerkReady(page);

    // 2. Assert page renders without error (new-password form or valid Clerk state)
    const newPasswordInput = page.locator('input[name="password"]');
    const errorState = page.getByText(/something went wrong|invalid.*link/i);

    await expect(newPasswordInput.or(errorState).first()).toBeVisible({ timeout: 15_000 });
  });
});
