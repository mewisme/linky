// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Profile — Name & Country Editing', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Cancel edit reverts to original values', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 1280, height: 720 });

    const user = TEST_USERS.user1;
    const originalName = [user.firstName, user.lastName].filter(Boolean).join(' ');

    const profileHeader = page.locator('section[aria-label="Profile identity"]');
    await profileHeader.hover();
    await page.getByRole('button', { name: /edit/i }).click();

    const firstNameInput = page.getByPlaceholder(/first name/i);
    await firstNameInput.clear();
    await firstNameInput.fill('ChangedName');

    await page.getByRole('button', { name: /cancel/i }).click();

    if (originalName) {
      await expect(page.getByText(originalName)).toBeVisible();
    }
  });
});
