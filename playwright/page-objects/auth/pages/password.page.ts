import { Page } from "@playwright/test";

export class PasswordPage {
  constructor(private readonly page: Page) { }

  passwordInput() {
    return this.page.getByRole('textbox', { name: 'Password' });
  }

  continueButton() {
    return this.page.getByRole('button', { name: 'Continue' });
  }

  errorMessage() {
    return this.page.getByTestId('form-feedback-error');
  }

  breachWarning() {
    return this.page.getByText(/password has been found as part of a breach/i);
  }

  async submitPassword(password: string) {
    await this.passwordInput().fill(password);
    await this.continueButton().click();
  }

  async waitUntilVisible() {
    await this.passwordInput().waitFor({ state: 'visible' });
  }

  async waitUntilHidden() {
    await this.passwordInput().waitFor({ state: 'hidden' });
  }
}