// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from 'linky/playwright-test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';
import * as path from 'path';

test.describe('Profile — Avatar Management', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Avatar upload handles network failure gracefully', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');

    await page.route('**/api/**/media/upload-avatar**', (route) => route.abort());

    const testImagePath = path.resolve(__dirname, '../../../test-data/test-avatar.png');
    const fileInput = page.locator('input[type="file"]#avatar-upload');
    await fileInput.setInputFiles(testImagePath);

    await expect(page.getByText(/upload failed|error/i)).toBeVisible({ timeout: 5000 });
  });
});
