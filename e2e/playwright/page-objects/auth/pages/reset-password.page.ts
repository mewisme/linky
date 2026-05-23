import { Page } from "@playwright/test";

export class ResetPasswordPage {
  constructor(private readonly page: Page) { }

  resetPasswordButton() {
    return this.page.getByRole('button', { name: 'Reset your password' });
  }

  breachWarning() {
    return this.page.getByText(/password has been found as part of a breach/i);
  }

  async submitResetPassword() {
    await this.resetPasswordButton().click();
  }

  async waitUntilHidden() {
    await this.resetPasswordButton().waitFor({ state: 'hidden' });
  }
}