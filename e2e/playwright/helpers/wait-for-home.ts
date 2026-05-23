import { expect, type Page } from "@playwright/test";

function isLocaleHomePathname(pathname: string): boolean {
  const p = pathname.replace(/\/$/, "") || "/";
  return p === "/" || p === "/vi";
}

function isAuthPathname(pathname: string): boolean {
  return (
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/vi/sign-in") ||
    pathname.startsWith("/vi/sign-up")
  );
}

export function isPostAuthAppUrl(url: URL): boolean {
  const href = url.href;
  if (href.includes("verify-email")) {
    return false;
  }
  if (href.includes("factor-two")) {
    return false;
  }
  if (isLocaleHomePathname(url.pathname)) {
    return true;
  }
  if (isAuthPathname(url.pathname)) {
    return false;
  }
  return true;
}

async function clickProceedToRedirectUrlIfShown(page: Page): Promise<void> {
  const byRole = page.getByRole("link", {
    name: /proceed to redirect url/i,
  });
  const byText = page.getByText("Proceed to redirect URL", { exact: true });
  const locator = byRole.or(byText);

  if (await locator.isVisible().catch(() => false)) {
    await locator.click();
    return;
  }

  const anyProceedAnchor = page.locator("a[href]:not([href^='http'])").filter({
    hasText: /proceed to redirect url/i,
  });
  if ((await anyProceedAnchor.count()) > 0) {
    await anyProceedAnchor.first().click();
  }
}

export async function waitForRedirectToHome(
  page: Page,
  timeout = 20000,
): Promise<void> {
  await expect
    .poll(
      async () => {
        await clickProceedToRedirectUrlIfShown(page);
        try {
          return isPostAuthAppUrl(new URL(page.url()));
        } catch {
          return false;
        }
      },
      { timeout },
    )
    .toBe(true);
}
