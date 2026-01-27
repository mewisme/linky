import { Page } from '@playwright/test';

export async function waitForClerkReady(page: Page, timeout = 30000): Promise<void> {
  await page.waitForSelector('[data-clerk-ready="true"]', {
    state: 'attached',
    timeout
  });
}
