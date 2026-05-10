// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Profile — Interest Tags', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Cancel reverts tag selection', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 1280, height: 720 });

    const interestsSection = page.locator('section[aria-label="Interests"]');
    await interestsSection.hover();
    await interestsSection.getByRole('button', { name: /edit/i }).click();

    await interestsSection.getByRole('button', { name: /cancel/i }).click();

    await expect(interestsSection.getByRole('button', { name: /save/i })).not.toBeVisible();
  });
});
