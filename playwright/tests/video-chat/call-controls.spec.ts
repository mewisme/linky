// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from 'linky/playwright-test';
import { setupTwoUserCall, teardownTwoUserCall, establishCall } from '../../fixtures/call.fixtures';
import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Call Controls', () => {
  test('Mute toggles audio and notifies peer', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    await user1VideoPage.muteButton().click();
    await expect(user1VideoPage.muteButton()).toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('Unmute restores audio', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    await user1VideoPage.muteButton().click();
    await user1VideoPage.muteButton().click();

    await expect(user1VideoPage.muteButton()).toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('Video toggle notifies peer', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user2VideoPage } = setup;

    await establishCall(user1VideoPage, user2VideoPage);

    await user1VideoPage.videoToggleButton().click();
    await user2VideoPage.page.waitForTimeout(2000);

    const cameraOffVisible = await user2VideoPage.cameraOffIndicator().isVisible().catch(() => false);
    expect(cameraOffVisible).toBe(true);

    await teardownTwoUserCall(setup);
  });

  test('Swap camera cycles camera devices', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    await user1VideoPage.swapCameraButton().click();
    await expect(user1VideoPage.localVideo()).toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('End call via button returns to idle', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user2VideoPage } = setup;

    await establishCall(user1VideoPage, user2VideoPage);

    await user1VideoPage.endCallButton().click();
    await user1VideoPage.waitForIdle();
    await user2VideoPage.waitForIdle();

    await expect(user1VideoPage.idleContainer()).toBeVisible();
    await expect(user2VideoPage.idleContainer()).toBeVisible();
    await expect(user1VideoPage.callTimer()).not.toBeVisible();
    await expect(user2VideoPage.callTimer()).not.toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('End call via keyboard shortcut (Mod+D)', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    await user1VideoPage.page.keyboard.press('Control+d');
    await user1VideoPage.waitForIdle();

    await expect(user1VideoPage.idleContainer()).toBeVisible();

    await teardownTwoUserCall(setup);
  });
});
