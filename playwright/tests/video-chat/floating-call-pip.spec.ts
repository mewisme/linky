// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import { setupTwoUserCall, teardownTwoUserCall, establishCall, endCall } from '../../fixtures/call.fixtures';
import { TEST_USERS } from '../../fixtures/users.fixtures';
import { VideoChatPage } from '../../page-objects/video-chat/pages/video-chat.page';

test.describe('Floating Call (PiP)', () => {
  test('Floating overlay appears when navigating away from call page', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user1Page } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    await user1Page.goto('/dashboard');
    await user1Page.waitForTimeout(2000);

    await expect(user1VideoPage.remoteVideo()).toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('Expand floating overlay returns to full call page', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user1Page } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    await user1Page.goto('/dashboard');
    await user1Page.waitForTimeout(2000);

    await user1Page.goto('/call');
    await user1Page.waitForTimeout(2000);

    await expect(user1VideoPage.videoContainer()).toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('Floating overlay hidden after call ends', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user2VideoPage, user1Page } = setup;

    await establishCall(user1VideoPage, user2VideoPage);

    await user1Page.goto('/dashboard');
    await user1Page.waitForTimeout(2000);

    await endCall(user1VideoPage, user2VideoPage);

    const overlayVisible = await user1VideoPage.remoteVideo().isVisible().catch(() => false);
    expect(overlayVisible).toBe(false);

    await teardownTwoUserCall(setup);
  });
});
