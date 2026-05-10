// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Profile — Avatar Management', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Upload an invalid file shows error toast', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');

    const invalidFilePath = path.resolve(__dirname, '../../../test-data/invalid-upload.txt');
    if (!fs.existsSync(invalidFilePath)) {
      fs.writeFileSync(invalidFilePath, 'this is not an image', 'utf-8');
    }

    const fileInput = page.locator('input[type="file"]#avatar-upload');
    await fileInput.setInputFiles(invalidFilePath);

    await expect(page.getByText(/invalid image/i)).toBeVisible({ timeout: 5000 });
  });
});
