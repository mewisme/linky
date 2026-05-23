import { Page } from "@playwright/test";

export class IdentifierPage {
  constructor(private readonly page: Page) { }

  emailInput() {
    return this.page.getByRole('textbox', { name: 'Email address' });
  }

  continueButton() {
    return this.page.getByRole('button', { name: 'Continue' });
  }

  errorMessage() {
    return this.page.getByTestId('form-feedback-error');
  }

  async submitEmail(email: string) {
    await this.emailInput().fill(email);
    await this.continueButton().click();
  }

  async waitUntilHidden() {
    await this.emailInput().waitFor({ state: 'hidden' });
  }

  async waitUntilVisible() {
    await this.emailInput().waitFor({ state: 'visible' });
  }
}