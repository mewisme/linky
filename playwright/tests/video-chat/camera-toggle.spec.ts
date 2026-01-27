import { createUserContext, openChatPage, startCall, toggleVideo, waitForIdle, waitForInCall } from '../../utils/video-chat/helpers';
import { expect, test } from '@playwright/test';

import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Video Chat - Camera Toggle', () => {
  test('should toggle camera off and show camera-off indicator', async ({ browser }) => {
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

      const videoToggleButton = user1Page.locator('[data-testid="chat-video-toggle-button"]');
      await expect(videoToggleButton).toBeVisible();

      await toggleVideo(user1Page);

      await expect(user1Page.locator('[data-testid="chat-camera-off-indicator"]')).toBeVisible();
      await expect(videoToggleButton).toHaveClass(/destructive/);

      await toggleVideo(user1Page);

      await expect(user1Page.locator('[data-testid="chat-camera-off-indicator"]')).not.toBeVisible();
      await expect(videoToggleButton).not.toHaveClass(/destructive/);
    } finally {
      await user1Context.close();
      await user2Context.close();
    }
  });
});
