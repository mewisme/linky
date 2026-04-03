import { Page } from '@playwright/test';
import { waitForClerkReady } from '../../../helpers/clerk-helpers';

export class VideoChatPage {
  constructor(private readonly page: Page) { }

  async goto() {
    await this.page.goto('/call');
    await waitForClerkReady(this.page);
  }

  async waitForIdle() {
    await this.page.waitForSelector('[data-testid="chat-idle-container"]', { state: 'visible' });
  }

  async waitForInCall() {
    await this.page.waitForSelector('[data-testid="chat-remote-video"]', { state: 'visible' });
    await this.page.waitForSelector('[data-testid="chat-call-timer"]', { state: 'visible' });
  }

  async waitForSearching() {
    await this.page.waitForSelector('[data-testid="chat-searching-indicator"]', { state: 'visible' });
  }

  startButton() {
    return this.page.locator('[data-testid="chat-start-button"]');
  }

  endCallButton() {
    return this.page.locator('[data-testid="chat-end-call-button"]');
  }

  skipButton() {
    return this.page.locator('[data-testid="chat-skip-button"]');
  }

  muteButton() {
    return this.page.locator('[data-testid="chat-mute-button"]');
  }

  videoToggleButton() {
    return this.page.locator('[data-testid="chat-video-toggle-button"]');
  }

  chatToggleButton() {
    return this.page.locator('[data-testid="chat-toggle-button"]');
  }

  addFavoriteButton() {
    return this.page.locator('[data-testid="chat-add-favorite-button"]');
  }

  removeFavoriteButton() {
    return this.page.locator('[data-testid="chat-remove-favorite-button"]');
  }

  videoContainer() {
    return this.page.locator('[data-testid="chat-video-container"]');
  }

  remoteVideo() {
    return this.page.locator('[data-testid="chat-remote-video"]');
  }

  localVideo() {
    return this.page.locator('[data-testid="chat-local-video"]');
  }

  callTimer() {
    return this.page.locator('[data-testid="chat-call-timer"]');
  }

  idleContainer() {
    return this.page.locator('[data-testid="chat-idle-container"]');
  }

  searchingIndicator() {
    return this.page.locator('[data-testid="chat-searching-indicator"]');
  }

  cameraOffIndicator() {
    return this.page.locator('[data-testid="chat-camera-off-indicator"]');
  }

  chatSidebar() {
    return this.page.locator('[data-testid="chat-sidebar"]');
  }

  chatMessagesContainer() {
    return this.page.locator('[data-testid="chat-messages-container"]');
  }

  chatInput() {
    return this.page.locator('[data-testid="chat-input"]');
  }

  chatSendButton() {
    return this.page.locator('[data-testid="chat-send-button"]');
  }

  chatMessage(messageId: string) {
    return this.page.locator(`[data-testid="chat-message-${messageId}"]`);
  }
}
