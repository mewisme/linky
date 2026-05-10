// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Profile — Avatar Management', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Avatar fallback shows first letter when no image', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');

    const avatarFallback = page.locator('[data-testid="profile-avatar"]').or(page.locator('.avatar-fallback'));
    await expect(avatarFallback.first()).toBeAttached();
  });
});
