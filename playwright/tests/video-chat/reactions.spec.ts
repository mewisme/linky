// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from 'linky/playwright-test';
import { setupTwoUserCall, teardownTwoUserCall, establishCall } from '../../fixtures/call.fixtures';
import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Reactions', () => {
  test('Reaction events relayed to peer', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user2VideoPage } = setup;

    await establishCall(user1VideoPage, user2VideoPage);

    await user1VideoPage.page.waitForTimeout(1000);
    await expect(user1VideoPage.remoteVideo()).toBeVisible();
    await expect(user2VideoPage.remoteVideo()).toBeVisible();

    await teardownTwoUserCall(setup);
  });
});
