import { Browser, BrowserContext, Page } from '@playwright/test';

import { TestUser } from '../../fixtures/users.fixtures';
import { createAuthenticatedContext } from '../../fixtures/context.fixtures';

export async function createUserContext(
  browser: Browser,
  user: TestUser
): Promise<BrowserContext> {
  return await createAuthenticatedContext(browser, user);
}

export async function waitForIdle(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="chat-idle-container"]', { state: 'visible' });
}

export async function waitForInCall(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="chat-remote-video"]', { state: 'visible' });
  await page.waitForSelector('[data-testid="chat-call-timer"]', { state: 'visible' });
}

export async function waitForSearching(page: Page): Promise<void> {
  await page.waitForSelector('[data-testid="chat-searching-indicator"]', { state: 'visible' });
}

export async function startCall(page: Page): Promise<void> {
  await page.click('[data-testid="chat-start-button"]');
}

export async function endCall(page: Page): Promise<void> {
  await page.click('[data-testid="chat-end-call-button"]');
}

export async function skipCall(page: Page): Promise<void> {
  await page.click('[data-testid="chat-skip-button"]');
}

export async function toggleMute(page: Page): Promise<void> {
  await page.click('[data-testid="chat-mute-button"]');
}

export async function toggleVideo(page: Page): Promise<void> {
  await page.click('[data-testid="chat-video-toggle-button"]');
}

export async function toggleChat(page: Page): Promise<void> {
  await page.click('[data-testid="chat-toggle-button"]');
}

export async function sendChatMessage(page: Page, message: string): Promise<void> {
  const input = page.locator('[data-testid="chat-input"]');
  await input.click();
  await input.fill(message);
  await page.click('[data-testid="chat-send-button"]');
}

export async function waitForChatMessage(page: Page, messageText: string): Promise<void> {
  await page.waitForSelector(`[data-testid^="chat-message-"]:has-text("${messageText}")`, { state: 'visible' });
}

export async function addFavorite(page: Page): Promise<void> {
  await page.click('[data-testid="chat-add-favorite-button"]');
}

export async function removeFavorite(page: Page): Promise<void> {
  await page.click('[data-testid="chat-remove-favorite-button"]');
}

export async function waitForToast(page: Page, text: string): Promise<void> {
  await page.waitForSelector(`text=${text}`, { state: 'visible', timeout: 5000 });
}