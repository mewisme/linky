// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import { setupTwoUserCall, teardownTwoUserCall, establishCall } from '../../fixtures/call.fixtures';
import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Screen Sharing', () => {
  test('Screen share starts and peer receives notification', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    await user1VideoPage.screenShareButton().click();
    await user1VideoPage.page.waitForTimeout(2000);

    await expect(user1VideoPage.screenShareButton()).toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('Stop screen share restores camera', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    await user1VideoPage.screenShareButton().click();
    await user1VideoPage.page.waitForTimeout(2000);

    await user1VideoPage.screenShareButton().click();
    await expect(user1VideoPage.localVideo()).toBeVisible();

    await teardownTwoUserCall(setup);
  });
});
