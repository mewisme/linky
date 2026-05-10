// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Profile — Bio Section', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Bio character counter updates while typing', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 1280, height: 720 });

    const bioSection = page.locator('section[aria-label="Bio"]');
    await bioSection.hover();
    await bioSection.getByRole('button', { name: /edit/i }).click();

    const textarea = bioSection.locator('textarea');
    await textarea.fill('Hello');
    await expect(bioSection.getByText(/5\/300/)).toBeVisible();
  });
});
