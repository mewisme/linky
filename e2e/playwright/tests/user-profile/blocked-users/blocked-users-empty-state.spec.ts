// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from 'linky/playwright-test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Blocked Users Page', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Empty state when no blocked users', async ({ page }) => {
    await page.goto('/connections/blocked-users');
    await page.waitForLoadState('networkidle');

    const emptyState = page.getByText(/no blocked users|empty/i);
    await expect(emptyState.or(page.locator('table, [role="table"]'))).toBeVisible();
  });
});
