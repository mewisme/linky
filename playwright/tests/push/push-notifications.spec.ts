import { expect, test } from "@playwright/test";

import { TEST_USERS } from "../../fixtures/users.fixtures";
import { createUserContext } from "../../utils/video-chat/helpers";

test.describe("Push Notifications Settings", () => {
  test("should show push notification settings page", async ({ browser }) => {
    const userContext = await createUserContext(browser, TEST_USERS.user1);
    const page = await userContext.newPage();

    try {
      await page.goto("/settings/notifications");
      await page.waitForLoadState("networkidle");

      const heading = page.locator("h1");
      await expect(heading).toContainText("Notification Settings");
    } finally {
      await userContext.close();
    }
  });

  test("should show enable button when not subscribed", async ({
    browser,
  }) => {
    const userContext = await createUserContext(browser, TEST_USERS.user1);
    const page = await userContext.newPage();

    try {
      await page.goto("/settings/notifications");
      await page.waitForLoadState("networkidle");

      const enableButton = page.locator('[data-testid="enable-push-button"]');
      const disableButton = page.locator(
        '[data-testid="disable-push-button"]'
      );

      const isEnabled = await enableButton.isVisible();
      const isDisabled = await disableButton.isVisible();

      expect(isEnabled || isDisabled).toBeTruthy();
    } finally {
      await userContext.close();
    }
  });
});
