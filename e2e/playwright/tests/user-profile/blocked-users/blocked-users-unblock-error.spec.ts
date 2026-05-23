// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from 'linky/playwright-test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Blocked Users Page', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Unblock handles API error gracefully', async ({ page }) => {
    await page.goto('/connections/blocked-users');
    await page.waitForLoadState('networkidle');

    const unblockButton = page.getByRole('button', { name: /unblock/i }).first();
    if (await unblockButton.isVisible()) {
      await page.route('**/api/**/block**', (route) => route.abort());
      await unblockButton.click();
      await expect(page.getByText(/unblock failed|error/i)).toBeVisible({ timeout: 5000 });
    }
  });
});
