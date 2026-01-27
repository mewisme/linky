import { Page } from "@playwright/test";

export class NewPasswordPage {
  constructor(private readonly page: Page) { }

  newPasswordInput() {
    return this.page.getByRole('textbox', { name: 'New password' });
  }

  confirmPasswordInput() {
    return this.page.getByRole('textbox', { name: 'Confirm password' });
  }

  resetPasswordButton() {
    return this.page.getByRole('button', { name: 'Reset Password' });
  }

  passwordSuccessFeedback() {
    return this.page.locator('#password-success-feedback');
  }

  confirmPasswordSuccessFeedback() {
    return this.page.locator('#confirmPassword-success-feedback');
  }

  errorNewPasswordMessage() {
    return this.page.locator('#error-password');
  }

  errorConfirmPasswordMessage() {
    return this.page.locator('#error-confirmPassword');
  }

  formFeedbackErrorMessage() {
    return this.page.getByTestId('form-feedback-error');
  }

  async fillNewPassword(newPassword: string) {
    await this.newPasswordInput().fill(newPassword);
  }

  async fillConfirmPassword(confirmPassword: string) {
    await this.confirmPasswordInput().fill(confirmPassword);
  }

  async submitResetPassword() {
    await this.resetPasswordButton().click();
  }

  async waitUntilVisible() {
    await this.newPasswordInput().waitFor({ state: 'visible' });
    await this.confirmPasswordInput().waitFor({ state: 'visible' });
  }

  async waitUntilHidden() {
    await this.newPasswordInput().waitFor({ state: 'hidden' });
    await this.confirmPasswordInput().waitFor({ state: 'hidden' });
  }
}