// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Profile Page — Page Load & Display', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Profile page loads with all sections visible', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('img', { name: /avatar/i })).toBeVisible();
    await expect(page.locator('text=Bio')).toBeVisible();
    await expect(page.locator('text=Personal Info')).toBeVisible();
    await expect(page.locator('text=Interests')).toBeVisible();
  });
});
