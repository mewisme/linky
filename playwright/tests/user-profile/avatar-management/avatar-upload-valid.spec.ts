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

  test('Upload a valid image file', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');

    const testImagePath = path.resolve(__dirname, '../../../test-data/test-avatar.png');
    const fileInput = page.locator('input[type="file"]#avatar-upload');
    await fileInput.setInputFiles(testImagePath);

    await expect(page.getByText(/avatar updated/i)).toBeVisible({ timeout: 10000 });
  });
});
