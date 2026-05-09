// spec: playwright/tests/auth/AUTH_TEST_PLAN.md — Suite 8: Redirect / Middleware Guards

import { expect, test } from '@playwright/test';

import { TEST_USERS } from '../../../fixtures/users.fixtures';
import { waitForClerkReady } from '../../../helpers/clerk-helpers';

test.describe('Redirect / Middleware Guards', () => {
  test.describe.configure({ timeout: 30_000 });

  test('RD-01 · P0 — Unauthenticated user accessing protected page → redirect to sign-in', async ({
    browser,
  }) => {
    // 1. Open a fresh (unauthenticated) browser context
    const context = await browser.newContext();
    const page = await context.newPage();

    // 2. Navigate to a protected page
    await page.goto('/user/profile');

    // 3. Assert redirect to /sign-in (Clerk auth.protect() fires in middleware)
    await page.waitForURL(/\/sign-in/, { timeout: 15_000 });

    await context.close();
  });

  test('RD-02 · P0 — Unauthenticated user accessing /sign-in is not redirected away', async ({
    browser,
  }) => {
    // 1. Fresh unauthenticated context
    const context = await browser.newContext();
    const page = await context.newPage();

    // 2. Navigate to /sign-in
    await page.goto('/sign-in');
    await waitForClerkReady(page);

    // 3. Assert sign-in form visible and no unexpected redirect
    const emailInput = page.locator('input[name="identifier"]');
    await expect(emailInput).toBeVisible({ timeout: 10_000 });
    expect(page.url()).toContain('/sign-in');

    await context.close();
  });

  test('RD-03 · P1 — /api/* routes respect Clerk auth (200 when authenticated, 401 when not)', async ({
    browser,
  }) => {
    // 1. Authenticated context → /api/users/me should return 200
    const authContext = await browser.newContext({
      storageState: TEST_USERS.user1.storageStatePath,
    });
    const authPage = await authContext.newPage();
    await authPage.goto('/');

    const authResponse = await authPage.evaluate(async () => {
      const res = await fetch('/api/users/me', { credentials: 'include' });
      return res.status;
    });
    expect(authResponse).toBe(200);
    await authContext.close();

    // 2. Unauthenticated context → /api/users/me should return 401
    const anonContext = await browser.newContext();
    const anonPage = await anonContext.newPage();
    await anonPage.goto('/sign-in');

    const anonResponse = await anonPage.evaluate(async () => {
      const res = await fetch('/api/users/me', { credentials: 'include' });
      return res.status;
    });
    expect(anonResponse).toBe(401);
    await anonContext.close();
  });

  test('RD-04 · P2 — 404 on unknown auth-group path', async ({ browser }) => {
    // Navigate to a non-existent sub-path under /sign-in
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/sign-in/nonexistent-step');

    // Assert Clerk renders an error state OR Next.js not-found is shown
    const notFoundIndicator = page
      .getByText(/404|not found|page.*not found|this page.*doesn't exist/i)
      .or(page.locator('[data-testid="not-found"], [class*="not-found"]'));

    // Also accept Clerk error state (expired / invalid link)
    const clerkError = page.getByTestId('form-feedback-error').or(
      page.getByText(/something went wrong|invalid.*link|link has expired/i),
    );

    await expect(notFoundIndicator.or(clerkError).first()).toBeVisible({ timeout: 15_000 });

    await context.close();
  });
});
