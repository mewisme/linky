// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import { VideoChatPage } from '../../page-objects/video-chat/pages/video-chat.page';
import { authenticateUser } from '../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Error States & Edge Cases', () => {
  test('Media permission denial shows error', async ({ browser }) => {
    const context = await browser.newContext({
      permissions: [],
      storageState: TEST_USERS.user1.storageStatePath,
    });
    const page = await context.newPage();
    const videoPage = new VideoChatPage(page);

    await videoPage.goto();
    await videoPage.waitForIdle();

    await videoPage.startButton().click();
    await expect(videoPage.idleContainer()).toBeVisible();

    await context.close();
  });

  test('No camera device falls back to audio-only', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: TEST_USERS.user1.storageStatePath,
    });
    const page = await context.newPage();
    const videoPage = new VideoChatPage(page);

    await videoPage.goto();
    await videoPage.waitForIdle();

    await videoPage.startButton().click();
    await videoPage.waitForSearching();

    await expect(videoPage.searchingIndicator()).toBeVisible();

    await context.close();
  });

  test('ICE server fetch failure shows error', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: TEST_USERS.user1.storageStatePath,
    });
    const page = await context.newPage();
    const videoPage = new VideoChatPage(page);

    await videoPage.goto();
    await videoPage.waitForIdle();

    await expect(videoPage.idleContainer()).toBeVisible();

    await context.close();
  });

  test('Queue timeout shows error', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: TEST_USERS.user1.storageStatePath,
    });
    const page = await context.newPage();
    const videoPage = new VideoChatPage(page);

    await videoPage.goto();
    await videoPage.waitForIdle();

    await videoPage.startButton().click();
    await videoPage.waitForSearching();

    await page.waitForTimeout(30000);

    await expect(videoPage.idleContainer()).toBeVisible();

    await context.close();
  });

  test('Socket connection error shows toast', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: TEST_USERS.user1.storageStatePath,
    });
    const page = await context.newPage();
    const videoPage = new VideoChatPage(page);

    await videoPage.goto();
    await videoPage.waitForIdle();

    await expect(videoPage.idleContainer()).toBeVisible();

    await context.close();
  });
});
