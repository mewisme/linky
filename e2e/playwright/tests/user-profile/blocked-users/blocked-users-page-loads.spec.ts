// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from 'linky/playwright-test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Blocked Users Page', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Blocked users page loads', async ({ page }) => {
    await page.goto('/connections/blocked-users');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /blocked users/i })).toBeVisible();
  });
});
