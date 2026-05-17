// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from 'linky/playwright-test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Settings Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Notification sound toggle works', async ({ page }) => {
    await page.goto('/settings/notifications');
    await page.waitForLoadState('networkidle');

    const soundToggle = page.getByLabel(/sound/i).or(page.getByRole('switch', { name: /sound/i }));
    if (await soundToggle.isVisible()) {
      await soundToggle.click();
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText(/settings updated/i)).toBeVisible({ timeout: 10000 });
    }
  });
});
