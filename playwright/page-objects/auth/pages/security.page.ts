import { Page } from '@playwright/test';

export class SecurityPage {
  constructor(private readonly page: Page) {}

  authenticationCard() {
    return this.page.getByTestId('security-authentication-card');
  }

  changePasswordButton() {
    return this.page.getByTestId('security-password-open-dialog');
  }

  dialogContainer() {
    return this.page.getByTestId('dialog-container');
  }

  drawerContainer() {
    return this.page.getByTestId('drawer-container');
  }

  private passwordModal() {
    return this.dialogContainer().or(this.drawerContainer());
  }

  // The password inputs in the modal have no explicit label association (no htmlFor/id pair).
  // We locate by position within the modal: first password input = "new password",
  // second = "confirm password". Scoping to the modal prevents matching unrelated inputs.
  newPasswordInput() {
    return this.passwordModal().locator('input[type="password"], input[type="text"]').first();
  }

  confirmPasswordInput() {
    return this.passwordModal().locator('input[type="password"], input[type="text"]').nth(1);
  }

  updatePasswordButton() {
    return this.page.getByTestId('security-password-submit');
  }

  cancelButton() {
    return this.page.getByTestId('dialog-cancel-button');
  }

  signOutOthersCheckbox() {
    return this.page.getByTestId('security-password-sign-out-others');
  }

  activeSessionsList() {
    return this.page.locator('#active-sessions-list');
  }

  // The button toggles between "View all sessions" and "Show less" on click.
  // Use aria-controls to get a stable locator that survives the text change.
  viewAllSessionsButton() {
    return this.page.locator('button[aria-controls="active-sessions-list"]');
  }

  // The password strength text is rendered as a plain <p> element, not with a testid.
  // Match by translation key output: "Strength: Weak|Medium|Strong".
  passwordStrengthLabel() {
    return this.page.locator('p').filter({ hasText: /strength/i });
  }

  async openChangePasswordDialog(): Promise<void> {
    await this.changePasswordButton().click();
    const dialog = this.passwordModal();
    await dialog.waitFor({ state: 'visible', timeout: 10_000 });
  }

  // Sessions use role="listitem" divs, not <li> elements or data-testid="session-row".
  async waitForSessionsLoaded(): Promise<void> {
    await this.page.waitForSelector(
      '#active-sessions-list [role="listitem"]',
      { state: 'visible', timeout: 15_000 },
    );
  }
}
