// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from 'linky/playwright-test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Profile — Name & Country Editing', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Save handles API error gracefully', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 1280, height: 720 });

    const profileHeader = page.locator('section[aria-label="Profile identity"]');
    await profileHeader.hover();
    await page.getByRole('button', { name: /edit/i }).click();

    const firstNameInput = page.getByPlaceholder(/first name/i);
    await firstNameInput.fill('ErrorTest');

    await page.route('**/api/**/user/profile**', (route) => route.abort());

    await page.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText(/update failed|error/i)).toBeVisible({ timeout: 5000 });
  });
});
