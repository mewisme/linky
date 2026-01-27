import { Browser, BrowserContext, Page } from '@playwright/test';

import { TestUser } from '../../fixtures/users.fixtures';
import { createAuthenticatedContext } from '../../fixtures/context.fixtures';
import { waitForClerkReady } from '../clerk-helpers';

export async function createUserContext(
  browser: Browser,
  user: TestUser
): Promise<BrowserContext> {
  return await createAuthenticatedContext(browser, user);
}

export async function openChatPage(page: Page): Promise<void> {
  await page.goto('/chat');
  await waitForClerkReady(page);
}

export async function waitForIdle(page: Page): Promise<void> {
  await page.getByTestId('chat-idle-container').waitFor({ state: 'visible' });
}

export async function waitForInCall(page: Page): Promise<void> {
  await page.getByTestId('chat-remote-video').waitFor({ state: 'visible' });
  await page.getByTestId('chat-call-timer').waitFor({ state: 'visible' });
}

export async function waitForSearching(page: Page): Promise<void> {
  await page.getByTestId('chat-searching-indicator').waitFor({ state: 'visible' });
}

export async function startCall(page: Page): Promise<void> {
  await page.getByTestId('chat-start-button').click();
}

export async function endCall(page: Page): Promise<void> {
  await page.getByTestId('chat-end-call-button').click();
}

export async function skipCall(page: Page): Promise<void> {
  await page.getByTestId('chat-skip-button').click();
}

export async function toggleMute(page: Page): Promise<void> {
  await page.getByTestId('chat-mute-button').click();
}

export async function toggleVideo(page: Page): Promise<void> {
  await page.getByTestId('chat-video-toggle-button').click();
}

export async function toggleChat(page: Page): Promise<void> {
  await page.getByTestId('chat-toggle-button').click();
}

export async function sendChatMessage(page: Page, message: string): Promise<void> {
  const input = page.getByTestId('chat-input');
  await input.click();
  await input.fill(message);
  await page.getByTestId('chat-send-button').click();
}

export async function waitForChatMessage(page: Page, messageText: string): Promise<void> {
  await page.getByTestId(`chat-message-${messageText}`).waitFor({ state: 'visible' });
}

export async function addFavorite(page: Page): Promise<void> {
  await page.getByTestId('chat-add-favorite-button').click();
}

export async function removeFavorite(page: Page): Promise<void> {
  await page.getByTestId('chat-remove-favorite-button').click();
}

export async function waitForToast(page: Page, text: string): Promise<void> {
  await page.waitForSelector(`text=${text}`, { state: 'visible', timeout: 5000 });
}