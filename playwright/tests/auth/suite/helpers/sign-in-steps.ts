import { Page } from '@playwright/test';

import { IdentifierPage } from '../../../../page-objects/auth/pages/identifier.page';
import { OTPPage } from '../../../../page-objects/auth/pages/otp.page';
import { PasswordPage } from '../../../../page-objects/auth/pages/password.page';
import { waitForClerkReady } from '../../../../helpers/clerk-helpers';

export type SignInCredentials = {
  email: string;
  password: string;
};

export async function navigateAndWaitForClerk(page: Page, path = '/sign-in'): Promise<void> {
  await page.goto(path);
  await waitForClerkReady(page);
}

export async function fillEmailAndContinue(page: Page, email: string): Promise<void> {
  const identifierPage = new IdentifierPage(page);
  await identifierPage.waitUntilVisible();
  await identifierPage.emailInput().fill(email);
  await identifierPage.continueButton().click();
}

export async function fillPasswordAndContinue(page: Page, password: string): Promise<void> {
  const passwordPage = new PasswordPage(page);
  await passwordPage.waitUntilVisible();
  await passwordPage.submitPassword(password);
}

export async function signInWithCredentials(
  page: Page,
  credentials: SignInCredentials,
): Promise<void> {
  await navigateAndWaitForClerk(page);
  await fillEmailAndContinue(page, credentials.email);
  await fillPasswordAndContinue(page, credentials.password);
}

export async function advanceToFactorTwo(
  page: Page,
  credentials: SignInCredentials,
): Promise<void> {
  await signInWithCredentials(page, credentials);
  await page.waitForURL(/sign-in\/factor-two/, { timeout: 15_000 });
}

export async function submitOtpCode(page: Page, code: string): Promise<void> {
  const needFactorTwo = page.url().includes('factor-two');
  if (needFactorTwo) {
    const otpPage = new OTPPage(page);
    await otpPage.waitUntilVisible();
    await otpPage.fillOTP(code);
  }

  await page.waitForTimeout(5_000);

  let alertElement = page.locator('p.cl-alertText').first();
  if (await alertElement.isVisible()) {
    if (await alertElement.getAttribute('data-color') === 'danger') {
      await submitOtpCode(page, code);
    }
  }
}
