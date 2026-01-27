import { createUserContext, openChatPage, sendChatMessage, startCall, toggleChat, waitForChatMessage, waitForIdle, waitForInCall } from '../../utils/video-chat/helpers';
import { expect, test } from '@playwright/test';

import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Video Chat - Chat Messages', () => {
  test('should send and receive chat messages during call', async ({ browser }) => {
    const user1Context = await createUserContext(
      browser,
      TEST_USERS.user1
    );
    const user2Context = await createUserContext(
      browser,
      TEST_USERS.user2
    );

    const user1Page = await user1Context.newPage();
    const user2Page = await user2Context.newPage();

    try {
      await openChatPage(user1Page);
      await openChatPage(user2Page);

      await waitForIdle(user1Page);
      await waitForIdle(user2Page);

      await Promise.all([
        startCall(user1Page),
        startCall(user2Page),
      ]);

      await Promise.all([
        waitForInCall(user1Page),
        waitForInCall(user2Page),
      ]);

      await toggleChat(user1Page);
      await toggleChat(user2Page);

      await expect(user1Page.locator('[data-testid="chat-sidebar"]')).toBeVisible();
      await expect(user2Page.locator('[data-testid="chat-sidebar"]')).toBeVisible();

      const testMessage = 'Hello from user 1!';
      await sendChatMessage(user1Page, testMessage);

      await waitForChatMessage(user1Page, testMessage);
      await waitForChatMessage(user2Page, testMessage);

      await expect(user1Page.locator('[data-testid="chat-messages-container"]')).toContainText(testMessage);
      await expect(user2Page.locator('[data-testid="chat-messages-container"]')).toContainText(testMessage);

      const testMessage2 = 'Hello from user 2!';
      await sendChatMessage(user2Page, testMessage2);

      await waitForChatMessage(user1Page, testMessage2);
      await waitForChatMessage(user2Page, testMessage2);

      await expect(user1Page.locator('[data-testid="chat-messages-container"]')).toContainText(testMessage2);
      await expect(user2Page.locator('[data-testid="chat-messages-container"]')).toContainText(testMessage2);
    } finally {
      await user1Context.close();
      await user2Context.close();
    }
  });
});
