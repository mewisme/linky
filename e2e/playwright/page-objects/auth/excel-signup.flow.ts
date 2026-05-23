import { errors, expect, type Page } from "@playwright/test";

import { waitForRedirectToHome } from "../../helpers/wait-for-home";
import { cellStr, type SignupTestRow } from "../../test-data/excel";
import {
  generateSignupEmail,
  shouldDisableSignupEmailGenerate,
} from "../../test-data/generate-signup-email";

function isVerifyEmailUrl(page: Page): boolean {
  return page.url().includes("verify-email-address");
}

async function serverRespondedOrVerifyStep(page: Page): Promise<void> {
  if (isVerifyEmailUrl(page)) {
    return;
  }
  try {
    await page.waitForFunction(
      () => {
        const h = window.location.href;
        if (h.includes("verify-email-address")) {
          return true;
        }
        const selectors = [
          "#error-firstName",
          "#error-lastName",
          "#error-emailAddress",
          "#error-password",
          ".cl-alertText",
        ];
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (!el) {
            continue;
          }
          const t = (el as HTMLElement).innerText?.trim();
          if (t) {
            return true;
          }
        }
        return false;
      },
      { timeout: 5000 },
    );
  } catch (e) {
    if (e instanceof errors.TimeoutError) {
      return;
    }
    throw e;
  }
}

async function assertSignedInAtHome(page: Page): Promise<void> {
  await waitForRedirectToHome(page, 8000);
}

async function fillEmailVerificationOtp(page: Page, otp: string): Promise<void> {
  const byLabel = page.getByRole("textbox", {
    name: /verification code|Enter verification code/i,
  });
  const byAutocomplete = page.locator(
    'input[autocomplete="one-time-code"]',
  );
  const otpInput = byLabel.or(byAutocomplete).first();
  await otpInput.waitFor({ state: "visible", timeout: 8000 });
  await otpInput.click();
  await otpInput.pressSequentially(otp, { delay: 40 });
  const continueAfterOtp = page.getByRole("button", { name: "Continue" });
  if (await continueAfterOtp.isVisible().catch(() => false)) {
    await continueAfterOtp.click();
  }
}

async function otpStepResolvedOrLeftVerify(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const h = window.location.href;
      if (!h.includes("verify-email-address")) {
        return true;
      }
      const err = document.getElementById("error-undefined");
      if (err?.textContent?.trim()) {
        return true;
      }
      return false;
    },
    { timeout: 10000 },
  );
}

async function runVerifyEmailBranch(
  page: Page,
  otpStr: string,
  expectedMessage: string,
): Promise<void> {
  await fillEmailVerificationOtp(page, otpStr);

  await otpStepResolvedOrLeftVerify(page);

  if (!page.url().includes("verify-email-address")) {
    await assertSignedInAtHome(page);
    return;
  }

  const otpErr = page.locator("#error-undefined");
  if ((await otpErr.count()) > 0) {
    const t = (await otpErr.first().innerText()).trim();
    expect(t).toContain(expectedMessage);
    return;
  }

  if (!expectedMessage) {
    await page.waitForURL(
      (url) => !url.href.includes("verify-email-address"),
      { timeout: 8000, waitUntil: "domcontentloaded" },
    );
    await assertSignedInAtHome(page);
  }
}

async function runBrowserValidationIfFormStillOpen(
  page: Page,
  expectedMessage: string,
): Promise<boolean> {
  if (isVerifyEmailUrl(page)) {
    return false;
  }

  const emailField = page.locator('input[name="emailAddress"]');
  const pwField = page.locator('input[name="password"]');

  if (isVerifyEmailUrl(page)) {
    return false;
  }

  try {
    await emailField.waitFor({ state: "visible", timeout: 1500 });
    await pwField.waitFor({ state: "visible", timeout: 1500 });
  } catch {
    return false;
  }

  if (isVerifyEmailUrl(page)) {
    return false;
  }

  const isValidEmail = await emailField.evaluate(
    (el: HTMLInputElement) => el.checkValidity(),
  );
  const isValidPassword = await pwField.evaluate(
    (el: HTMLInputElement) => el.checkValidity(),
  );

  if (!isValidEmail) {
    const vm = await emailField.evaluate(
      (el: HTMLInputElement) => el.validationMessage,
    );
    expect(vm).toContain(expectedMessage);
    return true;
  }

  if (!isValidPassword) {
    const vm = await pwField.evaluate(
      (el: HTMLInputElement) => el.validationMessage,
    );
    expect(vm).toContain(expectedMessage);
    return true;
  }

  return false;
}

export async function runExcelSignupFlow(
  page: Page,
  row: SignupTestRow,
): Promise<void> {
  const firstName = cellStr(row.firstName);
  const lastName = cellStr(row.lastName);
  const emailRaw = cellStr(row.email);
  const passwordStr = cellStr(row.password);
  const otpStr = cellStr(row.otp);
  const expectedMessage = row.message ? cellStr(row.message) : "";

  const enableGen = !shouldDisableSignupEmailGenerate(expectedMessage);
  const finalEmail = generateSignupEmail(emailRaw, enableGen);

  await page.locator('input[name="firstName"]').waitFor({ state: "visible" });
  await page.locator('input[name="firstName"]').fill(firstName);
  await page.locator('input[name="lastName"]').fill(lastName);
  await page.locator('input[name="emailAddress"]').fill(finalEmail);

  const passwordField = page.locator('input[name="password"]');
  await passwordField.fill(passwordStr);

  if (expectedMessage.includes("72 characters")) {
    const err = page.locator("#error-password");
    await err.waitFor({ state: "visible", timeout: 6000 });
    expect((await err.innerText()).trim()).toContain(expectedMessage);
    return;
  }

  await page.locator('input[name="legalAccepted"]').click();
  await passwordField.press("Enter");

  try {
    await page.waitForURL(/verify-email-address/, { timeout: 2000 });
  } catch {
    /* still on sign-up; continue */
  }

  if (isVerifyEmailUrl(page)) {
    await serverRespondedOrVerifyStep(page);
    const alertEls = page.locator(".cl-alertText");
    const alertCount = await alertEls.count();
    if (alertCount > 0) {
      const alertText = (await alertEls.first().innerText()).trim();
      if (alertText) {
        expect(alertText).toContain(expectedMessage);
        return;
      }
    }
    const errorEls = page.locator("[id^='error-']");
    const n = await errorEls.count();
    let merged = "";
    for (let i = 0; i < n; i += 1) {
      const t = (await errorEls.nth(i).innerText()).trim();
      if (t) {
        merged += `${t} `;
      }
    }
    if (merged.trim()) {
      expect(merged).toContain(expectedMessage);
      return;
    }
    await runVerifyEmailBranch(page, otpStr, expectedMessage);
    return;
  }

  const stoppedOnValidation = await runBrowserValidationIfFormStillOpen(
    page,
    expectedMessage,
  );
  if (stoppedOnValidation) {
    return;
  }

  await serverRespondedOrVerifyStep(page);

  const alertEls = page.locator(".cl-alertText");
  const alertCount = await alertEls.count();
  if (alertCount > 0) {
    const alertText = (await alertEls.first().innerText()).trim();
    if (alertText) {
      expect(alertText).toContain(expectedMessage);
      return;
    }
  }

  const errorEls = page.locator("[id^='error-']");
  const n = await errorEls.count();
  let merged = "";
  for (let i = 0; i < n; i += 1) {
    const t = (await errorEls.nth(i).innerText()).trim();
    if (t) {
      merged += `${t} `;
    }
  }
  if (merged.trim()) {
    expect(merged).toContain(expectedMessage);
    return;
  }

  if (isVerifyEmailUrl(page)) {
    await runVerifyEmailBranch(page, otpStr, expectedMessage);
    return;
  }

  if (!expectedMessage) {
    await assertSignedInAtHome(page);
    return;
  }

  throw new Error(
    `Expected error containing "${expectedMessage}" but no matching UI state was found. URL: ${page.url()}`,
  );
}
