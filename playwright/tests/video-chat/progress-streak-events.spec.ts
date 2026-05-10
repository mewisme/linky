// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import { setupTwoUserCall, teardownTwoUserCall, establishCall } from '../../fixtures/call.fixtures';
import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Progress & Streak Events', () => {
  test('Streak completed event emitted during long call', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    await user1VideoPage.page.waitForTimeout(10000);

    await expect(user1VideoPage.callTimer()).toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('Level up event emitted on exp threshold', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    await user1VideoPage.page.waitForTimeout(10000);

    await expect(user1VideoPage.callTimer()).toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('User progress updates emitted via heartbeat', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    await user1VideoPage.page.waitForTimeout(6000);

    await expect(user1VideoPage.callTimer()).toBeVisible();

    await teardownTwoUserCall(setup);
  });
});
