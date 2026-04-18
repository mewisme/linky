import {
  createUserContext,
  openChatPage,
  startCall,
  waitForIdle,
  waitForInCall,
  waitForToast,
} from "../../helpers/video-chat/helpers";
import { expect, test } from "@playwright/test";

import { TEST_USERS } from "../../fixtures/users.fixtures";

test.describe("User Blocking", () => {
  test("should block user from video controls during call", async ({
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

      const blockButton = user1Page.locator(
        '[data-testid="chat-block-user-button"]'
      );
      await expect(blockButton).toBeVisible();
      await blockButton.click();

      await waitForToast(user1Page, "User blocked");
    } finally {
      await user1Context.close();
      await user2Context.close();
    }
  });

  test("should show blocked users page in settings", async ({ browser }) => {
    const userContext = await createUserContext(browser, TEST_USERS.user1);
    const page = await userContext.newPage();

    try {
      await page.goto("/connections/blocked-users");
      await page.waitForLoadState("networkidle");

      const heading = page.locator("h1");
      await expect(heading).toContainText("Blocked Users");
    } finally {
      await userContext.close();
    }
  });
});
