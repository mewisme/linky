import { createUserContext, openChatPage, startCall, waitForIdle, waitForInCall } from '../../helpers/video-chat/helpers';
import { devices, expect, test } from '@playwright/test';

import { TEST_USERS } from '../../fixtures/users.fixtures';

test.use({ ...devices['iPhone 13'] });

test.describe('Video Chat - Mobile Viewport', () => {
  test('should render idle page correctly on mobile', async ({ browser }) => {
    const user1Context = await createUserContext(
      browser,
      TEST_USERS.user1
    );

    const user1Page = await user1Context.newPage();

    try {
      await openChatPage(user1Page);

      await waitForIdle(user1Page);

      await expect(user1Page.locator('[data-testid="chat-idle-container"]')).toBeVisible();
      await expect(user1Page.locator('[data-testid="chat-start-button"]')).toBeVisible();
    } finally {
      await user1Context.close();
    }
  });

  test('should show in-call UI correctly on mobile', async ({ browser }) => {
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
      await user2Page.goto('/call');

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

      await expect(user1Page.locator('[data-testid="chat-video-container"]')).toBeVisible();
      await expect(user1Page.locator('[data-testid="chat-remote-video"]')).toBeVisible();
      await expect(user1Page.locator('[data-testid="chat-call-timer"]')).toBeVisible();

      const container = user1Page.locator('[data-testid="chat-video-container"]');
      const boundingBox = await container.boundingBox();
      expect(boundingBox).not.toBeNull();
      expect(boundingBox!.width).toBeGreaterThan(0);
      expect(boundingBox!.height).toBeGreaterThan(0);
    } finally {
      await user1Context.close();
      await user2Context.close();
    }
  });
});
