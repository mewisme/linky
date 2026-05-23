// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from 'linky/playwright-test';
import { setupTwoUserCall, teardownTwoUserCall, establishCall } from '../../fixtures/call.fixtures';
import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('In-Call Core — Video & Audio', () => {
  test('Remote video stream renders', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user2VideoPage } = setup;

    await establishCall(user1VideoPage, user2VideoPage);

    await expect(user1VideoPage.remoteVideo()).toBeVisible();
    await expect(user2VideoPage.remoteVideo()).toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('Local video preview renders', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user2VideoPage } = setup;

    await establishCall(user1VideoPage, user2VideoPage);

    await expect(user1VideoPage.localVideo()).toBeVisible();
    await expect(user2VideoPage.localVideo()).toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('Call timer increments during call', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    const timer1 = await user1VideoPage.getCallTimerText();
    await user1VideoPage.page.waitForTimeout(3000);
    const timer2 = await user1VideoPage.getCallTimerText();

    expect(timer1).not.toBe(timer2);

    await teardownTwoUserCall(setup);
  });

  test('Camera off indicator shown when video disabled', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user2VideoPage } = setup;

    await establishCall(user1VideoPage, user2VideoPage);

    await user1VideoPage.videoToggleButton().click();
    await user2VideoPage.page.waitForTimeout(2000);

    const cameraOffVisible = await user2VideoPage.cameraOffIndicator().isVisible().catch(() => false);
    expect(cameraOffVisible).toBe(true);

    await teardownTwoUserCall(setup);
  });
});
