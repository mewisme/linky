// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Profile Page — Page Load & Display', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Sidebar highlights the profile item', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');

    const profileLink = page.locator('nav').getByRole('link', { name: /profile/i });
    await expect(profileLink).toBeVisible();
  });
});
