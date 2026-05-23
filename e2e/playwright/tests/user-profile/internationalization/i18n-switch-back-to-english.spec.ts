// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from 'linky/playwright-test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Internationalization', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Switch locale from Vietnamese back to English', async ({ page }) => {
    await page.goto('/vi/user/profile');
    await page.waitForLoadState('networkidle');

    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('section[aria-label="Bio"]')).toBeVisible();
  });
});
