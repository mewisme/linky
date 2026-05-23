// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from 'linky/playwright-test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Profile — Bio Section', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Click bio area enters edit mode', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 1280, height: 720 });

    const bioSection = page.locator('section[aria-label="Bio"]');
    await bioSection.hover();
    await bioSection.getByRole('button', { name: /edit/i }).click();

    await expect(bioSection.locator('textarea')).toBeVisible();
    await expect(bioSection.getByRole('button', { name: /save/i })).toBeVisible();
    await expect(bioSection.getByRole('button', { name: /cancel/i })).toBeVisible();
  });
});
