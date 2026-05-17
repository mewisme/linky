// spec: specs/video-call.plan.md
// seed: playwright/tests/seed.spec.ts

import { test, expect } from 'linky/playwright-test';
import { VideoChatPage } from '../../page-objects/video-chat/pages/video-chat.page';
import { setupTwoUserCall, teardownTwoUserCall, establishCall } from '../../fixtures/call.fixtures';
import { authenticateUser } from '../../fixtures/auth.fixtures';
import { TEST_USERS } from '../../fixtures/users.fixtures';

test.describe('Internationalization (i18n)', () => {
  test('Call page renders in English (default)', async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
    const videoPage = new VideoChatPage(page);

    await videoPage.goto();
    await videoPage.waitForIdle();

    await expect(videoPage.startButton()).toBeVisible();
    await expect(videoPage.idleContainer()).toBeVisible();
  });

  test('Call page renders in Vietnamese', async ({ page }) => {
    await authenticateUser(page, TEST_USERS.user1);
    const videoPage = new VideoChatPage(page);

    await page.goto('/vi/call');
    await videoPage.waitForIdle();

    await expect(videoPage.startButton()).toBeVisible();
    await expect(videoPage.idleContainer()).toBeVisible();
  });

  test('Backend error messages localized', async ({ browser }) => {
    const setup = await setupTwoUserCall(browser, TEST_USERS.user1, TEST_USERS.user2);
    const { user1VideoPage, user2VideoPage, user1Page, user2Page } = setup;

    await user1Page.goto('/vi/call');
    await user1VideoPage.waitForIdle();

    await user2Page.goto('/vi/call');
    await user2VideoPage.waitForIdle();

    await establishCall(user1VideoPage, user2VideoPage);

    await user1VideoPage.startButton().click();
    await expect(user1VideoPage.searchingIndicator()).toBeVisible();

    await teardownTwoUserCall(setup);
  });
});
