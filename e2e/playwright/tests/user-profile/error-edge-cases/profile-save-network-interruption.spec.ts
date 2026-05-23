// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from 'linky/playwright-test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Error & Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Profile name save with network interruption', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 1280, height: 720 });

    const profileHeader = page.locator('section[aria-label="Profile identity"]');
    await profileHeader.hover();
    await profileHeader.getByRole('button', { name: /edit/i }).click();

    const firstNameInput = page.getByPlaceholder(/first name/i);
    await firstNameInput.clear();
    await firstNameInput.fill('NetworkErrorTest');

    await page.route('**/api/**/user/profile**', (route) => route.abort());

    await profileHeader.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText(/update failed|error/i)).toBeVisible({ timeout: 5000 });
  });
});
