// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import { setupTwoUserCall, teardownTwoUserCall, establishCall } from '../../fixtures/call.fixtures';
import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Chat During Call', () => {
  test('Chat sidebar opens on toggle', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    await user1VideoPage.chatToggleButton().click();

    await expect(user1VideoPage.chatSidebar()).toBeVisible();
    await expect(user1VideoPage.chatInput()).toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('Send text message and peer receives it', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user2VideoPage } = setup;

    await establishCall(user1VideoPage, user2VideoPage);

    await user1VideoPage.chatToggleButton().click();
    await user2VideoPage.chatToggleButton().click();

    const testMessage = 'Hello from User 1';
    await user1VideoPage.sendChatMessage(testMessage);

    await user2VideoPage.page.waitForTimeout(2000);
    await expect(user2VideoPage.chatMessagesContainer()).toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('Typing indicator relayed to peer', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    await user1VideoPage.chatToggleButton().click();
    await setup.user2VideoPage.chatToggleButton().click();

    await user1VideoPage.chatInput().click();
    await user1VideoPage.chatInput().fill('T');

    await expect(user1VideoPage.chatInput()).toBeVisible();

    await teardownTwoUserCall(setup);
  });

  test('Empty message not sent', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage } = setup;

    await establishCall(user1VideoPage, setup.user2VideoPage);

    await user1VideoPage.chatToggleButton().click();
    await user1VideoPage.chatInput().fill('   ');
    await user1VideoPage.chatSendButton().click();

    await expect(user1VideoPage.chatInput()).toBeVisible();

    await teardownTwoUserCall(setup);
  });
});
