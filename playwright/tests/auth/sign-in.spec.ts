import * as Fixtures from '../../fixtures/auth.fixtures';

import { expect, test } from '@playwright/test';

import { IdentifierPage } from '../../flows/auth/pages/identifier.page';
import { LandingPage } from '../../flows/auth/pages/landing.page';
import { OTPPage } from '../../flows/auth/pages/otp.page';
import { PasswordPage } from '../../flows/auth/pages/password.page';
import { TEST_USERS } from '../../fixtures/users.fixtures';
import { waitForClerkReady } from '../../utils/clerk-helpers';

test.describe('Sign in flow', () => {
  let identifierPage: IdentifierPage;

  test.beforeEach(async ({ page }) => {
    identifierPage = new IdentifierPage(page);
    await page.goto('/sign-in');
    await waitForClerkReady(page);
    await identifierPage.waitUntilVisible();
  });

  test.describe('Email validation', () => {
    test('should not submit with empty email', async ({ page }) => {
      await identifierPage.submitEmail('');
      await expect(identifierPage.emailInput()).toHaveValue('');
    });

    test('should not submit with invalid email format', async ({ page }) => {
      await identifierPage.submitEmail(TEST_USERS.user3.email);
      await expect(identifierPage.emailInput()).toHaveValue(TEST_USERS.user3.email);
    });

    test('should show error when email is not found', async ({ page }) => {
      await identifierPage.submitEmail(TEST_USERS.user4.email);
      await expect(identifierPage.errorMessage()).toBeVisible();
      await expect(identifierPage.errorMessage()).toHaveText(
        "Couldn't find your account."
      );
    });
  });

  test.describe('Password validation', () => {
    let passwordPage: PasswordPage;

    test.beforeEach(async ({ page }) => {
      passwordPage = new PasswordPage(page);
      await identifierPage.submitEmail(TEST_USERS.user1.email);
      await identifierPage.waitUntilHidden();
      await passwordPage.waitUntilVisible();
    });

    test('should not submit with empty password', async ({ page }) => {
      await passwordPage.submitPassword('');
      await expect(passwordPage.passwordInput()).toHaveValue('');
    });

    test('should show error when password is incorrect', async ({ page }) => {
      await passwordPage.submitPassword(TEST_USERS.user4.password);
      await expect(passwordPage.errorMessage()).toBeVisible();
      await expect(passwordPage.errorMessage()).toHaveText(
        'Password is incorrect. Try again, or use another method.'
      );
    });
  });

  test.describe('Successful sign in', () => {
    let passwordPage: PasswordPage;

    test.beforeEach(async ({ page }) => {
      passwordPage = new PasswordPage(page);
      await identifierPage.submitEmail(TEST_USERS.user1.email);
      await identifierPage.waitUntilHidden();
      await passwordPage.waitUntilVisible();
    });

    test('should sign in successfully', async ({ page }) => {
      const landingPage = new LandingPage(page);
      await page.waitForTimeout(1000);
      await passwordPage.submitPassword(TEST_USERS.user1.password);
      await passwordPage.waitUntilHidden();

      if (page.url().includes('/sign-in/factor-two')) {
        const otpPage = new OTPPage(page);
        await otpPage.fillOTP(TEST_USERS.user1.otp);
        await otpPage.waitUntilHidden();
      }

      await landingPage.waitUntilVisible();
      await expect(landingPage.goToChatButton()).toBeVisible();
    });
  });
});
