import { test } from "@playwright/test";

import { SignUpPage } from "../../page-objects/auth/pages/sign-up.page";
import { runExcelSignupFlow } from "../../page-objects/auth/excel-signup.flow";
import { readSignupTestRows } from "../../test-data/excel";
import { waitForClerkReady } from "../../helpers/clerk-helpers";

const signupRows = readSignupTestRows();

test.describe("Sign up (Excel test data)", () => {
  test.describe.configure({ timeout: 60_000 });

  for (const row of signupRows) {
    test(`row ${row.sheetRowIndex}`, async ({ page }) => {
      await page.goto("/sign-up");
      await waitForClerkReady(page);
      await new SignUpPage(page).waitUntilVisible();
      await runExcelSignupFlow(page, row);
    });
  }
});
