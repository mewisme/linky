import { createUserContext, startCall, toggleMute, waitForIdle, waitForInCall } from '../../utils/video-chat/helpers';
import { expect, test } from '@playwright/test';

import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Video Chat - Mute/Unmute Audio', () => {
  test('should toggle mute and reflect muted state in UI', async ({ browser }) => {
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
      await user1Page.goto('/chat');
      await user2Page.goto('/chat');

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

      const muteButton = user1Page.locator('[data-testid="chat-mute-button"]');
      await expect(muteButton).toBeVisible();

      await toggleMute(user1Page);

      await expect(muteButton).toHaveClass(/destructive/);

      await toggleMute(user1Page);

      await expect(muteButton).not.toHaveClass(/destructive/);
    } finally {
      await user1Context.close();
      await user2Context.close();
    }
  });
});
