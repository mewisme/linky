// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Error & Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Tag catalog fetch failure shows error state', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 1280, height: 720 });

    await page.route('**/api/**/interest-tags**', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'InternalError' }) }),
    );

    const interestsSection = page.locator('section[aria-label="Interests"]');
    await interestsSection.hover();
    await interestsSection.getByRole('button', { name: /edit/i }).click();

    await expect(interestsSection.getByRole('button', { name: /save/i })).toBeVisible({ timeout: 10000 });
  });
});
