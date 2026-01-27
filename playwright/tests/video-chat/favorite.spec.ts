import { addFavorite, createUserContext, openChatPage, removeFavorite, startCall, waitForIdle, waitForInCall, waitForToast } from '../../utils/video-chat/helpers';
import { expect, test } from '@playwright/test';

import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Video Chat - Favorite Add/Remove', () => {
  test('should add and remove favorite during call', async ({ browser }) => {
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

      await user1Page.click('[data-testid="chat-overflow-menu-button"]');

      await user1Page.waitForSelector('[role="menu"]', { state: 'visible' });
      await user1Page.waitForSelector('[data-testid="chat-add-favorite-button"]', { state: 'visible' });

      await addFavorite(user1Page);

      await waitForToast(user1Page, 'Added to favorites');

      await expect(user1Page.locator('[data-testid="chat-remove-favorite-button"]')).toBeVisible();
      await expect(user1Page.locator('[data-testid="chat-add-favorite-button"]')).not.toBeVisible();

      await removeFavorite(user1Page);

      await waitForToast(user1Page, 'Removed from favorites');

      await expect(user1Page.locator('[data-testid="chat-add-favorite-button"]')).toBeVisible();
      await expect(user1Page.locator('[data-testid="chat-remove-favorite-button"]')).not.toBeVisible();
    } finally {
      await user1Context.close();
      await user2Context.close();
    }
  });
});
