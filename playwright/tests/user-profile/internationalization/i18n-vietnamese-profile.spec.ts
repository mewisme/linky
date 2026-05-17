// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from 'linky/playwright-test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Internationalization', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Vietnamese locale loads translated profile page', async ({ page }) => {
    await page.goto('/vi/user/profile');
    await page.waitForLoadState('networkidle');

    const bioSection = page.locator('section[aria-label="Bio"]');
    await expect(bioSection).toBeVisible();
    await expect(page.locator('section[aria-label="Personal Info"]')).toBeVisible();
    await expect(page.locator('section[aria-label="Interests"]')).toBeVisible();
  });
});
