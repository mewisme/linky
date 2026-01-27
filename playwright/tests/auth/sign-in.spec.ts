import * as Fixtures from '../../fixtures/auth.fixtures';

import { expect, test } from '@playwright/test';

import { IdentifierPage } from '../../flows/auth/pages/identifier.page';
import { LandingPage } from '../../flows/auth/pages/landing.page';
import { OTPPage } from '../../flows/auth/pages/otp.page';
import { PasswordPage } from '../../flows/auth/pages/password.page';

test.describe('Sign in flow', () => {
  let identifierPage: IdentifierPage;

  test.beforeEach(async ({ page }) => {
    identifierPage = new IdentifierPage(page);
    await page.goto('/sign-in');
    await identifierPage.waitUntilVisible();
  });

  test.describe('Email validation', () => {
    test('empty email', async ({ page }) => {
      await identifierPage.submitEmail('');
      await expect(identifierPage.emailInput()).toHaveValue('');
    })

    test('invalid email format', async ({ page }) => {
      await identifierPage.submitEmail(Fixtures.INVALID_EMAIL);
      await expect(identifierPage.emailInput()).toHaveValue(Fixtures.INVALID_EMAIL);
    })

    test('email not found', async ({ page }) => {
      await identifierPage.submitEmail(Fixtures.WRONG_IDENTIFIER);
      await expect(identifierPage.errorMessage()).toBeVisible();
      await expect(identifierPage.errorMessage()).toHaveText(
        "Couldn't find your account."
      );
    })
  })

  test.describe('Password validation', () => {
    let passwordPage: PasswordPage;

    test.beforeEach(async ({ page }) => {
      passwordPage = new PasswordPage(page);
      await identifierPage.submitEmail(Fixtures.CORRECT_TEST_EMAIL);
      await identifierPage.waitUntilHidden();
      await passwordPage.waitUntilVisible();
    });

    test('empty password', async ({ page }) => {
      await passwordPage.submitPassword('');
      await expect(passwordPage.passwordInput()).toHaveValue('');
    });

    test('wrong password', async ({ page }) => {
      await passwordPage.submitPassword(Fixtures.WRONG_PASSWORD);
      await expect(passwordPage.errorMessage()).toBeVisible();
      await expect(passwordPage.errorMessage()).toHaveText(
        'Password is incorrect. Try again, or use another method.'
      );
    });

    test.describe('correct email & password', () => {
      test.describe('password is not compromised', () => {
        test('sign in successfully', async ({ page }) => {
          const landingPage = new LandingPage(page);
          await page.waitForTimeout(1000);
          await passwordPage.submitPassword(Fixtures.CORRECT_TEST_PASSWORD);
          await passwordPage.waitUntilHidden();

          if (page.url().includes('/sign-in/factor-two')) {
            const otpPage = new OTPPage(page);
            await otpPage.fillOTP(Fixtures.CORRECT_OTP);
            await otpPage.waitUntilHidden();
          }

          await landingPage.waitUntilVisible();
          await expect(landingPage.goToChatButton()).toBeVisible();
        });
      })
    })
  })
})
