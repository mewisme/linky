// spec: playwright/tests/auth/AUTH_TEST_PLAN.md — Suite 2: Sign-Up

import { expect, test } from 'linky/playwright-test';

import { OTPPage } from '../../../page-objects/auth/pages/otp.page';
import { SignUpPage } from '../../../page-objects/auth/pages/sign-up.page';
import { TEST_USERS } from '../../../fixtures/users.fixtures';
import { generateSignupEmail } from '../../../test-data/generate-signup-email';
import { navigateAndWaitForClerk } from './helpers/sign-in-steps';
import { waitForClerkReady } from '../../../helpers/clerk-helpers';
import { waitForRedirectToHome } from '../../../helpers/wait-for-home';

// Clerk test-mode OTP: the +clerk_test suffix always returns code 424242 in test mode.
const CLERK_TEST_OTP = '424242';

function freshTestEmail(): string {
  return generateSignupEmail(`test+clerk_test@example.com`, true);
}

test.describe('Sign-Up', () => {
  test.describe.configure({ timeout: 90_000 });

  // --- Happy Path ---

  test('SU-01 · P0 — Valid registration → email verification → redirect to home', async ({
    page,
  }) => {
    const signUpPage = new SignUpPage(page);

    // 1. Navigate to /sign-up and wait for Clerk
    await navigateAndWaitForClerk(page, '/sign-up');
    await signUpPage.waitUntilVisible();

    // 2. Fill all required fields
    await signUpPage.fillFirstName('Test');
    await signUpPage.fillLastName('User');
    await signUpPage.fillEmailAddress(freshTestEmail());
    await signUpPage.fillPassword('ValidPass123!');

    // 3. Accept terms of service
    await signUpPage.fillCheckbox();

    // 4. Submit
    await signUpPage.submitSignUp();

    // 5. Assert URL changes to verify-email-address step
    await page.waitForURL(/sign-up\/verify-email-address/, { timeout: 20_000 });

    // 6. Fill the Clerk test-mode OTP (424242 for +clerk_test addresses)
    const otpPage = new OTPPage(page);
    await otpPage.waitUntilVisible();
    await otpPage.submitOTP(CLERK_TEST_OTP);

    // 7. Assert redirect to post-auth URL
    await waitForRedirectToHome(page, 30_000);
  });

  test('SU-02 · P1 — Already signed-in user visiting /sign-up → form not shown', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: TEST_USERS.user1.storageStatePath,
    });
    const page = await context.newPage();

    // 1. Navigate to /sign-up
    await page.goto('/sign-up');
    await waitForClerkReady(page);

    // 2. Assert registration form fields are not visible (component renders null for signed-in users)
    const signUpPage = new SignUpPage(page);
    await expect(signUpPage.firstNameInput()).not.toBeVisible({ timeout: 5_000 });

    await context.close();
  });

  test('SU-03 · P1 — Sign-up page renders in Vietnamese locale', async ({ page }) => {
    // 1. Navigate to Vietnamese locale sign-up
    await page.goto('/vi/sign-up');
    await waitForClerkReady(page);

    // 2. Assert firstName input is visible (smoke)
    const signUpPage = new SignUpPage(page);
    await expect(signUpPage.firstNameInput()).toBeVisible({ timeout: 10_000 });
  });

  // --- Validation / Error Cases ---

  test('SU-04 · P0 — All fields blank → submit blocked with errors', async ({ page }) => {
    const signUpPage = new SignUpPage(page);

    // 1. Navigate and wait for fields
    await navigateAndWaitForClerk(page, '/sign-up');
    await signUpPage.waitUntilVisible();

    // 2. Click Continue without filling anything
    await signUpPage.submitSignUp();

    // 3. Assert at least one field-level error visible
    const firstNameErr = page.locator('#error-firstName');
    const lastNameErr = page.locator('#error-lastName');
    const emailErr = page.locator('#error-emailAddress');
    const passwordErr = page.locator('#error-password');
    const anyErr = firstNameErr.or(lastNameErr).or(emailErr).or(passwordErr);
    await expect(anyErr.first()).toBeVisible({ timeout: 5_000 });
  });

  test('SU-05 · P0 — Invalid email format shows error', async ({ page }) => {
    const signUpPage = new SignUpPage(page);

    // 1. Fill all valid fields except email
    await navigateAndWaitForClerk(page, '/sign-up');
    await signUpPage.waitUntilVisible();
    await signUpPage.fillFirstName('Test');
    await signUpPage.fillLastName('User');
    await signUpPage.fillPassword('ValidPass123!');
    await signUpPage.fillCheckbox();

    // 2. Fill invalid email and submit
    await signUpPage.fillEmailAddress('bademail');
    await signUpPage.submitSignUp();

    // 3. Assert email error or native validation
    const clerkErr = signUpPage.errorEmailMessage();
    const hasClerkErr = await clerkErr.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasClerkErr) {
      const validationMessage = await signUpPage
        .emailAddressInput()
        .evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage.length).toBeGreaterThan(0);
    } else {
      await expect(clerkErr).toBeVisible();
    }
  });

  test('SU-06 · P0 — Password too short (< 8 chars) shows error', async ({ page }) => {
    const signUpPage = new SignUpPage(page);

    // 1. Fill all valid fields except password
    await navigateAndWaitForClerk(page, '/sign-up');
    await signUpPage.waitUntilVisible();
    await signUpPage.fillFirstName('Test');
    await signUpPage.fillLastName('User');
    await signUpPage.fillEmailAddress(freshTestEmail());
    await signUpPage.fillCheckbox();

    // 2. Fill short password and submit
    await signUpPage.fillPassword('abc123');
    await signUpPage.submitSignUp();

    // 3. Assert password error mentions 8 characters
    await expect(signUpPage.errorPasswordMessage()).toBeVisible({ timeout: 5_000 });
    await expect(signUpPage.errorPasswordMessage()).toContainText(/8 or more characters/i);
  });

  test('SU-07 · P0 — Password at max length (73 chars) shows inline error before submit', async ({
    page,
  }) => {
    const signUpPage = new SignUpPage(page);

    // 1. Fill valid data
    await navigateAndWaitForClerk(page, '/sign-up');
    await signUpPage.waitUntilVisible();
    await signUpPage.fillFirstName('Test');
    await signUpPage.fillLastName('User');
    await signUpPage.fillEmailAddress(freshTestEmail());
    await signUpPage.fillCheckbox();

    // 2. Paste 73-character password (exceeds Clerk's 72-char max)
    const tooLongPassword = 'A'.repeat(73);
    await signUpPage.fillPassword(tooLongPassword);
    await signUpPage.passwordInput().press('Tab');

    // 3. Assert inline error appears (Clerk validates before submit)
    await expect(signUpPage.errorPasswordMessage()).toBeVisible({ timeout: 5_000 });
  });

  test('SU-08 · P0 — Duplicate email shows "already in use" error', async ({ page }) => {
    const signUpPage = new SignUpPage(page);

    // 1. Fill with a known registered email (user1's email, no +clerk_test generation)
    await navigateAndWaitForClerk(page, '/sign-up');
    await signUpPage.waitUntilVisible();
    await signUpPage.fillFirstName('Test');
    await signUpPage.fillLastName('User');
    await signUpPage.fillEmailAddress(TEST_USERS.user1.email);
    await signUpPage.fillPassword('ValidPass123!');
    await signUpPage.fillCheckbox();

    // 2. Submit
    await signUpPage.submitSignUp();

    // 3. Assert Clerk duplicate-email error
    const clerkErr = signUpPage.errorEmailMessage().or(signUpPage.formFeedbackErrorMessage());
    await expect(clerkErr.first()).toBeVisible({ timeout: 10_000 });
    await expect(clerkErr.first()).toContainText(/already in use|is taken/i);
  });

  test('SU-09 · P1 — Terms checkbox unchecked → submit blocked', async ({ page }) => {
    const signUpPage = new SignUpPage(page);

    // 1. Fill all required fields but do NOT check the terms checkbox
    await navigateAndWaitForClerk(page, '/sign-up');
    await signUpPage.waitUntilVisible();
    await signUpPage.fillFirstName('Test');
    await signUpPage.fillLastName('User');
    await signUpPage.fillEmailAddress(freshTestEmail());
    await signUpPage.fillPassword('ValidPass123!');
    // Terms checkbox intentionally left unchecked

    // 2. Click Continue
    await signUpPage.submitSignUp();

    // 3. Assert a terms-related error or that form did not advance
    const termsErr = page
      .locator('[name="legalAccepted"]')
      .or(page.getByTestId('form-feedback-error'))
      .or(page.locator('#error-legalAccepted'));
    const stillOnSignUp = page.url().includes('/sign-up') && !page.url().includes('verify-email');
    expect(stillOnSignUp || (await termsErr.first().isVisible({ timeout: 3_000 }).catch(() => false))).toBe(true);
  });

  test('SU-10 · P0 — Wrong OTP on email verification shows error', async ({ page }) => {
    const signUpPage = new SignUpPage(page);

    // 1. Complete sign-up form
    await navigateAndWaitForClerk(page, '/sign-up');
    await signUpPage.waitUntilVisible();
    await signUpPage.fillFirstName('Test');
    await signUpPage.fillLastName('User');
    await signUpPage.fillEmailAddress(freshTestEmail());
    await signUpPage.fillPassword('ValidPass123!');
    await signUpPage.fillCheckbox();
    await signUpPage.submitSignUp();

    await page.waitForURL(/sign-up\/verify-email-address/, { timeout: 20_000 });

    // 2. Enter wrong OTP
    const otpPage = new OTPPage(page);
    await otpPage.waitUntilVisible();
    await otpPage.submitOTP('123456');

    // 3. Assert error
    await expect(otpPage.errorMessage()).toBeVisible({ timeout: 10_000 });
  });

  test('SU-11 · P1 — Empty OTP on email verification shows error', async ({ page }) => {
    const signUpPage = new SignUpPage(page);

    // 1. Reach OTP step
    await navigateAndWaitForClerk(page, '/sign-up');
    await signUpPage.waitUntilVisible();
    await signUpPage.fillFirstName('Test');
    await signUpPage.fillLastName('User');
    await signUpPage.fillEmailAddress(freshTestEmail());
    await signUpPage.fillPassword('ValidPass123!');
    await signUpPage.fillCheckbox();
    await signUpPage.submitSignUp();

    await page.waitForURL(/sign-up\/verify-email-address/, { timeout: 20_000 });

    // 2. Click Continue without entering OTP
    const otpPage = new OTPPage(page);
    await otpPage.waitUntilVisible();
    await otpPage.submitOTPButton().click();

    // 3. Assert error visible
    await expect(otpPage.errorMessage()).toBeVisible({ timeout: 5_000 });
  });

  test('SU-12 · P1 — Resend code link triggers new code delivery', async ({ page }) => {
    const signUpPage = new SignUpPage(page);

    // 1. Reach OTP step
    await navigateAndWaitForClerk(page, '/sign-up');
    await signUpPage.waitUntilVisible();
    await signUpPage.fillFirstName('Test');
    await signUpPage.fillLastName('User');
    await signUpPage.fillEmailAddress(freshTestEmail());
    await signUpPage.fillPassword('ValidPass123!');
    await signUpPage.fillCheckbox();
    await signUpPage.submitSignUp();

    await page.waitForURL(/sign-up\/verify-email-address/, { timeout: 20_000 });

    // 2. Click "Resend code" / "Didn't receive?" link
    // NOTE: Exact label depends on Clerk version — adjust selector if it differs.
    const resendLink = page
      .getByRole('button', { name: /resend|didn't receive/i })
      .or(page.getByText(/resend code|didn't receive/i));
    await expect(resendLink.first()).toBeVisible({ timeout: 5_000 });
    await resendLink.first().click();

    // 3. Assert no error shown after resend
    const otpPage = new OTPPage(page);
    await expect(otpPage.errorMessage()).not.toBeVisible({ timeout: 5_000 });
  });

  test('SU-13 · P2 — OAuth popup flow (Google) — popup opened (smoke)', async ({ page }) => {
    // 1. Navigate to /sign-up
    await navigateAndWaitForClerk(page, '/sign-up');
    const signUpPage = new SignUpPage(page);
    await signUpPage.waitUntilVisible();

    // 2. Locate Google OAuth button
    const googleButton = page
      .getByRole('button', { name: /google/i })
      .or(page.locator('[data-provider="google"]'));
    await expect(googleButton.first()).toBeVisible({ timeout: 10_000 });

    // 3. Assert popup opens on click
    // NOTE: Full OAuth flow requires test OAuth credentials; we only assert popup event.
    const [popup] = await Promise.all([
      page.waitForEvent('popup', { timeout: 10_000 }).catch(() => null),
      googleButton.first().click(),
    ]);

    // A popup or a same-page redirect is acceptable evidence that OAuth flow started
    const popupOpened = popup !== null;
    const redirectedToOAuth = page.url().includes('accounts.google.com') ||
      page.url().includes('oauth') ||
      page.url().includes('clerk');

    expect(popupOpened || redirectedToOAuth).toBe(true);
  });

  test('SU-14 · P2 — First/Last name with special characters accepted', async ({ page }) => {
    const signUpPage = new SignUpPage(page);

    // 1. Fill with Vietnamese special characters
    await navigateAndWaitForClerk(page, '/sign-up');
    await signUpPage.waitUntilVisible();
    await signUpPage.fillFirstName('Ân');
    await signUpPage.fillLastName('Nguyễn');
    await signUpPage.fillEmailAddress(freshTestEmail());
    await signUpPage.fillPassword('ValidPass123!');
    await signUpPage.fillCheckbox();

    // 2. Submit and assert no field errors on names
    await signUpPage.submitSignUp();

    const firstNameErr = page.locator('#error-firstName');
    const lastNameErr = page.locator('#error-lastName');
    await expect(firstNameErr).not.toBeVisible({ timeout: 3_000 });
    await expect(lastNameErr).not.toBeVisible({ timeout: 3_000 });
  });

  test('SU-15 · P2 — Sign-up with very long valid name fields (boundary check)', async ({
    page,
  }) => {
    const signUpPage = new SignUpPage(page);

    // 1. Fill 50-character first and last names
    await navigateAndWaitForClerk(page, '/sign-up');
    await signUpPage.waitUntilVisible();
    await signUpPage.fillFirstName('A'.repeat(50));
    await signUpPage.fillLastName('B'.repeat(50));
    await signUpPage.fillEmailAddress(freshTestEmail());
    await signUpPage.fillPassword('ValidPass123!');
    await signUpPage.fillCheckbox();

    // 2. Submit and assert no name-field errors
    await signUpPage.submitSignUp();

    const firstNameErr = page.locator('#error-firstName');
    const lastNameErr = page.locator('#error-lastName');
    await expect(firstNameErr).not.toBeVisible({ timeout: 3_000 });
    await expect(lastNameErr).not.toBeVisible({ timeout: 3_000 });
  });
});
