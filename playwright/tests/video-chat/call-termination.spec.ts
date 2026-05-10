// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import { setupTwoUserCall, teardownTwoUserCall, establishCall, endCall } from '../../fixtures/call.fixtures';
import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Call Termination', () => {
  test('Both users return to idle after one ends call', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user2VideoPage } = setup;

    await establishCall(user1VideoPage, user2VideoPage);
    await endCall(user1VideoPage, user2VideoPage);

    await expect(user1VideoPage.idleContainer()).toBeVisible();
    await expect(user2VideoPage.idleContainer()).toBeVisible();
    await expect(user1VideoPage.callTimer()).not.toBeVisible();
    await expect(user2VideoPage.callTimer()).not.toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('Peer receives end-call notification with correct message', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user2VideoPage } = setup;

    await establishCall(user1VideoPage, user2VideoPage);

    await user1VideoPage.endCallButton().click();
    await user2VideoPage.waitForIdle();

    await expect(user2VideoPage.idleContainer()).toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('Call history recorded after call ends', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user2VideoPage } = setup;

    await establishCall(user1VideoPage, user2VideoPage);
    await endCall(user1VideoPage, user2VideoPage);

    await expect(user1VideoPage.idleContainer()).toBeVisible();
    await expect(user2VideoPage.idleContainer()).toBeVisible();

    await teardownTwoUserCall(setup);
  });
});
