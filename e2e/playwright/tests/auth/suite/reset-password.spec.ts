// spec: playwright/tests/auth/AUTH_TEST_PLAN.md — Suite 3: Password Reset

import { expect, test } from 'linky/playwright-test';

import { NewPasswordPage } from '../../../page-objects/auth/pages/new-password.page';
import { waitForClerkReady } from '../../../helpers/clerk-helpers';

// RP-01, RP-02, RP-03, RP-04, RP-05 all require a valid Clerk __clerk_ticket token in the URL.
// Blocker #1 from the test plan: this token must be obtained either via Clerk Backend API
// (programmatic password reset request) or a seeded token in the test environment.
//
// Set CLERK_RESET_PASSWORD_URL env var to a valid reset URL during CI setup,
// or inject it via a Clerk Backend API call in a beforeAll hook.

function getResetPasswordUrl(): string {
  return process.env.CLERK_RESET_PASSWORD_URL ?? '/reset-password';
}

test.describe('Password Reset', () => {
  test.describe.configure({ timeout: 60_000 });

  test(
    'RP-01 · P0 — Enter new valid password → success → redirect to /user/security',
    async ({ page }) => {
      // TODO: Set CLERK_RESET_PASSWORD_URL env var to a valid Clerk ticket URL before enabling.
      // Without a valid __clerk_ticket token, Clerk will render an error state (covered by RP-06).
      test.skip(
        !process.env.CLERK_RESET_PASSWORD_URL,
        'CLERK_RESET_PASSWORD_URL env var not set — provide a valid Clerk reset-password URL.',
      );

      const newPasswordPage = new NewPasswordPage(page);

      // 1. Navigate to the Clerk-generated reset-password URL
      await page.goto(getResetPasswordUrl());
      await waitForClerkReady(page);

      // 2. Wait for new-password input
      await newPasswordPage.waitUntilVisible();

      // 3-4. Enter matching strong passwords
      await newPasswordPage.fillNewPassword('NewSecurePass123!');
      await newPasswordPage.fillConfirmPassword('NewSecurePass123!');

      // 5. Click "Reset Password"
      await newPasswordPage.submitResetPassword();

      // 6. Assert redirect to /user/security
      await page.waitForURL(/\/user\/security/, { timeout: 20_000 });
    },
  );

  test(
    'RP-02 · P1 — Password field shows strength feedback while typing',
    async ({ page }) => {
      test.skip(
        !process.env.CLERK_RESET_PASSWORD_URL,
        'CLERK_RESET_PASSWORD_URL env var not set.',
      );

      const newPasswordPage = new NewPasswordPage(page);

      // 1. Navigate to reset URL
      await page.goto(getResetPasswordUrl());
      await waitForClerkReady(page);
      await newPasswordPage.waitUntilVisible();

      // 2. Type in new-password field
      await newPasswordPage.newPasswordInput().fill('ValidP12');

      // 3. Assert strength indicator appears
      const successFeedback = newPasswordPage.passwordSuccessFeedback();
      const strengthAny = page.locator('[id*="password"][id*="feedback"], [class*="strength"]');
      await expect(successFeedback.or(strengthAny).first()).toBeVisible({ timeout: 5_000 });
    },
  );

  test('RP-03 · P0 — Passwords do not match → inline error', async ({ page }) => {
    test.skip(
      !process.env.CLERK_RESET_PASSWORD_URL,
      'CLERK_RESET_PASSWORD_URL env var not set.',
    );

    const newPasswordPage = new NewPasswordPage(page);

    // 1. Navigate to reset URL
    await page.goto(getResetPasswordUrl());
    await waitForClerkReady(page);
    await newPasswordPage.waitUntilVisible();

    // 2. Fill mismatched passwords
    await newPasswordPage.fillNewPassword('ValidPass123!');
    await newPasswordPage.fillConfirmPassword('DifferentPass456!');

    // 3. Click Reset Password
    await newPasswordPage.submitResetPassword();

    // 4. Assert confirm-password error
    await expect(newPasswordPage.errorConfirmPasswordMessage()).toBeVisible({ timeout: 5_000 });
    await expect(newPasswordPage.errorConfirmPasswordMessage()).toContainText(
      /don't match|do not match/i,
    );
  });

  test('RP-04 · P0 — Short new password (< 8 chars) → inline error', async ({ page }) => {
    test.skip(
      !process.env.CLERK_RESET_PASSWORD_URL,
      'CLERK_RESET_PASSWORD_URL env var not set.',
    );

    const newPasswordPage = new NewPasswordPage(page);

    // 1. Navigate to reset URL
    await page.goto(getResetPasswordUrl());
    await waitForClerkReady(page);
    await newPasswordPage.waitUntilVisible();

    // 2. Fill short password
    await newPasswordPage.fillNewPassword('abc123');
    await newPasswordPage.newPasswordInput().press('Tab');

    // 3. Assert inline error
    await expect(newPasswordPage.errorNewPasswordMessage()).toBeVisible({ timeout: 5_000 });
    await expect(newPasswordPage.errorNewPasswordMessage()).toContainText(
      /8 or more characters|at least 8/i,
    );
  });

  test('RP-05 · P1 — Breached password in new password → error', async ({ page }) => {
    test.skip(
      !process.env.CLERK_RESET_PASSWORD_URL,
      'CLERK_RESET_PASSWORD_URL env var not set.',
    );

    const newPasswordPage = new NewPasswordPage(page);

    // 1. Navigate to reset URL
    await page.goto(getResetPasswordUrl());
    await waitForClerkReady(page);
    await newPasswordPage.waitUntilVisible();

    // 2. Fill a known-breached password
    await newPasswordPage.fillNewPassword('password123');
    await newPasswordPage.fillConfirmPassword('password123');

    // 3. Click Reset Password
    await newPasswordPage.submitResetPassword();

    // 4. Assert breach error
    await expect(newPasswordPage.formFeedbackErrorMessage()).toBeVisible({ timeout: 10_000 });
    await expect(newPasswordPage.formFeedbackErrorMessage()).toContainText(
      /found as part of a breach/i,
    );
  });

  test('RP-06 · P2 — Expired/invalid reset token → Clerk error shown', async ({ page }) => {
    // Navigate to /reset-password without a valid token (direct navigation)
    await page.goto('/reset-password');
    await waitForClerkReady(page);

    // Assert Clerk renders an error state (expired link, invalid token, etc.)
    const expiredText = page
      .getByText(/link has expired|invalid.*token|no longer valid/i)
      .or(page.getByTestId('form-feedback-error'))
      .or(page.locator('[class*="error"], [class*="alert"]').filter({ hasText: /expired|invalid/i }));

    await expect(expiredText.first()).toBeVisible({ timeout: 15_000 });
  });
});
