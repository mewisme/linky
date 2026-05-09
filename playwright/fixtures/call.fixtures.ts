import { Browser, BrowserContext, Page } from '@playwright/test';
import { TestUser } from './users.fixtures';
import { createAuthenticatedContext } from './context.fixtures';
import { VideoChatPage } from '../page-objects/video-chat/pages/video-chat.page';

export interface TwoUserCallSetup {
  user1Context: BrowserContext;
  user2Context: BrowserContext;
  user1Page: Page;
  user2Page: Page;
  user1VideoPage: VideoChatPage;
  user2VideoPage: VideoChatPage;
}

export async function setupTwoUserCall(
  browser: Browser,
  user1: TestUser,
  user2: TestUser,
): Promise<TwoUserCallSetup> {
  const user1Context = await createAuthenticatedContext(browser, user1);
  const user2Context = await createAuthenticatedContext(browser, user2);
  const user1Page = await user1Context.newPage();
  const user2Page = await user2Context.newPage();
  return {
    user1Context,
    user2Context,
    user1Page,
    user2Page,
    user1VideoPage: new VideoChatPage(user1Page),
    user2VideoPage: new VideoChatPage(user2Page),
  };
}

export async function teardownTwoUserCall(
  setup: TwoUserCallSetup,
): Promise<void> {
  await setup.user1Context.close();
  await setup.user2Context.close();
}

export async function establishCall(page1: VideoChatPage, page2: VideoChatPage) {
  await page1.goto();
  await page1.waitForIdle();

  await page2.goto();
  await page2.waitForIdle();

  // Start call on first user
  await page1.startButton().click();
  await page1.waitForSearching();

  // Second user joins — triggers match
  await page2.startButton().click();
  await page1.waitForInCall();
  await page2.waitForInCall();
}

export async function endCall(page1: VideoChatPage, page2: VideoChatPage) {
  await page1.endCallButton().click();
  await page1.waitForIdle();
  await page2.waitForIdle();
}
