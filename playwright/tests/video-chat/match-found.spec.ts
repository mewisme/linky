// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from 'linky/playwright-test';
import { VideoChatPage } from '../../page-objects/video-chat/pages/video-chat.page';
import { setupTwoUserCall, teardownTwoUserCall, establishCall } from '../../fixtures/call.fixtures';
import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Matchmaking — Match Found', () => {
  test('Two users match successfully', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user2VideoPage } = setup;

    await establishCall(user1VideoPage, user2VideoPage);

    await expect(user1VideoPage.remoteVideo()).toBeVisible();
    await expect(user1VideoPage.callTimer()).toBeVisible();
    await expect(user2VideoPage.remoteVideo()).toBeVisible();
    await expect(user2VideoPage.callTimer()).toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('Match delivers peer info', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user2VideoPage } = setup;

    await establishCall(user1VideoPage, user2VideoPage);

    await expect(user1VideoPage.remoteVideo()).toBeVisible();
    await expect(user2VideoPage.remoteVideo()).toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('One user is designated as offerer', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user2VideoPage } = setup;

    await establishCall(user1VideoPage, user2VideoPage);

    await expect(user1VideoPage.remoteVideo()).toBeVisible();
    await expect(user2VideoPage.remoteVideo()).toBeVisible();

    await teardownTwoUserCall(setup);
  });
});
