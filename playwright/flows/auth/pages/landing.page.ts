import { Page } from "@playwright/test";

export class LandingPage {
  constructor(private readonly page: Page) { }

  goToChatButton() {
    return this.page.getByRole('button', { name: 'Start Chatting Now' });
  }

  async waitUntilVisible() {
    await this.goToChatButton().waitFor({ state: 'visible' });
  }

  async waitUntilHidden() {
    await this.goToChatButton().waitFor({ state: 'hidden' });
  }
}