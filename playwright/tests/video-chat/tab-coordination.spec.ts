// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from 'linky/playwright-test';
import { setupTwoUserCall, teardownTwoUserCall, establishCall } from '../../fixtures/call.fixtures';
import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Tab Coordination', () => {
  test('Second tab shows passive state when call is active in first tab', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user1Page, user1Context } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    const secondPage = await user1Context.newPage();
    await secondPage.goto('/call');
    await secondPage.waitForTimeout(2000);

    const passiveContainer = secondPage.locator('[data-testid="chat-video-container-passive"]');
    const isPassive = await passiveContainer.isVisible().catch(() => false);
    expect(isPassive).toBe(true);

    await secondPage.close();
    await teardownTwoUserCall(setup);
  });

  test('Ownership transfers when active tab is closed', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user1Page, user1Context } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    const secondPage = await user1Context.newPage();
    await secondPage.goto('/call');
    await secondPage.waitForTimeout(2000);

    await user1Page.close();

    const idleContainer = secondPage.locator('[data-testid="chat-idle-container"]');
    const isVisible = await idleContainer.isVisible({ timeout: 5000 }).catch(() => false);
    expect(isVisible).toBe(true);

    await secondPage.close();
    await teardownTwoUserCall(setup);
  });
});
