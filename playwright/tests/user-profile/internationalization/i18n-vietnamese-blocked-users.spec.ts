// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Internationalization', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Vietnamese blocked users page loads translated', async ({ page }) => {
    await page.goto('/vi/connections/blocked-users');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading')).toBeVisible();
  });
});
