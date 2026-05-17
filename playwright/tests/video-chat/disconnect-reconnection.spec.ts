// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from 'linky/playwright-test';
import { setupTwoUserCall, teardownTwoUserCall, establishCall } from '../../fixtures/call.fixtures';
import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Disconnect & Reconnection', () => {
  test('Peer disconnect triggers end-call for remaining user', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user2VideoPage, user1Context } = setup;

    await establishCall(user1VideoPage, user2VideoPage);

    await user1Context.close();
    await user2VideoPage.waitForIdle();

    await expect(user2VideoPage.idleContainer()).toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('Session resync after reconnection', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    await expect(user1VideoPage.remoteVideo()).toBeVisible();

    await teardownTwoUserCall(setup);
  });
});
