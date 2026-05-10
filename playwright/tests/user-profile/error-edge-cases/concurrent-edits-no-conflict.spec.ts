// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Error & Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Concurrent edits do not conflict', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 1280, height: 720 });

    const bioSection = page.locator('section[aria-label="Bio"]');
    await bioSection.hover();
    await bioSection.getByRole('button', { name: /edit/i }).click();
    const textarea = bioSection.locator('textarea');
    await textarea.fill('Concurrent bio update');
    await bioSection.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/bio updated/i)).toBeVisible({ timeout: 10000 });

    const personalInfo = page.locator('section[aria-label="Personal Info"]');
    await personalInfo.hover();
    await personalInfo.getByRole('button', { name: /edit/i }).click();
    await personalInfo.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/personal info updated/i)).toBeVisible({ timeout: 10000 });

    const interestsSection = page.locator('section[aria-label="Interests"]');
    await interestsSection.hover();
    await interestsSection.getByRole('button', { name: /edit/i }).click();
    await interestsSection.getByRole('button', { name: /save/i }).click();
    await expect(page.getByText(/interest tags updated/i)).toBeVisible({ timeout: 10000 });
  });
});
