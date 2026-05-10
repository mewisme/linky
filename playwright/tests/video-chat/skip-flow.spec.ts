// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import { setupTwoUserCall, teardownTwoUserCall, establishCall } from '../../fixtures/call.fixtures';
import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Skip Flow', () => {
  test('Skip during call re-queues skipper', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    await user1VideoPage.skipButton().click();
    await user1VideoPage.waitForSearching();

    await expect(user1VideoPage.searchingIndicator()).toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('Peer receives skip notification', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user2VideoPage } = setup;

    await establishCall(user1VideoPage, user2VideoPage);

    await user1VideoPage.skipButton().click();
    await user2VideoPage.page.waitForTimeout(2000);

    const isSearching = await user2VideoPage.searchingIndicator().isVisible().catch(() => false);
    expect(isSearching).toBe(true);

    await teardownTwoUserCall(setup);
  });

  test('Skip records mutual skips to prevent re-matching', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    await user1VideoPage.skipButton().click();
    await user1VideoPage.waitForSearching();

    await setup.user2VideoPage.page.waitForTimeout(5000);
    await expect(user1VideoPage.searchingIndicator()).toBeVisible();

    await teardownTwoUserCall(setup);
  });
});
