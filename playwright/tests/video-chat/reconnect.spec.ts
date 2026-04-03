import { createUserContext, openChatPage, startCall, waitForIdle, waitForInCall } from '../../helpers/video-chat/helpers';
import { expect, test } from '@playwright/test';

import { TEST_USERS } from '../../fixtures/users.fixtures';
import { waitForClerkReady } from '../../helpers/clerk-helpers';

test.describe('Video Chat - Reconnect Handling', () => {
  test('should reconnect and return to in-call state after page reload', async ({ browser }) => {
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

      await user1Page.reload();
      await waitForClerkReady(user1Page);

      await waitForInCall(user1Page);

      await expect(user1Page.locator('[data-testid="chat-video-container"]')).toBeVisible();
      await expect(user1Page.locator('[data-testid="chat-remote-video"]')).toBeVisible();
      await expect(user1Page.locator('[data-testid="chat-call-timer"]')).toBeVisible();

      await expect(user1Page.locator('[data-testid="chat-idle-container"]')).not.toBeVisible();
      await expect(user1Page.locator('[data-testid="chat-searching-indicator"]')).not.toBeVisible();
    } finally {
      await user1Context.close();
      await user2Context.close();
    }
  });
});
