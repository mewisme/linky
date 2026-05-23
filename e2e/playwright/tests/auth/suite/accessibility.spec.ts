// spec: playwright/tests/auth/AUTH_TEST_PLAN.md — Suite 10: Accessibility Smoke Checks

import { Page, expect, test } from 'linky/playwright-test';

import { SecurityPage } from '../../../page-objects/auth/pages/security.page';
import { TEST_USERS } from '../../../fixtures/users.fixtures';
import { waitForClerkReady } from '../../../helpers/clerk-helpers';

// A11Y tests use axe-core for ARIA violation checks.
// Install: pnpm add -D @axe-core/playwright
// If @axe-core/playwright is not installed, the axe-based tests will be skipped.

async function runAxe(page: Page): Promise<{ violations: { id: string; impact: string; description: string }[] }> {
  return page.evaluate(async () => {
    // @ts-ignore — axe is injected via addScriptTag
    return axe.run(document, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] },
    });
  });
}

async function injectAxe(page: Page): Promise<void> {
  await page.addScriptTag({
    url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.9.1/axe.min.js',
  });
}

test.describe('Accessibility Smoke Checks', () => {
  test.describe.configure({ timeout: 60_000 });

  test('A11Y-01 · P2 — Sign-in page has no critical ARIA violations', async ({ page }) => {
    // 1. Navigate to /sign-in and wait for Clerk
    await page.goto('/sign-in');
    await waitForClerkReady(page);

    // 2. Inject axe-core
    await injectAxe(page);

    // 3. Run axe and assert no critical violations
    const results = await runAxe(page);
    const criticalViolations = results.violations.filter((v) => v.impact === 'critical');

    if (criticalViolations.length > 0) {
      const summary = criticalViolations.map((v) => `${v.id}: ${v.description}`).join('\n');
      throw new Error(`Critical ARIA violations on /sign-in:\n${summary}`);
    }
  });

  test('A11Y-02 · P2 — Sign-up page has no critical ARIA violations', async ({ page }) => {
    // 1. Navigate to /sign-up and wait for Clerk
    await page.goto('/sign-up');
    await waitForClerkReady(page);

    // 2. Inject axe-core
    await injectAxe(page);

    // 3. Run axe and assert no critical violations
    const results = await runAxe(page);
    const criticalViolations = results.violations.filter((v) => v.impact === 'critical');

    if (criticalViolations.length > 0) {
      const summary = criticalViolations.map((v) => `${v.id}: ${v.description}`).join('\n');
      throw new Error(`Critical ARIA violations on /sign-up:\n${summary}`);
    }
  });
});
