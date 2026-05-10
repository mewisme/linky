// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from '@playwright/test';
import { VideoChatPage } from '../../page-objects/video-chat/pages/video-chat.page';
import { authenticateUser } from '../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Matchmaking — Start Search & Queue', () => {
  let videoPage: VideoChatPage;

  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
    videoPage = new VideoChatPage(page);
  });

  test('Start search transitions to searching state', async () => {
    await videoPage.goto();
    await videoPage.waitForIdle();

    await videoPage.startButton().click();
    await videoPage.waitForSearching();

    await expect(videoPage.searchingIndicator()).toBeVisible();
  });

  test('Cancel search button visible during search', async () => {
    await videoPage.goto();
    await videoPage.waitForIdle();

    await videoPage.startButton().click();
    await videoPage.waitForSearching();

    await expect(videoPage.cancelSearchButton()).toBeVisible();
  });

  test('Cancel search returns to idle', async () => {
    await videoPage.goto();
    await videoPage.waitForIdle();

    await videoPage.startButton().click();
    await videoPage.waitForSearching();

    await videoPage.cancelSearchButton().click();
    await videoPage.waitForIdle();

    await expect(videoPage.idleContainer()).toBeVisible();
    await expect(videoPage.searchingIndicator()).not.toBeVisible();
  });

  test('Cannot join queue twice', async () => {
    await videoPage.goto();
    await videoPage.waitForIdle();

    await videoPage.startButton().click();
    await videoPage.waitForSearching();

    await videoPage.startButton().click();

    await expect(videoPage.searchingIndicator()).toBeVisible();
  });
});
