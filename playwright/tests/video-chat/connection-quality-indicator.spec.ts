// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import { setupTwoUserCall, teardownTwoUserCall, establishCall } from '../../fixtures/call.fixtures';
import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Connection Quality Indicator', () => {
  test('Connection quality indicator visible during call', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    const indicator = user1VideoPage.connectionQualityIndicator();
    await expect(indicator).toBeAttached();

    await teardownTwoUserCall(setup);
  });
});
