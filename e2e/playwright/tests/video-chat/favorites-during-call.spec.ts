// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from 'linky/playwright-test';
import { setupTwoUserCall, teardownTwoUserCall, establishCall } from '../../fixtures/call.fixtures';
import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Favorites During Call', () => {
  test('Add favorite notifies peer', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    await user1VideoPage.addFavoriteButton().click();
    await expect(user1VideoPage.addFavoriteButton()).toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('Remove favorite notifies peer', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    await user1VideoPage.removeFavoriteButton().click();
    await expect(user1VideoPage.removeFavoriteButton()).toBeVisible();

    await teardownTwoUserCall(setup);
  });
});
