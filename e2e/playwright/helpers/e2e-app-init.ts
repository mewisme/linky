import type { BrowserContext } from '@playwright/test';

export async function applyLinkyAutomationInit(context: BrowserContext): Promise<void> {
  await context.addInitScript(() => {
    window.__LINKY_E2E__ = true;
    try {
      localStorage.setItem('linky:e2e', '1');
    } catch {
      /* noop */
    }
  });
}
