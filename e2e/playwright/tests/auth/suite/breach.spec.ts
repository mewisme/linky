// spec: playwright/tests/auth/AUTH_TEST_PLAN.md — Suite 4: Sign-In Breach Interstitial

import { expect, test } from 'linky/playwright-test';

import { NewPasswordPage } from '../../../page-objects/auth/pages/new-password.page';
import { OTPPage } from '../../../page-objects/auth/pages/otp.page';
import { PasswordPage } from '../../../page-objects/auth/pages/password.page';
import { ResetPasswordPage } from '../../../page-objects/auth/pages/reset-password.page';
import { fillEmailAndContinue, navigateAndWaitForClerk } from './helpers/sign-in-steps';
import { waitForRedirectToHome } from '../../../helpers/wait-for-home';

// All BR-* tests require a dedicated Clerk test account whose current password is a known-breached
// value (e.g. "password123"). Provide credentials via env vars:
//   BREACH_TEST_EMAIL    — email of the account with a breached password
//   BREACH_TEST_PASSWORD — the current (breached) password
//   BREACH_TEST_OTP      — OTP/email code sent during breach-reset flow
//
// Assumption #9 from the test plan: Clerk "Block sign-ins to accounts using breached passwords"
// must be enabled in the Clerk dashboard for these tests to trigger the interstitial.

const BREACH_EMAIL = process.env.BREACH_TEST_EMAIL ?? '';
const BREACH_PASSWORD = process.env.BREACH_TEST_PASSWORD ?? 'password123';
const BREACH_OTP = process.env.BREACH_TEST_OTP ?? '';

const hasBreach = !!BREACH_EMAIL;

async function signInWithBreachedAccount(page: Parameters<typeof navigateAndWaitForClerk>[0]) {
  const passwordPage = new PasswordPage(page);

  await navigateAndWaitForClerk(page);
  await fillEmailAndContinue(page, BREACH_EMAIL);
  await passwordPage.waitUntilVisible();
  await passwordPage.submitPassword(BREACH_PASSWORD);
}

test.describe('Sign-In Breach Interstitial', () => {
  test.describe.configure({ timeout: 60_000 });

  test('BR-01 · P0 — Breach interstitial displayed on compromised password', async ({ page }) => {
    test.skip(!hasBreach, 'BREACH_TEST_EMAIL env var not set — provide a breached-password test account.');

    // 1. Sign in with the breached-password account
    await signInWithBreachedAccount(page);

    // 2. Assert breach warning text
    const resetPage = new ResetPasswordPage(page);
    await expect(resetPage.breachWarning()).toBeVisible({ timeout: 15_000 });

    // 3. Assert "Reset your password" button visible
    await expect(resetPage.resetPasswordButton()).toBeVisible();
  });

  test('BR-02 · P0 — Clicking "Reset your password" → transitions to OTP/email step', async ({
    page,
  }) => {
    test.skip(!hasBreach, 'BREACH_TEST_EMAIL env var not set.');

    // 1. Reach breach interstitial
    await signInWithBreachedAccount(page);

    const resetPage = new ResetPasswordPage(page);
    await expect(resetPage.resetPasswordButton()).toBeVisible({ timeout: 15_000 });

    // 2. Click "Reset your password"
    await resetPage.submitResetPassword();

    // 3. Assert reset button is now hidden
    await expect(resetPage.resetPasswordButton()).not.toBeVisible({ timeout: 10_000 });

    // 4. Assert OTP input is visible
    const otpPage = new OTPPage(page);
    await expect(otpPage.otpInput()).toBeVisible({ timeout: 10_000 });
  });

  test('BR-03 · P0 — Wrong OTP on breach reset → error', async ({ page }) => {
    test.skip(!hasBreach, 'BREACH_TEST_EMAIL env var not set.');

    // 1. Reach OTP step
    await signInWithBreachedAccount(page);
    const resetPage = new ResetPasswordPage(page);
    await expect(resetPage.resetPasswordButton()).toBeVisible({ timeout: 15_000 });
    await resetPage.submitResetPassword();

    const otpPage = new OTPPage(page);
    await expect(otpPage.otpInput()).toBeVisible({ timeout: 10_000 });

    // 2. Fill wrong OTP and continue
    await otpPage.otpInput().fill('000000');
    await otpPage.submitOTPButton().click();

    // 3. Assert error visible
    await expect(otpPage.errorMessage()).toBeVisible({ timeout: 10_000 });
  });

  test('BR-04 · P1 — Correct OTP → proceeds to new-password step → success', async ({ page }) => {
    test.skip(!hasBreach, 'BREACH_TEST_EMAIL env var not set.');
    test.skip(!BREACH_OTP, 'BREACH_TEST_OTP env var not set — provide the OTP for breach reset.');

    // 1. Reach OTP step
    await signInWithBreachedAccount(page);
    const resetPage = new ResetPasswordPage(page);
    await expect(resetPage.resetPasswordButton()).toBeVisible({ timeout: 15_000 });
    await resetPage.submitResetPassword();

    const otpPage = new OTPPage(page);
    await expect(otpPage.otpInput()).toBeVisible({ timeout: 10_000 });

    // 2. Fill correct OTP
    await otpPage.otpInput().fill(BREACH_OTP);
    await otpPage.submitOTPButton().click();

    // 3. Assert new-password form appears
    const newPasswordPage = new NewPasswordPage(page);
    await expect(newPasswordPage.newPasswordInput()).toBeVisible({ timeout: 15_000 });

    // 4. Fill a strong non-breached password
    await newPasswordPage.fillNewPassword('BrandNewSecure456!');
    await newPasswordPage.fillConfirmPassword('BrandNewSecure456!');
    await newPasswordPage.submitResetPassword();

    // 5. Assert redirect to post-auth URL
    await waitForRedirectToHome(page, 20_000);
  });
});
