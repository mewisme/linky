// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Profile — Avatar Management', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Avatar is displayed', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');

    const avatar = page.locator('#avatar-upload').or(page.locator('[data-testid="profile-avatar"]')).or(page.getByRole('img', { name: /avatar/i }));
    await expect(avatar).toBeAttached();
  });
});
