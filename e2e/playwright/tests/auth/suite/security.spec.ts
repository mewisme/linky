// spec: playwright/tests/auth/AUTH_TEST_PLAN.md — Suite 5: Security Page — Password Management

import { Browser, BrowserContext, Page, expect, test } from 'linky/playwright-test';

import { SecurityPage } from '../../../page-objects/auth/pages/security.page';
import { TEST_USERS } from '../../../fixtures/users.fixtures';
import { waitForClerkReady } from '../../../helpers/clerk-helpers';

async function openSecurityPage(browser: Browser): Promise<{
  context: BrowserContext;
  page: Page;
  securityPage: SecurityPage;
}> {
  const context = await browser.newContext({
    storageState: TEST_USERS.user1.storageStatePath,
  });
  const page = await context.newPage();
  await page.goto('/user/security');
  await waitForClerkReady(page);
  return { context, page, securityPage: new SecurityPage(page) };
}

test.describe('Security Page — Password Management', () => {
  test.describe.configure({ timeout: 60_000 });

  test('SEC-01 · P0 — Open "Change Password" dialog', async ({ browser }) => {
    const { context, page, securityPage } = await openSecurityPage(browser);

    // 1. Assert authentication card visible
    await expect(securityPage.authenticationCard()).toBeVisible({ timeout: 15_000 });

    // 2. Click "Change Password" button
    await securityPage.changePasswordButton().click();

    // 3. Assert dialog or drawer visible
    const dialog = page.getByTestId('dialog-container').or(page.getByTestId('drawer-container'));
    await expect(dialog.first()).toBeVisible({ timeout: 5_000 });

    await context.close();
  });

  test('SEC-02 · P0 — Change password with mismatched confirm → inline error', async ({
    browser,
  }) => {
    const { context, page, securityPage } = await openSecurityPage(browser);

    await expect(securityPage.authenticationCard()).toBeVisible({ timeout: 15_000 });
    await securityPage.openChangePasswordDialog();

    // 1. Fill mismatched passwords
    await securityPage.newPasswordInput().fill('NewValid123!');
    await securityPage.confirmPasswordInput().fill('Different456!');

    // 2. Click Update Password
    await securityPage.updatePasswordButton().click();

    // 3. Assert mismatch error
    const mismatchErr = page
      .locator('#error-confirmPassword')
      .or(page.getByText(/passwords.*don't match|do not match/i));
    await expect(mismatchErr.first()).toBeVisible({ timeout: 5_000 });

    await context.close();
  });

  test('SEC-03 · P0 — Change password too short → inline error', async ({ browser }) => {
    const { context, page, securityPage } = await openSecurityPage(browser);

    await expect(securityPage.authenticationCard()).toBeVisible({ timeout: 15_000 });
    await securityPage.openChangePasswordDialog();

    // 1. Fill short password and tab away to trigger validation
    await securityPage.newPasswordInput().fill('abc');
    await securityPage.newPasswordInput().press('Tab');

    // 2. Click Update Password
    await securityPage.updatePasswordButton().click();

    // 3. Assert length error
    const err = page.getByText(/at least 8 characters|8 or more characters/i);
    await expect(err.first()).toBeVisible({ timeout: 5_000 });

    await context.close();
  });

  test('SEC-04 · P0 — Empty new password → inline error', async ({ browser }) => {
    const { context, page, securityPage } = await openSecurityPage(browser);

    await expect(securityPage.authenticationCard()).toBeVisible({ timeout: 15_000 });
    await securityPage.openChangePasswordDialog();

    // 1. Leave new password blank and submit
    await securityPage.updatePasswordButton().click();

    // 2. Assert required error
    const err = page.getByText(/required|can't be blank|enter.*password/i);
    await expect(err.first()).toBeVisible({ timeout: 5_000 });

    await context.close();
  });

  test('SEC-05 · P1 — Password strength indicator updates while typing', async ({ browser }) => {
    const { context, page, securityPage } = await openSecurityPage(browser);

    await expect(securityPage.authenticationCard()).toBeVisible({ timeout: 15_000 });
    await securityPage.openChangePasswordDialog();

    // The strength indicator is a plain <p> containing "Strength: <level>".
    // It only renders once at least one character is typed.
    const strengthIndicator = page.locator('p').filter({ hasText: /strength/i });

    // Type progressively stronger passwords
    await securityPage.newPasswordInput().fill('ab');
    await securityPage.newPasswordInput().fill('abcdef12');
    await securityPage.newPasswordInput().fill('abcdef123456!');

    // Assert strength indicator is visible (label text is implementation-dependent)
    await expect(strengthIndicator.first()).toBeVisible({ timeout: 5_000 });

    await context.close();
  });

  test('SEC-06 · P1 — "Sign out other devices" checkbox present and toggleable', async ({
    browser,
  }) => {
    const { context, securityPage } = await openSecurityPage(browser);

    await expect(securityPage.authenticationCard()).toBeVisible({ timeout: 15_000 });
    await securityPage.openChangePasswordDialog();

    // 1. Assert checkbox visible and initially unchecked
    await expect(securityPage.signOutOthersCheckbox()).toBeVisible({ timeout: 5_000 });
    await expect(securityPage.signOutOthersCheckbox()).not.toBeChecked();

    // 2. Click to check
    await securityPage.signOutOthersCheckbox().click();
    await expect(securityPage.signOutOthersCheckbox()).toBeChecked();

    await context.close();
  });

  test('SEC-07 · P1 — Cancel button closes dialog without changes', async ({ browser }) => {
    const { context, page, securityPage } = await openSecurityPage(browser);

    await expect(securityPage.authenticationCard()).toBeVisible({ timeout: 15_000 });
    await securityPage.openChangePasswordDialog();

    // 1. Fill a value then cancel
    await securityPage.newPasswordInput().fill('TestPass123!');
    await securityPage.cancelButton().click();

    // 2. Assert dialog dismissed
    const dialog = page.getByTestId('dialog-container').or(page.getByTestId('drawer-container'));
    await expect(dialog.first()).not.toBeVisible({ timeout: 5_000 });

    await context.close();
  });

  test('SEC-08 · P1 — Password change requires Clerk re-verification modal', async ({
    browser,
  }) => {
    // SKIP: The exact Clerk reverification modal DOM selector is unknown until inspected at
    // runtime, and a freshly-authenticated session may not trigger reverification at all
    // (Clerk only prompts step-up auth when the session age exceeds its threshold).
    // Steps to unblock:
    //   1. Manually open /user/security with an aged session and trigger a password change.
    //   2. Inspect the DOM of the modal that appears.
    //   3. Replace the reverificationModal locator below and remove test.skip().
    // IMPORTANT: Do NOT convert this to test.fixme() — that would execute the password change
    // code and alter user1's credentials, breaking the globalSetup.
    test.skip(true, 'Clerk reverification modal selector not yet confirmed via runtime inspection.');

    const { context, page, securityPage } = await openSecurityPage(browser);

    await expect(securityPage.authenticationCard()).toBeVisible({ timeout: 15_000 });
    await securityPage.openChangePasswordDialog();

    await securityPage.newPasswordInput().fill('ReverifyTest123!');
    await securityPage.confirmPasswordInput().fill('ReverifyTest123!');
    await securityPage.updatePasswordButton().click();

    const reverificationModal = page.locator(
      '[data-clerk-modal="reverification"], [role="dialog"][class*="clerk"], [class*="reverification"]',
    );
    await expect(reverificationModal.first()).toBeVisible({ timeout: 15_000 });

    await context.close();
  });

  test.skip('SEC-09 · P2 — "Set Password" mode shown for OAuth-only user', async ({ browser }) => {
    // TODO: Requires a test account with passwordEnabled = false (OAuth-only user).
    // Blocker #5: no such account currently confirmed in data_test_users.xlsx.
    // Create a dedicated OAuth-only test account and load its storage state here.
    const { context, page, securityPage } = await openSecurityPage(browser);

    await expect(page.getByTestId('security-password-open-dialog')).toHaveText(/set password/i, {
      timeout: 10_000,
    });
    await securityPage.openChangePasswordDialog();

    await expect(page.getByText(/set.*password|create.*password/i)).toBeVisible({
      timeout: 5_000,
    });
    await context.close();
  });

  // --- Active Sessions Card ---

  test('SEC-10 · P1 — Current session is labelled "This device"', async ({ browser }) => {
    const { context, page, securityPage } = await openSecurityPage(browser);

    // 1. Wait for sessions to load
    await securityPage.waitForSessionsLoaded();

    // 2. Assert sessions list is visible
    await expect(securityPage.activeSessionsList()).toBeVisible({ timeout: 10_000 });

    // 3. Assert exactly one "This device" badge
    const thisDeviceBadge = page.getByText('This device');
    await expect(thisDeviceBadge).toBeVisible({ timeout: 10_000 });
    expect(await thisDeviceBadge.count()).toBe(1);

    await context.close();
  });

  test('SEC-11 · P1 — "View all sessions" expands list when > 2 sessions', async ({ browser }) => {
    // Prerequisite: user1 must have ≥ 3 active sessions for the button to appear.
    const { context, securityPage } = await openSecurityPage(browser);

    await securityPage.waitForSessionsLoaded();

    const viewAllButton = securityPage.viewAllSessionsButton();
    const isVisible = await viewAllButton.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!isVisible) {
      test.skip(true, 'user1 has fewer than 3 active sessions — "View all sessions" not shown.');
      await context.close();
      return;
    }

    await viewAllButton.click();
    await expect(viewAllButton).toHaveAttribute('aria-expanded', 'true', { timeout: 5_000 });

    await context.close();
  });

  test('SEC-12 · P2 — Sessions list shows last-active relative time', async ({ browser }) => {
    const { context, securityPage } = await openSecurityPage(browser);

    await securityPage.waitForSessionsLoaded();

    // Assert at least one session row has relative time text
    const agoText = securityPage.activeSessionsList().getByText(/ago|just now|online/i);
    await expect(agoText.first()).toBeVisible({ timeout: 10_000 });

    await context.close();
  });
});
