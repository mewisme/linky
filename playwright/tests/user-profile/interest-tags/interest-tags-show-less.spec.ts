// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from 'linky/playwright-test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Profile — Interest Tags', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Show less collapses tags back', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');

    const showMoreBtn = page.getByRole('button', { name: /show more/i });
    if (await showMoreBtn.isVisible()) {
      await showMoreBtn.click();
      await page.getByRole('button', { name: /show less/i }).click();
      await expect(page.getByRole('button', { name: /show more/i })).toBeVisible();
    }
  });
});
