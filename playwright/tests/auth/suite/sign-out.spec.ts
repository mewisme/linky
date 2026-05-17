// spec: playwright/tests/auth/AUTH_TEST_PLAN.md — Suite 7: Sign-Out

import { Browser, BrowserContext, Page, expect, test } from 'linky/playwright-test';

import { TEST_USERS } from '../../../fixtures/users.fixtures';
import { waitForClerkReady } from '../../../helpers/clerk-helpers';

// All SO-* tests start with user1 pre-authenticated storage state.

async function createAuthContext(browser: Browser): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    storageState: TEST_USERS.user1.storageStatePath,
  });
  const page = await context.newPage();
  return { context, page };
}

async function clickSignOut(page: Page): Promise<void> {
  // Open user button / sidebar avatar trigger and click sign-out menu item.
  // The trigger is a ShaderAvatar / user button in the sidebar.
  const avatarTrigger = page
    .locator('[data-testid="user-button"], [data-testid="avatar-trigger"], [aria-label*="user menu"], [aria-label*="account"]')
    .or(page.locator('button[class*="avatar"], button[class*="user"]'))
    .first();

  await avatarTrigger.click();

  const logoutItem = page
    .getByRole('menuitem', { name: /logout|sign out/i })
    .or(page.getByRole('button', { name: /logout|sign out/i }))
    .or(page.getByText(/logout|sign out/i).first());

  await expect(logoutItem.first()).toBeVisible({ timeout: 5_000 });
  await logoutItem.first().click();
}

test.describe('Sign-Out', () => {
  test.describe.configure({ timeout: 60_000 });

  test('SO-01 · P0 — Sign out via user button dropdown → redirect to /sign-in', async ({
    browser,
  }) => {
    const { context, page } = await createAuthContext(browser);

    // 1. Navigate to an authenticated page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 2. Open user menu and click Sign Out
    await clickSignOut(page);

    // 3. Assert redirect to /sign-in
    await page.waitForURL(/\/sign-in/, { timeout: 15_000 });

    // 4. Assert sign-in form visible (user is signed out)
    await waitForClerkReady(page);
    const emailInput = page.locator('input[name="identifier"]');
    await expect(emailInput).toBeVisible({ timeout: 10_000 });

    await context.close();
  });

  test('SO-02 · P0 — Keyboard shortcut Ctrl+Shift+Q triggers sign-out', async ({ browser }) => {
    const { context, page } = await createAuthContext(browser);

    // 1. Navigate to an authenticated page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 2. Press Ctrl+Shift+Q (keyboard shortcut registered by the app)
    await page.keyboard.press('Control+Shift+Q');

    // 3. Assert redirect to /sign-in
    await page.waitForURL(/\/sign-in/, { timeout: 15_000 });

    await context.close();
  });

  test('SO-03 · P1 — Sign-out in Vietnamese locale redirects to /vi/sign-in', async ({
    browser,
  }) => {
    // Assumption #6: locale preference is stored in localStorage (Zustand locale-preference-store).
    // We manually set the localStorage value to simulate a Vietnamese-locale session.
    const { context, page } = await createAuthContext(browser);

    // 1. Navigate to home first to allow localStorage write
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 2. Set locale preference to Vietnamese via localStorage
    // Key pattern derived from locale-preference-store Zustand persisted store.
    await page.evaluate(() => {
      localStorage.setItem(
        'locale-preference-store',
        JSON.stringify({ state: { locale: 'vi' }, version: 0 }),
      );
    });

    // 3. Navigate to the Vietnamese-prefixed page
    await page.goto('/vi/');
    await page.waitForLoadState('networkidle');

    // 4. Sign out via user menu
    await clickSignOut(page);

    // 5. Assert redirect URL is /vi/sign-in
    await page.waitForURL(/\/vi\/sign-in/, { timeout: 15_000 });

    await context.close();
  });
});
