// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from 'linky/playwright-test';

test.describe('Error & Edge Cases', () => {
  test('Profile page handles unauthenticated access', async ({ page }) => {
    await page.goto('/user/profile');

    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });
});
