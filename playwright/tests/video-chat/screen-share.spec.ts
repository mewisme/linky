import {
  createUserContext,
  openChatPage,
  startCall,
  waitForIdle,
  waitForInCall,
} from "../../helpers/video-chat/helpers";
import { expect, test } from "@playwright/test";

import { TEST_USERS } from "../../fixtures/users.fixtures";

test.describe("Screen Sharing", () => {
  test("should show screen share button in overflow menu during call on desktop", async ({
    browser,
  }) => {
    const user1Context = await createUserContext(browser, TEST_USERS.user1);
    const user2Context = await createUserContext(browser, TEST_USERS.user2);

    const user1Page = await user1Context.newPage();
    const user2Page = await user2Context.newPage();

    try {
      await openChatPage(user1Page);
      await openChatPage(user2Page);

      await waitForIdle(user1Page);
      await waitForIdle(user2Page);

      await Promise.all([startCall(user1Page), startCall(user2Page)]);

      await Promise.all([waitForInCall(user1Page), waitForInCall(user2Page)]);

      await user1Page.click('[data-testid="chat-overflow-menu-button"]');
      await user1Page.waitForSelector('[role="menu"]', { state: "visible" });

      const screenShareButton = user1Page.locator(
        '[data-testid="chat-screen-share-button"]'
      );
      await expect(screenShareButton).toBeVisible();
    } finally {
      await user1Context.close();
      await user2Context.close();
    }
  });

  test("should not show screen share button on mobile", async ({
    browser,
  }) => {
    const userContext = await createUserContext(browser, TEST_USERS.user1);
    const page = await userContext.newPage();

    try {
      await page.setViewportSize({ width: 375, height: 812 });
      await openChatPage(page);
      await waitForIdle(page);

      const screenShareButton = page.locator(
        '[data-testid="chat-screen-share-button"]'
      );
      await expect(screenShareButton).not.toBeVisible();
    } finally {
      await userContext.close();
    }
  });
});
