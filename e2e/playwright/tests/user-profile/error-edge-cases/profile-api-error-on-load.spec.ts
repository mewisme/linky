// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from 'linky/playwright-test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Error & Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Profile page handles API error on load', async ({ page }) => {
    await page.route('**/api/**/user/profile**', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'InternalError' }) }),
    );

    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('section[aria-label="Bio"]')).toBeVisible({ timeout: 10000 });
  });
});
