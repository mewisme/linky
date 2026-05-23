// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from 'linky/playwright-test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Error & Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Bio save API failure shows error toast', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 1280, height: 720 });

    const bioSection = page.locator('section[aria-label="Bio"]');
    await bioSection.hover();
    await bioSection.getByRole('button', { name: /edit/i }).click();
    const textarea = bioSection.locator('textarea');
    await textarea.fill('This should fail');

    await page.route('**/api/**/user/bio**', (route) => route.abort());

    await bioSection.getByRole('button', { name: /save/i }).click();

    await expect(page.getByText(/update failed|error/i)).toBeVisible({ timeout: 5000 });
    await expect(textarea).toBeVisible();
  });
});
