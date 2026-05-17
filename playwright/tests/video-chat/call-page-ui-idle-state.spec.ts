// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from 'linky/playwright-test';
import { VideoChatPage } from '../../page-objects/video-chat/pages/video-chat.page';
import { authenticateUser } from '../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Call Page UI — Idle State', () => {
  let videoPage: VideoChatPage;

  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
    videoPage = new VideoChatPage(page);
  });

  test('Call page loads in idle state', async () => {
    await videoPage.goto();
    await videoPage.waitForIdle();

    await expect(videoPage.idleContainer()).toBeVisible();
    await expect(videoPage.startButton()).toBeVisible();
    await expect(videoPage.videoContainer()).toBeVisible();
  });

  test('Start button is enabled and clickable', async () => {
    await videoPage.goto();
    await videoPage.waitForIdle();

    await expect(videoPage.startButton()).toBeVisible();
    await expect(videoPage.startButton()).toBeEnabled();
  });

  test('Call timer not visible in idle state', async () => {
    await videoPage.goto();
    await videoPage.waitForIdle();

    await expect(videoPage.callTimer()).not.toBeVisible();
  });

  test('Chat sidebar hidden in idle state', async () => {
    await videoPage.goto();
    await videoPage.waitForIdle();

    await expect(videoPage.chatSidebar()).not.toBeVisible();
  });
});
