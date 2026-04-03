import { Page } from "@playwright/test";

export class OTPPage {
  constructor(private readonly page: Page) { }

  otpInput() {
    return this.page.getByRole('textbox', { name: 'Enter verification code' });
  }

  submitOTPButton() {
    return this.page.getByRole('button', { name: 'Continue' });
  }

  errorMessage() {
    return this.page.getByTestId('form-feedback-error');
  }

  invalidStrategyMessage() {
    return this.page.getByText(/The verification strategy is not valid for this account/i);
  }

  async fillOTP(otp: string) {
    await this.otpInput().fill(otp);
  }

  async submitOTP(otp: string) {
    await this.fillOTP(otp);
    await this.submitOTPButton().click();
  }

  async waitUntilVisible() {
    await this.otpInput().waitFor({ state: 'visible' });
  }

  async waitUntilHidden() {
    await this.otpInput().waitFor({ state: 'hidden' });
  }
}