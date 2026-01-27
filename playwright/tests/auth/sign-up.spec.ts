import * as Fixtures from '../../fixtures/auth.fixtures';

import { expect, test } from '@playwright/test';

import { OTPPage } from '../../flows/auth/pages/otp.page';
import { SignUpPage } from '../../flows/auth/pages/sign-up.page';
import { generateEmail } from '../../utils/auth/sign-up';

test.describe('Sign up flow', () => {
  let signUpPage: SignUpPage;
  let signUpEmail: string;

  test.beforeEach(async ({ page }) => {
    signUpPage = new SignUpPage(page);
    signUpEmail = generateEmail({ prefix: 'example', suffix: true, domain: 'example.com' });
    await page.goto('/sign-up');
    await signUpPage.waitUntilVisible();
  });

  test.describe('Client side validation', () => {

    test('should not submit with invalid email format', async () => {
      await signUpPage.fillEmailAddress('abc');
      await signUpPage.fillPassword(Fixtures.NEW_STRONG_PASSWORD);
      await signUpPage.fillCheckbox();
      await signUpPage.submitSignUp();

      await expect(signUpPage.emailAddressInput()).toHaveValue('abc');
    });

    test('should show error when password is less than 8 characters', async () => {
      await signUpPage.fillPassword('123');
      await signUpPage.submitSignUp();

      await expect(signUpPage.errorPasswordMessage()).toBeVisible();
    });

    test('should not submit when terms are not accepted', async () => {
      await signUpPage.fillFirstName('Test');
      await signUpPage.fillLastName('User');
      await signUpPage.fillEmailAddress(signUpEmail);
      await signUpPage.fillPassword(Fixtures.NEW_STRONG_PASSWORD);

      await signUpPage.submitSignUp();

      await expect(signUpPage.checkboxInput()).not.toBeChecked();
    });
  });

  test.describe('Server side validation (after submit)', () => {

    test('should show error when email is already in use', async () => {
      await signUpPage.fillFirstName('Test');
      await signUpPage.fillLastName('User');
      await signUpPage.fillEmailAddress(Fixtures.CORRECT_TEST_EMAIL);
      await signUpPage.fillPassword(Fixtures.NEW_STRONG_PASSWORD);
      await signUpPage.fillCheckbox();

      await signUpPage.submitSignUp();

      await expect(signUpPage.formFeedbackErrorMessage()).toBeVisible();
      await expect(signUpPage.formFeedbackErrorMessage())
        .toHaveText(/email address is taken/i);
    });

    test('should show error when password is weak or compromised', async () => {
      await signUpPage.fillFirstName('Test');
      await signUpPage.fillLastName('User');
      await signUpPage.fillEmailAddress(Fixtures.CORRECT_TEST_EMAIL);
      await signUpPage.fillPassword(Fixtures.NEW_SHORT_PASSWORD);
      await signUpPage.fillCheckbox();

      await signUpPage.submitSignUp();

      await expect(signUpPage.errorPasswordMessage()).toBeVisible();
    });
  });

  test.describe('Successful sign up', () => {

    test.beforeEach(async ({ page }) => {
      await signUpPage.fillFirstName(Fixtures.FIRST_NAME);
      await signUpPage.fillLastName(Fixtures.LAST_NAME);
      await signUpPage.fillEmailAddress(signUpEmail);
      await signUpPage.fillPassword(Fixtures.NEW_STRONG_PASSWORD);
      await signUpPage.fillCheckbox();

      await signUpPage.submitSignUp();
    });


    test('should show error when OTP is not provided', async ({ page }) => {
      const otpPage = new OTPPage(page);
      await otpPage.submitOTP('');
      await expect(otpPage.errorMessage()).toBeVisible();
      await expect(otpPage.errorMessage()).toHaveText(/Enter code./i);
    })

    test('should show error when OTP is incorrect', async ({ page }) => {
      const otpPage = new OTPPage(page);
      await otpPage.fillOTP(Fixtures.WRONG_OTP);
      await expect(otpPage.errorMessage()).toBeVisible();
      await expect(otpPage.errorMessage()).toHaveText(/Incorrect/i);
    })

    test('should sign up successfully', async ({ page }) => {
      const otpPage = new OTPPage(page);
      await page.waitForTimeout(1000);
      await otpPage.fillOTP(Fixtures.CORRECT_OTP);
      await otpPage.waitUntilHidden();
      await expect(page).toHaveURL('/');
    });
  });
});
