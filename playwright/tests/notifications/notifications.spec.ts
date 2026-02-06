import { expect, test } from "@playwright/test";

import { TEST_USERS } from "../../fixtures/users.fixtures";
import { createUserContext } from "../../utils/video-chat/helpers";

test.describe("Notification Center", () => {
  test("should show notification bell in header", async ({ browser }) => {
    const userContext = await createUserContext(browser, TEST_USERS.user1);
    const page = await userContext.newPage();

    try {
      await page.goto("/chat");
      await page.waitForLoadState("networkidle");

      const bell = page.locator('[data-testid="notifications-bell"]');
      await expect(bell).toBeVisible();
    } finally {
      await userContext.close();
    }
  });

  test("should open notifications panel on bell click", async ({
    browser,
  }) => {
    const userContext = await createUserContext(browser, TEST_USERS.user1);
    const page = await userContext.newPage();

    try {
      await page.goto("/chat");
      await page.waitForLoadState("networkidle");

      await page.click('[data-testid="notifications-bell"]');

      const panel = page.locator('[data-testid="notifications-panel"]');
      await expect(panel).toBeVisible();
    } finally {
      await userContext.close();
    }
  });

  test("should show empty state when no notifications", async ({
    browser,
  }) => {
    const userContext = await createUserContext(browser, TEST_USERS.user5);
    const page = await userContext.newPage();

    try {
      await page.goto("/chat");
      await page.waitForLoadState("networkidle");

      await page.click('[data-testid="notifications-bell"]');

      const emptyState = page.locator('[data-testid="notifications-empty"]');
      await expect(emptyState).toBeVisible();
    } finally {
      await userContext.close();
    }
  });
});
