import { IdentifierPage } from '../flows/auth/pages/identifier.page';
import { LandingPage } from '../flows/auth/pages/landing.page';
import { OTPPage } from '../flows/auth/pages/otp.page';
import { Page } from '@playwright/test';
import { PasswordPage } from '../flows/auth/pages/password.page';
import { TestUser } from './users.fixtures';
import { waitForClerkReady } from '../utils/clerk-helpers';

export async function authenticateUser(
  page: Page,
  user: TestUser,
): Promise<void> {
  const identifierPage = new IdentifierPage(page);
  await page.goto('/sign-in');
  await waitForClerkReady(page);
  await page.waitForTimeout(1000);
  await identifierPage.waitUntilVisible();

  await identifierPage.submitEmail(user.email);
  await identifierPage.waitUntilHidden();

  const passwordPage = new PasswordPage(page);
  await page.waitForTimeout(1000);
  await passwordPage.waitUntilVisible();
  await passwordPage.submitPassword(user.password);
  await passwordPage.waitUntilHidden();

  if (page.url().includes('/sign-in/factor-two')) {
    const otpPage = new OTPPage(page);
    await otpPage.waitUntilVisible();
    await page.waitForTimeout(1000);
    await otpPage.fillOTP(user.otp);
    await otpPage.waitUntilHidden();
  }

  const landingPage = new LandingPage(page);
  await page.waitForTimeout(1000);
  await landingPage.waitUntilVisible();
  await landingPage.goToChatButton().waitFor({ state: 'visible' });

  await page.waitForURL((url) => !url.pathname.includes('/sign-in'), {
    timeout: 10000,
  });
}

export async function saveStorageState(
  page: Page,
  user: TestUser,
): Promise<void> {
  await page.context().storageState({ path: user.storageStatePath });
}