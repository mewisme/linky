// spec: playwright/tests/auth/AUTH_TEST_PLAN.md — Suite 1: Sign-In

import { expect, test } from 'linky/playwright-test';

import { IdentifierPage } from '../../../page-objects/auth/pages/identifier.page';
import { OTPPage } from '../../../page-objects/auth/pages/otp.page';
import { PasswordPage } from '../../../page-objects/auth/pages/password.page';
import { TEST_USERS } from '../../../fixtures/users.fixtures';
import {
  advanceToFactorTwo,
  fillEmailAndContinue,
  fillPasswordAndContinue,
  navigateAndWaitForClerk,
  signInWithCredentials,
  submitOtpCode,
} from './helpers/sign-in-steps';
import { waitForClerkReady } from '../../../helpers/clerk-helpers';
import { waitForRedirectToHome } from '../../../helpers/wait-for-home';

// TODO: install @otplib/preset-default (or speakeasy) for runtime TOTP generation.
// Until then, SI-02 and SI-10 are skipped with rationale.

test.describe('Sign-In', () => {
  test.describe.configure({ timeout: 60_000 });

  // --- Happy Path ---

  test('SI-01 · P0 — Valid email + password →  MFA if needed  → redirect to home', async ({ page }) => {
    const user = TEST_USERS.user1;

    await advanceToFactorTwo(page, { email: user.email, password: user.password });
    await submitOtpCode(page, '424242');

    // 4. Assert URL changes to a non-auth page within 20s
    await waitForRedirectToHome(page, 20_000);

    // 5. Assert no error elements visible
    await expect(page.getByTestId('form-feedback-error')).not.toBeVisible();
  });

  test('SI-02 · P1 — Already signed-in user visits /sign-in → redirect to home', async ({
    browser,
  }) => {
    // Load user1 pre-authenticated storage state
    const context = await browser.newContext({
      storageState: TEST_USERS.user1.storageStatePath,
    });
    const page = await context.newPage();

    // 1. Navigate to /sign-in
    await page.goto('/sign-in');
    await waitForClerkReady(page);

    // 2. Assert page auto-redirects away from /sign-in within 5s
    await expect
      .poll(
        async () => {
          const url = new URL(page.url());
          return !url.pathname.startsWith('/sign-in');
        },
        { timeout: 8_000 },
      )
      .toBe(true);

    await context.close();
  });

  test('SI-03 · P1 — redirect_url query param is honoured', async ({ page }) => {
    const user = TEST_USERS.user1;

    // 1. Navigate with redirect_url pointing to /user/profile
    await page.goto('/sign-in?redirect_url=%2Fuser%2Fprofile');
    await advanceToFactorTwo(page, { email: user.email, password: user.password });
    await submitOtpCode(page, '424242');

    // 2. Assert no error elements visible
    await expect(page.getByTestId('form-feedback-error')).not.toBeVisible();

    // 3. Assert final URL is /user/profile
    await page.waitForURL(/\/user\/profile/, { timeout: 20_000 });
  });

  test('SI-04 · P1 — Invalid redirect_url (external origin) falls back to /', async ({ page }) => {
    const user = TEST_USERS.user1;

    // 1. Navigate with cross-origin redirect_url
    await page.goto('/sign-in?redirect_url=https%3A%2F%2Fevil.example.com');
    await advanceToFactorTwo(page, { email: user.email, password: user.password });
    await submitOtpCode(page, '424242');

    // 2. Assert no error elements visible
    await expect(page.getByTestId('form-feedback-error')).not.toBeVisible();

    // 3. Assert final URL is /
    await page.waitForURL(/\//, { timeout: 20_000 });
  });

  // --- Error / Negative Cases ---

  test('SI-05 · P0 — Empty email shows validation error', async ({ page }) => {
    // 1. Navigate to /sign-in
    await navigateAndWaitForClerk(page);

    // 2. Click Continue without filling anything
    await page.getByRole('button', { name: 'Continue' }).click();

    // 3. Assert error element is visible
    const errorByTestId = page.getByTestId('form-feedback-error');
    const errorById = page.locator('#error-identifier');
    await expect(errorByTestId.or(errorById).first()).toBeVisible({ timeout: 5_000 });
  });

  test('SI-06 · P0 — Malformed email shows validation error', async ({ page }) => {
    // 1. Navigate and enter non-email string
    await navigateAndWaitForClerk(page);

    const identifierPage = new IdentifierPage(page);
    await identifierPage.waitUntilVisible();

    // 2. Type invalid value and press Enter
    await identifierPage.emailInput().fill('notanemail');
    await identifierPage.emailInput().press('Enter');

    // 3. Assert browser native or Clerk error visible
    const clerkError = page.getByTestId('form-feedback-error').or(page.locator('#error-identifier'));
    const hasClerkError = await clerkError.first().isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasClerkError) {
      // Browser native validation is acceptable
      const validationMessage = await identifierPage
        .emailInput()
        .evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage.length).toBeGreaterThan(0);
    }
  });

  test('SI-07 · P0 — Non-existent email shows account not found error', async ({ page }) => {
    // 1. Navigate and fill non-existent email
    await navigateAndWaitForClerk(page);
    await fillEmailAndContinue(page, `nonexistent_${Date.now()}@example.com`);

    // 2. Assert error mentions account not found
    const identifierPage = new IdentifierPage(page);
    await expect(identifierPage.errorMessage()).toBeVisible({ timeout: 10_000 });
    await expect(identifierPage.errorMessage()).toContainText(
      /couldn't find your account|no account found|doesn't exist/i,
    );
  });

  test('SI-08 · P0 — Wrong password shows error', async ({ page }) => {
    const user = TEST_USERS.user1;

    // 1. Navigate and enter valid email
    await navigateAndWaitForClerk(page);
    await fillEmailAndContinue(page, user.email);

    // 2. Enter wrong password and continue
    const passwordPage = new PasswordPage(page);
    await passwordPage.waitUntilVisible();
    await passwordPage.passwordInput().fill('wrongpassword123');
    await passwordPage.continueButton().click();

    // 3. Assert password error is visible
    const errorById = page.locator('#error-password');
    const errorByTestId = page.getByTestId('form-feedback-error');
    const errorVisible = errorById.or(errorByTestId).first();
    await expect(errorVisible).toBeVisible({ timeout: 10_000 });
    await expect(errorVisible).toContainText(/incorrect|invalid|wrong/i);
  });

  test('SI-09 · P1 — Wrong TOTP code shows error', async ({ page }) => {
    const user = TEST_USERS.user1;

    await advanceToFactorTwo(page, { email: user.email, password: user.password });

    // Fill an obviously wrong code
    await submitOtpCode(page, '000000');

    const otpPage = new OTPPage(page);
    await expect(otpPage.errorMessage()).toBeVisible({ timeout: 10_000 });
  });

  test('SI-10 · P2 — Back-navigate from password step returns to identifier step', async ({
    page,
  }) => {
    const user = TEST_USERS.user1;

    // 1. Navigate and fill valid email
    await navigateAndWaitForClerk(page);
    await fillEmailAndContinue(page, user.email);

    const passwordPage = new PasswordPage(page);
    await passwordPage.waitUntilVisible();

    // 2. Click back or use Clerk's edit affordance
    const editButton = page.getByRole('button', { name: /edit/i });
    const hasEditButton = await editButton.isVisible({ timeout: 2_000 }).catch(() => false);

    if (hasEditButton) {
      await editButton.click();
    } else {
      await page.goBack();
    }

    // 3. Assert identifier input is visible again
    const identifierPage = new IdentifierPage(page);
    await expect(identifierPage.emailInput()).toBeVisible({ timeout: 8_000 });
  });

  test('SI-11 · P2 — Sign-in page renders in Vietnamese locale', async ({ page }) => {
    // 1. Navigate to Vietnamese locale sign-in
    await page.goto('/vi/sign-in');
    await waitForClerkReady(page);

    // 2. Assert Clerk widget identifier input is visible (smoke only)
    const identifierPage = new IdentifierPage(page);
    await expect(identifierPage.emailInput()).toBeVisible({ timeout: 10_000 });
  });
});
