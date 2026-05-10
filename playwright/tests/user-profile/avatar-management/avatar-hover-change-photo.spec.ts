// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Profile — Avatar Management', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Hover shows "Change photo" overlay', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');

    const avatarContainer = page.locator('[data-testid="profile-avatar"]').or(page.locator('.profile-avatar'));
    await avatarContainer.first().hover();

    await expect(page.getByText(/change photo/i)).toBeVisible({ timeout: 5000 });
  });
});
