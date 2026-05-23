import { Page } from "@playwright/test";

export class SignUpPage {
  constructor(private readonly page: Page) { }

  firstNameInput() {
    return this.page.getByRole('textbox', { name: 'First name' });
  }

  lastNameInput() {
    return this.page.getByRole('textbox', { name: 'Last name' });
  }

  emailAddressInput() {
    return this.page.getByRole('textbox', { name: 'Email address' });
  }

  passwordInput() {
    return this.page.getByRole('textbox', { name: 'Password' });
  }

  checkboxInput() {
    return this.page.getByRole('checkbox', { name: 'I agree to the Terms of' });
  }

  signUpButton() {
    return this.page.getByRole('button', { name: 'Continue' });
  }

  errorEmailMessage() {
    return this.page.locator('#error-emailAddress');
  }

  errorPasswordMessage() {
    return this.page.locator('#error-password');
  }

  formFeedbackErrorMessage() {
    return this.page.getByTestId('form-feedback-error');
  }

  async fillFirstName(firstName: string) {
    await this.firstNameInput().fill(firstName);
  }

  async fillLastName(lastName: string) {
    await this.lastNameInput().fill(lastName);
  }

  async fillEmailAddress(emailAddress: string) {
    await this.emailAddressInput().fill(emailAddress);
  }

  async fillPassword(password: string) {
    await this.passwordInput().fill(password);
  }

  async fillCheckbox() {
    await this.checkboxInput().check();
  }

  async uncheckCheckbox() {
    await this.checkboxInput().uncheck();
  }

  async submitSignUp() {
    await this.signUpButton().click();
  }

  async waitUntilState(state: 'visible' | 'hidden') {
    await this.firstNameInput().waitFor({ state });
    await this.lastNameInput().waitFor({ state });
    await this.emailAddressInput().waitFor({ state });
    await this.passwordInput().waitFor({ state });
    await this.checkboxInput().waitFor({ state });
  }

  async waitUntilVisible() {
    await this.waitUntilState('visible');
  }

  async waitUntilHidden() {
    await this.waitUntilState('hidden');
  }
}