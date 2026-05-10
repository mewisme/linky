// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Profile — Personal Info', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Select a date of birth and save', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 1280, height: 720 });

    const personalInfo = page.locator('section[aria-label="Personal Info"]');
    await personalInfo.hover();
    await personalInfo.getByRole('button', { name: /edit/i }).click();

    const dateInput = personalInfo.locator('input[type="date"]');
    await dateInput.fill('2000-01-15');

    await personalInfo.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText(/personal info updated/i)).toBeVisible({ timeout: 10000 });
  });
});
