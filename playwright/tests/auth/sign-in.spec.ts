import { test } from "@playwright/test";

import { IdentifierPage } from "../../page-objects/auth/pages/identifier.page";
import { runExcelLoginFlow } from "../../page-objects/auth/excel-login.flow";
import { readLoginTestRows } from "../../test-data/excel";
import { waitForClerkReady } from "../../helpers/clerk-helpers";

const loginRows = readLoginTestRows();

test.describe("Sign in (Excel test data)", () => {
  test.describe.configure({ timeout: 60_000 });

  for (const row of loginRows) {
    test(`row ${row.sheetRowIndex}`, async ({ page }) => {
      await page.goto("/sign-in");
      await waitForClerkReady(page);
      await new IdentifierPage(page).waitUntilVisible();
      await runExcelLoginFlow(page, row);
    });
  }
});
