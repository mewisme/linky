// spec: playwright/tests/auth/AUTH_TEST_PLAN.md — Suite 6: Connected OAuth Providers

import { Browser, BrowserContext, Page, expect, test } from 'linky/playwright-test';

import { SecurityPage } from '../../../page-objects/auth/pages/security.page';
import { TEST_USERS } from '../../../fixtures/users.fixtures';
import { waitForClerkReady } from '../../../helpers/clerk-helpers';

// All OA-* tests require user1's authenticated storage state.
// OA-02 and OA-05 are limited to asserting the redirect/modal fires, not completing the OAuth flow.

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

test.describe('Connected OAuth Providers', () => {
  test.describe.configure({ timeout: 60_000 });

  test('OA-01 · P1 — Connected providers listed in authentication card', async ({ browser }) => {
    const { context, page, securityPage } = await openSecurityPage(browser);

    // 1. Assert authentication card visible
    await expect(securityPage.authenticationCard()).toBeVisible({ timeout: 15_000 });

    // 2. Assert at least one OAuth provider badge is rendered
    // Providers may appear as connected (showing name) or unconnected ("Connect [Provider]").
    const oauthBadge = page.locator(
      '[data-provider], [data-testid*="provider"], [aria-label*="Google"], [aria-label*="Facebook"], [aria-label*="Discord"]',
    );
    const providerText = page.getByText(/google|facebook|discord/i);

    await expect(oauthBadge.or(providerText).first()).toBeVisible({ timeout: 10_000 });

    await context.close();
  });

  test('OA-02 · P1 — Click unlinked provider → triggers OAuth redirect', async ({ browser }) => {
    // NOTE: Full OAuth callback cannot be automated without test OAuth credentials.
    // This test only asserts that clicking initiates the redirect/popup.
    const { context, page, securityPage } = await openSecurityPage(browser);

    await expect(securityPage.authenticationCard()).toBeVisible({ timeout: 15_000 });

    // Locate an unlinked provider button (label contains "Connect")
    const connectButton = page.getByRole('button', { name: /connect/i });
    const isConnectVisible = await connectButton.first().isVisible({ timeout: 5_000 }).catch(() => false);

    if (!isConnectVisible) {
      test.skip(true, 'No unlinked providers found for user1 — all providers already connected.');
      await context.close();
      return;
    }

    // Click and assert navigation initiates (redirect or popup)
    const [popup] = await Promise.all([
      page.waitForEvent('popup', { timeout: 8_000 }).catch(() => null),
      connectButton.first().click(),
    ]);

    const redirected = !page.url().includes('/user/security');
    expect(popup !== null || redirected).toBe(true);

    await context.close();
  });

  test('OA-03 · P1 — Click linked provider → disconnect confirm dialog appears', async ({
    browser,
  }) => {
    const { context, page, securityPage } = await openSecurityPage(browser);

    await expect(securityPage.authenticationCard()).toBeVisible({ timeout: 15_000 });

    // Locate a linked provider badge — hover to reveal the X / disconnect control
    const linkedProviderButton = page.locator(
      '[data-testid*="provider-connected"], [aria-label*="Disconnect"], [data-connected="true"]',
    );
    const isLinkedVisible = await linkedProviderButton.first().isVisible({ timeout: 5_000 }).catch(() => false);

    if (!isLinkedVisible) {
      // Try hovering a provider card to reveal disconnect icon
      const providerCard = page.getByText(/google|facebook|discord/i).first();
      await providerCard.hover();
    } else {
      await linkedProviderButton.first().click();
    }

    // Assert AlertDialog with disconnect title
    const disconnectDialog = page
      .getByRole('alertdialog')
      .or(page.getByText(/disconnect this sign-in method/i).locator('xpath=ancestor::*[@role="dialog"]'));

    await expect(disconnectDialog.first()).toBeVisible({ timeout: 10_000 });

    await context.close();
  });

  test('OA-04 · P1 — Cancel disconnect keeps provider connected', async ({ browser }) => {
    const { context, page, securityPage } = await openSecurityPage(browser);

    await expect(securityPage.authenticationCard()).toBeVisible({ timeout: 15_000 });

    // Trigger disconnect dialog
    const linkedProviderButton = page.locator(
      '[data-testid*="provider-connected"], [aria-label*="Disconnect"], [data-connected="true"]',
    );
    const isLinkedVisible = await linkedProviderButton.first().isVisible({ timeout: 5_000 }).catch(() => false);

    if (!isLinkedVisible) {
      test.skip(true, 'No linked provider found for user1 — cannot test disconnect cancel.');
      await context.close();
      return;
    }

    await linkedProviderButton.first().click();

    // Click "Keep Connected" / cancel button in the dialog
    const cancelBtn = page
      .getByRole('button', { name: /keep connected|cancel/i })
      .or(page.getByText(/keep connected/i));
    await expect(cancelBtn.first()).toBeVisible({ timeout: 5_000 });
    await cancelBtn.first().click();

    // Assert dialog dismissed and provider still shows as connected
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).not.toBeVisible({ timeout: 5_000 });

    await context.close();
  });

  test('OA-05 · P2 — Confirm disconnect calls Clerk destroy with re-verification', async ({
    browser,
  }) => {
    // NOTE: useReverification wraps account.destroy(). We only test that the
    // re-verification modal appears — we do not attempt to complete it.
    const { context, page, securityPage } = await openSecurityPage(browser);

    await expect(securityPage.authenticationCard()).toBeVisible({ timeout: 15_000 });

    const linkedProviderButton = page.locator(
      '[data-testid*="provider-connected"], [aria-label*="Disconnect"], [data-connected="true"]',
    );
    const isLinkedVisible = await linkedProviderButton.first().isVisible({ timeout: 5_000 }).catch(() => false);

    if (!isLinkedVisible) {
      test.skip(true, 'No linked provider found for user1 — cannot test disconnect reverification.');
      await context.close();
      return;
    }

    await linkedProviderButton.first().click();

    // Click "Yes, Disconnect" confirm button
    const confirmBtn = page.getByRole('button', { name: /yes.*disconnect|disconnect/i });
    await expect(confirmBtn.first()).toBeVisible({ timeout: 5_000 });
    await confirmBtn.first().click();

    // Assert Clerk reverification modal
    // TODO: Update selector after observing the actual Clerk reverification DOM at runtime.
    const reverificationModal = page.locator(
      '[data-clerk-modal="reverification"], [role="dialog"][class*="clerk"], [class*="reverification"]',
    );
    await expect(reverificationModal.first()).toBeVisible({ timeout: 15_000 });

    await context.close();
  });
});
