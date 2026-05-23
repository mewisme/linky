import { errors, expect, type Page } from "@playwright/test";

import {
  isPostAuthAppUrl,
  waitForRedirectToHome,
} from "../../helpers/wait-for-home";
import { cellStr, type LoginTestRow } from "../../test-data/excel";

function identifierFieldError(page: Page) {
  const byClerkClass = page
    .locator('input[name="identifier"]')
    .locator("..")
    .locator(".cl-formFieldErrorText, #error-identifier");
  const bySiblingBlock = page.locator('input[name="identifier"]').locator(
    'xpath=ancestor::div[.//input[@name="identifier"] and following-sibling::*[normalize-space(.)]][1]/following-sibling::*[normalize-space(.)][1]',
  );
  return byClerkClass.or(bySiblingBlock);
}

function passwordFieldError(page: Page) {
  return page
    .locator('input[name="password"]')
    .locator("..")
    .locator(".cl-formFieldErrorText, #error-password");
}

export async function runExcelLoginFlow(
  page: Page,
  row: LoginTestRow,
): Promise<void> {
  const emailStr = cellStr(row.email);
  const passwordStr = cellStr(row.password);
  const otpStr = cellStr(row.otp);
  const expectedMessage = row.message ? cellStr(row.message) : "";

  const emailField = page.locator('input[name="identifier"]');
  await emailField.waitFor({ state: "visible", timeout: 10000 });
  await emailField.fill(emailStr);
  await emailField.press("Enter");
  await page.waitForTimeout(200);

  const emailValid = await emailField.evaluate(
    (el: HTMLInputElement) => el.checkValidity(),
  );
  if (!emailValid) {
    const vm = await emailField.evaluate(
      (el: HTMLInputElement) => el.validationMessage,
    );
    expect(vm).toContain(expectedMessage);
    return;
  }

  await identifierFieldError(page)
    .waitFor({ state: "visible", timeout: 8000 })
    .catch(() => {});

  if (await identifierFieldError(page).isVisible().catch(() => false)) {
    const t = (await identifierFieldError(page).first().innerText()).trim();
    if (t) {
      expect(t).toContain(expectedMessage);
      return;
    }
  }

  const passwordField = page.locator('input[name="password"]');
  await passwordField.waitFor({ state: "visible", timeout: 10000 });
  await passwordField.fill(passwordStr);
  await passwordField.press("Enter");
  await page.waitForTimeout(200);

  try {
    await Promise.race([
      page.locator("#error-password").waitFor({ state: "visible", timeout: 10000 }),
      page.waitForURL(/factor-two/, { timeout: 10000 }),
      page.waitForURL((url) => isPostAuthAppUrl(url), {
        timeout: 10000,
        waitUntil: "load",
      }),
    ]);
  } catch {
    /* Timeout waiting password result — mirror Python: continue */
  }

  if (await passwordFieldError(page).isVisible().catch(() => false)) {
    const t = (await passwordFieldError(page).first().innerText()).trim();
    if (t) {
      expect(t).toContain(expectedMessage);
      return;
    }
  }

  const pwErrCount = await page.locator("#error-password").count();
  if (pwErrCount > 0) {
    const t = (await page.locator("#error-password").first().innerText()).trim();
    expect(t).toContain(expectedMessage);
    return;
  }

  if (page.url().includes("/sign-in")) {
    if (await identifierFieldError(page).isVisible().catch(() => false)) {
      const t = (await identifierFieldError(page).first().innerText()).trim();
      if (t) {
        expect(t).toContain(expectedMessage);
        return;
      }
    }
  }

  if (page.url().includes("factor-two")) {
    const otpField = page.locator("input[autocomplete='one-time-code']");
    await otpField.waitFor({ state: "visible", timeout: 10000 });
    await otpField.click();
    await otpField.pressSequentially(otpStr, { delay: 40 });
    const continueAfterOtp = page.getByRole("button", { name: "Continue" });
    if (await continueAfterOtp.isVisible().catch(() => false)) {
      await continueAfterOtp.click();
    }

    try {
      await page.waitForFunction(
        () => {
          const h = window.location.href;
          if (!h.includes("factor-two")) {
            return true;
          }
          const err = document.getElementById("error-undefined");
          if (err?.textContent?.trim()) {
            return true;
          }
          return false;
        },
        { timeout: 20000 },
      );
    } catch (e) {
      if (e instanceof errors.TimeoutError) {
        const otpErrCount = await page.locator("#error-undefined").count();
        if (otpErrCount > 0) {
          const t = (await page.locator("#error-undefined").first().innerText()).trim();
          expect(t).toContain(expectedMessage);
          return;
        }
      }
      throw e;
    }

    const otpErrCount = await page.locator("#error-undefined").count();
    if (otpErrCount > 0) {
      const t = (await page.locator("#error-undefined").first().innerText()).trim();
      expect(t).toContain(expectedMessage);
      return;
    }

    await waitForRedirectToHome(page, 20000);
    return;
  }

  await waitForRedirectToHome(page, 20000);
}
