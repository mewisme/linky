// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Profile Page — Page Load & Display', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Correct user data is displayed', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');

    const user = TEST_USERS.user1;
    const expectedName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    if (expectedName) {
      await expect(page.getByText(expectedName)).toBeVisible();
    }
    if (user.email) {
      await expect(page.getByText(user.email)).toBeVisible();
    }
  });
});
