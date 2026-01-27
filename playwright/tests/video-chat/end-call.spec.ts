import { createUserContext, endCall, openChatPage, startCall, waitForIdle, waitForInCall } from '../../utils/video-chat/helpers';
import { expect, test } from '@playwright/test';

import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Video Chat - End Call', () => {
  test('should end call and return both users to idle state', async ({ browser }) => {
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

      await endCall(user1Page);

      await Promise.all([
        waitForIdle(user1Page),
        waitForIdle(user2Page),
      ]);

      await expect(user1Page.locator('[data-testid="chat-start-button"]')).toBeVisible();
      await expect(user2Page.locator('[data-testid="chat-start-button"]')).toBeVisible();

      await expect(user1Page.locator('[data-testid="chat-remote-video"]')).not.toBeVisible();
      await expect(user2Page.locator('[data-testid="chat-remote-video"]')).not.toBeVisible();
      await expect(user1Page.locator('[data-testid="chat-call-timer"]')).not.toBeVisible();
      await expect(user2Page.locator('[data-testid="chat-call-timer"]')).not.toBeVisible();
    } finally {
      await user1Context.close();
      await user2Context.close();
    }
  });
});
