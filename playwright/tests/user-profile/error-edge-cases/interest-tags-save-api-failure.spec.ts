// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Error & Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Interest tags save API failure shows error toast', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 1280, height: 720 });

    const interestsSection = page.locator('section[aria-label="Interests"]');
    await interestsSection.hover();
    await interestsSection.getByRole('button', { name: /edit/i }).click();

    await page.route('**/api/**/user/interest-tags**', (route) => route.abort());

    await interestsSection.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText(/update failed|error/i)).toBeVisible({ timeout: 5000 });
    await expect(interestsSection.getByRole('button', { name: /save/i })).toBeVisible();
  });
});
