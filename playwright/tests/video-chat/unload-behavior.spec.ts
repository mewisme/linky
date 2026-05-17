// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from 'linky/playwright-test';
import { setupTwoUserCall, teardownTwoUserCall, establishCall } from '../../fixtures/call.fixtures';
import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Unload Behavior', () => {
  test('beforeunload sends end-call via fetch/beacon', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user2VideoPage, user1Page } = setup;

    await establishCall(user1VideoPage, user2VideoPage);

    await user1Page.close();
    await user2VideoPage.waitForIdle();

    await expect(user2VideoPage.idleContainer()).toBeVisible();

    await teardownTwoUserCall(setup);
  });
});
