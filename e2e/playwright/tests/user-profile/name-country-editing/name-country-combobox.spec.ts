// spec: specs/user-profile.plan.md
// seed: playwright/tests/seed.spec.ts
import { test, expect } from 'linky/playwright-test';
import { authenticateUser } from '../../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../../fixtures/users.fixtures';

test.describe('Profile — Name & Country Editing', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
  });

  test('Country combobox search and select', async ({ page }) => {
    await page.goto('/user/profile');
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 1280, height: 720 });

    const profileHeader = page.locator('section[aria-label="Profile identity"]');
    await profileHeader.hover();
    await page.getByRole('button', { name: /edit/i }).click();

    const countryCombobox = page.getByRole('combobox', { name: /country/i });
    await countryCombobox.click();
    await countryCombobox.fill('Japan');
    await page.getByRole('option', { name: /japan/i }).click();

    await expect(countryCombobox).toHaveValue(/japan/i);
  });
});
